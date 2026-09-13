/**
 * Phase 3C fixture installation — creates MISSING state only.
 *
 * Requires a completed conflict-free preflight. Writes go through CatalogService.
 * Per-operation transactions only; no whole-seed transaction API.
 *
 * Replacement-style writes re-read live state immediately before mutation and
 * refuse divergent post-preflight state using the shared compare policy.
 */

import type { ProductOptionWithValues } from "@/catalog/repository";
import {
  decideOptionsInstall,
  compareCategoryMemberships,
  compareCollectionMemberships,
  expectedCategoryViews,
  expectedCollectionViews,
  type CategoryMembershipView,
  type CollectionMembershipView,
} from "@/catalog/fixtures/compare";
import {
  DEV_CATALOG_FIXTURE_MANIFEST,
  type DevCatalogFixtureManifest,
  type FixtureProduct,
  type FixtureVariant,
} from "@/catalog/fixtures/manifest";
import {
  classifyDevCatalogFixtures,
  type FixtureComponentReport,
  type FixturePreflightReport,
  type FixtureSeedContext,
} from "@/catalog/fixtures/preflight";

export type FixtureInstallResult = {
  preflight: FixturePreflightReport;
  createdKeys: string[];
  skippedMatching: number;
  mode: "noop" | "partial-install" | "aborted-conflict";
};

function reportsByPrefix(
  components: FixtureComponentReport[],
  prefix: string,
): FixtureComponentReport[] {
  return components.filter((item) => item.key.startsWith(prefix));
}

function classificationFor(components: FixtureComponentReport[], key: string): string | undefined {
  return components.find((item) => item.key === key)?.classification;
}

async function resolveOptionSelections(
  options: ProductOptionWithValues[],
  variant: FixtureVariant,
): Promise<Array<{ optionId: string; optionValueId: string }>> {
  const selections: Array<{ optionId: string; optionValueId: string }> = [];
  for (const [optionName, value] of Object.entries(variant.optionValues)) {
    const option = options.find((item) => item.name === optionName);
    if (!option) {
      throw new Error(`Missing option '${optionName}' while installing ${variant.sku}`);
    }
    const optionValue = option.values.find((item) => item.value === value);
    if (!optionValue) {
      throw new Error(
        `Missing option value '${value}' on '${optionName}' while installing ${variant.sku}`,
      );
    }
    selections.push({ optionId: option.id, optionValueId: optionValue.id });
  }
  return selections;
}

async function resolveLiveCategoryMemberships(
  ctx: FixtureSeedContext,
  productId: string,
): Promise<CategoryMembershipView[]> {
  const live = await ctx.repo.listProductCategories(ctx.db, productId);
  const resolved: CategoryMembershipView[] = [];
  for (const row of live) {
    const category = await ctx.repo.getCategoryById(ctx.db, row.categoryId);
    if (!category) {
      throw new Error(
        `Refusing category membership install: unknown category id ${row.categoryId}`,
      );
    }
    resolved.push({
      slug: category.slug,
      position: row.position,
      isPrimary: row.isPrimary,
    });
  }
  return resolved;
}

async function resolveLiveCollectionMemberships(
  ctx: FixtureSeedContext,
  productId: string,
): Promise<CollectionMembershipView[]> {
  const live = await ctx.repo.listProductCollections(ctx.db, productId);
  const resolved: CollectionMembershipView[] = [];
  for (const row of live) {
    const collection = await ctx.repo.getCollectionById(ctx.db, row.collectionId);
    if (!collection) {
      throw new Error(
        `Refusing collection membership install: unknown collection id ${row.collectionId}`,
      );
    }
    resolved.push({ slug: collection.slug, position: row.position });
  }
  return resolved;
}

