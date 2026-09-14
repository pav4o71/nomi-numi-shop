import { expect, test } from "@playwright/test";

import {
  assertDevCatalogFixturesReady,
  CATALOG_PUBLIC_E2E_FIXTURES,
  shouldRunCatalogPublicE2E,
} from "./helpers/catalog-public";

/**
 * Phase 3D public catalog Playwright smoke (local only).
 * Read-only against Phase 3C DEV fixtures. Skipped in portable CI.
 */

test.describe("Phase 3D public catalog reads", () => {
  test.skip(!shouldRunCatalogPublicE2E(), "catalog public E2E requires local DEV (skipped in CI)");

  test.beforeAll(async () => {
    await assertDevCatalogFixturesReady();
  });

  test("lists products and opens PDP", async ({ page }) => {
    const { productSlug, productListingPriceDisplay, productUsdDisplay } =
      CATALOG_PUBLIC_E2E_FIXTURES;

    const listResponse = await page.goto("/products");
    expect(listResponse?.ok()).toBe(true);
    await expect(page.getByRole("heading", { level: 1, name: "Products" })).toBeVisible();
    await expect(page.getByTestId(`product-card-${productSlug}`)).toBeVisible();
    await expect(page.getByTestId(`product-card-${productSlug}`)).toContainText(
      productListingPriceDisplay,
    );

    await page.getByTestId(`product-card-${productSlug}`).click();
    await expect(page).toHaveURL(new RegExp(`/products/${productSlug}$`));
    await expect(page.getByTestId("product-detail")).toBeVisible();
    await expect(page.getByTestId("product-detail-price")).toContainText(productUsdDisplay);
  });

  test("category and collection pages list eligible membership", async ({ page }) => {
    const { productSlug, categorySlug, collectionSlug } = CATALOG_PUBLIC_E2E_FIXTURES;

    await page.goto(`/categories/${categorySlug}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByTestId(`product-card-${productSlug}`)).toBeVisible();

    await page.goto(`/collections/${collectionSlug}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByTestId(`product-card-${productSlug}`)).toBeVisible();
  });

  test("draft product slug returns 404", async ({ page }) => {
    const response = await page.goto(`/products/${CATALOG_PUBLIC_E2E_FIXTURES.draftSlug}`);
    expect(response?.status()).toBe(404);
  });

  test("catalog nav story anchors return to homepage sections", async ({ page }) => {
    await page.goto("/products");
    const primaryNav = page.getByRole("navigation", { name: "Primary" });

    await primaryNav.getByRole("link", { name: "Why Nomi Numi" }).click();
    await expect(page).toHaveURL(/\/#why-nomi-numi$/);
    await expect(page.getByRole("heading", { level: 2, name: "Why Nomi Numi" })).toBeVisible();

    await page.goto("/categories");
    await primaryNav.getByRole("link", { name: "How It Works" }).click();
    await expect(page).toHaveURL(/\/#how-it-works$/);
    await expect(page.getByRole("heading", { level: 2, name: "How It Works" })).toBeVisible();
  });
});
