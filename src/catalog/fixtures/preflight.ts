/**
 * Phase 3C read-only fixture graph classification.
 *
 * Uses CatalogService / repository reads only. Never mutates.
 */

import type { CatalogService } from "@/catalog/service";
import type {
  DrizzleCatalogRepository,
  ProductOptionWithValues,
  VariantPriceRow,
  VariantRow,
} from "@/catalog/repository";
import type { CatalogDb } from "@/catalog/db";
import {
  DEV_CATALOG_FIXTURE_MANIFEST,
  type DevCatalogFixtureManifest,
  type FixtureOption,
  type FixturePrice,
  type FixtureProduct,
  type FixtureVariant,
} from "@/catalog/fixtures/manifest";

export type FixtureClassification = "MISSING" | "MATCHING" | "CONFLICTING";

export type FixtureComponentReport = {
  key: string;
  classification: FixtureClassification;
  field?: string;
  expected?: string;
  actual?: string;
  message?: string;
};

export type FixturePreflightReport = {
  components: FixtureComponentReport[];
  matchingCount: number;
  missingCount: number;
  conflictingCount: number;
  hasConflict: boolean;
  allMatching: boolean;
  canInstall: boolean;
};

export type FixtureSeedContext = {
  service: CatalogService;
  repo: DrizzleCatalogRepository;
  db: CatalogDb;
};

function conflict(
  key: string,
  field: string,
  expected: string,
  actual: string,
  message?: string,
): FixtureComponentReport {
  return {
    key,
    classification: "CONFLICTING",
    field,
    expected,
    actual,
    message: message ?? `${key} ${field} conflicts`,
  };
}

function matching(key: string): FixtureComponentReport {
  return { key, classification: "MATCHING" };
}

function missing(key: string): FixtureComponentReport {
  return { key, classification: "MISSING" };
}

function optionSignature(options: FixtureOption[]): string {
  return JSON.stringify(
    options.map((option) => ({
      name: option.name,
      position: option.position,
      values: option.values.map((value) => ({ value: value.value, position: value.position })),
    })),
  );
}

function liveOptionSignature(options: ProductOptionWithValues[]): string {
  return JSON.stringify(
    options.map((option) => ({
      name: option.name,
      position: option.position,
      values: option.values.map((value) => ({ value: value.value, position: value.position })),
    })),
  );
}

function priceSignature(prices: FixturePrice[]): string {
  return JSON.stringify(
    [...prices]
      .map((price) => ({
        currency: price.currency,
        amountMinor: price.amountMinor,
        compareAtAmountMinor: price.compareAtAmountMinor ?? null,
      }))
      .sort((a, b) => a.currency.localeCompare(b.currency)),
  );
}

function livePriceSignature(prices: VariantPriceRow[]): string {
  return JSON.stringify(
    [...prices]
      .map((price) => ({
        currency: price.currency,
        amountMinor: price.amountMinor,
        compareAtAmountMinor: price.compareAtAmountMinor ?? null,
      }))
      .sort((a, b) => a.currency.localeCompare(b.currency)),
  );
}

function selectionSignatureFromFixture(
  variant: FixtureVariant,
  options: ProductOptionWithValues[],
): string | null {
  if (Object.keys(variant.optionValues).length === 0) {
    return JSON.stringify([]);
  }

  const selections: Array<{ optionName: string; value: string }> = [];
  for (const [optionName, value] of Object.entries(variant.optionValues)) {
    const option = options.find((item) => item.name === optionName);
    if (!option) {
      return null;
    }
    const optionValue = option.values.find((item) => item.value === value);
    if (!optionValue) {
      return null;
    }
    selections.push({ optionName, value });
  }
  selections.sort((a, b) => a.optionName.localeCompare(b.optionName));
  return JSON.stringify(selections);
}

function selectionSignatureFromLive(
  variantId: string,
  options: ProductOptionWithValues[],
  selections: Array<{ optionId: string; optionValueId: string }>,
): string {
  const mapped = selections.map((selection) => {
    const option = options.find((item) => item.id === selection.optionId);
    const value = option?.values.find((item) => item.id === selection.optionValueId);
    return {
      optionName: option?.name ?? selection.optionId,
      value: value?.value ?? selection.optionValueId,
    };
  });
  mapped.sort((a, b) => a.optionName.localeCompare(b.optionName));
  return JSON.stringify(mapped);
}

