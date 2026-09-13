/**
 * Public storefront catalog read models (Phase 3D).
 */

import type { CatalogCurrency } from "@/catalog/money";

export type PriceDisplayMode = "exact" | "from";

export type PublicMoney = {
  currency: CatalogCurrency;
  amountMinor: number;
  compareAtAmountMinor: number | null;
};

export type PublicProductListingCard = {
  slug: string;
  title: string;
  description: string | null;
  price: PublicMoney;
  priceDisplayMode: PriceDisplayMode;
};

export type PublicCategorySummary = {
  slug: string;
  name: string;
  description: string | null;
};

export type PublicCollectionSummary = {
  slug: string;
  name: string;
  description: string | null;
};

export type PublicProductOptionValue = {
  id: string;
  value: string;
  position: number;
};

export type PublicProductOption = {
  id: string;
  name: string;
  position: number;
  values: PublicProductOptionValue[];
};

export type PublicVariantSelection = {
  optionId: string;
  optionValueId: string;
};

export type PublicVariant = {
  id: string;
  sku: string;
  selections: PublicVariantSelection[];
  price: PublicMoney;
};

export type PublicProductDetail = {
  slug: string;
  title: string;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  options: PublicProductOption[];
  variants: PublicVariant[];
  initialVariantId: string;
  categories: PublicCategorySummary[];
  collections: PublicCollectionSummary[];
};

export type PublicCategoryPage = {
  category: PublicCategorySummary;
  products: PublicProductListingCard[];
};

export type PublicCollectionPage = {
  collection: PublicCollectionSummary;
  products: PublicProductListingCard[];
};
