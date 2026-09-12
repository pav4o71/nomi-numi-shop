import { expect, test } from "@playwright/test";

const authPages = [
  {
    path: "/signup",
    heading: "Create your account",
    fields: ["Name", "Email", "Password"],
    submit: "Create account",
  },
  {
    path: "/login",
    heading: "Sign in",
    fields: ["Email", "Password"],
    submit: "Sign in",
  },
  {
    path: "/check-email",
    heading: "Check your email",
    fields: ["Email"],
    submit: "Resend verification email",
  },
  {
    path: "/forgot-password",
    heading: "Forgot password",
    fields: ["Email"],
    submit: "Send reset link",
  },
  {
    path: "/reset-password",
    heading: "Reset password",
    fields: [],
    submit: null,
  },
  {
    path: "/logout",
    heading: "Sign out",
    fields: [],
    submit: "Sign out",
  },
  {
    path: "/email-verified",
    heading: "Email verified",
    fields: [],
    submit: null,
  },
] as const;

for (const pageConfig of authPages) {
  test(`renders auth UI ${pageConfig.path} without role controls`, async ({ page }) => {
    const response = await page.goto(pageConfig.path);
    expect(response?.ok()).toBe(true);

    await expect(page.getByRole("heading", { level: 1, name: pageConfig.heading })).toBeVisible();

    for (const label of pageConfig.fields) {
      await expect(page.getByLabel(label, { exact: true })).toBeVisible();
    }

    if (pageConfig.submit) {
      await expect(page.getByRole("button", { name: pageConfig.submit })).toBeVisible();
    }

    await expect(page.locator('input[name="role"]')).toHaveCount(0);
    await expect(page.locator("#role")).toHaveCount(0);
    await expect(page.getByLabel(/role|admin/i)).toHaveCount(0);
    await expect(page.getByText(/choose role|select role|become admin/i)).toHaveCount(0);
  });
}

test("reset-password shows invalid-token UX", async ({ page }) => {
  await page.goto("/reset-password?error=INVALID_TOKEN");
  await expect(page.getByRole("alert")).toContainText(/invalid or has expired/i);
  await expect(page.getByRole("link", { name: /request a new reset link/i })).toBeVisible();
  await expect(page.getByLabel("New password")).toHaveCount(0);
});

test("email-verified shows invalid-token UX", async ({ page }) => {
  await page.goto("/email-verified?error=TOKEN_EXPIRED");
  await expect(page.getByRole("heading", { level: 1, name: "Verification needed" })).toBeVisible();
  await expect(page.getByRole("alert")).toContainText(/invalid or has expired/i);
  await expect(page.getByRole("link", { name: /request a new verification email/i })).toBeVisible();
});

test("header exposes sign-in and sign-up when signed out", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign up" })).toBeVisible();
});
