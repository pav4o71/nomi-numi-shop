import { expect, test } from "@playwright/test";

import {
  cleanupCatalogPublicSmoke,
  seedCatalogPublicSmoke,
  shouldRunCatalogPublicE2E,
  type CatalogPublicSmokeIds,
} from "./helpers/catalog-public";

/**
 * Phase 3D public catalog Playwright smoke.
 * Skipped in portable CI (requires owned DEV Postgres + .env.local).
 */

test.describe("Phase 3D public catalog reads", () => {
  test.skip(!shouldRunCatalogPublicE2E(), "catalog public E2E requires local DEV (skipped in CI)");

  let ids: CatalogPublicSmokeIds;

  test.beforeAll(async () => {
    ids = await seedCatalogPublicSmoke();
  });

  test.afterAll(async () => {
    if (ids) {
      await cleanupCatalogPublicSmoke(ids);
    }
  });

  test("lists products and opens PDP", async ({ page }) => {
    const listResponse = await page.goto("/products");
    expect(listResponse?.ok()).toBe(true);
    await expect(page.getByRole("heading", { level: 1, name: "Products" })).toBeVisible();
    await expect(page.getByTestId(`product-card-${ids.productSlug}`)).toBeVisible();
    await expect(page.getByTestId(`product-card-${ids.productSlug}`)).toContainText("$24.99");

    await page.getByTestId(`product-card-${ids.productSlug}`).click();
    await expect(page).toHaveURL(new RegExp(`/products/${ids.productSlug}$`));
    await expect(page.getByTestId("product-detail")).toBeVisible();
    await expect(page.getByTestId("product-detail-price")).toContainText("$24.99");
  });

  test("category and collection pages list eligible membership", async ({ page }) => {
    await page.goto(`/categories/${ids.categorySlug}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByTestId(`product-card-${ids.productSlug}`)).toBeVisible();

    await page.goto(`/collections/${ids.collectionSlug}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByTestId(`product-card-${ids.productSlug}`)).toBeVisible();
  });

  test("draft product slug returns 404", async ({ page }) => {
    const response = await page.goto(`/products/${ids.draftSlug}`);
    expect(response?.status()).toBe(404);
  });
});
