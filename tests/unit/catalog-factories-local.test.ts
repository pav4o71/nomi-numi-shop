/**
 * Path-locked / TEST-DB Phase 3C catalog factory coverage.
 * Excluded from portable `pnpm test:ci`.
 */
import { randomUUID } from "node:crypto";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { CatalogError, CatalogService, DrizzleCatalogRepository } from "@/catalog";
import { DEV_FIXTURE_SKU_PREFIX, DEV_FIXTURE_SLUG_PREFIX } from "@/catalog/fixtures";
import * as schema from "@/db/schema";
import {
  EXPECTED_ROOT,
  PROTECTED_HOST_PORT,
  loadValidatedCredentials,
} from "../../scripts/drizzle-credentials.mjs";
import {
  assignTestCollections,
  assignTestPrimaryCategory,
  createTestActiveVariant,
  createTestCategory,
  createTestCollection,
  createTestDefaultVariantProduct,
  createTestInactiveVariant,
  createTestOptionProduct,
  createTestProduct,
  setTestCompareAtPrices,
  setTestVariantPrices,
} from "../support/catalog-factories";

const credentials = loadValidatedCredentials("test");

describe("Phase 3C catalog factories against TEST database", () => {
  let sql: ReturnType<typeof postgres>;
  let service: CatalogService;

  beforeAll(async () => {
    expect(EXPECTED_ROOT).toBe("/home/pav4o71/Projects/nomi-numi-shop");
    expect(credentials.database).toBe("nomi_numi_shop_test");
    expect(credentials.port).toBe(55433);
    expect(String(credentials.port)).not.toBe(PROTECTED_HOST_PORT);

    sql = postgres({
      host: credentials.host,
      port: credentials.port,
      database: credentials.database,
      username: credentials.user,
      password: credentials.password,
      max: 5,
      idle_timeout: 5,
      connect_timeout: 10,
      prepare: false,
    });

    const identity = await sql`
      SELECT current_database() AS database_name, current_user AS database_user
    `;
    expect(identity[0]?.database_name).toBe("nomi_numi_shop_test");
    expect(identity[0]?.database_user).toBe("nomi_numi_test");

    const db = drizzle(sql, { schema });
    service = new CatalogService(new DrizzleCatalogRepository(db));
  });

  afterAll(async () => {
    await sql.end({ timeout: 5 });
  });

  beforeEach(async () => {
    await sql`DELETE FROM product_media`;
    await sql`DELETE FROM variant_prices`;
    await sql`DELETE FROM product_variant_option_values`;
    await sql`DELETE FROM product_option_values`;
    await sql`DELETE FROM product_options`;
    await sql`DELETE FROM product_variants`;
    await sql`DELETE FROM product_categories`;
    await sql`DELETE FROM collection_products`;
    await sql`DELETE FROM products`;
    await sql`DELETE FROM categories`;
    await sql`DELETE FROM collections`;
  });

  it("creates default-variant and option-based products with prices and memberships", async () => {
    const ctx = { service };
    const category = await createTestCategory(ctx, { name: "Factory Cat" });
    const collection = await createTestCollection(ctx, { name: "Factory Col" });

    const defaults = await createTestDefaultVariantProduct(ctx, {
      product: { title: "Factory Default" },
    });
    expect(defaults.product.title).toBe("Factory Default");
    expect(defaults.variant.isActive).toBe(true);
    expect(defaults.prices).toHaveLength(2);
    expect(defaults.product.slug.startsWith(DEV_FIXTURE_SLUG_PREFIX)).toBe(false);
    expect(defaults.variant.sku.startsWith(DEV_FIXTURE_SKU_PREFIX)).toBe(false);

    await assignTestPrimaryCategory(ctx, defaults.product.id, category.id);
    await assignTestCollections(ctx, defaults.product.id, [collection.id]);

    const optioned = await createTestOptionProduct(ctx);
    expect(optioned.options).toHaveLength(1);
    const size = optioned.options[0]!;
    const small = size.values[0]!;
    const medium = size.values[1]!;

    const active = await createTestActiveVariant(ctx, optioned.product.id, {
      sku: `FACT-ACTIVE-${randomUUID()}`,
      optionSelections: [{ optionId: size.id, optionValueId: small.id }],
      prices: [
        { currency: "PHP", amountMinor: 1111 },
        { currency: "USD", amountMinor: 222 },
      ],
    });
    expect(active.variant.isActive).toBe(true);

    const inactive = await createTestInactiveVariant(ctx, optioned.product.id, {
      sku: `FACT-INACTIVE-${randomUUID()}`,
      optionSelections: [{ optionId: size.id, optionValueId: medium.id }],
    });
    expect(inactive.variant.isActive).toBe(false);

    const compareAt = await setTestCompareAtPrices(ctx, active.variant.id);
    expect(
      compareAt.every(
        (price) =>
          price.compareAtAmountMinor != null && price.compareAtAmountMinor > price.amountMinor,
      ),
    ).toBe(true);

    const phpUsd = await setTestVariantPrices(ctx, inactive.variant.id);
    expect(phpUsd.map((price) => price.currency).sort()).toEqual(["PHP", "USD"]);
  });

  it("applies overrides and still fails invalid input through CatalogService", async () => {
    const ctx = { service };
    const product = await createTestProduct(ctx, {
      slug: `override-${randomUUID()}`,
      status: "published",
    });
    expect(product.status).toBe("published");

    await expect(
      createTestActiveVariant(ctx, product.id, {
        sku: `BAD-${randomUUID()}`,
        prices: [{ currency: "USD", amountMinor: 0 }],
      }),
    ).rejects.toBeInstanceOf(CatalogError);

    await expect(createTestCategory(ctx, { slug: "" })).rejects.toBeInstanceOf(CatalogError);
  });

  it("never depends on DEV fixture rows", async () => {
    const ctx = { service };
    await createTestDefaultVariantProduct(ctx);
    const fixtureProducts = await sql`
      SELECT count(*)::int AS count
      FROM products
      WHERE slug LIKE 'dev-fixture-%'
    `;
    expect(fixtureProducts[0]?.count).toBe(0);
  });
});
