import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import {
  guestOrderAccessCapabilities,
  inventoryReservations,
  orders,
  orderItems,
  paymentEvents,
} from "@/db/schema";
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

  async lockIdempotencyKey(tx: CheckoutExecutor, scope: string, key: string) {
    const lockIdentity = JSON.stringify([scope, key]);
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${lockIdentity}, 0))`);
  }

  async getOrderByIdempotencyKey(tx: CheckoutExecutor, scope: string, key: string) {
    const [order] = await tx
      .select()
      .from(orders)
      .where(and(eq(orders.idempotencyScope, scope), eq(orders.idempotencyKey, key)));
    return order ?? null;
  }

  async insertGuestAccessCapability(tx: CheckoutExecutor, orderId: string, tokenDigest: string) {
    await tx.insert(guestOrderAccessCapabilities).values({ orderId, tokenDigest });
  }

  async hasGuestAccessCapability(
    tx: CheckoutExecutor,
    orderId: string,
    tokenDigest: string,
  ): Promise<boolean> {
    const [capability] = await tx
      .select({ tokenDigest: guestOrderAccessCapabilities.tokenDigest })
      .from(guestOrderAccessCapabilities)
      .where(
        and(
          eq(guestOrderAccessCapabilities.orderId, orderId),
          eq(guestOrderAccessCapabilities.tokenDigest, tokenDigest),
        ),
      )
      .limit(1);
    return Boolean(capability);
  }

  async listOrdersForCustomer(tx: CheckoutExecutor, customerId: string) {
    return tx
      .select()
      .from(orders)
      .where(eq(orders.customerId, customerId))
      .orderBy(desc(orders.createdAt));
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

  async createReservations(
    tx: CheckoutExecutor,
    rows: (typeof inventoryReservations.$inferInsert)[],
  ) {
    if (rows.length > 0) await tx.insert(inventoryReservations).values(rows);
  }

  async getReservationsForOrderForUpdate(tx: CheckoutExecutor, orderId: string) {
    return tx
      .select()
      .from(inventoryReservations)
      .where(eq(inventoryReservations.orderId, orderId))
      .for("update");
  }

  async listExpiredReservationOrderIds(tx: CheckoutExecutor, now: Date) {
    return tx
      .selectDistinct({ orderId: inventoryReservations.orderId })
      .from(inventoryReservations)
      .where(
        and(eq(inventoryReservations.status, "active"), lt(inventoryReservations.expiresAt, now)),
      );
  }

  async updateReservationStatus(
    tx: CheckoutExecutor,
    reservationIds: string[],
    status: "committed" | "released" | "expired",
  ) {
    if (reservationIds.length === 0) return;
    await tx
      .update(inventoryReservations)
      .set({ status })
      .where(inArray(inventoryReservations.id, reservationIds));
  }

  async insertPaymentEvent(
    tx: CheckoutExecutor,
    row: typeof paymentEvents.$inferInsert,
  ): Promise<boolean> {
    const inserted = await tx.insert(paymentEvents).values(row).onConflictDoNothing().returning();
    return inserted.length === 1;
  }

  async updateOrderStatus(
    tx: CheckoutExecutor,
    orderId: string,
    status: {
      orderStatus?: "pending" | "confirmed" | "cancelled" | "completed";
      paymentStatus?: "pending" | "paid" | "failed" | "refunded";
      fulfillmentStatus?: "unfulfilled" | "processing" | "shipped" | "delivered" | "cancelled";
    },
  ) {
    const [updated] = await tx.update(orders).set(status).where(eq(orders.id, orderId)).returning();
    return updated;
  }
}
