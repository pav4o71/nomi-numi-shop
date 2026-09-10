import { expect, test } from "@playwright/test";

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