async function classifyCategory(
  ctx: FixtureSeedContext,
  slug: string,
  expected: DevCatalogFixtureManifest["categories"][number],
): Promise<FixtureComponentReport> {
  const key = `category:${slug}`;
  const row = await ctx.repo.getCategoryBySlug(ctx.db, slug);
  if (!row) {
    return missing(key);
  }
  if (row.name !== expected.name) {
    return conflict(key, "name", expected.name, row.name);
  }
  if (row.position !== expected.position) {
    return conflict(key, "position", String(expected.position), String(row.position));
  }
  if (row.published !== expected.published) {
    return conflict(key, "published", String(expected.published), String(row.published));
  }
  if ((row.description ?? "") !== expected.description) {
    return conflict(key, "description", expected.description, row.description ?? "");
  }
  return matching(key);
}

async function classifyCollection(
  ctx: FixtureSeedContext,
  slug: string,
  expected: DevCatalogFixtureManifest["collections"][number],
): Promise<FixtureComponentReport> {
  const key = `collection:${slug}`;
  const row = await ctx.repo.getCollectionBySlug(ctx.db, slug);
  if (!row) {
    return missing(key);
  }
  if (row.name !== expected.name) {
    return conflict(key, "name", expected.name, row.name);
  }
  if (row.position !== expected.position) {
    return conflict(key, "position", String(expected.position), String(row.position));
  }
  if (row.published !== expected.published) {
    return conflict(key, "published", String(expected.published), String(row.published));
  }
  if ((row.description ?? "") !== expected.description) {
    return conflict(key, "description", expected.description, row.description ?? "");
  }
  return matching(key);
}

async function classifyProductCore(
  ctx: FixtureSeedContext,
  product: FixtureProduct,
): Promise<{ report: FixtureComponentReport; productId: string | null }> {
  const key = `product:${product.slug}`;
  const row = await ctx.repo.getProductBySlug(ctx.db, product.slug);
  if (!row) {
    return { report: missing(key), productId: null };
  }
  if (row.title !== product.title) {
    return { report: conflict(key, "title", product.title, row.title), productId: row.id };
  }
  if (row.status !== product.status) {
    return { report: conflict(key, "status", product.status, row.status), productId: row.id };
  }
  if (row.position !== product.position) {
    return {
      report: conflict(key, "position", String(product.position), String(row.position)),
      productId: row.id,
    };
  }
  if ((row.description ?? "") !== product.description) {
    return {
      report: conflict(key, "description", product.description, row.description ?? ""),
      productId: row.id,
    };
  }
  return { report: matching(key), productId: row.id };
}

async function classifyOptions(
  ctx: FixtureSeedContext,
  product: FixtureProduct,
  productId: string | null,
  productCore: FixtureClassification,
): Promise<FixtureComponentReport> {
  const key = `product-options:${product.slug}`;
  if (productCore === "MISSING" || productId == null) {
    return product.options.length === 0 ? matching(key) : missing(key);
  }

  const liveOptions = await ctx.repo.listProductOptionsWithValues(ctx.db, productId);
  const expectedSig = optionSignature(product.options);
  const liveSig = liveOptionSignature(liveOptions);

  if (liveOptions.length === 0 && product.options.length > 0) {
    const variantCount = await ctx.repo.countVariantsForProduct(ctx.db, productId);
    if (variantCount > 0) {
      return conflict(
        key,
        "options",
        expectedSig,
        liveSig,
        "Cannot define missing options because variants already exist",
      );
    }
    return missing(key);
  }

  if (liveOptions.length === 0 && product.options.length === 0) {
    return matching(key);
  }

  if (liveSig !== expectedSig) {
    return conflict(key, "options", expectedSig, liveSig);
  }
  return matching(key);
}

