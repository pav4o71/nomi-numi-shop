import { expect, test } from "@playwright/test";

test("renders the public storefront homepage", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.ok()).toBe(true);

  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.getByRole("link", { name: "Nomi Numi" }).first()).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 1, name: "Gifts for soft hearts" }),
  ).toBeVisible();
  await expect(
    page.getByRole("main").getByRole("link", { name: "Shop Plush" }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("main").getByRole("link", { name: "Shop Gifts" }).first(),
  ).toBeVisible();

  await expect(page.getByRole("heading", { level: 2, name: "Gift directions" })).toBeVisible();
  await expect(page.locator("#gifts")).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Shop destinations" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Why Nomi Numi" })).toBeVisible();
  await expect(page.locator("#why-nomi-numi")).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "How It Works" })).toBeVisible();
  await expect(page.locator("#how-it-works")).toBeVisible();
  await expect(page.getByRole("contentinfo")).toBeVisible();
  await expect(page.getByRole("contentinfo").getByText("Nomi Numi", { exact: true })).toBeVisible();
});

/**
 * Portable CI storefront smoke: homepage + href contracts only.
 * Must remain database-free. Do not navigate to /products (or other catalog
 * routes) here — catalog navigation lives in local-only catalog-public.spec.ts.
 */
test("primary navigation includes catalog hrefs and homepage section anchors", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.scrollTo(0, 0));

  const primaryNav = page.getByRole("navigation", { name: "Primary" });
  const main = page.getByRole("main");

  await expect(primaryNav.getByRole("link", { name: "Products" })).toHaveAttribute(
    "href",
    "/products",
  );
  await expect(primaryNav.getByRole("link", { name: "Categories" })).toHaveAttribute(
    "href",
    "/categories",
  );
  await expect(primaryNav.getByRole("link", { name: "Collections" })).toHaveAttribute(
    "href",
    "/collections",
  );
  await expect(primaryNav.getByRole("link", { name: "Gifts" })).toHaveAttribute("href", "/gifts");
  await expect(primaryNav.getByRole("link", { name: "About" })).toHaveAttribute("href", "/about");

  await expect(main.getByRole("link", { name: "Shop Plush", exact: true }).first()).toHaveAttribute(
    "href",
    "/collections",
  );
  await expect(main.getByRole("link", { name: "Shop Gifts", exact: true }).first()).toHaveAttribute(
    "href",
    "/gifts",
  );
  await expect(main.getByRole("heading", { level: 2, name: "Shop destinations" })).toBeVisible();
  await expect(main.getByRole("link", { name: /^Products\b/ })).toHaveAttribute(
    "href",
    "/products",
  );
  await expect(main.getByRole("link", { name: /^Categories\b/ })).toHaveAttribute(
    "href",
    "/categories",
  );
  await expect(main.getByRole("link", { name: /^Collections\b/ })).toHaveAttribute(
    "href",
    "/collections",
  );
  await expect(main.getByText("Browse categories", { exact: true })).toBeVisible();
  await expect(main.getByText("Explore collections", { exact: true }).first()).toBeVisible();
});
