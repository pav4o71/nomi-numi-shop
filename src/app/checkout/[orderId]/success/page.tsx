import { notFound } from "next/navigation";
import { getRuntimeDb } from "@/db/runtime";
import { DrizzleCheckoutRepository } from "@/checkout/repository";
import { CheckoutDb } from "@/checkout/db";
import { Container } from "@/components/container";
import { formatPublicMoney } from "@/catalog/public/format-money";

import { CatalogCurrency } from "@/catalog/money";

export const dynamic = "force-dynamic";

export default async function OrderSuccessPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;

  const db = getRuntimeDb();
  const repo = new DrizzleCheckoutRepository(db as unknown as CheckoutDb);

  const order = await repo.transaction(async (tx) => {
    return repo.getOrderById(tx, orderId);
  });

  if (!order) {
    notFound();
  }

  const items = await repo.transaction(async (tx) => {
    return repo.getOrderItems(tx, orderId);
  });

  return (
    <main className="section-shell py-12 sm:py-24 bg-muted/30">
      <Container className="max-w-2xl">
        <div className="surface-card p-8 sm:p-12 text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Thank you for your order!
          </h1>

          <p className="text-muted-foreground">
            Order <span className="font-mono text-foreground font-medium">{order.id}</span>
          </p>

          <div className="flex items-center justify-center gap-4 py-4">
            <div className="flex flex-col items-center">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                Payment
              </span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium uppercase ${
                  order.paymentStatus === "paid"
                    ? "bg-green-100 text-green-800"
                    : order.paymentStatus === "failed"
                      ? "bg-red-100 text-red-800"
                      : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {order.paymentStatus}
              </span>
            </div>
            <div className="h-8 w-px bg-border"></div>
            <div className="flex flex-col items-center">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                Order
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground uppercase">
                {order.orderStatus}
              </span>
            </div>
          </div>

          <div className="border-t border-border pt-6 mt-6 text-left">
            <h2 className="font-semibold text-lg mb-4">Order Summary</h2>
            <ul className="space-y-4">
              {items.map((item) => (
                <li key={item.id} className="flex justify-between text-sm">
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-muted-foreground">Qty: {item.quantity}</p>
                  </div>
                  <p className="font-medium">
                    {formatPublicMoney({
                      amountMinor: item.unitPrice,
                      currency: order.currency as CatalogCurrency,
                      compareAtAmountMinor: null,
                    })}
                  </p>
                </li>
              ))}
            </ul>
            <div className="flex justify-between font-semibold text-lg border-t border-border pt-4 mt-4">
              <span>Total</span>
              <span>
                {formatPublicMoney({
                  amountMinor: order.totalAmount,
                  currency: order.currency as CatalogCurrency,
                  compareAtAmountMinor: null,
                })}
              </span>
            </div>
          </div>

          <p className="text-sm text-muted-foreground pt-8">
            (If payment is pending, try refreshing the page in 2 seconds to see the mock webhook
            resolve it!)
          </p>
        </div>
      </Container>
    </main>
  );
}
