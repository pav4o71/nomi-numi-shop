import { sql } from "drizzle-orm";
import { boolean, check, index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const promotions = pgTable(
  "promotions",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull(),
    type: text("type", { enum: ["percentage", "fixed_amount"] }).notNull(),
    value: integer("value").notNull(), // Percentage (0-100) or fixed amount in minor units
    currency: text("currency"), // Required only if fixed_amount
    minSpend: integer("min_spend"), // Minor units
    maxUses: integer("max_uses"),
    currentUses: integer("current_uses").default(0).notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("promotions_code_uidx").on(table.code),
    index("promotions_active_idx").on(table.active),
    check("promotions_value_chk", sql`${table.value} > 0`),
    check(
      "promotions_currency_chk",
      sql`(${table.type} = 'fixed_amount' AND ${table.currency} IS NOT NULL) OR (${table.type} = 'percentage')`
    ),
  ]
);
