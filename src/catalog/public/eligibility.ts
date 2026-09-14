/**
 * Pure Phase 3D public-catalog eligibility and pricing helpers.
 *
 * PublicCatalogReads passes CatalogCurrency explicitly; geo/cookies are out of scope.
 */

import type { CatalogCurrency } from "@/catalog/money";
import type { OptionSelection } from "@/catalog/option-combination";
import type {
  CategoryRow,
  CollectionRow,
  ProductOptionWithValues,
  ProductRow,
  VariantPriceRow,
  VariantRow,
} from "@/catalog/repository";
import type { PriceDisplayMode, PublicMoney } from "@/catalog/public/types";

export type EligibleVariantCandidate = {
  variant: VariantRow;
  price: VariantPriceRow;
  selections: OptionSelection[];
};

export function isCategoryPublic(category: CategoryRow): boolean {
  return category.published === true && category.archivedAt === null;
}

export function isCollectionPublic(collection: CollectionRow, now: Date): boolean {
  if (collection.published !== true || collection.archivedAt !== null) {
    return false;
  }
  if (collection.publishedFrom != null && collection.publishedFrom.getTime() > now.getTime()) {
    return false;
  }
  if (collection.publishedUntil != null && !(now.getTime() < collection.publishedUntil.getTime())) {
    return false;
  }
  return true;
}

export function isProductPublished(product: ProductRow): boolean {
  return product.status === "published";
}

export function priceForCurrency(
  prices: VariantPriceRow[],
  currency: CatalogCurrency,
): VariantPriceRow | null {
  return prices.find((price) => price.currency === currency && price.amountMinor > 0) ?? null;
}

export function collectEligibleVariants(args: {
  variants: VariantRow[];
  pricesByVariantId: Map<string, VariantPriceRow[]>;
  selectionsByVariantId: Map<string, OptionSelection[]>;
  currency: CatalogCurrency;
}): EligibleVariantCandidate[] {
  const eligible: EligibleVariantCandidate[] = [];
  for (const variant of args.variants) {
    if (!variant.isActive) {
      continue;
    }
    const price = priceForCurrency(args.pricesByVariantId.get(variant.id) ?? [], args.currency);
    if (!price) {
      continue;
    }
    eligible.push({
      variant,
      price,
      selections: args.selectionsByVariantId.get(variant.id) ?? [],
    });
  }
  return eligible;
}

/**
 * Compare two eligible variants for initial/listing selection.
 * Lower amountMinor wins; ties break by option-axis position, then
 * option-value position (options ordered by axis position), then SKU.
 */
export function compareEligibleVariants(
  left: EligibleVariantCandidate,
  right: EligibleVariantCandidate,
  options: ProductOptionWithValues[],
): number {
  if (left.price.amountMinor !== right.price.amountMinor) {
    return left.price.amountMinor - right.price.amountMinor;
  }

  const axes = [...options].sort((a, b) => {
    if (a.position !== b.position) {
      return a.position - b.position;
    }
    return a.id.localeCompare(b.id);
  });

  for (const axis of axes) {
    const leftValueId = left.selections.find((s) => s.optionId === axis.id)?.optionValueId;
    const rightValueId = right.selections.find((s) => s.optionId === axis.id)?.optionValueId;
    const leftValue = axis.values.find((value) => value.id === leftValueId);
    const rightValue = axis.values.find((value) => value.id === rightValueId);
    const leftPos = leftValue?.position ?? Number.MAX_SAFE_INTEGER;
    const rightPos = rightValue?.position ?? Number.MAX_SAFE_INTEGER;
    if (leftPos !== rightPos) {
      return leftPos - rightPos;
    }
  }

  return left.variant.sku.localeCompare(right.variant.sku);
}

export function selectInitialEligibleVariant(
  eligible: EligibleVariantCandidate[],
  options: ProductOptionWithValues[],
): EligibleVariantCandidate | null {
  if (eligible.length === 0) {
    return null;
  }
  return [...eligible].sort((a, b) => compareEligibleVariants(a, b, options))[0] ?? null;
}

export function buildListingPrice(
  eligible: EligibleVariantCandidate[],
  currency: CatalogCurrency,
  options: ProductOptionWithValues[],
): { price: PublicMoney; priceDisplayMode: PriceDisplayMode } | null {
  const selected = selectInitialEligibleVariant(eligible, options);
  if (!selected) {
    return null;
  }
  const distinctAmounts = new Set(eligible.map((item) => item.price.amountMinor));
  const priceDisplayMode: PriceDisplayMode = distinctAmounts.size > 1 ? "from" : "exact";
  return {
    price: {
      currency,
      amountMinor: selected.price.amountMinor,
      compareAtAmountMinor: selected.price.compareAtAmountMinor,
    },
    priceDisplayMode,
  };
}

export function isProductEligibleForCurrency(args: {
  product: ProductRow;
  variants: VariantRow[];
  pricesByVariantId: Map<string, VariantPriceRow[]>;
  currency: CatalogCurrency;
}): boolean {
  if (!isProductPublished(args.product)) {
    return false;
  }
  return (
    collectEligibleVariants({
      variants: args.variants,
      pricesByVariantId: args.pricesByVariantId,
      selectionsByVariantId: new Map(),
      currency: args.currency,
    }).length > 0
  );
}
