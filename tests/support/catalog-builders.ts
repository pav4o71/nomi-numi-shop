/**
 * Pure deterministic catalog builders for portable tests (Phase 3C).
 * No database access. Not DEV fixtures.
 */

import type { CatalogCurrency } from "@/catalog/money";
import type { ProductStatus } from "@/catalog/validators";

export type BuilderPrice = {
  currency: CatalogCurrency;
  amountMinor: number;
  compareAtAmountMinor?: number | null;
};

export type BuilderCategoryInput = {
  slug: string;
  name: string;
  description?: string | null;
  position?: number;
  published?: boolean;
};

export type BuilderCollectionInput = {
  slug: string;
  name: string;
  description?: string | null;
  position?: number;
  published?: boolean;
};

export type BuilderProductInput = {
  slug: string;
  title: string;
  description?: string | null;
  status?: ProductStatus;
  position?: number;
};

export type BuilderVariantInput = {
  sku: string;
  isActive?: boolean;
  optionSelections?: Array<{ optionId: string; optionValueId: string }>;
  prices?: BuilderPrice[];
};

let builderCounter = 0;

function nextSuffix(): string {
  builderCounter += 1;
  return `${Date.now().toString(36)}-${builderCounter}`;
}

/** Reset only in tests that need deterministic suffixes across cases. */
export function resetCatalogBuilderCounter(): void {
  builderCounter = 0;
}

export function buildCategoryInput(
  overrides: Partial<BuilderCategoryInput> = {},
): BuilderCategoryInput {
  const suffix = nextSuffix();
  return {
    slug: `test-category-${suffix}`,
    name: `Test Category ${suffix}`,
    description: null,
    position: 0,
    published: false,
    ...overrides,
  };
}

export function buildCollectionInput(
  overrides: Partial<BuilderCollectionInput> = {},
): BuilderCollectionInput {
  const suffix = nextSuffix();
  return {
    slug: `test-collection-${suffix}`,
    name: `Test Collection ${suffix}`,
    description: null,
    position: 0,
    published: false,
    ...overrides,
  };
}

export function buildProductInput(
  overrides: Partial<BuilderProductInput> = {},
): BuilderProductInput {
  const suffix = nextSuffix();
  return {
    slug: `test-product-${suffix}`,
    title: `Test Product ${suffix}`,
    description: null,
    status: "draft",
    position: 0,
    ...overrides,
  };
}

export function buildPrice(
  currency: CatalogCurrency,
  amountMinor: number,
  compareAtAmountMinor?: number | null,
): BuilderPrice {
  return {
    currency,
    amountMinor,
    compareAtAmountMinor: compareAtAmountMinor ?? null,
  };
}

export function buildDefaultVariantInput(
  overrides: Partial<BuilderVariantInput> = {},
): BuilderVariantInput {
  const suffix = nextSuffix();
  return {
    sku: `TEST-SKU-${suffix}`,
    isActive: true,
    optionSelections: [],
    prices: [buildPrice("PHP", 10000), buildPrice("USD", 1000)],
    ...overrides,
  };
}

export function buildInactiveVariantInput(
  overrides: Partial<BuilderVariantInput> = {},
): BuilderVariantInput {
  return buildDefaultVariantInput({ isActive: false, ...overrides });
}

export function buildCompareAtPrices(): BuilderPrice[] {
  return [buildPrice("PHP", 15000, 20000), buildPrice("USD", 1200, 1800)];
}
