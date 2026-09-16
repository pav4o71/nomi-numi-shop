/**
 * Phase 3A foundational catalog schema.
 *
 * Authoritative contract: docs/STORE_CATALOG.md (§16 conceptual model,
 * §17 Phase 3A scope). Auth tables stay in ./auth.ts.
 *
 * Intentionally deferred (not invented here):
 * - category parent_id hierarchy
 * - inventory_balances / movements / reservations
 * - active-variant option-combination uniqueness (service layer in 3B)
 * - admin catalog APIs, upload runtime
 */
import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
};

/** Singleton store configuration (exactly one logical row, id = 1). */
export const storeSettings = pgTable(
  "store_settings",
  {
    id: integer("id").primaryKey().default(1),
    storeName: text("store_name").notNull(),
    defaultLocale: text("default_locale").notNull().default("en"),
    phpEnabled: boolean("php_enabled").notNull().default(true),
    usdEnabled: boolean("usd_enabled").notNull().default(true),
    contactEmail: text("contact_email"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    ...timestamps,
  },
  (table) => [
    check("store_settings_singleton_chk", sql`${table.id} = 1`),
    check("store_settings_currency_enabled_chk", sql`${table.phpEnabled} OR ${table.usdEnabled}`),
  ],
);

/** Structural taxonomy (flat in Phase 3A; hierarchy deferred). */
export const categories = pgTable(
  "categories",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    position: integer("position").notNull().default(0),
    published: boolean("published").notNull().default(false),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [unique("categories_slug_uidx").on(table.slug)],
);

/** Merchandising / editorial groupings (separate from categories). */
export const collections = pgTable(
  "collections",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    position: integer("position").notNull().default(0),
    published: boolean("published").notNull().default(false),
    publishedFrom: timestamp("published_from", { withTimezone: true }),
    publishedUntil: timestamp("published_until", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    unique("collections_slug_uidx").on(table.slug),
    check(
      "collections_publish_window_chk",
      sql`${table.publishedUntil} IS NULL OR ${table.publishedFrom} IS NULL OR ${table.publishedUntil} > ${table.publishedFrom}`,
    ),
  ],
);

/**
 * Product parent aggregate. Price and inventory must not live here —
 * every sellable unit is a variant.
 */
export const products = pgTable(
  "products",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status").notNull().default("draft"),
    position: integer("position").notNull().default(0),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    unique("products_slug_uidx").on(table.slug),
    check("products_status_chk", sql`${table.status} IN ('draft', 'published', 'archived')`),
  ],
);

export const productCategories = pgTable(
  "product_categories",
  {
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    position: integer("position").notNull().default(0),
    isPrimary: boolean("is_primary").notNull().default(false),
  },
  (table) => [
    unique("product_categories_product_category_uidx").on(table.productId, table.categoryId),
  ],
);

