/**
 * Path-locked / TEST-DB Phase 3C fixture preflight + install coverage.
 * Excluded from portable `pnpm test:ci`.
 *
 * Mutates TEST only. Never mutates DEV.
 */
import { randomUUID } from "node:crypto";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { CatalogService, DrizzleCatalogRepository } from "@/catalog";
import {
  DEV_CATALOG_FIXTURE_MANIFEST,
  classifyDevCatalogFixtures,
  installDevCatalogFixtures,
} from "@/catalog/fixtures";
import * as schema from "@/db/schema";
import {
  EXPECTED_ROOT,
  PROTECTED_HOST_PORT,
  loadValidatedCredentials,
} from "../../scripts/drizzle-credentials.mjs";

const credentials = loadValidatedCredentials("test");

describe("Phase 3C catalog fixtures against TEST database", () => {
  let sql: ReturnType<typeof postgres>;
  let service: CatalogService;
  let repo: DrizzleCatalogRepository;
  let db: ReturnType<typeof drizzle<typeof schema>>;

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

    db = drizzle(sql, { schema });
    repo = new DrizzleCatalogRepository(db);
    service = new CatalogService(repo);
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
    await sql`DELETE FROM store_settings`;
  });

  it("classifies a fresh database as entirely MISSING", async () => {
    const report = await classifyDevCatalogFixtures({ service, repo, db });
    expect(report.conflictingCount).toBe(0);
    expect(report.missingCount).toBeGreaterThan(0);
    expect(report.components.every((item) => item.classification !== "CONFLICTING")).toBe(true);
    expect(report.components.some((item) => item.classification === "MISSING")).toBe(true);
  });

  it("installs the fixture graph, no-ops on identical rerun, and preserves unrelated rows", async () => {
    const unrelated = await service.createCategory({
      slug: `unrelated-${randomUUID()}`,
      name: "Unrelated Category",
      published: true,
    });

    const first = await installDevCatalogFixtures({ service, repo, db });
    expect(first.mode).toBe("partial-install");
    expect(first.preflight.hasConflict).toBe(false);
    expect(first.createdKeys.length).toBeGreaterThan(0);

    const hug = await service.getProductBySlug("dev-fixture-hug-plush");
    expect(hug.status).toBe("published");
    const hugVariants = await service.listVariantsForProduct(hug.id);
    expect(hugVariants).toHaveLength(3);

    const hoodie = await service.getProductBySlug("dev-fixture-cozy-hoodie");
    const hoodieVariants = await service.listVariantsForProduct(hoodie.id);
    expect(hoodieVariants.some((variant) => variant.isActive === false)).toBe(true);
    const activeHoodie = hoodieVariants.find(
      (variant) => variant.sku === "DEVFIX-COZY-HOODIE-S-BLACK",
    );
    expect(activeHoodie).toBeTruthy();
    const prices = await service.listVariantPrices(activeHoodie!.id);
    expect(
      prices.some(
        (price) =>
          price.compareAtAmountMinor != null && price.compareAtAmountMinor > price.amountMinor,
      ),
    ).toBe(true);

    const keychain = await service.getProductBySlug("dev-fixture-heart-keychain");
    expect(keychain.status).toBe("draft");
    const tote = await service.getProductBySlug("dev-fixture-everyday-tote");
    expect(tote.status).toBe("archived");

    const christmas = await service.getCollectionBySlug("dev-fixture-christmas");
    const valentine = await service.getCollectionBySlug("dev-fixture-valentines-day");
    expect(christmas.name).toBe("Christmas");
    expect(valentine.name).toBe("Valentine's Day");

    const stillThere = await service.getCategoryById(unrelated.id);
    expect(stillThere.slug).toBe(unrelated.slug);

    const second = await installDevCatalogFixtures({ service, repo, db });
    expect(second.mode).toBe("noop");
    expect(second.createdKeys).toEqual([]);
    expect(second.preflight.allMatching).toBe(true);
  });

  it("completes only missing state after a valid partial installation", async () => {
    await service.createCategory({
      slug: "dev-fixture-plushies",
      name: "Plushies",
      description: "DEV fixture structural category for plush merchandise.",
      position: 10,
      published: true,
    });

    const partial = await classifyDevCatalogFixtures({ service, repo, db });
    expect(partial.hasConflict).toBe(false);
    expect(
      partial.components.find((item) => item.key === "category:dev-fixture-plushies")
        ?.classification,
    ).toBe("MATCHING");
    expect(partial.missingCount).toBeGreaterThan(0);

    const result = await installDevCatalogFixtures({ service, repo, db });
    expect(result.mode).toBe("partial-install");
    expect(result.createdKeys).not.toContain("category:dev-fixture-plushies");
    expect(result.createdKeys.some((key) => key.startsWith("product:"))).toBe(true);

    const finalReport = await classifyDevCatalogFixtures({ service, repo, db });
    expect(finalReport.allMatching).toBe(true);
  });

  it("aborts before writes when reserved fixture state conflicts", async () => {
    await service.createCategory({
      slug: "dev-fixture-plushies",
      name: "Wrong Name",
      description: "divergent",
      position: 10,
      published: true,
    });

    const beforeProducts = await sql`SELECT count(*)::int AS count FROM products`;
    const result = await installDevCatalogFixtures({ service, repo, db });
    expect(result.mode).toBe("aborted-conflict");
    expect(result.createdKeys).toEqual([]);
    expect(result.preflight.conflictingCount).toBeGreaterThan(0);
    expect(
      result.preflight.components.some(
        (item) =>
          item.key === "category:dev-fixture-plushies" && item.classification === "CONFLICTING",
      ),
    ).toBe(true);

    const afterProducts = await sql`SELECT count(*)::int AS count FROM products`;
    expect(afterProducts[0]?.count).toBe(beforeProducts[0]?.count);
  });

  it("conflicts on price, primary category, membership extras, and option mismatches", async () => {
    const installed = await installDevCatalogFixtures({ service, repo, db });
    expect(installed.mode).toBe("partial-install");

    const tumbler = await service.getProductBySlug("dev-fixture-moonlight-tumbler");
    const tumblerVariant = (await service.listVariantsForProduct(tumbler.id))[0]!;
    await service.setVariantPrices(tumblerVariant.id, {
      prices: [
        { currency: "PHP", amountMinor: 1 },
        { currency: "USD", amountMinor: 1 },
      ],
    });
    const priceConflict = await classifyDevCatalogFixtures({ service, repo, db });
    expect(
      priceConflict.components.some(
        (item) =>
          item.key === "variant-prices:DEVFIX-MOONLIGHT-TUMBLER" &&
          item.classification === "CONFLICTING",
      ),
    ).toBe(true);

    // Restore prices then introduce unexpected extra category membership.
    await service.setVariantPrices(tumblerVariant.id, {
      prices: DEV_CATALOG_FIXTURE_MANIFEST.products.find(
        (product) => product.slug === "dev-fixture-moonlight-tumbler",
      )!.variants[0]!.prices,
    });

    const extraCategory = await service.createCategory({
      slug: `extra-${randomUUID()}`,
      name: "Extra",
    });
    const drinkware = await service.getCategoryBySlug("dev-fixture-drinkware");
    await service.replaceProductCategories(tumbler.id, {
      categories: [
        { categoryId: drinkware.id, isPrimary: true, position: 0 },
        { categoryId: extraCategory.id, isPrimary: false, position: 1 },
      ],
    });
    const membershipConflict = await classifyDevCatalogFixtures({ service, repo, db });
    expect(
      membershipConflict.components.some(
        (item) =>
          item.key === "product-categories:dev-fixture-moonlight-tumbler" &&
          item.classification === "CONFLICTING",
      ),
    ).toBe(true);

    // Primary mismatch without extras.
    await service.replaceProductCategories(tumbler.id, {
      categories: [{ categoryId: drinkware.id, isPrimary: false, position: 0 }],
    });
    const primaryConflict = await classifyDevCatalogFixtures({ service, repo, db });
    expect(
      primaryConflict.components.some(
        (item) =>
          item.key === "product-categories:dev-fixture-moonlight-tumbler" &&
          item.classification === "CONFLICTING",
      ),
    ).toBe(true);

    // Option mismatch on hug plush.
    const hug = await service.getProductBySlug("dev-fixture-hug-plush");
    await sql`DELETE FROM product_variant_option_values WHERE product_id = ${hug.id}`;
    await sql`DELETE FROM product_variants WHERE product_id = ${hug.id}`;
    await sql`DELETE FROM product_option_values WHERE option_id IN (SELECT id FROM product_options WHERE product_id = ${hug.id})`;
    await sql`DELETE FROM product_options WHERE product_id = ${hug.id}`;
    await service.defineProductOptions(hug.id, {
      options: [
        {
          name: "Size",
          position: 0,
          values: [
            { value: "10cm", position: 0 },
            { value: "60cm", position: 1 },
            { value: "80cm", position: 2 },
          ],
        },
      ],
    });
    const optionConflict = await classifyDevCatalogFixtures({ service, repo, db });
    expect(
      optionConflict.components.some(
        (item) =>
          item.key === "product-options:dev-fixture-hug-plush" &&
          item.classification === "CONFLICTING",
      ),
    ).toBe(true);

    // SKU ownership mismatch.
    await service.createProduct({
      slug: `other-${randomUUID()}`,
      title: "Other",
    });
    // Create a product then attach a DEVFIX SKU that belongs to moonlight tumbler.
    // First remove tumbler variant to free SKU.
    await sql`DELETE FROM variant_prices WHERE variant_id = ${tumblerVariant.id}`;
    await sql`DELETE FROM product_variants WHERE id = ${tumblerVariant.id}`;
    const other = await service.createProduct({
      slug: `sku-thief-${randomUUID()}`,
      title: "SKU Thief",
    });
    await service.createVariant(other.id, {
      sku: "DEVFIX-MOONLIGHT-TUMBLER",
      prices: [
        { currency: "PHP", amountMinor: 69900 },
        { currency: "USD", amountMinor: 1999 },
      ],
    });
    const skuConflict = await classifyDevCatalogFixtures({ service, repo, db });
    expect(
      skuConflict.components.some(
        (item) =>
          item.key === "variant:DEVFIX-MOONLIGHT-TUMBLER" && item.classification === "CONFLICTING",
      ),
    ).toBe(true);
  });

  it("exposes the new repository/domain reads used for reconciliation", async () => {
    const product = await service.createProduct({
      slug: `read-${randomUUID()}`,
      title: "Read Probe",
    });
    const collection = await service.createCollection({
      slug: `read-col-${randomUUID()}`,
      name: "Read Collection",
    });
    const created = await service.createVariant(product.id, {
      sku: `READ-${randomUUID()}`,
      prices: [
        { currency: "PHP", amountMinor: 5000 },
        { currency: "USD", amountMinor: 500 },
      ],
    });
    await service.replaceProductCollections(product.id, {
      collections: [{ collectionId: collection.id, position: 0 }],
    });

    const bySku = await service.getVariantBySku(created.variant.sku);
    expect(bySku.id).toBe(created.variant.id);
    const variants = await service.listVariantsForProduct(product.id);
    expect(variants.map((item) => item.id)).toEqual([created.variant.id]);
    const prices = await service.listVariantPrices(created.variant.id);
    expect(prices).toHaveLength(2);
    const memberships = await service.listProductCollections(product.id);
    expect(memberships).toHaveLength(1);
    expect(memberships[0]?.collectionId).toBe(collection.id);
  });
});
