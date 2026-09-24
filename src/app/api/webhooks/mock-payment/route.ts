import { NextResponse } from "next/server";
import { CheckoutService } from "@/checkout/service";
import { DrizzleCheckoutRepository } from "@/checkout/repository";
import { CartService } from "@/cart/service";
import { DrizzleCartRepository } from "@/cart/repository";
import { CatalogService } from "@/catalog/service";
import { DrizzleCatalogRepository } from "@/catalog/repository";
import { getRuntimeDb } from "@/db/runtime";
import { type CheckoutDb } from "@/checkout/db";
import { z } from "zod";
import { authenticateMockWebhook } from "@/checkout/mock-payment";
import { isCheckoutError } from "@/checkout/errors";

function getCheckoutService() {
  const db = getRuntimeDb();
  const catalog = new CatalogService(new DrizzleCatalogRepository(db));
  const cart = new CartService(new DrizzleCartRepository(db as unknown as CheckoutDb), catalog);
  return new CheckoutService(
    new DrizzleCheckoutRepository(db as unknown as CheckoutDb),
    cart,
    catalog,
  );
}

const webhookSchema = z.object({
  orderId: z.string().min(1),
  status: z.enum(["PAID", "FAILED"]),
  transactionId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    if (!authenticateMockWebhook(request.headers.get("authorization"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const parsed = webhookSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const { orderId, status, transactionId } = parsed.data;
    const isSuccess = status === "PAID";

    const checkout = getCheckoutService();
    await checkout.processPaymentWebhook(orderId, isSuccess, transactionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (isCheckoutError(error)) {
      const status = error.code === "INVALID_INPUT" ? 400 : error.code === "NOT_FOUND" ? 404 : 409;
      return NextResponse.json({ error: error.message }, { status });
    }
    console.error("Mock Webhook Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