export const collectionProducts = pgTable(
  "collection_products",
  {
    collectionId: text("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
  },
  (table) => [
    unique("collection_products_collection_product_uidx").on(table.collectionId, table.productId),
  ],
);

/**
 * Variant-level inventory balance tracking.
 */
export const inventoryBalances = pgTable(
  "inventory_balances",
  {
    variantId: text("variant_id")
      .primaryKey()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    onHand: integer("on_hand").notNull().default(0),
    reserved: integer("reserved").notNull().default(0),
    ...timestamps,
  },
  (table) => [
    check("inventory_balances_on_hand_nonneg_chk", sql`${table.onHand} >= 0`),
    check("inventory_balances_reserved_nonneg_chk", sql`${table.reserved} >= 0`),
    check("inventory_balances_reserved_lte_on_hand_chk", sql`${table.reserved} <= ${table.onHand}`),
  ],
);

/**
 * Immutable ledger of inventory movements.
 */
export const inventoryMovements = pgTable("inventory_movements", {
  id: text("id").primaryKey(),
  variantId: text("variant_id")
    .notNull()
    .references(() => productVariants.id, { onDelete: "cascade" }),
  delta: integer("delta").notNull(),
  reason: text("reason").notNull(),
  sourceReference: text("source_reference"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const productOptions = pgTable(
  "product_options",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: integer("position").notNull().default(0),
    ...timestamps,
  },
  (table) => [
    unique("product_options_product_name_uidx").on(table.productId, table.name),
    unique("product_options_id_product_uidx").on(table.id, table.productId),
  ],
);

export const productOptionValues = pgTable(
  "product_option_values",
  {
    id: text("id").primaryKey(),
    optionId: text("option_id")
      .notNull()
      .references(() => productOptions.id, { onDelete: "cascade" }),
    value: text("value").notNull(),
    position: integer("position").notNull().default(0),
    ...timestamps,
  },
  (table) => [
    unique("product_option_values_option_value_uidx").on(table.optionId, table.value),
    unique("product_option_values_id_option_uidx").on(table.id, table.optionId),
  ],
);

/** Sellable SKU unit. Store-wide unique SKU. */
export const productVariants = pgTable(
  "product_variants",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sku: text("sku").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    weightGrams: integer("weight_grams"),
    lengthMm: integer("length_mm"),
    widthMm: integer("width_mm"),
    heightMm: integer("height_mm"),
    fulfillmentHint: text("fulfillment_hint"),
    ...timestamps,
  },
  (table) => [
    unique("product_variants_sku_uidx").on(table.sku),
    unique("product_variants_id_product_uidx").on(table.id, table.productId),
    check(
      "product_variants_weight_nonneg_chk",
      sql`${table.weightGrams} IS NULL OR ${table.weightGrams} >= 0`,
    ),
    check(
      "product_variants_dimensions_nonneg_chk",
      sql`(${table.lengthMm} IS NULL OR ${table.lengthMm} >= 0)
        AND (${table.widthMm} IS NULL OR ${table.widthMm} >= 0)
        AND (${table.heightMm} IS NULL OR ${table.heightMm} >= 0)`,
    ),
  ],
);

/**
 * Binds a variant to one value per option.
 * Composite FKs keep option_value ownership on the declared option, and
 * keep variant + option on the same product.
 */
export const productVariantOptionValues = pgTable(
  "product_variant_option_values",
  {
    id: text("id").primaryKey(),
    productId: text("product_id").notNull(),
    variantId: text("variant_id").notNull(),
    optionId: text("option_id").notNull(),
    optionValueId: text("option_value_id").notNull(),
  },
  (table) => [
    unique("product_variant_option_values_variant_option_uidx").on(table.variantId, table.optionId),
    unique("product_variant_option_values_variant_value_uidx").on(
      table.variantId,
      table.optionValueId,
    ),
    foreignKey({
      name: "product_variant_option_values_variant_product_fk",
      columns: [table.variantId, table.productId],
      foreignColumns: [productVariants.id, productVariants.productId],
    }).onDelete("cascade"),
    foreignKey({
      name: "product_variant_option_values_option_product_fk",
      columns: [table.optionId, table.productId],
      foreignColumns: [productOptions.id, productOptions.productId],
    }).onDelete("cascade"),
    foreignKey({
      name: "product_variant_option_values_value_option_fk",
      columns: [table.optionValueId, table.optionId],
      foreignColumns: [productOptionValues.id, productOptionValues.optionId],
    }).onDelete("cascade"),
  ],
);

/** Explicit per-currency catalog prices (integer minor units only). */
export const variantPrices = pgTable(
  "variant_prices",
  {
    id: text("id").primaryKey(),
    variantId: text("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    currency: text("currency").notNull(),
    amountMinor: integer("amount_minor").notNull(),
    compareAtAmountMinor: integer("compare_at_amount_minor"),
    ...timestamps,
  },
  (table) => [
    unique("variant_prices_variant_currency_uidx").on(table.variantId, table.currency),
    check("variant_prices_currency_chk", sql`${table.currency} IN ('PHP', 'USD')`),
    check("variant_prices_amount_positive_chk", sql`${table.amountMinor} > 0`),
    check(
      "variant_prices_compare_at_chk",
      sql`${table.compareAtAmountMinor} IS NULL OR ${table.compareAtAmountMinor} > ${table.amountMinor}`,
    ),
  ],
);

/**
 * Public product/variant imagery metadata.
 * Primary image convention: lowest `position` wins (no is_primary flag).
 * Composite variant FK enforces variant belongs to the same product.
 */
export const productMedia = pgTable(
  "product_media",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    variantId: text("variant_id"),
    storageKey: text("storage_key").notNull(),
    provider: text("provider").notNull().default("local"),
    altText: text("alt_text"),
    position: integer("position").notNull().default(0),
    contentType: text("content_type"),
    byteSize: integer("byte_size"),
    ...timestamps,
  },
  (table) => [
    check("product_media_provider_chk", sql`${table.provider} IN ('local')`),
    check(
      "product_media_byte_size_nonneg_chk",
      sql`${table.byteSize} IS NULL OR ${table.byteSize} >= 0`,
    ),
    foreignKey({
      name: "product_media_variant_product_fk",
      columns: [table.variantId, table.productId],
      foreignColumns: [productVariants.id, productVariants.productId],
    }).onDelete("cascade"),
  ],
);

export const storeSettingsRelations = relations(storeSettings, () => ({}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  productCategories: many(productCategories),
}));

export const collectionsRelations = relations(collections, ({ many }) => ({
  collectionProducts: many(collectionProducts),
}));

export const productsRelations = relations(products, ({ many }) => ({
  productCategories: many(productCategories),
  collectionProducts: many(collectionProducts),
  options: many(productOptions),
  variants: many(productVariants),
  media: many(productMedia),
}));

export const productCategoriesRelations = relations(productCategories, ({ one }) => ({
  product: one(products, {
    fields: [productCategories.productId],
    references: [products.id],
  }),
  category: one(categories, {
    fields: [productCategories.categoryId],
    references: [categories.id],
  }),
}));

export const collectionProductsRelations = relations(collectionProducts, ({ one }) => ({
  collection: one(collections, {
    fields: [collectionProducts.collectionId],
    references: [collections.id],
  }),
  product: one(products, {
    fields: [collectionProducts.productId],
    references: [products.id],
  }),
}));

export const productOptionsRelations = relations(productOptions, ({ one, many }) => ({
  product: one(products, {
    fields: [productOptions.productId],
    references: [products.id],
  }),
  values: many(productOptionValues),
}));

export const productOptionValuesRelations = relations(productOptionValues, ({ one, many }) => ({
  option: one(productOptions, {
    fields: [productOptionValues.optionId],
    references: [productOptions.id],
  }),
  variantLinks: many(productVariantOptionValues),
}));

export const productVariantsRelations = relations(productVariants, ({ one, many }) => ({
  product: one(products, {
    fields: [productVariants.productId],
    references: [products.id],
  }),
  optionValues: many(productVariantOptionValues),
  prices: many(variantPrices),
  media: many(productMedia),
  inventoryBalance: one(inventoryBalances, {
    fields: [productVariants.id],
    references: [inventoryBalances.variantId],
  }),
  inventoryMovements: many(inventoryMovements),
}));

export const productVariantOptionValuesRelations = relations(
  productVariantOptionValues,
  ({ one }) => ({
    product: one(products, {
      fields: [productVariantOptionValues.productId],
      references: [products.id],
    }),
    variant: one(productVariants, {
      fields: [productVariantOptionValues.variantId],
      references: [productVariants.id],
    }),
    option: one(productOptions, {
      fields: [productVariantOptionValues.optionId],
      references: [productOptions.id],
    }),
    optionValue: one(productOptionValues, {
      fields: [productVariantOptionValues.optionValueId],
      references: [productOptionValues.id],
    }),
  }),
);

export const variantPricesRelations = relations(variantPrices, ({ one }) => ({
  variant: one(productVariants, {
    fields: [variantPrices.variantId],
    references: [productVariants.id],
  }),
}));

export const inventoryBalancesRelations = relations(inventoryBalances, ({ one }) => ({
  variant: one(productVariants, {
    fields: [inventoryBalances.variantId],
    references: [productVariants.id],
  }),
}));

export const inventoryMovementsRelations = relations(inventoryMovements, ({ one }) => ({
  variant: one(productVariants, {
    fields: [inventoryMovements.variantId],
    references: [productVariants.id],
  }),
}));

export const productMediaRelations = relations(productMedia, ({ one }) => ({
  product: one(products, {
    fields: [productMedia.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [productMedia.variantId],
    references: [productVariants.id],
  }),
}));
