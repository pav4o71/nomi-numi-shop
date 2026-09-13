/**
 * Portable Phase 3C fixture manifest + DEV seed CLI surface tests.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  DEV_CATALOG_FIXTURE_MANIFEST,
  DEV_CATALOG_SEED_CONFIRMATION,
  DEV_FIXTURE_SKU_PREFIX,
  DEV_FIXTURE_SLUG_PREFIX,
  assertFixtureOwnershipKeys,
  parseDevCatalogSeedArgs,
} from "@/catalog/fixtures";
import { PROTECTED_HOST_PORT } from "../../scripts/drizzle-credentials.mjs";
import {
  buildCategoryInput,
  buildCompareAtPrices,
  buildDefaultVariantInput,
  buildInactiveVariantInput,
  buildPrice,
  buildProductInput,
} from "../support/catalog-builders";

const ROOT = "/home/pav4o71/Projects/nomi-numi-shop";

describe("Phase 3C fixture manifest", () => {
  it("uses reserved slug and SKU namespaces with deterministic graph shape", () => {
    expect(() => assertFixtureOwnershipKeys()).not.toThrow();

    for (const category of DEV_CATALOG_FIXTURE_MANIFEST.categories) {
      expect(category.slug.startsWith(DEV_FIXTURE_SLUG_PREFIX)).toBe(true);
    }
    for (const collection of DEV_CATALOG_FIXTURE_MANIFEST.collections) {
      expect(collection.slug.startsWith(DEV_FIXTURE_SLUG_PREFIX)).toBe(true);
    }

    const productSlugs = DEV_CATALOG_FIXTURE_MANIFEST.products.map((product) => product.slug);
    expect(productSlugs).toEqual([
      "dev-fixture-hug-plush",
      "dev-fixture-cozy-hoodie",
      "dev-fixture-moonlight-tumbler",
      "dev-fixture-heart-keychain",
      "dev-fixture-everyday-tote",
      "dev-fixture-cozy-cushion",
    ]);

    const hug = DEV_CATALOG_FIXTURE_MANIFEST.products.find(
      (product) => product.slug === "dev-fixture-hug-plush",
    );
    expect(hug?.status).toBe("published");
    expect(hug?.options).toHaveLength(1);
    expect(hug?.variants).toHaveLength(3);

    const hoodie = DEV_CATALOG_FIXTURE_MANIFEST.products.find(
      (product) => product.slug === "dev-fixture-cozy-hoodie",
    );
    expect(hoodie?.options.map((option) => option.name)).toEqual(["Size", "Color"]);
    expect(hoodie?.variants.some((variant) => variant.isActive === false)).toBe(true);
    expect(
      hoodie?.variants.some((variant) =>
        variant.prices.some((price) => (price.compareAtAmountMinor ?? 0) > price.amountMinor),
      ),
    ).toBe(true);

    const keychain = DEV_CATALOG_FIXTURE_MANIFEST.products.find(
      (product) => product.slug === "dev-fixture-heart-keychain",
    );
    expect(keychain?.status).toBe("draft");

    const tote = DEV_CATALOG_FIXTURE_MANIFEST.products.find(
      (product) => product.slug === "dev-fixture-everyday-tote",
    );
    expect(tote?.status).toBe("archived");

    for (const product of DEV_CATALOG_FIXTURE_MANIFEST.products) {
      expect(product.categories.some((item) => item.isPrimary)).toBe(true);
      for (const variant of product.variants) {
        expect(variant.sku.startsWith(DEV_FIXTURE_SKU_PREFIX)).toBe(true);
        expect(variant.prices.map((price) => price.currency).sort()).toEqual(["PHP", "USD"]);
        for (const price of variant.prices) {
          expect(Number.isInteger(price.amountMinor)).toBe(true);
          expect(price.amountMinor).toBeGreaterThan(0);
        }
      }
    }

    const categorySlugs = new Set(
      DEV_CATALOG_FIXTURE_MANIFEST.categories.map((category) => category.slug),
    );
    const collectionSlugs = new Set(
      DEV_CATALOG_FIXTURE_MANIFEST.collections.map((collection) => collection.slug),
    );
    expect([...categorySlugs].some((slug) => collectionSlugs.has(slug))).toBe(false);

    expect(DEV_CATALOG_FIXTURE_MANIFEST.collections).toHaveLength(2);
    for (const collection of DEV_CATALOG_FIXTURE_MANIFEST.collections) {
      const members = DEV_CATALOG_FIXTURE_MANIFEST.products.filter((product) =>
        product.collections.some((item) => item.collectionSlug === collection.slug),
      );
      expect(members.length).toBeGreaterThan(0);
    }
  });
});

describe("Phase 3C DEV seed CLI surface", () => {
  it("requires exact confirmation and rejects target selectors", () => {
    expect(() => parseDevCatalogSeedArgs([])).toThrow(/usage: --confirm/);
    expect(() => parseDevCatalogSeedArgs(["--confirm"])).toThrow(/confirmation token missing/);
    expect(() => parseDevCatalogSeedArgs(["--confirm", "WRONG"])).toThrow(/token mismatch/);
    expect(() =>
      parseDevCatalogSeedArgs(["--confirm", DEV_CATALOG_SEED_CONFIRMATION, "--env", "test"]),
    ).toThrow(/forbidden target-selection/);
    expect(() =>
      parseDevCatalogSeedArgs(["--confirm", DEV_CATALOG_SEED_CONFIRMATION, "--host", "127.0.0.1"]),
    ).toThrow(/forbidden target-selection/);
    expect(() =>
      parseDevCatalogSeedArgs(["--confirm", DEV_CATALOG_SEED_CONFIRMATION, "--port", "55433"]),
    ).toThrow(/forbidden target-selection/);
    expect(() =>
      parseDevCatalogSeedArgs([
        "--confirm",
        DEV_CATALOG_SEED_CONFIRMATION,
        "--database",
        "nomi_numi_shop_test",
      ]),
    ).toThrow(/forbidden target-selection/);
    expect(parseDevCatalogSeedArgs(["--confirm", DEV_CATALOG_SEED_CONFIRMATION])).toEqual({
      confirmation: DEV_CATALOG_SEED_CONFIRMATION,
    });
    expect(parseDevCatalogSeedArgs(["--", "--confirm", DEV_CATALOG_SEED_CONFIRMATION])).toEqual({
      confirmation: DEV_CATALOG_SEED_CONFIRMATION,
    });
  });

  it("public package script is DEV-only without TEST/prod selectors", () => {
    const packageJson = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };
    expect(packageJson.scripts["catalog:seed:dev"]).toBe("./scripts/catalog-seed-dev.sh");
    expect(packageJson.scripts["catalog:seed:test"]).toBeUndefined();
    expect(packageJson.scripts["catalog:seed:prod"]).toBeUndefined();
    expect(packageJson.scripts["catalog:seed"]).toBeUndefined();

    const helper = readFileSync(path.join(ROOT, "scripts/catalog-seed-dev.sh"), "utf8");
    expect(helper).toContain("SEED-NOMI-DEV-CATALOG");
    expect(helper).toContain("nomi_numi_shop_dev");
    expect(helper).toContain("55432");
    expect(helper).toContain(PROTECTED_HOST_PORT);
    expect(helper).toContain("forbidden target-selection argument");
    expect(helper).not.toContain("catalog:seed:test");
    expect(helper).toContain("-u DATABASE_URL");
    expect(helper).toContain("com.nomimumi.project");
    expect(helper).toContain('EXPECTED_CONTAINER="${COMPOSE_PROJECT}-${COMPOSE_SERVICE_NAME}-1"');
    expect(helper).toContain('COMPOSE_PROJECT="nomi-numi-shop-dev"');
  });
});

describe("Phase 3C pure TEST builders", () => {
  it("builds valid defaults and overrides without DEV fixture keys", () => {
    const category = buildCategoryInput({ slug: "custom-cat", name: "Custom" });
    expect(category.slug).toBe("custom-cat");
    expect(category.slug.startsWith(DEV_FIXTURE_SLUG_PREFIX)).toBe(false);

    const product = buildProductInput({ status: "published" });
    expect(product.status).toBe("published");
    expect(product.slug.startsWith(DEV_FIXTURE_SLUG_PREFIX)).toBe(false);

    const active = buildDefaultVariantInput();
    expect(active.isActive).toBe(true);
    expect(active.sku?.startsWith(DEV_FIXTURE_SKU_PREFIX)).toBe(false);

    const inactive = buildInactiveVariantInput({ sku: "TEST-INACTIVE-1" });
    expect(inactive.isActive).toBe(false);
    expect(inactive.sku).toBe("TEST-INACTIVE-1");

    expect(buildPrice("USD", 1000).amountMinor).toBe(1000);
    const compareAt = buildCompareAtPrices();
    expect(compareAt.every((price) => (price.compareAtAmountMinor ?? 0) > price.amountMinor)).toBe(
      true,
    );
  });
});
