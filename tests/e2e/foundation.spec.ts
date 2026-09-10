import { expect, test } from "@playwright/test";

test("renders the Phase 1A application foundation", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.ok()).toBe(true);
  await expect(page.getByRole("heading", { level: 1, name: "Nomi Numi Shop" })).toBeVisible();
  await expect(page.getByText("Application Foundation", { exact: true })).toBeVisible();
  await expect(page.getByText("Phase 1A", { exact: true })).toBeVisible();
});
