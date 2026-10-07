import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getRuntimeDb } from "@/db/runtime";
import { orders } from "@/db/schema";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getRuntimeDb();

  const order = await db.query.orders.findFirst({
    where: eq(orders.id, id),
    with: {
      items: true,
      customer: true,
    },
  });

  if (!order) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/orders"
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent"
        >
          &larr; Back to Orders
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Order {order.id}</h1>
          <p className="text-muted-foreground">Placed on {new Date(order.createdAt).toLocaleString()}</p>
        </div>
        <div className="flex gap-2">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1 text-sm font-medium",
              {
                "bg-yellow-100 text-yellow-800": order.paymentStatus === "pending",
                "bg-green-100 text-green-800": order.paymentStatus === "paid",
                "bg-red-100 text-red-800": order.paymentStatus === "failed",
                "bg-gray-100 text-gray-800": order.paymentStatus === "refunded",
              }
            )}
          >
            Payment: {order.paymentStatus}
          </span>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1 text-sm font-medium",
              {
                "bg-yellow-100 text-yellow-800": order.fulfillmentStatus === "unfulfilled",
                "bg-blue-100 text-blue-800": order.fulfillmentStatus === "processing",
                "bg-purple-100 text-purple-800": order.fulfillmentStatus === "shipped",
                "bg-green-100 text-green-800": order.fulfillmentStatus === "delivered",
                "bg-red-100 text-red-800": order.fulfillmentStatus === "cancelled",
              }
            )}
          >
            Fulfillment: {order.fulfillmentStatus}
          </span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left column: Items and totals */}
        <div className="md:col-span-2 space-y-6">
          <div className="border rounded-lg bg-card overflow-hidden">
            <div className="p-4 border-b bg-muted/30">
              <h2 className="font-semibold text-lg">Order Items</h2>
            </div>
            <div className="p-4">
              <ul className="divide-y">
                {order.items.map((item) => (
                  <li key={item.id} className="flex py-4">
                    <div className="flex-1">
                      <div className="font-medium">{item.title}</div>
                      {item.sku && <div className="text-sm text-muted-foreground font-mono">SKU: {item.sku}</div>}
                      {item.selectedOptions && item.selectedOptions.length > 0 && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {item.selectedOptions.map((opt) => `${opt.name}: ${opt.value}`).join(", ")}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {order.currency} {(item.lineTotal / 100).toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Qty: {item.quantity} × {order.currency} {(item.unitPrice / 100).toFixed(2)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-4 bg-muted/10 border-t space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{order.currency} {(order.subtotalAmount / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span>{order.currency} {(order.shippingAmount / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span>{order.currency} {(order.taxAmount / 100).toFixed(2)}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount {order.promoCode ? `(${order.promoCode})` : ""}</span>
                  <span>-{order.currency} {(order.discountAmount / 100).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold pt-2 border-t">
                <span>Total</span>
                <span>{order.currency} {(order.totalAmount / 100).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Customer info */}
        <div className="space-y-6">
          <div className="border rounded-lg bg-card overflow-hidden">
            <div className="p-4 border-b bg-muted/30">
              <h2 className="font-semibold text-lg">Customer</h2>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Contact Email</h3>
                <p className="mt-1">{order.email}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Account Status</h3>
                {order.customer ? (
                  <p className="mt-1 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                    Registered Customer
                  </p>
                ) : (
                  <p className="mt-1 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-gray-400"></span>
                    Guest Order
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
