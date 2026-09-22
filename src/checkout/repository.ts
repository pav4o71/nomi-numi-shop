import { eq } from "drizzle-orm";
import { orders, orderItems } from "@/db/schema";
import { CheckoutDb, CheckoutExecutor } from "./db";

export class DrizzleCheckoutRepository {
  constructor(private readonly db: CheckoutDb) {}

  async transaction<T>(callback: (tx: CheckoutExecutor) => Promise<T>): Promise<T> {
    return this.db.transaction(callback);
  }

  async getOrderById(tx: CheckoutExecutor, orderId: string) {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId));
    return order ?? null;
  }

  async getOrderByIdForUpdate(tx: CheckoutExecutor, orderId: string) {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
    return order ?? null;
  }

  async getOrderItems(tx: CheckoutExecutor, orderId: string) {
    return tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  }

  async getOrderByIdempotencyKey(tx: CheckoutExecutor, idempotencyKey: string) {
    const [order] = await tx.select().from(orders).where(eq(orders.idempotencyKey, idempotencyKey));
    return order ?? null;
  }

  async createOrder(
    tx: CheckoutExecutor,
    orderData: typeof orders.$inferInsert,
    itemsData: (typeof orderItems.$inferInsert)[],
  ) {
    const [order] = await tx.insert(orders).values(orderData).returning();
    if (itemsData.length > 0) {
      await tx.insert(orderItems).values(itemsData);
    }
    return order;
  }

  async updateOrderStatus(
    tx: CheckoutExecutor,
    orderId: string,
    status: {
      orderStatus?: "pending" | "confirmed" | "cancelled" | "completed";
      paymentStatus?: "unpaid" | "pending" | "paid" | "failed" | "refunded";
      fulfillmentStatus?: "unfulfilled" | "processing" | "shipped" | "delivered" | "cancelled";
    },
  ) {
    const [updated] = await tx.update(orders).set(status).where(eq(orders.id, orderId)).returning();
    return updated;
  }
}
