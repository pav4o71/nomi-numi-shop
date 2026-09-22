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

const CART_SESSION_COOKIE = "nomi_cart_session";
const DEFAULT_CURRENCY = "USD";

async function getCartIdentity() {
  const reqHeaders = await headers();
  const principal = await getAuthorizationPrincipal(reqHeaders);

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(CART_SESSION_COOKIE);

  return {
    customerId: principal?.userId ?? null,
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
  return { checkout };
}

const checkoutSchema = z.object({
  email: z.string().email(),
  idempotencyKey: z.string().min(1),
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

    const { checkout } = getServices();

    const order = await checkout.createOrderFromCart(
      {
        customerId: identity.customerId ?? undefined,
        sessionId: identity.sessionId ?? undefined,
        currency: DEFAULT_CURRENCY,
      },
      parsed.data.email,
      parsed.data.idempotencyKey,
    );

    // Simulate the payment asynchronously
    import("@/checkout/mock-payment").then((m) => {
      // 80% chance of success for testing the failure path
      const shouldSucceed = Math.random() > 0.2;
      m.MockPaymentProvider.simulatePayment(order.id, shouldSucceed);
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error("Checkout error:", error);

    // Map inventory availability failures to 409 Conflict
    if (
      (error instanceof Error ? error.message : "").includes("unavailable or inactive") ||
      (error instanceof Error ? error.name : "") === "ConflictError" ||
      (error instanceof Error ? error.message : "").includes("Insufficient inventory")
    ) {
      return NextResponse.json({ error: "Inventory conflict" }, { status: 409 });
    }

    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
