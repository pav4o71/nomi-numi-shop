import { relations, sql } from "drizzle-orm";
import { boolean, check, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { productVariants } from "./catalog";

export const customerAddresses = pgTable(
  "customer_addresses",
  {
    id: text("id").primaryKey(),
    customerId: text("customer_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: text("type", { enum: ["billing", "shipping"] }).notNull(),
    name: text("name").notNull(),
    street: text("street").notNull(),
    city: text("city").notNull(),
    postalCode: text("postal_code").notNull(),
    country: text("country").notNull(),
    isDefault: boolean("is_default").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    check("customer_addresses_type_chk", sql`${table.type} IN ('billing', 'shipping')`),
    uniqueIndex("customer_addresses_one_default_uidx")
      .on(table.customerId, table.type)
      .where(sql`${table.isDefault} = true`),
  ],
);

export const customerAddressesRelations = relations(customerAddresses, ({ one }) => ({
  customer: one(user, {
    fields: [customerAddresses.customerId],
    references: [user.id],
  }),
}));

export const wishlists = pgTable(
  "wishlists",
  {
    id: text("id").primaryKey(),
    customerId: text("customer_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    variantId: text("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    customerVariantUnique: uniqueIndex("wishlists_customer_variant_idx").on(
      t.customerId,
      t.variantId,
    ),
  }),
);

export const wishlistsRelations = relations(wishlists, ({ one }) => ({
  customer: one(user, {
    fields: [wishlists.customerId],
    references: [user.id],
  }),
  variant: one(productVariants, {
    fields: [wishlists.variantId],
    references: [productVariants.id],
  }),
}));
