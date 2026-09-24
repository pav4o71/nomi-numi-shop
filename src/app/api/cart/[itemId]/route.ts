import { NextResponse } from "next/server";
import { headers, cookies } from "next/headers";
import { getAuthorizationPrincipal } from "@/auth/authorization";
import { CartService } from "@/cart/service";
import { DrizzleCartRepository } from "@/cart/repository";
import { type CartDb } from "@/cart/db";
import { getRuntimeDb } from "@/db/runtime";
import { CatalogService } from "@/catalog/service";
import { DrizzleCatalogRepository } from "@/catalog/repository";
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

const updateItemSchema = z.object({
  quantity: z.number().int().min(0),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  try {
    const { itemId } = await params;
    const identity = await getCartIdentity();

    if (!identity.customerId && !identity.sessionId) {
      return NextResponse.json({ error: "Cart not found" }, { status: 404 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = updateItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
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

    await cart.updateItem(resolvedCart.id, itemId, parsed.data.quantity);

    const updatedCart = await cart.getCart({
      customerId: identity.customerId ?? undefined,
      sessionId: identity.sessionId ?? undefined,
      currency: DEFAULT_CURRENCY,
    });

    return NextResponse.json(toPublicCart(updatedCart));
  } catch (error) {
    const authResponse = authorizationErrorResponse(error);
    if (authResponse) return authResponse;
    if (isCartError(error) || isCatalogError(error)) {
      const status = error.code === "INVALID_INPUT" ? 400 : error.code === "NOT_FOUND" ? 404 : 409;
      return NextResponse.json({ error: error.message }, { status });
    }
    console.error("Cart PATCH error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  try {
    const { itemId } = await params;
    const identity = await getCartIdentity();

    if (!identity.customerId && !identity.sessionId) {
      return NextResponse.json({ error: "Cart not found" }, { status: 404 });
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

    await cart.updateItem(resolvedCart.id, itemId, 0); // 0 quantity deletes it

    const updatedCart = await cart.getCart({
      customerId: identity.customerId ?? undefined,
      sessionId: identity.sessionId ?? undefined,
      currency: DEFAULT_CURRENCY,
    });

    return NextResponse.json(toPublicCart(updatedCart));
  } catch (error) {
    const authResponse = authorizationErrorResponse(error);
    if (authResponse) return authResponse;
    if (isCartError(error) || isCatalogError(error)) {
      const status = error.code === "INVALID_INPUT" ? 400 : error.code === "NOT_FOUND" ? 404 : 409;
      return NextResponse.json({ error: error.message }, { status });
    }
    console.error("Cart DELETE error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