async function classifyVariant(
  ctx: FixtureSeedContext,
  product: FixtureProduct,
  productId: string | null,
  productCore: FixtureClassification,
  optionsReport: FixtureComponentReport,
  variant: FixtureVariant,
): Promise<FixtureComponentReport[]> {
  const key = `variant:${variant.sku}`;
  const priceKey = `variant-prices:${variant.sku}`;
  const reports: FixtureComponentReport[] = [];
  const bySku = await ctx.repo.getVariantBySku(ctx.db, variant.sku);

  if (productCore === "MISSING" || productId == null) {
    if (bySku) {
      reports.push(
        conflict(
          key,
          "productId",
          product.slug,
          bySku.productId,
          "DEVFIX SKU exists but fixture product is missing",
        ),
      );
      return reports;
    }
    reports.push(missing(key));
    reports.push(missing(priceKey));
    return reports;
  }

  if (!bySku) {
    reports.push(missing(key));
    reports.push(missing(priceKey));
    return reports;
  }

  if (bySku.productId !== productId) {
    reports.push(
      conflict(
        key,
        "productId",
        productId,
        bySku.productId,
        "DEVFIX SKU is attached to a different product",
      ),
    );
    return reports;
  }

  if (bySku.isActive !== variant.isActive) {
    reports.push(conflict(key, "isActive", String(variant.isActive), String(bySku.isActive)));
  } else if (optionsReport.classification === "CONFLICTING") {
    reports.push(
      conflict(
        key,
        "optionSelections",
        JSON.stringify(variant.optionValues),
        "unavailable",
        "Option axis conflicts; variant selections cannot be verified as matching",
      ),
    );
  } else if (optionsReport.classification === "MISSING") {
    reports.push(
      conflict(
        key,
        "optionSelections",
        JSON.stringify(variant.optionValues),
        "options-missing",
        "Variant exists while expected options are still missing",
      ),
    );
  } else {
    const liveOptions = await ctx.repo.listProductOptionsWithValues(ctx.db, productId);
    const expectedSelection = selectionSignatureFromFixture(variant, liveOptions);
    const liveSelections = await ctx.repo.listVariantSelections(ctx.db, bySku.id);
    if (expectedSelection == null) {
      reports.push(
        conflict(
          key,
          "optionSelections",
          JSON.stringify(variant.optionValues),
          selectionSignatureFromLive(bySku.id, liveOptions, liveSelections),
          "Expected option values are not present on the product",
        ),
      );
    } else {
      const liveSelection = selectionSignatureFromLive(bySku.id, liveOptions, liveSelections);
      if (expectedSelection !== liveSelection) {
        reports.push(conflict(key, "optionSelections", expectedSelection, liveSelection));
      } else {
        reports.push(matching(key));
      }
    }
  }

  const livePrices = await ctx.repo.listVariantPrices(ctx.db, bySku.id);
  const expectedPriceSig = priceSignature(variant.prices);
  const livePriceSig = livePriceSignature(livePrices);

  if (livePrices.length === 0) {
    reports.push(missing(priceKey));
  } else if (livePriceSig !== expectedPriceSig) {
    reports.push(conflict(priceKey, "prices", expectedPriceSig, livePriceSig));
  } else {
    reports.push(matching(priceKey));
  }

  return reports;
}

