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
