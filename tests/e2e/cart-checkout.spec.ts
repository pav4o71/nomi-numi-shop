import { test, expect } from "@playwright/test";
import { CATALOG_PUBLIC_E2E_FIXTURES } from "./helpers/catalog-public";

test.describe("Cart and Checkout Flow", () => {
  test.skip(Boolean(process.env.CI), "cart checkout E2E requires the isolated TEST database");

  test("guest user can add items to cart and complete checkout", async ({ page }) => {
    // Navigate to a product page
    await page.goto(`/products/${CATALOG_PUBLIC_E2E_FIXTURES.productSlug}`);

    // Add to cart
    await page
      .getByRole("button", { name: /Add to Cart/i })
      .first()
      .click({ force: true });

    // Verify cart drawer opens and item is there
    const cartDrawer = page.locator(".fixed.inset-0").last();
    await expect(cartDrawer).toBeVisible();
    await expect(cartDrawer.getByText(/Your Cart/i)).toBeVisible();
    await expect(cartDrawer.getByText(/Plush/i).first()).toBeVisible();

    // Complete checkout
    await cartDrawer.getByLabel("Receipt email").fill("guest-checkout@example.com");
    await cartDrawer.getByRole("button", { name: "Proceed to Checkout" }).click();

    // Verify successful order redirect
    await page.waitForURL(/\/checkout\/.*\/success/);
    await expect(page.getByRole("heading", { name: "Thank you for your order!" })).toBeVisible();
    const successUrl = page.url();

    // Check order summary
    await expect(page.getByText(/Plush/i).first()).toBeVisible();
    await expect(page.locator("text=Qty: 1")).toBeVisible();

    await page.context().clearCookies();
    const unauthorizedResponse = await page.goto(successUrl);
    expect(unauthorizedResponse?.status()).toBe(404);
  });
});
