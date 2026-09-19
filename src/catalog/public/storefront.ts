/**
 * Phase 3D temporary storefront currency + public catalog accessor.
 * Phase 6 adds DB-safe merchandising loading for the homepage.
 *
 * Pages pass USD until a later server-side country/currency resolver exists.
 * PublicCatalogReads remains currency-aware (PHP | USD).
 *
 * Import only from Server Components / other server modules.
 */

import { DrizzleCatalogRepository, PublicCatalogReads, type CatalogCurrency } from "@/catalog";
import type {
  PublicCategorySummary,
  PublicCollectionSummary,
  PublicProductListingCard,
} from "@/catalog/public/types";
import { getRuntimeDb } from "@/db/runtime";

/** Temporary Phase 3D storefront currency (explicit page-boundary constant). */
export const PUBLIC_STOREFRONT_CURRENCY: CatalogCurrency = "USD";

export type StorefrontMerchandising = {
  featuredProducts: PublicProductListingCard[];
  featuredCategories: PublicCategorySummary[];
  featuredCollections: PublicCollectionSummary[];
  seasonalCollections: PublicCollectionSummary[];
};

const EMPTY_MERCHANDISING: StorefrontMerchandising = {
  featuredProducts: [],
  featuredCategories: [],
  featuredCollections: [],
  seasonalCollections: [],
};

export function getPublicCatalogReads(): PublicCatalogReads {
  return new PublicCatalogReads(new DrizzleCatalogRepository(getRuntimeDb()));
}

/**
 * Load homepage merchandising from published catalog data.
 * Returns empty slices when DATABASE_URL is unset (portable CI) or on read errors
 * so the static storefront shell stays available without a database.
 */
export async function loadStorefrontMerchandising(
  now: Date = new Date(),
): Promise<StorefrontMerchandising> {
  if (!process.env.DATABASE_URL) {
    return EMPTY_MERCHANDISING;
  }

  try {
    const reads = getPublicCatalogReads();
    const [featuredProducts, featuredCategories, featuredCollections, seasonalCollections] =
      await Promise.all([
        reads.listFeaturedProducts(PUBLIC_STOREFRONT_CURRENCY),
        reads.listFeaturedCategories(),
        reads.listFeaturedCollections(now),
        reads.listSeasonalCollections(now),
      ]);
    return {
      featuredProducts,
      featuredCategories,
      featuredCollections,
      seasonalCollections,
    };
  } catch {
    return EMPTY_MERCHANDISING;
  }
}
