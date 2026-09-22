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
    const body = await request.json();
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
    console.error("Mock Webhook Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
