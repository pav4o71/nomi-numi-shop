import { desc } from "drizzle-orm";
import Link from "next/link";
import { getRuntimeDb } from "@/db/runtime";
import { orders } from "@/db/schema";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const db = getRuntimeDb();
  
  // Fetch orders, ordered by newest first
  const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <p className="text-muted-foreground">Manage customer orders and fulfillment.</p>
        </div>
      </div>

      <div className="border rounded-lg p-0 bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Order ID</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Payment</th>
                <th className="px-4 py-3 font-medium">Fulfillment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {allOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No orders found.
                  </td>
                </tr>
              ) : (
                allOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 font-medium font-mono text-xs">
                      <Link href={`/admin/orders/${order.id}`} className="hover:underline text-primary">
                        {order.id}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">{order.email}</td>
                    <td className="px-4 py-3">
                      {order.currency} {(order.totalAmount / 100).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                          {
                            "bg-yellow-100 text-yellow-800": order.paymentStatus === "pending",
                            "bg-green-100 text-green-800": order.paymentStatus === "paid",
                            "bg-red-100 text-red-800": order.paymentStatus === "failed",
                            "bg-gray-100 text-gray-800": order.paymentStatus === "refunded",
                          }
                        )}
                      >
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                          {
                            "bg-yellow-100 text-yellow-800": order.fulfillmentStatus === "unfulfilled",
                            "bg-blue-100 text-blue-800": order.fulfillmentStatus === "processing",
                            "bg-purple-100 text-purple-800": order.fulfillmentStatus === "shipped",
                            "bg-green-100 text-green-800": order.fulfillmentStatus === "delivered",
                            "bg-red-100 text-red-800": order.fulfillmentStatus === "cancelled",
                          }
                        )}
                      >
                        {order.fulfillmentStatus}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
