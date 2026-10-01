import { and, desc, eq, or } from "drizzle-orm";
import { getRuntimeDb } from "@/db/runtime";
import { orderItems, orders, productReviews } from "@/db/schema";
import type { CreateReviewInput, ReviewStatus } from "./schema";

export async function getReviewsForProduct(productId: string, status?: ReviewStatus) {
  const db = getRuntimeDb();
  const baseQuery = db
    .select()
    .from(productReviews)
    .where(eq(productReviews.productId, productId))
    .orderBy(desc(productReviews.createdAt));

  // The types returned from the query builder change when applying where clauses.
  // Instead of reassigning `baseQuery`, we conditionally await it.
  if (status) {
    return await db
      .select()
      .from(productReviews)
      .where(and(eq(productReviews.productId, productId), eq(productReviews.status, status)))
      .orderBy(desc(productReviews.createdAt));
  }

  return await baseQuery;
}

export async function getReviewsByCustomer(customerId: string) {
  const db = getRuntimeDb();
  return await db
    .select()
    .from(productReviews)
    .where(eq(productReviews.customerId, customerId))
    .orderBy(desc(productReviews.createdAt));
}

export async function getAllReviews() {
  const db = getRuntimeDb();
  return await db
    .select()
    .from(productReviews)
    .orderBy(desc(productReviews.createdAt));
}

export async function getReviewByCustomerAndProduct(customerId: string, productId: string) {
  const db = getRuntimeDb();
  const rows = await db
    .select()
    .from(productReviews)
    .where(and(eq(productReviews.customerId, customerId), eq(productReviews.productId, productId)))
    .limit(1);
  return rows[0] || null;
}

export async function hasVerifiedPurchase(customerId: string, productId: string) {
  const db = getRuntimeDb();
  const rows = await db
    .select({ id: orders.id })
    .from(orders)
    .innerJoin(orderItems, eq(orders.id, orderItems.orderId))
    .where(
      and(
        eq(orders.customerId, customerId),
        eq(orderItems.productId, productId),
        or(eq(orders.paymentStatus, "paid"), eq(orders.orderStatus, "completed"))
      )
    )
    .limit(1);

  return rows.length > 0;
}

export async function createReview(
  id: string,
  customerId: string,
  data: CreateReviewInput,
  status: ReviewStatus = "pending"
) {
  const db = getRuntimeDb();
  const rows = await db
    .insert(productReviews)
    .values({
      id,
      customerId,
      productId: data.productId,
      variantId: data.variantId || null,
      rating: data.rating,
      title: data.title,
      content: data.content,
      status,
    })
    .returning();
  return rows[0]!;
}

export async function updateReviewStatus(id: string, status: ReviewStatus) {
  const db = getRuntimeDb();
  const rows = await db
    .update(productReviews)
    .set({ status })
    .where(eq(productReviews.id, id))
    .returning();
  return rows[0] || null;
}
