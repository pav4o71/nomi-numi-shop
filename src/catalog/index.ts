/**
 * Phase 3B+ catalog domain public surface.
 *
 * Server-side repository/service foundations for products, variants/options,
 * categories, collections, and prices, plus Phase 3C DEV fixtures and
 * Phase 3D public catalog reads. No admin HTTP/UI in these phases.
 */

export {
  CatalogError,
  conflict,
  invalidInput,
  isCatalogError,
  notFound,
  type CatalogErrorCode,
  type CatalogErrorIssue,
} from "@/catalog/errors";
export type { CatalogDb, CatalogExecutor, CatalogTx } from "@/catalog/db";
export {
  CATALOG_CURRENCIES,
  PG_INTEGER_MAX,
  isCatalogCurrency,
  parseCatalogMoney,
  type CatalogCurrency,
  type CatalogMoney,
  type CatalogMoneyInput,
} from "@/catalog/money";
export { optionCombinationKey, type OptionSelection } from "@/catalog/option-combination";
export { catalogConflictFromUniqueViolation, uniqueConstraintName } from "@/catalog/pg-errors";
export { DrizzleCatalogRepository } from "@/catalog/repository";
export type {
  CategoryRow,
  CollectionProductRow,
  CollectionRow,
  ProductCategoryRow,
  ProductOptionWithValues,
  ProductRow,
  VariantPriceRow,
  VariantRow,
} from "@/catalog/repository";
export { CatalogService } from "@/catalog/service";
export { normalizeCatalogSlug } from "@/catalog/slug";
export { parseCatalogInput, productStatusSchema, type ProductStatus } from "@/catalog/validators";
export {
  DEV_CATALOG_FIXTURE_MANIFEST,
  DEV_CATALOG_SEED_CONFIRMATION,
  DEV_FIXTURE_SKU_PREFIX,
  DEV_FIXTURE_SLUG_PREFIX,
  assertFixtureOwnershipKeys,
  classifyDevCatalogFixtures,
  installDevCatalogFixtures,
  parseDevCatalogSeedArgs,
  summarizePreflight,
} from "@/catalog/fixtures";
export {
  PublicCatalogReads,
  buildListingPrice,
  collectEligibleVariants,
  compareEligibleVariants,
  formatListingPrice,
  formatPublicMoney,
  isCategoryPublic,
  isCollectionPublic,
  isProductEligibleForCurrency,
  isProductPublished,
  priceForCurrency,
  selectInitialEligibleVariant,
  selectSeasonalCollections,
  takeFeatured,
  FEATURED_CATEGORY_LIMIT,
  FEATURED_COLLECTION_LIMIT,
  FEATURED_PRODUCT_LIMIT,
  SEASONAL_COLLECTION_LIMIT,
  type CollectionWindowHint,
  type EligibleVariantCandidate,
  type PriceDisplayMode,
  type PublicCategoryPage,
  type PublicCategorySummary,
  type PublicCollectionPage,
  type PublicCollectionSummary,
  type PublicMoney,
  type PublicProductDetail,
  type PublicProductListingCard,
  type PublicProductOption,
  type PublicProductOptionValue,
  type PublicVariant,
  type PublicVariantSelection,
} from "@/catalog/public";
