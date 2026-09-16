/**
 * Playwright helpers for Phase 2C6 live auth/security coverage.
 * Uses project-owned Mailpit (127.0.0.1:18025) and unique fixture emails.
 */
import { expect, type APIRequestContext, type Page } from "@playwright/test";
import postgres from "postgres";

import { loadValidatedCredentials } from "../../../scripts/drizzle-credentials.mjs";

export const E2E_ORIGIN = "http://127.0.0.1:3101";
export const MAILPIT_API = "http://127.0.0.1:18025";

export const FIXTURE_PASSWORD = "Phase2C6-Test-Password!";
export const FIXTURE_PASSWORD_NEXT = "Phase2C6-Test-Password-Next!";

export function uniqueEmail(label: string): string {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `phase2c6-${label}-${stamp}@example.com`;
}

type MailpitMessageSummary = {
  ID: string;
  Subject: string;
  To?: Array<{ Address?: string }>;
  Created?: string;
};

type MailpitMessage = {
  ID: string;
  Subject: string;
  Text?: string;
  HTML?: string;
};

function openTestSql() {
  const credentials = loadValidatedCredentials("test");
  return postgres({
    host: credentials.host,
    port: credentials.port,
    database: credentials.database,
    username: credentials.user,
    password: credentials.password,
    max: 1,
    idle_timeout: 5,
    connect_timeout: 10,
    prepare: false,
  });
}

export async function mailpitDeleteAll(): Promise<void> {
  await fetch(`${MAILPIT_API}/api/v1/messages`, { method: "DELETE" });
}

export async function waitForMailpitMessage(options: {
  to: string;
  subjectIncludes: string;
  timeoutMs?: number;
}): Promise<MailpitMessage> {
  const timeoutMs = options.timeoutMs ?? 20_000;
  const deadline = Date.now() + timeoutMs;
  const needle = options.to.toLowerCase();
  const subjectNeedle = options.subjectIncludes.toLowerCase();

  while (Date.now() < deadline) {
    const listRes = await fetch(`${MAILPIT_API}/api/v1/messages?limit=50`);
    if (!listRes.ok) {
      throw new Error(`Mailpit list failed: ${listRes.status}`);
    }
    const listJson = (await listRes.json()) as { messages?: MailpitMessageSummary[] };
    const candidates = (listJson.messages ?? []).filter((message) => {
      const toMatch = (message.To ?? []).some(
        (recipient) => (recipient.Address ?? "").toLowerCase() === needle,
      );
      const subjectMatch = message.Subject.toLowerCase().includes(subjectNeedle);
      return toMatch && subjectMatch;
    });

    if (candidates.length > 0) {
      const newest = candidates[0]!;
      const detailRes = await fetch(`${MAILPIT_API}/api/v1/message/${newest.ID}`);
      if (!detailRes.ok) {
        throw new Error(`Mailpit message fetch failed: ${detailRes.status}`);
      }
      return (await detailRes.json()) as MailpitMessage;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(
    `Timed out waiting for Mailpit message to=${options.to} subject~=${options.subjectIncludes}`,
  );
}

export function extractFirstLocalAuthUrl(message: MailpitMessage): string {
  const body = `${message.Text ?? ""}\n${message.HTML ?? ""}`;
  const match = body.match(/https?:\/\/127\.0\.0\.1:310[01][^\s"'<>]+/i);
  if (!match) {
    throw new Error("No local auth URL found in Mailpit message body");
  }
  return match[0]!.replace(/&amp;/g, "&");
}

export async function signupCustomer(
  page: Page,
  input: {
    name: string;
    email: string;
    password: string;
  },
): Promise<void> {
  await page.goto("/signup");
  await page.getByLabel("Name", { exact: true }).fill(input.name);
  await page.getByLabel("Email", { exact: true }).fill(input.email);
  await page.getByLabel("Password", { exact: true }).fill(input.password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/check-email/);
  await expect(page.getByRole("heading", { level: 1, name: "Check your email" })).toBeVisible();
}

export async function verifyEmailFromMailpit(page: Page, email: string): Promise<void> {
  const message = await waitForMailpitMessage({
    to: email,
    subjectIncludes: "Verify your Nomi Numi email",
  });
  const url = extractFirstLocalAuthUrl(message);
  await page.goto(url);
  await expect(page.getByRole("heading", { level: 1, name: "Email verified" })).toBeVisible({
    timeout: 15_000,
  });
}

export async function loginWithPassword(
  page: Page,
  input: { email: string; password: string; expectPath?: RegExp | string },
): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(input.email);
  await page.getByLabel("Password", { exact: true }).fill(input.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  if (input.expectPath) {
    await expect(page).toHaveURL(input.expectPath);
  }
}

export async function logoutCurrentSession(page: Page): Promise<void> {
  await page.goto("/logout");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/");
}

export async function apiJson(
  request: APIRequestContext,
  path: string,
): Promise<{ status: number; body: unknown }> {
  const response = await request.get(path);
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { status: response.status(), body };
}

/** Prefer page/context request so auth cookies from the browser are included. */
export async function pageApiJson(
  page: Page,
  path: string,
): Promise<{ status: number; body: unknown }> {
  return apiJson(page.request, path);
}

/**
 * Delete fixture users by email from TEST (auth runtime DB). Does not print secrets.
 */
export async function cleanupTestUsersByEmail(emails: string[]): Promise<void> {
  if (emails.length === 0) return;
  const sql = openTestSql();
  try {
    await sql`
      DELETE FROM "session"
      WHERE "user_id" IN (SELECT id FROM "user" WHERE email = ANY(${emails}))
    `;
    await sql`
      DELETE FROM "account"
      WHERE "user_id" IN (SELECT id FROM "user" WHERE email = ANY(${emails}))
    `;
    await sql`DELETE FROM "verification" WHERE identifier = ANY(${emails})`;
    await sql`DELETE FROM "user" WHERE email = ANY(${emails})`;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

/**
 * Test-only role mutation via SQL (no HTTP/admin promote API).
 * Used for invalid-role fail-closed and admin surface matrix isolation.
 */
export async function setTestUserRoleByEmail(
  email: string,
  role: "customer" | "admin" | null,
): Promise<void> {
  const sql = openTestSql();
  try {
    await sql`UPDATE "user" SET role = ${role}, updated_at = now() WHERE email = ${email}`;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

/**
 * Live auth E2E requires local .env.local + owned TEST Postgres + Mailpit.
 * Portable CI has none of those — skip rather than fail the quality gate.
 */
export function shouldRunLiveAuthE2E(): boolean {
  if (process.env.CI === "true" || process.env.CI === "1") {
    return false;
  }
  if (process.env.NOMI_AUTH_E2E === "0") {
    return false;
  }
  return true;
}
