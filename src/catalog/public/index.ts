/**
 * Phase 3D public catalog reads surface.
 */

export {
  buildListingPrice,
  collectEligibleVariants,
  compareEligibleVariants,
  isCategoryPublic,
  isCollectionPublic,
  isProductEligibleForCurrency,
  isProductPublished,
  priceForCurrency,
  selectInitialEligibleVariant,
  type EligibleVariantCandidate,
} from "@/catalog/public/eligibility";
export { formatListingPrice, formatPublicMoney } from "@/catalog/public/format-money";
export { PublicCatalogReads } from "@/catalog/public/reads";
export type {
  PriceDisplayMode,
  PublicCategoryPage,
  PublicCategorySummary,
  PublicCollectionPage,
  PublicCollectionSummary,
  PublicMoney,
  PublicProductDetail,
  PublicProductListingCard,
  PublicProductOption,
  PublicProductOptionValue,
  PublicVariant,
  PublicVariantSelection,
} from "@/catalog/public/types";

export {
  FEATURED_CATEGORY_LIMIT,
  FEATURED_COLLECTION_LIMIT,
  FEATURED_PRODUCT_LIMIT,
  SEASONAL_COLLECTION_LIMIT,
  selectSeasonalCollections,
  takeFeatured,
  type CollectionWindowHint,
} from "@/catalog/public/merchandising";
