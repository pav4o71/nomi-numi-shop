import { expect, test, type Page } from "@playwright/test";

test("renders the public storefront homepage", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.ok()).toBe(true);

  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.getByRole("link", { name: "Nomi Numi" }).first()).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 1, name: "Gifts that help hearts stay close" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Explore Gifts" }).first()).toBeVisible();

  await expect(page.getByRole("heading", { level: 2, name: "Gift directions" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Why Nomi Numi" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "How It Works" })).toBeVisible();
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

test("primary navigation scrolls homepage sections into view", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.scrollTo(0, 0));

  const primaryNav = page.getByRole("navigation", { name: "Primary" });

  await primaryNav.getByRole("link", { name: "Gifts" }).click();
  await expect(page).toHaveURL(/#gifts$/);
  await expectSectionScrolledIntoView(page, "gifts");

  await primaryNav.getByRole("link", { name: "Why Nomi Numi" }).click();
  await expect(page).toHaveURL(/#why-nomi-numi$/);
  await expectSectionScrolledIntoView(page, "why-nomi-numi");

  await primaryNav.getByRole("link", { name: "How It Works" }).click();
  await expect(page).toHaveURL(/#how-it-works$/);
  await expectSectionScrolledIntoView(page, "how-it-works");
});
