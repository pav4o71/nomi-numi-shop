import { expect, test } from "@playwright/test";

import {
  FIXTURE_PASSWORD,
  FIXTURE_PASSWORD_NEXT,
  pageApiJson,
  cleanupTestUsersByEmail,
  loginWithPassword,
  logoutCurrentSession,
  mailpitDeleteAll,
  setTestUserRoleByEmail,
  shouldRunLiveAuthE2E,
  signupCustomer,
  uniqueEmail,
  verifyEmailFromMailpit,
  waitForMailpitMessage,
  extractFirstLocalAuthUrl,
} from "./helpers/auth-lifecycle";

/**
 * Phase 2C6 live auth security / lifecycle E2E.
 *
 * Skipped in portable CI (no .env.local / owned Docker). Local `pnpm test:e2e`
 * exercises real browser + Mailpit + TEST Postgres when infrastructure is up.
 */

test.describe("Phase 2C6 live auth security", () => {
  test.skip(
    !shouldRunLiveAuthE2E(),
    "live auth E2E requires local TEST DB/Mailpit (skipped in CI)",
  );

  test.describe.configure({ mode: "serial" });

  const createdEmails: string[] = [];

  test.afterAll(async () => {
    await cleanupTestUsersByEmail(createdEmails);
  });

  test.beforeAll(async () => {
    await mailpitDeleteAll();
  });

  test("email lifecycle: signup → Mailpit verify → session → logout; unverified blocked", async ({
    page,
  }) => {
    const email = uniqueEmail("lifecycle");
    createdEmails.push(email);

    await signupCustomer(page, {
      name: "Lifecycle Customer",
      email,
      password: FIXTURE_PASSWORD,
    });
    await expect(page.locator('input[name="role"]')).toHaveCount(0);

    // Unverified: login must not grant protected access.
    await page.goto("/login");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(FIXTURE_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/check-email/);

    const anonymousAccount = await pageApiJson(page, "/api/account");
    expect(anonymousAccount.status).toBe(401);

    await verifyEmailFromMailpit(page, email);

    // Success is from server session (verified landing), not bare query-string.
    await expect(page.getByRole("heading", { level: 1, name: "Email verified" })).toBeVisible();
    await expect(
      page.getByRole("status").filter({ hasText: /your email is verified/i }),
    ).toBeVisible();

    await page.goto("/account");
    await expect(page.getByTestId("customer-account-surface")).toBeVisible();
    await expect(page.getByTestId("customer-account-surface")).not.toHaveAttribute("data-user-id");

    const customerApi = await pageApiJson(page, "/api/account");
    expect(customerApi.status).toBe(200);
    expect(customerApi.body).toMatchObject({ ok: true, role: "customer" });

    await logoutCurrentSession(page);
    const afterLogout = await pageApiJson(page, "/api/account");
    expect(afterLogout.status).toBe(401);

    await page.goto("/account");
    await expect(page).toHaveURL(/\/login/);
  });

  test("account enumeration: public UX does not distinguish existing vs unknown email", async ({
    page,
  }) => {
    const existing = uniqueEmail("enum-existing");
    const unknown = uniqueEmail("enum-unknown");
    createdEmails.push(existing);

    await signupCustomer(page, {
      name: "Enum Existing",
      email: existing,
      password: FIXTURE_PASSWORD,
    });

    // Duplicate signup → same check-email path (non-enumerating).
    await page.goto("/signup");
    await page.getByLabel("Name", { exact: true }).fill("Enum Dup");
    await page.getByLabel("Email", { exact: true }).fill(existing);
    await page.getByLabel("Password", { exact: true }).fill(FIXTURE_PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/check-email/);
    await expect(page.getByText(/if an account needs verification/i)).toBeVisible();

    const forgotCopy = /if an account exists for that email, we sent password-reset instructions/i;

    async function forgotOutcome(email: string) {
      await page.goto("/forgot-password");
      await page.getByLabel("Email", { exact: true }).fill(email);
      await page.getByRole("button", { name: "Send reset link" }).click();
      const status = page.getByRole("status").filter({ hasText: forgotCopy });
      await expect(status).toBeVisible();
      return status.innerText();
    }

    const existingCopy = await forgotOutcome(existing);
    const unknownCopy = await forgotOutcome(unknown);
    expect(existingCopy).toBe(unknownCopy);

    // Resend verification: same generic success for known and unknown.
    const resendCopy = /if that email can receive messages from us/i;
    async function resendOutcome(email: string) {
      await page.goto("/check-email");
      await page.getByLabel("Email", { exact: true }).fill(email);
      await page.getByRole("button", { name: "Resend verification email" }).click();
      const status = page.getByRole("status").filter({ hasText: resendCopy });
      await expect(status).toBeVisible();
      return status.innerText();
    }

    const resendExisting = await resendOutcome(existing);
    const resendUnknown = await resendOutcome(unknown);
    expect(resendExisting).toBe(resendUnknown);
  });

  test("password reset revokes prior session; old password fails; token one-time when guaranteed", async ({
    page,
    context,
  }) => {
    const email = uniqueEmail("reset");
    createdEmails.push(email);

    await signupCustomer(page, {
      name: "Reset Customer",
      email,
      password: FIXTURE_PASSWORD,
    });
    await verifyEmailFromMailpit(page, email);

    // Establish an authenticated session BEFORE reset.
    await page.goto("/account");
    await expect(page.getByTestId("customer-account-surface")).toBeVisible();
    const beforeReset = await pageApiJson(page, "/api/account");
    expect(beforeReset.status).toBe(200);

    await mailpitDeleteAll();
    await page.goto("/forgot-password");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(
      page.getByRole("status").filter({
        hasText: /if an account exists for that email/i,
      }),
    ).toBeVisible();

    const resetMail = await waitForMailpitMessage({
      to: email,
      subjectIncludes: "Reset your Nomi Numi password",
    });
    const resetUrl = extractFirstLocalAuthUrl(resetMail);

    // Keep the pre-reset cookie jar in `page`; open reset in a separate page.
    const resetPage = await context.newPage();
    await resetPage.goto(resetUrl);
    await resetPage.getByLabel("New password", { exact: true }).fill(FIXTURE_PASSWORD_NEXT);
    await resetPage.getByLabel("Confirm new password", { exact: true }).fill(FIXTURE_PASSWORD_NEXT);
    await resetPage.getByRole("button", { name: "Update password" }).click();
    await expect(resetPage).toHaveURL(/\/login\?reset=1/);
    await resetPage.close();

    // Prior authenticated session must no longer authorize.
    const afterReset = await pageApiJson(page, "/api/account");
    expect(afterReset.status).toBe(401);
    await page.goto("/account");
    await expect(page).toHaveURL(/\/login/);

    // Old password cannot authenticate.
    await page.goto("/login");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(FIXTURE_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: /invalid email or password/i }),
    ).toBeVisible();

    // New password can authenticate.
    await loginWithPassword(page, {
      email,
      password: FIXTURE_PASSWORD_NEXT,
      expectPath: "/",
    });
    await page.goto("/account");
    await expect(page.getByTestId("customer-account-surface")).toBeVisible();

    // Re-use the same reset URL — Better Auth tokens are one-time when configured.
    await page.goto(resetUrl);
    const reuseVisible =
      (await page.getByLabel("New password", { exact: true }).count()) > 0 ||
      (await page.getByRole("alert").count()) > 0;
    expect(reuseVisible).toBe(true);
    if ((await page.getByLabel("New password", { exact: true }).count()) > 0) {
      await page.getByLabel("New password", { exact: true }).fill(`${FIXTURE_PASSWORD_NEXT}x`);
      await page
        .getByLabel("Confirm new password", { exact: true })
        .fill(`${FIXTURE_PASSWORD_NEXT}x`);
      await page.getByRole("button", { name: "Update password" }).click();
      await expect(
        page.getByRole("alert").filter({ hasText: /invalid or has expired|something went wrong/i }),
      ).toBeVisible();
    } else {
      await expect(
        page
          .getByRole("alert")
          .filter({ hasText: /invalid or has expired|missing or incomplete/i }),
      ).toBeVisible();
    }
  });

  test("protected surface role matrix: anonymous / customer / admin", async ({ page }) => {
    const customerEmail = uniqueEmail("matrix-customer");
    const adminEmail = uniqueEmail("matrix-admin");
    createdEmails.push(customerEmail, adminEmail);

    // Anonymous
    await page.goto("/account");
    await expect(page).toHaveURL(/\/login\?next=%2Faccount/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin/);
    expect((await pageApiJson(page, "/api/account")).status).toBe(401);
    expect((await pageApiJson(page, "/api/admin")).status).toBe(401);

    // Customer
    await signupCustomer(page, {
      name: "Matrix Customer",
      email: customerEmail,
      password: FIXTURE_PASSWORD,
    });
    await verifyEmailFromMailpit(page, customerEmail);
    await page.goto("/account");
    await expect(page.getByTestId("customer-account-surface")).toBeVisible();
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/forbidden/);
    expect((await pageApiJson(page, "/api/account")).status).toBe(200);
    expect((await pageApiJson(page, "/api/admin")).status).toBe(403);
    await logoutCurrentSession(page);

    // Admin: verified customer + test-only SQL role assignment (no HTTP promote API).
    // Phase 2C4 bootstrap guarantees remain covered by auth-first-admin-bootstrap-local
    // against TEST (zero-admin / race / DEV-TEST boundary).
    await signupCustomer(page, {
      name: "Matrix Admin",
      email: adminEmail,
      password: FIXTURE_PASSWORD,
    });
    await verifyEmailFromMailpit(page, adminEmail);
    await logoutCurrentSession(page);
    await setTestUserRoleByEmail(adminEmail, "admin");

    await loginWithPassword(page, {
      email: adminEmail,
      password: FIXTURE_PASSWORD,
      expectPath: "/",
    });
    await page.goto("/admin");
    await expect(page.getByTestId("admin-surface")).toBeVisible();
    await expect(page.getByTestId("admin-surface")).not.toHaveAttribute("data-user-id");
    await page.goto("/account");
    await expect(page).toHaveURL(/\/forbidden/);
    expect((await pageApiJson(page, "/api/admin")).status).toBe(200);
    expect((await pageApiJson(page, "/api/account")).status).toBe(403);
  });

  test("invalid role fails closed on pages and APIs", async ({ page }) => {
    const email = uniqueEmail("invalid-role");
    createdEmails.push(email);

    await signupCustomer(page, {
      name: "Invalid Role",
      email,
      password: FIXTURE_PASSWORD,
    });
    await verifyEmailFromMailpit(page, email);
    await setTestUserRoleByEmail(email, null);

    await page.goto("/account");
    await expect(page).toHaveURL(/\/forbidden/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/forbidden/);

    const account = await pageApiJson(page, "/api/account");
    expect(account.status).toBe(403);
    expect(account.body).toEqual({ code: "INVALID_AUTHORIZATION_STATE" });

    const admin = await pageApiJson(page, "/api/admin");
    expect(admin.status).toBe(403);
    expect(admin.body).toEqual({ code: "INVALID_AUTHORIZATION_STATE" });
  });

  test("safe navigation: hostile next values never escape the app origin", async ({ page }) => {
    const hostile = [
      "https://evil.example/phish",
      "//evil.example/phish",
      "javascript:alert(1)",
      "/%2f%2fevil.example",
      encodeURIComponent("https://evil.example"),
    ];

    for (const next of hostile) {
      await page.goto(`/login?next=${encodeURIComponent(next)}`);
      await expect(page).toHaveURL(/\/login$/);
      expect(page.url()).toMatch(/^http:\/\/127\.0\.0\.1:3101\/login$/);
      expect(page.url()).not.toContain("evil.example");
      expect(page.url()).not.toContain("javascript:");
    }

    await page.goto("/login?next=%2Faccount");
    await expect(page).toHaveURL(/\/login\?next=%2Faccount/);

    const email = uniqueEmail("next-safe");
    createdEmails.push(email);
    await signupCustomer(page, {
      name: "Next Safe",
      email,
      password: FIXTURE_PASSWORD,
    });
    await verifyEmailFromMailpit(page, email);
    await logoutCurrentSession(page);

    await page.goto("/login?next=%2Faccount");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(FIXTURE_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/account$/);
    expect(page.url().startsWith("http://127.0.0.1:3101/")).toBe(true);
  });

  test("logout invalidates the prior authenticated session cookie", async ({ page }) => {
    const email = uniqueEmail("logout");
    createdEmails.push(email);

    await signupCustomer(page, {
      name: "Logout Customer",
      email,
      password: FIXTURE_PASSWORD,
    });
    await verifyEmailFromMailpit(page, email);
    expect((await pageApiJson(page, "/api/account")).status).toBe(200);

    await logoutCurrentSession(page);
    expect((await pageApiJson(page, "/api/account")).status).toBe(401);
    await page.goto("/account");
    await expect(page).toHaveURL(/\/login/);
  });
});
