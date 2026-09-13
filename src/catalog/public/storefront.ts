/**
 * Phase 3D temporary storefront currency + public catalog accessor.
 *
 * Pages pass USD until a later server-side country/currency resolver exists.
 * PublicCatalogReads remains currency-aware (PHP | USD).
 *
 * Import only from Server Components / other server modules.
 */

import { DrizzleCatalogRepository, PublicCatalogReads, type CatalogCurrency } from "@/catalog";
import { getRuntimeDb } from "@/db/runtime";

/** Temporary Phase 3D storefront currency (explicit page-boundary constant). */
export const PUBLIC_STOREFRONT_CURRENCY: CatalogCurrency = "USD";

export function getPublicCatalogReads(): PublicCatalogReads {
  return new PublicCatalogReads(new DrizzleCatalogRepository(getRuntimeDb()));
}