async function installProductGraph(
  ctx: FixtureSeedContext,
  product: FixtureProduct,
  components: FixtureComponentReport[],
  createdKeys: string[],
): Promise<void> {
  const productKey = `product:${product.slug}`;
  const productClass = classificationFor(components, productKey);

  if (productClass === "MISSING") {
    await ctx.service.createProduct({
      slug: product.slug,
      title: product.title,
      description: product.description,
      status: product.status,
      position: product.position,
    });
    createdKeys.push(productKey);
  }

  const productRow = await ctx.repo.getProductBySlug(ctx.db, product.slug);
  if (!productRow) {
    throw new Error(`Fixture product missing after create attempt: ${product.slug}`);
  }

  const optionsKey = `product-options:${product.slug}`;
  if (classificationFor(components, optionsKey) === "MISSING" && product.options.length > 0) {
    const liveOptions = await ctx.repo.listProductOptionsWithValues(ctx.db, productRow.id);
    const variantCount = await ctx.repo.countVariantsForProduct(ctx.db, productRow.id);
    const decision = decideOptionsInstall(liveOptions, variantCount, product.options);

    if (decision === "refuse-variants") {
      throw new Error(
        `Refusing to define options for ${product.slug}: variants appeared after preflight`,
      );
    }
    if (decision === "refuse-divergent") {
      throw new Error(
        `Refusing to define options for ${product.slug}: option state diverged after preflight`,
      );
    }
    if (decision === "define") {
      await ctx.service.defineProductOptions(productRow.id, { options: product.options });
      createdKeys.push(optionsKey);
    }
    // already-matching: options became exactly expected after preflight — skip replace.
  }

  const options = await ctx.repo.listProductOptionsWithValues(ctx.db, productRow.id);

  for (const variant of product.variants) {
    const variantKey = `variant:${variant.sku}`;
    const pricesKey = `variant-prices:${variant.sku}`;
    const variantClass = classificationFor(components, variantKey);
    const pricesClass = classificationFor(components, pricesKey);

    if (variantClass === "MISSING") {
      const optionSelections = await resolveOptionSelections(options, variant);
      await ctx.service.createVariant(productRow.id, {
        sku: variant.sku,
        isActive: variant.isActive,
        optionSelections,
        prices: variant.prices,
      });
      createdKeys.push(variantKey);
      if (pricesClass === "MISSING") {
        createdKeys.push(pricesKey);
      }
      continue;
    }

    if (pricesClass === "MISSING") {
      const liveVariant = await ctx.repo.getVariantBySku(ctx.db, variant.sku);
      if (!liveVariant || liveVariant.productId !== productRow.id) {
        throw new Error(
          `Refusing price install for ${variant.sku}: ownership changed after preflight`,
        );
      }
      const livePrices = await ctx.repo.listVariantPrices(ctx.db, liveVariant.id);
      if (livePrices.length > 0) {
        throw new Error(
          `Refusing price install for ${variant.sku}: prices appeared after preflight and are no longer missing`,
        );
      }
      await ctx.service.setVariantPrices(liveVariant.id, { prices: variant.prices });
      createdKeys.push(pricesKey);
    }
  }

  const categoriesKey = `product-categories:${product.slug}`;
  if (classificationFor(components, categoriesKey) === "MISSING") {
    const liveResolved = await resolveLiveCategoryMemberships(ctx, productRow.id);
    const expectedExact = expectedCategoryViews(product.categories);
    const comparison = compareCategoryMemberships(liveResolved, expectedExact);

    if (comparison === "conflict") {
      throw new Error(
        `Refusing category membership install for ${product.slug}: live memberships diverged after preflight`,
      );
    }

    if (comparison === "exact") {
      // Exact expected set appeared after preflight — skip replacement.
    } else {
      // safe-subset (including empty live): may complete missing expected memberships.
      const categories = [];
      for (const membership of product.categories) {
        const category = await ctx.repo.getCategoryBySlug(ctx.db, membership.categorySlug);
        if (!category) {
          throw new Error(`Missing category ${membership.categorySlug} for ${product.slug}`);
        }
        categories.push({
          categoryId: category.id,
          position: membership.position,
          isPrimary: membership.isPrimary,
        });
      }
      await ctx.service.replaceProductCategories(productRow.id, { categories });
      createdKeys.push(categoriesKey);
    }
  }

  const collectionsKey = `product-collections:${product.slug}`;
  if (classificationFor(components, collectionsKey) === "MISSING") {
    const liveResolved = await resolveLiveCollectionMemberships(ctx, productRow.id);
    const expectedExact = expectedCollectionViews(product.collections);
    const comparison = compareCollectionMemberships(liveResolved, expectedExact);

    if (comparison === "conflict") {
      throw new Error(
        `Refusing collection membership install for ${product.slug}: live memberships diverged after preflight`,
      );
    }

    if (comparison === "exact") {
      // Exact expected set appeared after preflight — skip replacement.
    } else {
      const collections = [];
      for (const membership of product.collections) {
        const collection = await ctx.repo.getCollectionBySlug(ctx.db, membership.collectionSlug);
        if (!collection) {
          throw new Error(`Missing collection ${membership.collectionSlug} for ${product.slug}`);
        }
        collections.push({
          collectionId: collection.id,
          position: membership.position,
        });
      }
      await ctx.service.replaceProductCollections(productRow.id, { collections });
      createdKeys.push(collectionsKey);
    }
  }
}

