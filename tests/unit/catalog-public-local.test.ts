/**
 * Path-locked / TEST-DB Phase 3D public catalog reads coverage.
 * Excluded from portable `pnpm test:ci` (see package.json).
 */
import { randomUUID } from "node:crypto";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { CatalogService, DrizzleCatalogRepository, PublicCatalogReads } from "@/catalog";
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
  createTestOptionProduct,
  setTestVariantPrices,
} from "../support/catalog-factories";
import { buildPrice } from "../support/catalog-builders";

const credentials = loadValidatedCredentials("test");

function sku(label: string) {
  return `PUB-${label}-${randomUUID().slice(0, 8)}`;
}

describe("Phase 3D public catalog reads against TEST database", () => {
  let sql: ReturnType<typeof postgres>;
  let service: CatalogService;
  let publicReads: PublicCatalogReads;

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
    const repo = new DrizzleCatalogRepository(db);
    service = new CatalogService(repo);
    publicReads = new PublicCatalogReads(repo);
  });

  afterAll(async () => {
    await sql.end({ timeout: 5 });
  });

  beforeEach(async () => {
    await sql`DELETE FROM product_media`;
    await sql`DELETE FROM payment_events`;
    await sql`DELETE FROM inventory_reservations`;
    await sql`DELETE FROM order_items`;
    await sql`DELETE FROM orders`;
    await sql`DELETE FROM cart_items`;
    await sql`DELETE FROM carts`;
    await sql`DELETE FROM inventory_movements`;
    await sql`DELETE FROM inventory_balances`;
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

  it("lists only published eligible products and hides draft/archived/unpriced", async () => {
    const ctx = { service };
    const published = await createTestDefaultVariantProduct(ctx, {
      product: { slug: "pub-live", title: "Live", status: "published" },
      variant: {
        sku: sku("live"),
        prices: [buildPrice("USD", 2500), buildPrice("PHP", 99000)],
      },
    });
    await service.changeProductStatus(published.product.id, { status: "published" });

    const draft = await createTestDefaultVariantProduct(ctx, {
      product: { slug: "pub-draft", title: "Draft", status: "draft" },
      variant: { sku: sku("draft") },
    });
    expect(draft.product.status).toBe("draft");

    const archived = await createTestDefaultVariantProduct(ctx, {
      product: { slug: "pub-arch", title: "Arch", status: "published" },
      variant: { sku: sku("arch") },
    });
    await service.changeProductStatus(archived.product.id, { status: "published" });
    await service.changeProductStatus(archived.product.id, { status: "archived" });

    const usdOnly = await createTestDefaultVariantProduct(ctx, {
      product: { slug: "pub-usd-only", title: "USD Only", status: "published" },
      variant: {
        sku: sku("usd"),
        prices: [buildPrice("USD", 1999)],
      },
    });
    await service.changeProductStatus(usdOnly.product.id, { status: "published" });

    const usdList = await publicReads.listPublishedProducts("USD");
    expect(usdList.map((card) => card.slug).sort()).toEqual(["pub-live", "pub-usd-only"]);

    const phpList = await publicReads.listPublishedProducts("PHP");
    expect(phpList.map((card) => card.slug)).toEqual(["pub-live"]);

    await expect(publicReads.getPublishedProductBySlug("pub-draft", "USD")).resolves.toBeNull();
    await expect(publicReads.getPublishedProductBySlug("pub-arch", "USD")).resolves.toBeNull();
    await expect(publicReads.getPublishedProductBySlug("pub-usd-only", "PHP")).resolves.toBeNull();

    const detail = await publicReads.getPublishedProductBySlug("pub-live", "USD");
    expect(detail?.initialVariantId).toBe(published.variant.id);
    expect(detail?.variants).toHaveLength(1);
    expect(detail?.variants[0]?.price.amountMinor).toBe(2500);
  });

  it("returns From pricing and option-position tie-break on PDP", async () => {
    const ctx = { service };
    const { product, options } = await createTestOptionProduct(ctx, {
      product: { slug: "pub-sizes", title: "Sized", status: "published" },
      options: [
        {
          name: "Size",
          position: 0,
          values: [
            { value: "S", position: 0 },
            { value: "M", position: 1 },
          ],
        },
      ],
    });
    await service.changeProductStatus(product.id, { status: "published" });

    const size = options[0]!;
    const valueS = size.values.find((value) => value.value === "S")!;
    const valueM = size.values.find((value) => value.value === "M")!;

    const medium = await createTestActiveVariant(ctx, product.id, {
      sku: sku("M"),
      optionSelections: [{ optionId: size.id, optionValueId: valueM.id }],
      prices: [buildPrice("USD", 2000), buildPrice("PHP", 80000)],
    });
    const small = await createTestActiveVariant(ctx, product.id, {
      sku: sku("S"),
      optionSelections: [{ optionId: size.id, optionValueId: valueS.id }],
      prices: [buildPrice("USD", 2000), buildPrice("PHP", 80000)],
    });
    await setTestVariantPrices(ctx, medium.variant.id, [
      buildPrice("USD", 3000),
      buildPrice("PHP", 90000),
    ]);

    const cards = await publicReads.listPublishedProducts("USD");
    const card = cards.find((item) => item.slug === "pub-sizes");
    expect(card?.priceDisplayMode).toBe("from");
    expect(card?.price.amountMinor).toBe(2000);

    const detail = await publicReads.getPublishedProductBySlug("pub-sizes", "USD");
    expect(detail?.initialVariantId).toBe(small.variant.id);
    expect(detail?.variants).toHaveLength(2);
  });

  it("filters category/collection membership and publish windows", async () => {
    const ctx = { service };
    const publishedCategory = await createTestCategory(ctx, {
      slug: "pub-cat",
      name: "Pub Cat",
      published: true,
    });
    const unpublishedCategory = await createTestCategory(ctx, {
      slug: "hidden-cat",
      name: "Hidden",
      published: false,
    });

    const liveCollection = await createTestCollection(ctx, {
      slug: "pub-col",
      name: "Live Col",
      published: true,
    });
    const futureCollection = await service.createCollection({
      slug: "future-col",
      name: "Future",
      published: true,
      publishedFrom: new Date("2099-01-01T00:00:00.000Z"),
    });

    const live = await createTestDefaultVariantProduct(ctx, {
      product: { slug: "mem-live", title: "Mem Live", status: "published" },
      variant: { sku: sku("mem") },
    });
    await service.changeProductStatus(live.product.id, { status: "published" });

    const draft = await createTestDefaultVariantProduct(ctx, {
      product: { slug: "mem-draft", title: "Mem Draft", status: "draft" },
      variant: { sku: sku("memd") },
    });

    await assignTestPrimaryCategory(ctx, live.product.id, publishedCategory.id);
    await assignTestPrimaryCategory(ctx, draft.product.id, publishedCategory.id);
    await assignTestCollections(ctx, live.product.id, [liveCollection.id, futureCollection.id]);

    const categoryPage = await publicReads.getPublishedCategoryBySlug("pub-cat", "USD");
    expect(categoryPage?.products.map((p) => p.slug)).toEqual(["mem-live"]);

    await expect(publicReads.getPublishedCategoryBySlug("hidden-cat", "USD")).resolves.toBeNull();
    expect(unpublishedCategory.published).toBe(false);

    const collectionPage = await publicReads.getPublishedCollectionBySlug("pub-col", "USD");
    expect(collectionPage?.products.map((p) => p.slug)).toEqual(["mem-live"]);

    await expect(
      publicReads.getPublishedCollectionBySlug("future-col", "USD", new Date("2026-01-01")),
    ).resolves.toBeNull();

    const collections = await publicReads.listPublishedCollections(new Date("2026-01-01"));
    expect(collections.map((c) => c.slug)).toEqual(["pub-col"]);
  });
});
