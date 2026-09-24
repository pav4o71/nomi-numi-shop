import { NextResponse } from "next/server";
import { headers, cookies } from "next/headers";
import { getAuthorizationPrincipal } from "@/auth/authorization";
import { CartService } from "@/cart/service";
import { DrizzleCartRepository } from "@/cart/repository";
import { type CartDb } from "@/cart/db";
import { getRuntimeDb } from "@/db/runtime";
import { CatalogService } from "@/catalog/service";
import { DrizzleCatalogRepository } from "@/catalog/repository";
import { createCatalogId } from "@/catalog/ids";
import { z } from "zod";
import { isCartError } from "@/cart/errors";
import { isCatalogError } from "@/catalog/errors";
import { toPublicCart } from "@/cart/public";
import { authorizationErrorResponse } from "@/auth/http";

const CART_SESSION_COOKIE = "nomi_cart_session";
const DEFAULT_CURRENCY = "USD";

async function getCartIdentity() {
  const reqHeaders = await headers();
  const principal = await getAuthorizationPrincipal(reqHeaders);

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(CART_SESSION_COOKIE);

  return {
    customerId: principal?.role === "customer" ? principal.userId : null,
    sessionId: sessionCookie?.value ?? null,
  };
}

function getServices() {
  const db = getRuntimeDb();
  const catalog = new CatalogService(new DrizzleCatalogRepository(db));
  const cart = new CartService(new DrizzleCartRepository(db as unknown as CartDb), catalog);
  return { catalog, cart };
}

export async function GET() {
  try {
    const identity = await getCartIdentity();

    // If user has no cookie and is not logged in, return an empty cart shape
    if (!identity.customerId && !identity.sessionId) {
      return NextResponse.json({
        id: "",
        currency: DEFAULT_CURRENCY,
        items: [],
        totalAmount: 0,
      });
    }

    const { cart } = getServices();

    // Lazy merge on login
    if (identity.customerId && identity.sessionId) {
      await cart.mergeCart(identity.sessionId, identity.customerId);
      const cookieStore = await cookies();
      cookieStore.delete(CART_SESSION_COOKIE);
      identity.sessionId = null;
    }

    const resolvedCart = await cart.getCart({
      customerId: identity.customerId ?? undefined,
      sessionId: identity.sessionId ?? undefined,
      currency: DEFAULT_CURRENCY,
    });

    return NextResponse.json(toPublicCart(resolvedCart));
  } catch (error) {
    const authResponse = authorizationErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("Cart GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

const addItemSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().min(1),
});

export async function POST(request: Request) {
  try {
    const identity = await getCartIdentity();
    const { customerId } = identity;
    let { sessionId } = identity;

    let setCookieHeader = false;
    if (!customerId && !sessionId) {
      sessionId = `sess_${createCatalogId("crt")}`;
      setCookieHeader = true;
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = addItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { cart } = getServices();

    // Lazy merge on login
    if (customerId && sessionId) {
      await cart.mergeCart(sessionId, customerId);
      const cookieStore = await cookies();
      cookieStore.delete(CART_SESSION_COOKIE);
      sessionId = null;
    }

    // Ensure cart exists first
    const resolvedCart = await cart.getCart({
      customerId: customerId ?? undefined,
      sessionId: sessionId ?? undefined,
      currency: DEFAULT_CURRENCY,
    });

    // Add item
    await cart.addItem(resolvedCart.id, parsed.data.variantId, parsed.data.quantity);

    // Fetch updated
    const updatedCart = await cart.getCart({
      customerId: customerId ?? undefined,
      sessionId: sessionId ?? undefined,
      currency: DEFAULT_CURRENCY,
    });

    const response = NextResponse.json(toPublicCart(updatedCart));

    if (setCookieHeader && sessionId) {
      const cookieStore = await cookies();
      cookieStore.set({
        name: CART_SESSION_COOKIE,
        value: sessionId,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });
    }

    return response;
  } catch (error) {
    const authResponse = authorizationErrorResponse(error);
    if (authResponse) return authResponse;
    if (isCartError(error) || isCatalogError(error)) {
      const status = error.code === "INVALID_INPUT" ? 400 : error.code === "NOT_FOUND" ? 404 : 409;
      return NextResponse.json({ error: error.message }, { status });
    }
    console.error("Cart POST error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
