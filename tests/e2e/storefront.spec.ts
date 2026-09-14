import { expect, test, type Page } from "@playwright/test";

test("renders the public storefront homepage", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.ok()).toBe(true);

  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.getByRole("link", { name: "Nomi Numi" }).first()).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 1, name: "Gifts that help hearts stay close" }),
  ).toBeVisible();
  await expect(
    page.getByRole("main").getByRole("link", { name: "Browse products" }).first(),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Explore Gifts" }).first()).toBeVisible();

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

async function expectSectionScrolledIntoView(page: Page, sectionId: string) {
  await expect
    .poll(async () => {
      return page.evaluate((id) => {
        const section = document.getElementById(id);
        const header = document.querySelector("header");
        if (!section || !header) {
          return false;
        }

        const sectionRect = section.getBoundingClientRect();
        const headerBottom = header.getBoundingClientRect().bottom;

        return (
          sectionRect.top < window.innerHeight &&
          sectionRect.bottom > headerBottom &&
          sectionRect.top <= headerBottom + 32
        );
      }, sectionId);
    })
    .toBe(true);
}

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
  await expect(primaryNav.getByRole("link", { name: "Why Nomi Numi" })).toHaveAttribute(
    "href",
    "/#why-nomi-numi",
  );
  await expect(primaryNav.getByRole("link", { name: "How It Works" })).toHaveAttribute(
    "href",
    "/#how-it-works",
  );
  await expect(page.getByRole("link", { name: "Explore Gifts" }).first()).toHaveAttribute(
    "href",
    "/products",
  );

  await expect(
    main.getByRole("link", { name: "Browse products", exact: true }).first(),
  ).toHaveAttribute("href", "/products");
  await expect(main.getByRole("link", { name: "See how it works", exact: true })).toHaveAttribute(
    "href",
    "/#how-it-works",
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

  await primaryNav.getByRole("link", { name: "Why Nomi Numi" }).click();
  await expect(page).toHaveURL(/\/#why-nomi-numi$/);
  await expectSectionScrolledIntoView(page, "why-nomi-numi");

  await primaryNav.getByRole("link", { name: "How It Works" }).click();
  await expect(page).toHaveURL(/\/#how-it-works$/);
  await expectSectionScrolledIntoView(page, "how-it-works");
});
