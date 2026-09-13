/**
 * Shared Phase 3C fixture comparison policy.
 *
 * Used by preflight classification and install-time revalidation so both
 * agree on option equality, membership safe-subset, and variant-set equality.
 */

import type { ProductOptionWithValues } from "@/catalog/repository";
import type {
  FixtureCategoryMembership,
  FixtureCollectionMembership,
  FixtureOption,
  FixtureProduct,
} from "@/catalog/fixtures/manifest";

export type CategoryMembershipView = {
  slug: string;
  position: number;
  isPrimary: boolean;
};

export type CollectionMembershipView = {
  slug: string;
  position: number;
};

export type RelationCompareResult = "exact" | "safe-subset" | "conflict";

export type VariantSetCompareResult = "exact" | "safe-subset" | "conflict";

export type OptionsInstallDecision =
  "define" | "already-matching" | "refuse-divergent" | "refuse-variants";

export function fixtureOptionSignature(options: FixtureOption[]): string {
  return JSON.stringify(
    options.map((option) => ({
      name: option.name,
      position: option.position,
      values: option.values.map((value) => ({ value: value.value, position: value.position })),
    })),
  );
}

export function liveOptionSignature(options: ProductOptionWithValues[]): string {
  return JSON.stringify(
    options.map((option) => ({
      name: option.name,
      position: option.position,
      values: option.values.map((value) => ({ value: value.value, position: value.position })),
    })),
  );
}

export function optionsMatchExpected(
  liveOptions: ProductOptionWithValues[],
  expectedOptions: FixtureOption[],
): boolean {
  return liveOptionSignature(liveOptions) === fixtureOptionSignature(expectedOptions);
}

export function decideOptionsInstall(
  liveOptions: ProductOptionWithValues[],
  variantCount: number,
  expectedOptions: FixtureOption[],
): OptionsInstallDecision {
  if (variantCount > 0) {
    return "refuse-variants";
  }
  if (liveOptions.length === 0) {
    return expectedOptions.length === 0 ? "already-matching" : "define";
  }
  if (optionsMatchExpected(liveOptions, expectedOptions)) {
    return "already-matching";
  }
  return "refuse-divergent";
}

export function expectedCategoryViews(
  memberships: FixtureCategoryMembership[],
): CategoryMembershipView[] {
  return [...memberships]
    .map((item) => ({
      slug: item.categorySlug,
      position: item.position,
      isPrimary: item.isPrimary,
    }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

export function expectedCollectionViews(
  memberships: FixtureCollectionMembership[],
): CollectionMembershipView[] {
  return [...memberships]
    .map((item) => ({
      slug: item.collectionSlug,
      position: item.position,
    }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

export function compareCategoryMemberships(
  live: CategoryMembershipView[],
  expected: CategoryMembershipView[],
): RelationCompareResult {
  const liveExact = [...live].sort((a, b) => a.slug.localeCompare(b.slug));
  const expectedExact = [...expected].sort((a, b) => a.slug.localeCompare(b.slug));

  if (JSON.stringify(liveExact) === JSON.stringify(expectedExact)) {
    return "exact";
  }

  const unexpected = liveExact.filter(
    (liveItem) => !expectedExact.some((expectedItem) => expectedItem.slug === liveItem.slug),
  );
  if (unexpected.length > 0) {
    return "conflict";
  }

  const liveIsSafeSubset = liveExact.every((liveItem) =>
    expectedExact.some(
      (expectedItem) =>
        expectedItem.slug === liveItem.slug &&
        expectedItem.position === liveItem.position &&
        expectedItem.isPrimary === liveItem.isPrimary,
    ),
  );

  if (liveIsSafeSubset && liveExact.length < expectedExact.length) {
    return "safe-subset";
  }

  return "conflict";
}

export function compareCollectionMemberships(
  live: CollectionMembershipView[],
  expected: CollectionMembershipView[],
): RelationCompareResult {
  const liveExact = [...live].sort((a, b) => a.slug.localeCompare(b.slug));
  const expectedExact = [...expected].sort((a, b) => a.slug.localeCompare(b.slug));

  if (JSON.stringify(liveExact) === JSON.stringify(expectedExact)) {
    return "exact";
  }

  if (expectedExact.length === 0) {
    return liveExact.length === 0 ? "exact" : "conflict";
  }

  const unexpected = liveExact.filter(
    (liveItem) => !expectedExact.some((expectedItem) => expectedItem.slug === liveItem.slug),
  );
  if (unexpected.length > 0) {
    return "conflict";
  }

  const liveIsSafeSubset = liveExact.every((liveItem) =>
    expectedExact.some(
      (expectedItem) =>
        expectedItem.slug === liveItem.slug && expectedItem.position === liveItem.position,
    ),
  );

  if (liveIsSafeSubset && liveExact.length < expectedExact.length) {
    return "safe-subset";
  }

  return "conflict";
}

export function expectedVariantSkus(product: FixtureProduct): string[] {
  return product.variants.map((variant) => variant.sku).sort();
}

export function compareVariantSkuSets(
  liveSkus: string[],
  expectedSkus: string[],
): VariantSetCompareResult {
  const live = [...liveSkus].sort();
  const expected = [...expectedSkus].sort();

  const unexpected = live.filter((sku) => !expected.includes(sku));
  if (unexpected.length > 0) {
    return "conflict";
  }

  if (JSON.stringify(live) === JSON.stringify(expected)) {
    return "exact";
  }

  // Live is a proper subset of expected (no extras).
  return "safe-subset";
}

export function membershipViewsSignature(
  views: Array<CategoryMembershipView | CollectionMembershipView>,
): string {
  return JSON.stringify(views);
}
