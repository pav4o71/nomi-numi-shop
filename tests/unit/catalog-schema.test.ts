/**
 * Portable Phase 3A catalog schema contract checks (no live database).
 * Live constraint enforcement lives in catalog-schema-local.test.ts.
 */
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import * as schema from "../../src/db/schema";

const migrationSql = readFileSync(
  new URL("../../drizzle/0003_phase3a_catalog_schema.sql", import.meta.url),
  "utf8",
);

describe("Phase 3A catalog schema portable contracts", () => {
  it("exports catalog tables alongside inventory tables without commerce runtime tables", () => {
    expect(schema.storeSettings).toBeDefined();
    expect(schema.categories).toBeDefined();
    expect(schema.collections).toBeDefined();
    expect(schema.products).toBeDefined();
    expect(schema.productCategories).toBeDefined();
    expect(schema.collectionProducts).toBeDefined();
    expect(schema.productOptions).toBeDefined();
    expect(schema.productOptionValues).toBeDefined();
    expect(schema.productVariants).toBeDefined();
    expect(schema.productVariantOptionValues).toBeDefined();
    expect(schema.variantPrices).toBeDefined();
    expect(schema.productMedia).toBeDefined();
    expect(schema.inventoryBalances).toBeDefined();
    expect(schema.inventoryMovements).toBeDefined();

    const exported = Object.keys(schema);
    expect(exported).not.toContain("inventoryReservations");
    expect(exported).not.toContain("orders");
    expect(exported).not.toContain("carts");
  });

  it("keeps auth schema exports available alongside catalog", () => {
    expect(schema.user).toBeDefined();
    expect(schema.session).toBeDefined();
    expect(schema.account).toBeDefined();
    expect(schema.verification).toBeDefined();
  });

  it("encodes money, currency, uniqueness, and ownership constraints in SQL", () => {
    expect(migrationSql).toContain('CONSTRAINT "products_slug_uidx" UNIQUE("slug")');
    expect(migrationSql).toContain('CONSTRAINT "categories_slug_uidx" UNIQUE("slug")');
    expect(migrationSql).toContain('CONSTRAINT "collections_slug_uidx" UNIQUE("slug")');
    expect(migrationSql).toContain('CONSTRAINT "product_variants_sku_uidx" UNIQUE("sku")');
    expect(migrationSql).toContain(
      'CONSTRAINT "product_categories_product_category_uidx" UNIQUE("product_id","category_id")',
    );
    expect(migrationSql).toContain(
      'CONSTRAINT "collection_products_collection_product_uidx" UNIQUE("collection_id","product_id")',
    );
    expect(migrationSql).toContain(
      'CONSTRAINT "product_options_product_name_uidx" UNIQUE("product_id","name")',
    );
    expect(migrationSql).toContain(
      'CONSTRAINT "product_option_values_option_value_uidx" UNIQUE("option_id","value")',
    );
    expect(migrationSql).toContain(
      'CONSTRAINT "variant_prices_variant_currency_uidx" UNIQUE("variant_id","currency")',
    );
    expect(migrationSql).toContain(
      `CONSTRAINT "variant_prices_currency_chk" CHECK ("variant_prices"."currency" IN ('PHP', 'USD'))`,
    );
    expect(migrationSql).toContain(
      'CONSTRAINT "variant_prices_amount_positive_chk" CHECK ("variant_prices"."amount_minor" > 0)',
    );
    expect(migrationSql).toContain("variant_prices_compare_at_chk");
    expect(migrationSql).toContain("product_media_variant_product_fk");
    expect(migrationSql).toContain("product_variant_option_values_value_option_fk");
    expect(migrationSql).toContain("product_variant_option_values_option_product_fk");
    expect(migrationSql).toContain("ON DELETE restrict");
    expect(migrationSql).not.toMatch(/parent_id/i);
    expect(migrationSql).not.toMatch(/inventory_/i);
  });
});
