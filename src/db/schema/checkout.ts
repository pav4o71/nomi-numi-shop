import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, integer, uniqueIndex, index } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { productVariants, products } from "./catalog";

export const carts = pgTable(
  "carts",
  {
    id: text("id").primaryKey(),
    customerId: text("customer_id").references(() => user.id, { onDelete: "cascade" }),
    sessionId: text("session_id"),
    currency: text("currency").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (t) => ({
    customerIdx: index("carts_customer_idx").on(t.customerId),
    sessionIdx: uniqueIndex("carts_session_idx").on(t.sessionId),
  }),
);

export const cartsRelations = relations(carts, ({ one, many }) => ({
  customer: one(user, {
    fields: [carts.customerId],
    references: [user.id],
  }),
  items: many(cartItems),
}));

export const cartItems = pgTable(
  "cart_items",
  {
    id: text("id").primaryKey(),
    cartId: text("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    variantId: text("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull(),
    addedAt: timestamp("added_at").defaultNow().notNull(),
  },
  (t) => ({
    cartVariantUnique: uniqueIndex("cart_items_cart_variant_idx").on(t.cartId, t.variantId),
  }),
);

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, {
    fields: [cartItems.cartId],
    references: [carts.id],
  }),
  variant: one(productVariants, {
    fields: [cartItems.variantId],
    references: [productVariants.id],
  }),
}));

export const orders = pgTable("orders", {
  id: text("id").primaryKey(),
  customerId: text("customer_id").references(() => user.id, { onDelete: "set null" }),
  email: text("email").notNull(),
  currency: text("currency").notNull(),
  orderStatus: text("order_status", { enum: ["pending", "confirmed", "cancelled", "completed"] })
    .default("pending")
    .notNull(),
  paymentStatus: text("payment_status", {
    enum: ["unpaid", "pending", "paid", "failed", "refunded"],
  })
    .default("unpaid")
    .notNull(),
  fulfillmentStatus: text("fulfillment_status", {
    enum: ["unfulfilled", "processing", "shipped", "delivered", "cancelled"],
  })
    .default("unfulfilled")
    .notNull(),
  totalAmount: integer("total_amount").notNull(),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(user, {
    fields: [orders.customerId],
    references: [user.id],
  }),
  items: many(orderItems),
}));

export const orderItems = pgTable("order_items", {
  id: text("id").primaryKey(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  variantId: text("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
  productId: text("product_id").references(() => products.id, { onDelete: "set null" }),
  sku: text("sku"),
  title: text("title").notNull(),
  unitPrice: integer("unit_price").notNull(),
  quantity: integer("quantity").notNull(),
});

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  variant: one(productVariants, {
    fields: [orderItems.variantId],
    references: [productVariants.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));
