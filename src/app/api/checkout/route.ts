import { NextResponse } from "next/server";
import { headers, cookies } from "next/headers";
import { getAuthorizationPrincipal } from "@/auth/authorization";
import { CartService } from "@/cart/service";
import { DrizzleCartRepository } from "@/cart/repository";
import { CheckoutService } from "@/checkout/service";
import { DrizzleCheckoutRepository } from "@/checkout/repository";
import { getRuntimeDb } from "@/db/runtime";
import { type CheckoutDb } from "@/checkout/db";
import { CatalogService } from "@/catalog/service";
import { DrizzleCatalogRepository } from "@/catalog/repository";
import { z } from "zod";
import { isCheckoutError } from "@/checkout/errors";
import { isCartError } from "@/cart/errors";
import { isCatalogError } from "@/catalog/errors";
import { orderAccessCookieName, toPublicOrder } from "@/checkout/public";
import { MockPaymentProvider } from "@/checkout/mock-payment";
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
  const cart = new CartService(new DrizzleCartRepository(db as unknown as CheckoutDb), catalog);
  const checkout = new CheckoutService(
    new DrizzleCheckoutRepository(db as unknown as CheckoutDb),
    cart,
    catalog,
  );
  return { cart, checkout };
}

const checkoutSchema = z.object({
  email: z.string().email().max(320),
  idempotencyKey: z.string().min(1).max(200),
});

export async function POST(request: Request) {
  try {
    const identity = await getCartIdentity();

    if (!identity.customerId && !identity.sessionId) {
      return NextResponse.json({ error: "No active cart session" }, { status: 400 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { cart, checkout } = getServices();
    if (identity.customerId && identity.sessionId) {
      await cart.mergeCart(identity.sessionId, identity.customerId);
      const cookieStore = await cookies();
      cookieStore.delete(CART_SESSION_COOKIE);
      identity.sessionId = null;
    }

    const result = await checkout.createOrderFromCart(
      {
        customerId: identity.customerId ?? undefined,
        sessionId: identity.sessionId ?? undefined,
        currency: DEFAULT_CURRENCY,
      },
      parsed.data.email,
      parsed.data.idempotencyKey,
    );

    if (result.guestAccessToken) {
      const cookieStore = await cookies();
      cookieStore.set({
        name: orderAccessCookieName(result.order.id),
        value: result.guestAccessToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
      });
    }

    if (result.order.paymentStatus === "pending") {
      await MockPaymentProvider.deliverPayment(result.order.id);
    }

    return NextResponse.json({
      order: toPublicOrder(result.order),
      successPath: `/checkout/${result.order.id}/success`,
    });
  } catch (error) {
    const authResponse = authorizationErrorResponse(error);
    if (authResponse) return authResponse;
    if (isCheckoutError(error) || isCartError(error) || isCatalogError(error)) {
      const status = error.code === "INVALID_INPUT" ? 400 : error.code === "NOT_FOUND" ? 404 : 409;
      return NextResponse.json({ error: error.message }, { status });
    }
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
