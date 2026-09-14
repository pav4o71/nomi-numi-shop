/**
 * Read-only Playwright helpers for Phase 3D public catalog smoke.
 *
 * Uses deterministic Phase 3C DEV fixtures only.
 * Never seeds, deletes, truncates, or cleans DEV data.
 * Readiness is checked via HTTP against the E2E app (no test-process DB writes).
 */

export function shouldRunCatalogPublicE2E(): boolean {
  return !process.env.CI;
}

/** Stable Phase 3C fixture slugs required for local catalog E2E. */
export const CATALOG_PUBLIC_E2E_FIXTURES = {
  productSlug: "dev-fixture-hug-plush",
  categorySlug: "dev-fixture-plushies",
  collectionSlug: "dev-fixture-christmas",
  draftSlug: "dev-fixture-heart-keychain",
  /** Listing/PDP USD amount for the min-price hug-plush variant. */
  productUsdDisplay: "$24.99",
  productListingPriceDisplay: "From $24.99",
} as const;

const E2E_ORIGIN = "http://127.0.0.1:3101";

const FIXTURE_SETUP_HINT =
  "Phase 3C DEV catalog fixtures are required for local catalog E2E. " +
  "Run manually: pnpm catalog:seed:dev -- --confirm SEED-NOMI-DEV-CATALOG " +
  "(do not auto-seed from tests).";

async function fetchStatus(pathname: string): Promise<number> {
  const response = await fetch(`${E2E_ORIGIN}${pathname}`, {
    redirect: "manual",
  });
  return response.status;
}

async function fetchText(pathname: string): Promise<{ status: number; body: string }> {
  const response = await fetch(`${E2E_ORIGIN}${pathname}`, {
    redirect: "manual",
  });
  const body = await response.text();
  return { status: response.status, body };
}

/**
 * Read-only readiness check against the running E2E app.
 * Throws with an explicit setup requirement when fixtures are missing.
 */
export async function assertDevCatalogFixturesReady(): Promise<void> {
  const { productSlug, categorySlug, collectionSlug, draftSlug } = CATALOG_PUBLIC_E2E_FIXTURES;

  const product = await fetchText(`/products/${productSlug}`);
  if (product.status !== 200) {
    throw new Error(
      `Missing published DEV fixture product "${productSlug}" (HTTP ${product.status}). ${FIXTURE_SETUP_HINT}`,
    );
  }

  const category = await fetchText(`/categories/${categorySlug}`);
  if (category.status !== 200) {
    throw new Error(
      `Missing published DEV fixture category "${categorySlug}" (HTTP ${category.status}). ${FIXTURE_SETUP_HINT}`,
    );
  }
  if (!category.body.includes(`product-card-${productSlug}`)) {
    throw new Error(
      `DEV fixture product "${productSlug}" is not listed under category "${categorySlug}". ${FIXTURE_SETUP_HINT}`,
    );
  }

  const collection = await fetchText(`/collections/${collectionSlug}`);
  if (collection.status !== 200) {
    throw new Error(
      `Missing published DEV fixture collection "${collectionSlug}" (HTTP ${collection.status}). ${FIXTURE_SETUP_HINT}`,
    );
  }
  if (!collection.body.includes(`product-card-${productSlug}`)) {
    throw new Error(
      `DEV fixture product "${productSlug}" is not listed under collection "${collectionSlug}". ${FIXTURE_SETUP_HINT}`,
    );
  }

  const draftStatus = await fetchStatus(`/products/${draftSlug}`);
  if (draftStatus !== 404) {
    throw new Error(
      `Expected draft DEV fixture "${draftSlug}" to be unpublished (HTTP 404), got ${draftStatus}. ${FIXTURE_SETUP_HINT}`,
    );
  }
}