/**
 * Apply writes from a previously computed conflict-free preflight.
 *
 * Intended for production install path and for TEST coverage of post-preflight
 * revalidation (TOCTOU). Callers must not mutate fixture state between
 * classification and apply unless deliberately testing refusal.
 */
export async function applyDevCatalogFixturesFromPreflight(
  ctx: FixtureSeedContext,
  preflight: FixturePreflightReport,
  manifest: DevCatalogFixtureManifest = DEV_CATALOG_FIXTURE_MANIFEST,
): Promise<FixtureInstallResult> {
  if (preflight.hasConflict) {
    return {
      preflight,
      createdKeys: [],
      skippedMatching: preflight.matchingCount,
      mode: "aborted-conflict",
    };
  }

  if (preflight.allMatching) {
    return {
      preflight,
      createdKeys: [],
      skippedMatching: preflight.matchingCount,
      mode: "noop",
    };
  }

  const createdKeys: string[] = [];

  for (const category of manifest.categories) {
    const key = `category:${category.slug}`;
    if (classificationFor(preflight.components, key) === "MISSING") {
      await ctx.service.createCategory({
        slug: category.slug,
        name: category.name,
        description: category.description,
        position: category.position,
        published: category.published,
      });
      createdKeys.push(key);
    }
  }

  for (const collection of manifest.collections) {
    const key = `collection:${collection.slug}`;
    if (classificationFor(preflight.components, key) === "MISSING") {
      await ctx.service.createCollection({
        slug: collection.slug,
        name: collection.name,
        description: collection.description,
        position: collection.position,
        published: collection.published,
      });
      createdKeys.push(key);
    }
  }

  for (const product of manifest.products) {
    await installProductGraph(ctx, product, preflight.components, createdKeys);
  }

  return {
    preflight,
    createdKeys,
    skippedMatching: preflight.matchingCount,
    mode: "partial-install",
  };
}

/**
 * Complete read-only preflight, then create only MISSING fixture components.
 * Aborts with zero writes when any CONFLICTING component exists.
 */
export async function installDevCatalogFixtures(
  ctx: FixtureSeedContext,
  manifest: DevCatalogFixtureManifest = DEV_CATALOG_FIXTURE_MANIFEST,
): Promise<FixtureInstallResult> {
  const preflight = await classifyDevCatalogFixtures(ctx, manifest);
  return applyDevCatalogFixturesFromPreflight(ctx, preflight, manifest);
}

export { reportsByPrefix };
