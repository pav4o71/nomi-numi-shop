import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { LOCAL_AUTH_ORIGINS, PHASE2A_AUTH_E2E_ORIGIN, PHASE2A_AUTH_ORIGIN } from "@/auth/env";
import { authLifecycleConstants } from "@/auth/lifecycle";
import { buildLoginHref, resolvePostLoginPath, sanitizeNextPath } from "@/auth/safe-navigation";
import { AUTH_UI_COPY, shouldContinueToCheckEmailAfterSignup } from "@/auth/ui-messages";

function readSrc(...parts: string[]) {
  return readFileSync(path.join(process.cwd(), ...parts), "utf8");
}

/**
 * Portable Phase 2C6 contract coverage. Live browser/Mailpit evidence lives in
 * `tests/e2e/auth-security.spec.ts` (skipped in CI; required locally).
 */
describe("Phase 2C6 auth security closure contracts", () => {
  it("keeps local auth origins allowlisted to DEV and E2E loopback only", () => {
    expect(LOCAL_AUTH_ORIGINS).toEqual([PHASE2A_AUTH_ORIGIN, PHASE2A_AUTH_E2E_ORIGIN]);
    const server = readSrc("src/auth/server.ts");
    expect(server).toMatch(/trustedOrigins:\s*\[\.\.\.LOCAL_AUTH_ORIGINS\]/);
  });

  it("preserves session-revocation and verification policy constants", () => {
    expect(authLifecycleConstants.requireEmailVerification).toBe(true);
    expect(authLifecycleConstants.revokeSessionsOnPasswordReset).toBe(true);
    expect(authLifecycleConstants.emailVerificationExpiresInSeconds).toBe(60 * 60 * 24);
    expect(authLifecycleConstants.passwordResetExpiresInSeconds).toBe(60 * 60);
    expect(authLifecycleConstants.autoSignInAfterVerification).toBe(true);

    const server = readSrc("src/auth/server.ts");
    expect(server).toMatch(/revokeSessionsOnPasswordReset:\s*true/);
    expect(server).toMatch(/requireEmailVerification:\s*true/);
  });

  it("keeps public auth copy non-enumerating for signup/forgot/resend", () => {
    expect(shouldContinueToCheckEmailAfterSignup(null)).toBe(true);
    expect(shouldContinueToCheckEmailAfterSignup({ code: "USER_ALREADY_EXISTS" })).toBe(true);
    expect(shouldContinueToCheckEmailAfterSignup({ code: "INTERNAL_SERVER_ERROR" })).toBe(false);

    expect(AUTH_UI_COPY.forgotPasswordGeneric).toMatch(/if an account exists/i);
    expect(AUTH_UI_COPY.resendSuccess).toMatch(/if that email can receive/i);
    expect(AUTH_UI_COPY.checkEmailBody).toMatch(/if an account needs verification/i);
  });

  it("rejects open-redirect next candidates used in hostile browser cases", () => {
    const hostile = [
      "https://evil.example/phish",
      "//evil.example/phish",
      "javascript:alert(1)",
      "/%2f%2fevil.example",
      encodeURIComponent("https://evil.example"),
      "/\\evil.example",
    ];
    for (const candidate of hostile) {
      expect(sanitizeNextPath(candidate)).toBeNull();
      expect(buildLoginHref("/login", candidate)).toBe("/login");
      expect(resolvePostLoginPath(candidate)).toBe("/");
    }
    expect(sanitizeNextPath("/account")).toBe("/account");
    expect(resolvePostLoginPath("/account")).toBe("/account");
  });

  it("removes data-user-id production hooks from protected surfaces", () => {
    const account = readSrc("src/app/account/page.tsx");
    const admin = readSrc("src/app/admin/page.tsx");
    expect(account).toMatch(/data-testid="customer-account-surface"/);
    expect(admin).toMatch(/data-testid="admin-surface"/);
    expect(account).not.toMatch(/data-user-id=/);
    expect(admin).not.toMatch(/data-user-id=/);
  });

  it("wires live auth security E2E and keeps first-admin regression suites", () => {
    expect(existsSync(path.join(process.cwd(), "tests/e2e/auth-security.spec.ts"))).toBe(true);
    expect(existsSync(path.join(process.cwd(), "tests/e2e/helpers/auth-lifecycle.ts"))).toBe(true);
    expect(
      existsSync(path.join(process.cwd(), "tests/unit/auth-first-admin-bootstrap.test.ts")),
    ).toBe(true);
    expect(
      existsSync(path.join(process.cwd(), "tests/unit/auth-first-admin-bootstrap-local.test.ts")),
    ).toBe(true);

    const e2e = readSrc("tests/e2e/auth-security.spec.ts");
    expect(e2e).toMatch(/shouldRunLiveAuthE2E/);
    expect(e2e).toMatch(/password reset revokes/);
    expect(e2e).toMatch(/account enumeration/);
    expect(e2e).toMatch(/protected surface role matrix/);
    expect(e2e).toMatch(/invalid role fails closed/);
    expect(e2e).toMatch(/safe navigation/);
    expect(e2e).toMatch(/logout invalidates/);
  });
});