async function classifyCategoryMemberships(
  ctx: FixtureSeedContext,
  product: FixtureProduct,
  productId: string | null,
  productCore: FixtureClassification,
): Promise<FixtureComponentReport> {
  const key = `product-categories:${product.slug}`;
  if (productCore === "MISSING" || productId == null) {
    return missing(key);
  }

  const live = await ctx.repo.listProductCategories(ctx.db, productId);
  const expectedSlugs = product.categories.map((item) => item.categorySlug).sort();
  const liveResolved: Array<{ slug: string; position: number; isPrimary: boolean }> = [];

  for (const row of live) {
    const category = await ctx.repo.getCategoryById(ctx.db, row.categoryId);
    if (!category) {
      return conflict(key, "categoryId", "known fixture category", row.categoryId);
    }
    liveResolved.push({
      slug: category.slug,
      position: row.position,
      isPrimary: row.isPrimary,
    });
  }

  const liveSlugs = liveResolved.map((item) => item.slug).sort();
  const unexpected = liveSlugs.filter((slug) => !expectedSlugs.includes(slug));
  if (unexpected.length > 0) {
    return conflict(
      key,
      "memberships",
      expectedSlugs.join(","),
      liveSlugs.join(","),
      `Unexpected extra category memberships would be removed by replacement: ${unexpected.join(",")}`,
    );
  }

  if (liveResolved.length === 0 && product.categories.length > 0) {
    return missing(key);
  }

  const expectedExact = [...product.categories]
    .map((item) => ({
      slug: item.categorySlug,
      position: item.position,
      isPrimary: item.isPrimary,
    }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
  const liveExact = [...liveResolved].sort((a, b) => a.slug.localeCompare(b.slug));

  if (JSON.stringify(liveExact) === JSON.stringify(expectedExact)) {
    return matching(key);
  }

  // Safe subset: every live membership matches an expected entry; missing expected remain.
  const liveIsSafeSubset = liveExact.every((liveItem) =>
    expectedExact.some(
      (expected) =>
        expected.slug === liveItem.slug &&
        expected.position === liveItem.position &&
        expected.isPrimary === liveItem.isPrimary,
    ),
  );

  if (liveIsSafeSubset && liveExact.length < expectedExact.length) {
    return missing(key);
  }

  return conflict(key, "memberships", JSON.stringify(expectedExact), JSON.stringify(liveExact));
}

async function classifyCollectionMemberships(
  ctx: FixtureSeedContext,
  product: FixtureProduct,
  productId: string | null,
  productCore: FixtureClassification,
): Promise<FixtureComponentReport> {
  const key = `product-collections:${product.slug}`;
  if (productCore === "MISSING" || productId == null) {
    return product.collections.length === 0 ? matching(key) : missing(key);
  }

  const live = await ctx.repo.listProductCollections(ctx.db, productId);
  const expectedSlugs = product.collections.map((item) => item.collectionSlug).sort();
  const liveResolved: Array<{ slug: string; position: number }> = [];

  for (const row of live) {
    const collection = await ctx.repo.getCollectionById(ctx.db, row.collectionId);
    if (!collection) {
      return conflict(key, "collectionId", "known fixture collection", row.collectionId);
    }
    liveResolved.push({ slug: collection.slug, position: row.position });
  }

  const liveSlugs = liveResolved.map((item) => item.slug).sort();
  const unexpected = liveSlugs.filter((slug) => !expectedSlugs.includes(slug));
  if (unexpected.length > 0) {
    return conflict(
      key,
      "memberships",
      expectedSlugs.join(","),
      liveSlugs.join(","),
      `Unexpected extra collection memberships would be removed by replacement: ${unexpected.join(",")}`,
    );
  }

  if (liveResolved.length === 0 && product.collections.length > 0) {
    return missing(key);
  }

  if (product.collections.length === 0) {
    if (liveResolved.length === 0) {
      return matching(key);
    }
    return conflict(
      key,
      "memberships",
      "",
      liveSlugs.join(","),
      "Fixture product expects no collections but memberships exist",
    );
  }

  const expectedExact = [...product.collections]
    .map((item) => ({ slug: item.collectionSlug, position: item.position }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
  const liveExact = [...liveResolved].sort((a, b) => a.slug.localeCompare(b.slug));

  if (JSON.stringify(liveExact) === JSON.stringify(expectedExact)) {
    return matching(key);
  }

  const liveIsSafeSubset = liveExact.every((liveItem) =>
    expectedExact.some(
      (expected) => expected.slug === liveItem.slug && expected.position === liveItem.position,
    ),
  );

  if (liveIsSafeSubset && liveExact.length < expectedExact.length) {
    return missing(key);
  }

  return conflict(key, "memberships", JSON.stringify(expectedExact), JSON.stringify(liveExact));
}

export async function classifyDevCatalogFixtures(
  ctx: FixtureSeedContext,
  manifest: DevCatalogFixtureManifest = DEV_CATALOG_FIXTURE_MANIFEST,
): Promise<FixturePreflightReport> {
  const components: FixtureComponentReport[] = [];

  for (const category of manifest.categories) {
    components.push(await classifyCategory(ctx, category.slug, category));
  }

  for (const collection of manifest.collections) {
    components.push(await classifyCollection(ctx, collection.slug, collection));
  }

  for (const product of manifest.products) {
    const { report: productCore, productId } = await classifyProductCore(ctx, product);
    components.push(productCore);

    const optionsReport = await classifyOptions(
      ctx,
      product,
      productId,
      productCore.classification,
    );
    components.push(optionsReport);

    for (const variant of product.variants) {
      components.push(
        ...(await classifyVariant(
          ctx,
          product,
          productId,
          productCore.classification,
          optionsReport,
          variant,
        )),
      );
    }

    components.push(
      await classifyCategoryMemberships(ctx, product, productId, productCore.classification),
    );
    components.push(
      await classifyCollectionMemberships(ctx, product, productId, productCore.classification),
    );
  }

  const matchingCount = components.filter((item) => item.classification === "MATCHING").length;
  const missingCount = components.filter((item) => item.classification === "MISSING").length;
  const conflictingCount = components.filter(
    (item) => item.classification === "CONFLICTING",
  ).length;

  return {
    components,
    matchingCount,
    missingCount,
    conflictingCount,
    hasConflict: conflictingCount > 0,
    allMatching: conflictingCount === 0 && missingCount === 0,
    canInstall: conflictingCount === 0,
  };
}

export function summarizePreflight(report: FixturePreflightReport): string {
  return [
    `matching=${report.matchingCount}`,
    `missing=${report.missingCount}`,
    `conflicting=${report.conflictingCount}`,
  ].join(" ");
}

export type { VariantRow };
