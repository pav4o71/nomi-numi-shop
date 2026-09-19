/**
 * Phase 6 storefront merchandising selection helpers (pure).
 *
 * Featured surfaces use existing published catalog ordering (`position`,
 * then slug) — no separate featured flags yet. Seasonal surfaces use
 * published collections (the catalog merchandising entity), preferring
 * schedule-windowed collections when present.
 */

export const FEATURED_PRODUCT_LIMIT = 8;
export const FEATURED_CATEGORY_LIMIT = 6;
export const FEATURED_COLLECTION_LIMIT = 6;
export const SEASONAL_COLLECTION_LIMIT = 8;

export type CollectionWindowHint = {
  publishedFrom: Date | null;
  publishedUntil: Date | null;
};

/** Take the leading merchandising slice from an already-ordered public list. */
export function takeFeatured<T>(items: readonly T[], limit: number): T[] {
  const safeLimit = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 0;
  return items.slice(0, safeLimit);
}

/**
 * Prefer collections with an explicit publish window (seasonal/campaign).
 * If none are windowed, fall back to the full published list so the seasonal
 * surface still renders from catalog data.
 */
export function selectSeasonalCollections<T extends CollectionWindowHint>(
  collections: readonly T[],
  limit: number = SEASONAL_COLLECTION_LIMIT,
): T[] {
  const windowed = collections.filter(
    (collection) => collection.publishedFrom != null || collection.publishedUntil != null,
  );
  const source = windowed.length > 0 ? windowed : collections;
  return takeFeatured(source, limit);
}
