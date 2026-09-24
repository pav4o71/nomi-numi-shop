import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";
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
  (table) => [
    uniqueIndex("carts_customer_uidx")
      .on(table.customerId)
      .where(sql`${table.customerId} IS NOT NULL`),
    uniqueIndex("carts_session_uidx")
      .on(table.sessionId)
      .where(sql`${table.sessionId} IS NOT NULL`),
    index("carts_expires_at_idx").on(table.expiresAt),
    check(
      "carts_exactly_one_owner_chk",
      sql`(${table.customerId} IS NOT NULL) <> (${table.sessionId} IS NOT NULL)`,
    ),
    check("carts_currency_chk", sql`${table.currency} IN ('PHP', 'USD')`),
  ],
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
  (table) => [
    unique("cart_items_cart_variant_uidx").on(table.cartId, table.variantId),
    check("cart_items_quantity_positive_chk", sql`${table.quantity} > 0`),
  ],
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

export const orders = pgTable(
  "orders",
  {
    id: text("id").primaryKey(),
    customerId: text("customer_id").references(() => user.id, { onDelete: "set null" }),
    email: text("email").notNull(),
    currency: text("currency").notNull(),
    orderStatus: text("order_status", {
      enum: ["pending", "confirmed", "cancelled", "completed"],
    })
      .default("pending")
      .notNull(),
    paymentStatus: text("payment_status", {
      enum: ["pending", "paid", "failed", "refunded"],
    })
      .default("pending")
      .notNull(),
    fulfillmentStatus: text("fulfillment_status", {
      enum: ["unfulfilled", "processing", "shipped", "delivered", "cancelled"],
    })
      .default("unfulfilled")
      .notNull(),
    subtotalAmount: integer("subtotal_amount").notNull(),
    shippingAmount: integer("shipping_amount").default(0).notNull(),
    taxAmount: integer("tax_amount").default(0).notNull(),
    totalAmount: integer("total_amount").notNull(),
    idempotencyScope: text("idempotency_scope").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    requestFingerprint: text("request_fingerprint").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    unique("orders_idempotency_scope_key_uidx").on(table.idempotencyScope, table.idempotencyKey),
    index("orders_customer_created_idx").on(table.customerId, table.createdAt),
    check("orders_currency_chk", sql`${table.currency} IN ('PHP', 'USD')`),
    check(
      "orders_order_status_chk",
      sql`${table.orderStatus} IN ('pending', 'confirmed', 'cancelled', 'completed')`,
    ),
    check(
      "orders_payment_status_chk",
      sql`${table.paymentStatus} IN ('pending', 'paid', 'failed', 'refunded')`,
    ),
    check(
      "orders_fulfillment_status_chk",
      sql`${table.fulfillmentStatus} IN ('unfulfilled', 'processing', 'shipped', 'delivered', 'cancelled')`,
    ),
    check("orders_subtotal_nonneg_chk", sql`${table.subtotalAmount} >= 0`),
    check("orders_shipping_nonneg_chk", sql`${table.shippingAmount} >= 0`),
    check("orders_tax_nonneg_chk", sql`${table.taxAmount} >= 0`),
    check("orders_total_nonneg_chk", sql`${table.totalAmount} >= 0`),
    check(
      "orders_total_sum_chk",
      sql`${table.totalAmount} = ${table.subtotalAmount} + ${table.shippingAmount} + ${table.taxAmount}`,
    ),
  ],
);

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(user, {
    fields: [orders.customerId],
    references: [user.id],
  }),
  items: many(orderItems),
  guestAccessCapabilities: many(guestOrderAccessCapabilities),
}));

export const guestOrderAccessCapabilities = pgTable(
  "guest_order_access_capabilities",
  {
    tokenDigest: text("token_digest").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("guest_order_access_capabilities_order_idx").on(table.orderId)],
);

export const guestOrderAccessCapabilitiesRelations = relations(
  guestOrderAccessCapabilities,
  ({ one }) => ({
    order: one(orders, {
      fields: [guestOrderAccessCapabilities.orderId],
      references: [orders.id],
    }),
  }),
);

export type OrderItemOptionSnapshot = { name: string; value: string };

export const orderItems = pgTable(
  "order_items",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    variantId: text("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
    productId: text("product_id").references(() => products.id, { onDelete: "set null" }),
    sku: text("sku"),
    title: text("title").notNull(),
    selectedOptions: jsonb("selected_options")
      .$type<OrderItemOptionSnapshot[]>()
      .default(sql`'[]'::jsonb`)
      .notNull(),
    unitPrice: integer("unit_price").notNull(),
    quantity: integer("quantity").notNull(),
    lineTotal: integer("line_total").notNull(),
  },
  (table) => [
    check("order_items_unit_price_nonneg_chk", sql`${table.unitPrice} >= 0`),
    check("order_items_quantity_positive_chk", sql`${table.quantity} > 0`),
    check("order_items_line_total_nonneg_chk", sql`${table.lineTotal} >= 0`),
    check(
      "order_items_line_total_sum_chk",
      sql`${table.lineTotal} = ${table.unitPrice} * ${table.quantity}`,
    ),
  ],
);

export const inventoryReservations = pgTable(
  "inventory_reservations",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    variantId: text("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull(),
    status: text("status", { enum: ["active", "committed", "released", "expired"] })
      .default("active")
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    unique("inventory_reservations_order_variant_uidx").on(table.orderId, table.variantId),
    index("inventory_reservations_active_expiry_idx").on(table.status, table.expiresAt),
    check("inventory_reservations_quantity_positive_chk", sql`${table.quantity} > 0`),
    check(
      "inventory_reservations_status_chk",
      sql`${table.status} IN ('active', 'committed', 'released', 'expired')`,
    ),
  ],
);

export const paymentEvents = pgTable(
  "payment_events",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    provider: text("provider").notNull(),
    providerEventId: text("provider_event_id").notNull(),
    status: text("status", { enum: ["paid", "failed"] }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("payment_events_provider_event_uidx").on(table.provider, table.providerEventId),
    index("payment_events_order_idx").on(table.orderId),
    check("payment_events_provider_chk", sql`${table.provider} IN ('mock')`),
    check("payment_events_status_chk", sql`${table.status} IN ('paid', 'failed')`),
  ],
);

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

export const inventoryReservationsRelations = relations(inventoryReservations, ({ one }) => ({
  order: one(orders, {
    fields: [inventoryReservations.orderId],
    references: [orders.id],
  }),
  variant: one(productVariants, {
    fields: [inventoryReservations.variantId],
    references: [productVariants.id],
  }),
}));

export const paymentEventsRelations = relations(paymentEvents, ({ one }) => ({
  order: one(orders, {
    fields: [paymentEvents.orderId],
    references: [orders.id],
  }),
}));
