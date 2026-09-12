import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { authClientConstants } from "@/auth/client";
import { AUTH_UI_ROUTES } from "@/auth/routes";
import {
  AUTH_UI_COPY,
  loginErrorMessage,
  resetPasswordErrorMessage,
  tokenQueryErrorMessage,
} from "@/auth/ui-messages";

function readSrc(...parts: string[]) {
  return readFileSync(path.join(process.cwd(), ...parts), "utf8");
}

const authFormSources = [
  "src/components/auth/signup-form.tsx",
  "src/components/auth/login-form.tsx",
  "src/components/auth/check-email-panel.tsx",
  "src/components/auth/forgot-password-form.tsx",
  "src/components/auth/reset-password-form.tsx",
  "src/components/auth/logout-form.tsx",
  "src/components/auth/auth-header-actions.tsx",
] as const;

const authPageSources = [
  "src/app/signup/page.tsx",
  "src/app/login/page.tsx",
  "src/app/logout/page.tsx",
  "src/app/check-email/page.tsx",
  "src/app/email-verified/page.tsx",
  "src/app/forgot-password/page.tsx",
  "src/app/reset-password/page.tsx",
] as const;

describe("Phase 2C3 auth client + lifecycle UI", () => {
  it("exposes createAuthClient with locked local base URL/path", () => {
    expect(existsSync(path.join(process.cwd(), "src/auth/client.ts"))).toBe(true);
    expect(authClientConstants.packageImport).toBe("better-auth/react");
    expect(authClientConstants.baseURL).toBe("http://127.0.0.1:3100");
    expect(authClientConstants.basePath).toBe("/api/auth");
    expect(authClientConstants.roleInputAllowed).toBe(false);
    expect(authClientConstants.clientStateIsAuthorization).toBe(false);
    expect(authClientConstants.socialProvidersConfigured).toBe(false);

    const clientSource = readSrc("src/auth/client.ts");
    expect(clientSource).toMatch(/from\s+["']better-auth\/react["']/);
    expect(clientSource).toMatch(/createAuthClient/);
    expect(clientSource).not.toMatch(/role\s*:/);
    expect(clientSource).not.toMatch(/socialProviders\s*:/);
    expect(clientSource).toMatch(/Client session state is for UX only/);
    expect(clientSource).toMatch(/clientStateIsAuthorization:\s*false/);
  });

  it("registers the public auth UI routes", () => {
    expect(AUTH_UI_ROUTES).toEqual({
      signup: "/signup",
      login: "/login",
      logout: "/logout",
      checkEmail: "/check-email",
      emailVerified: "/email-verified",
      forgotPassword: "/forgot-password",
      resetPassword: "/reset-password",
    });

    for (const relativePath of authPageSources) {
      expect(existsSync(path.join(process.cwd(), relativePath))).toBe(true);
    }
  });

  it("keeps signup/login/forgot/reset/logout forms free of role or admin inputs", () => {
    for (const relativePath of authFormSources) {
      const source = readSrc(relativePath);
      expect(source).not.toMatch(/\bname=["']role["']/);
      expect(source).not.toMatch(/\bid=["'][^"']*role[^"']*["']/);
      expect(source).not.toMatch(/<select[^>]*role/i);
      expect(source).not.toMatch(/\badmin\b/i);
      expect(source).not.toMatch(/requireAdmin|requireCustomer|getAuthorizationPrincipal/);
    }

    const signup = readSrc("src/components/auth/signup-form.tsx");
    expect(signup).toMatch(/signUp\.email/);
    expect(signup).toMatch(/AUTH_UI_ROUTES\.checkEmail/);
    expect(signup).toMatch(/name=["']name["']/);
    expect(signup).toMatch(/name=["']email["']/);
    expect(signup).toMatch(/name=["']password["']/);
    expect(signup).not.toMatch(/name=["']role["']/);
  });

  it("uses non-enumerating copy for signup, check-email, and forgot-password", () => {
    expect(AUTH_UI_COPY.signupSuccess).toMatch(/if that email can receive/i);
    expect(AUTH_UI_COPY.forgotPasswordGeneric).toMatch(/if an account exists/i);
    expect(AUTH_UI_COPY.checkEmailBody).toMatch(/if an account needs verification/i);
    expect(AUTH_UI_COPY.signupSuccess.toLowerCase()).not.toContain("already registered");
    expect(AUTH_UI_COPY.forgotPasswordGeneric.toLowerCase()).not.toContain("no account");

    const forgot = readSrc("src/components/auth/forgot-password-form.tsx");
    expect(forgot).toMatch(/requestPasswordReset/);
    expect(forgot).toMatch(/AUTH_UI_COPY\.forgotPasswordGeneric/);
    expect(forgot).not.toMatch(/does not exist|no account|not found/i);

    const checkEmail = readSrc("src/components/auth/check-email-panel.tsx");
    expect(checkEmail).toMatch(/sendVerificationEmail/);
    expect(checkEmail).toMatch(/AUTH_UI_COPY\.resendSuccess|AUTH_UI_COPY\.checkEmailBody/);
  });

  it("maps login, reset, and token errors safely", () => {
    expect(loginErrorMessage({ code: "EMAIL_NOT_VERIFIED" })).toBe(AUTH_UI_COPY.loginUnverified);
    expect(loginErrorMessage({ code: "INVALID_EMAIL_OR_PASSWORD" })).toBe(
      AUTH_UI_COPY.loginInvalid,
    );
    expect(loginErrorMessage({ code: "WEIRD" })).toBe(AUTH_UI_COPY.genericFailure);

    expect(tokenQueryErrorMessage("INVALID_TOKEN", "reset")).toBe(AUTH_UI_COPY.resetInvalidToken);
    expect(tokenQueryErrorMessage("TOKEN_EXPIRED", "verification")).toBe(
      AUTH_UI_COPY.verificationInvalid,
    );
    expect(tokenQueryErrorMessage(null, "reset")).toBeNull();

    expect(resetPasswordErrorMessage({ code: "INVALID_TOKEN" })).toBe(
      AUTH_UI_COPY.resetInvalidToken,
    );
    expect(resetPasswordErrorMessage({ code: "PASSWORD_TOO_SHORT" })).toBe(
      AUTH_UI_COPY.passwordTooShort,
    );

    const login = readSrc("src/components/auth/login-form.tsx");
    expect(login).toMatch(/EMAIL_NOT_VERIFIED/);
    expect(login).toMatch(/AUTH_UI_ROUTES\.checkEmail/);
    expect(login).not.toMatch(/emailVerified\s*===?\s*false/);

    const reset = readSrc("src/components/auth/reset-password-form.tsx");
    expect(reset).toMatch(/resetPassword/);
    expect(reset).toMatch(/AUTH_UI_ROUTES\.login/);
    expect(reset).toMatch(/\?reset=1/);
    expect(reset).toMatch(/resetMissingToken|resetInvalidToken/);
  });

  it("documents that client session state is not authorization", () => {
    const header = readSrc("src/components/auth/auth-header-actions.tsx");
    expect(header).toMatch(/useSession/);
    expect(header).toMatch(/authorization/i);
    expect(header).not.toMatch(/requireAdmin|requireCustomer|role\s*===/);

    const logout = readSrc("src/components/auth/logout-form.tsx");
    expect(logout).toMatch(/signOut/);
  });

  it("keeps server authorization module authoritative and unchanged in UI layer", () => {
    const authorization = readSrc("src/auth/authorization.ts");
    expect(authorization).toMatch(/getAuthorizationPrincipal/);
    expect(authorization).toMatch(/requireCustomer/);
    expect(authorization).toMatch(/requireAdmin/);

    for (const relativePath of [...authFormSources, ...authPageSources]) {
      const source = readSrc(relativePath);
      expect(source).not.toMatch(/from\s+["']@\/auth\/authorization["']/);
    }
  });
});
