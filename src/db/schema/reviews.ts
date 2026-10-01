import { relations, sql } from "drizzle-orm";
import { check, integer, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { productVariants, products } from "./catalog";

export const productReviews = pgTable(
  "product_reviews",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    variantId: text("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
    customerId: text("customer_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    status: text("status", { enum: ["pending", "published", "rejected"] })
      .default("pending")
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    unique("product_reviews_product_customer_uidx").on(table.productId, table.customerId),
    check("product_reviews_rating_chk", sql`${table.rating} >= 1 AND ${table.rating} <= 5`),
    check(
      "product_reviews_status_chk",
      sql`${table.status} IN ('pending', 'published', 'rejected')`,
    ),
  ],
);

export const productReviewsRelations = relations(productReviews, ({ one }) => ({
  product: one(products, {
    fields: [productReviews.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [productReviews.variantId],
    references: [productVariants.id],
  }),
  customer: one(user, {
    fields: [productReviews.customerId],
    references: [user.id],
  }),
}));
