import { readFileSync } from "node:fs";
import path from "node:path";

import { parseUserInput } from "better-auth/db";
import { describe, expect, it, vi } from "vitest";

import {
  AuthorizationError,
  getAuthorizationPrincipal,
  requireAdmin,
  requireAuthenticated,
  requireCustomer,
} from "@/auth/authorization";
import { AuthEnvValidationError } from "@/auth/env";
import {
  AUTH_EMAIL_VERIFICATION_EXPIRES_IN_SECONDS,
  AUTH_PASSWORD_RESET_EXPIRES_IN_SECONDS,
  AUTH_SESSION_EXPIRES_IN_SECONDS,
  AUTH_SESSION_UPDATE_AGE_SECONDS,
  authLifecycleConstants,
  dispatchPasswordResetEmail,
  dispatchVerificationEmail,
} from "@/auth/lifecycle";
import { APP_ROLE_ADDITIONAL_FIELD, APP_ROLES, DEFAULT_APP_ROLE } from "@/auth/roles";
import { authFoundationConstants, getAuth } from "@/auth/server";
import { EmailEnvValidationError } from "@/email/env";
import type { EmailMessage, EmailProvider } from "@/email/index";

vi.mock("@/auth/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/auth/server")>();
  return {
    ...actual,
    getAuth: vi.fn(),
  };
});

const serverSource = readFileSync(path.join(process.cwd(), "src/auth/server.ts"), "utf8");

function roleFieldOptions() {
  return {
    user: {
      additionalFields: {
        role: {
          type: [...APP_ROLE_ADDITIONAL_FIELD.type],
          required: APP_ROLE_ADDITIONAL_FIELD.required,
          defaultValue: APP_ROLE_ADDITIONAL_FIELD.defaultValue,
          input: APP_ROLE_ADDITIONAL_FIELD.input,
          returned: APP_ROLE_ADDITIONAL_FIELD.returned,
        },
      },
    },
  };
}

class RecordingEmailProvider implements EmailProvider {
  readonly providerId = "mailpit";
  readonly sent: EmailMessage[] = [];

  async send(message: EmailMessage): Promise<void> {
    this.sent.push(message);
  }
}

describe("Phase 2C2 auth lifecycle policy", () => {
  it("locks session, verification, and reset TTLs exactly", () => {
    expect(AUTH_SESSION_EXPIRES_IN_SECONDS).toBe(60 * 60 * 24 * 7);
    expect(AUTH_SESSION_UPDATE_AGE_SECONDS).toBe(60 * 60 * 24);
    expect(AUTH_EMAIL_VERIFICATION_EXPIRES_IN_SECONDS).toBe(60 * 60 * 24);
    expect(AUTH_PASSWORD_RESET_EXPIRES_IN_SECONDS).toBe(60 * 60);

    expect(authLifecycleConstants).toMatchObject({
      sessionExpiresInSeconds: 604800,
      sessionUpdateAgeSeconds: 86400,
      emailVerificationExpiresInSeconds: 86400,
      passwordResetExpiresInSeconds: 3600,
      requireEmailVerification: true,
      revokeSessionsOnPasswordReset: true,
      autoSignInAfterVerification: true,
      sendVerificationOnSignUp: true,
      sendVerificationOnSignIn: false,
    });

    expect(authFoundationConstants.sessionExpiresInSeconds).toBe(604800);
    expect(authFoundationConstants.sessionUpdateAgeSeconds).toBe(86400);
    expect(authFoundationConstants.emailVerificationExpiresInSeconds).toBe(86400);
    expect(authFoundationConstants.passwordResetExpiresInSeconds).toBe(3600);
    expect(authFoundationConstants.requireEmailVerification).toBe(true);
    expect(authFoundationConstants.revokeSessionsOnPasswordReset).toBe(true);
  });

  it("enables email/password with required verification and session revocation on reset", () => {
    expect(authFoundationConstants.emailAndPasswordEnabled).toBe(true);
    expect(serverSource).toMatch(/emailAndPassword\s*:\s*\{/);
    expect(serverSource).toMatch(/enabled:\s*true/);
    expect(serverSource).toMatch(/requireEmailVerification:\s*true/);
    expect(serverSource).toMatch(/revokeSessionsOnPasswordReset:\s*true/);
    expect(serverSource).toMatch(
      /resetPasswordTokenExpiresIn:\s*AUTH_PASSWORD_RESET_EXPIRES_IN_SECONDS/,
    );
    expect(serverSource).toMatch(/emailVerification\s*:\s*\{/);
    expect(serverSource).toMatch(/expiresIn:\s*AUTH_EMAIL_VERIFICATION_EXPIRES_IN_SECONDS/);
    expect(serverSource).toMatch(/sendOnSignUp:\s*true/);
    expect(serverSource).toMatch(/autoSignInAfterVerification:\s*true/);
    expect(serverSource).toMatch(/expiresIn:\s*AUTH_SESSION_EXPIRES_IN_SECONDS/);
    expect(serverSource).toMatch(/updateAge:\s*AUTH_SESSION_UPDATE_AGE_SECONDS/);
  });

  it("keeps social providers and Better Auth plugins disabled", () => {
    expect(authFoundationConstants.socialProvidersConfigured).toBe(false);
    expect(authFoundationConstants.pluginsConfigured).toBe(false);
    expect(authFoundationConstants.adminPluginConfigured).toBe(false);
    expect(authLifecycleConstants.socialProvidersConfigured).toBe(false);
    expect(authLifecycleConstants.pluginsConfigured).toBe(false);
    expect(authLifecycleConstants.adminPluginConfigured).toBe(false);

    expect(serverSource).not.toMatch(/socialProviders\s*:/);
    expect(serverSource).not.toMatch(/plugins\s*:/);
    expect(serverSource).not.toMatch(/nextCookies/);
    expect(serverSource).not.toMatch(/from\s+["']better-auth\/plugins["']/);
    expect(serverSource).not.toMatch(/\badmin\s*\(/);
  });

  it("assigns customer-only defaults and rejects admin input injection", () => {
    expect(APP_ROLES).toEqual(["customer", "admin"]);
    expect(DEFAULT_APP_ROLE).toBe("customer");
    expect(APP_ROLE_ADDITIONAL_FIELD.input).toBe(false);
    expect(APP_ROLE_ADDITIONAL_FIELD.defaultValue).toBe("customer");
    expect(authFoundationConstants.roleInputAllowed).toBe(false);
    expect(authFoundationConstants.defaultAppRole).toBe("customer");

    const options = roleFieldOptions();
    expect(parseUserInput(options, { role: "admin" }, "create")).toEqual({ role: "customer" });
    expect(parseUserInput(options, { role: "customer" }, "create")).toEqual({ role: "customer" });
    expect(parseUserInput(options, {}, "create")).toEqual({ role: "customer" });
    expect(() => parseUserInput(options, { role: "admin" }, "update")).toThrow(/not allowed/i);
  });

  it("documents unverified sign-in rejection via requireEmailVerification", () => {
    // Better Auth refuses session creation for unverified credential sign-in
    // when requireEmailVerification is true (see sign-in EMAIL_NOT_VERIFIED).
    expect(authFoundationConstants.requireEmailVerification).toBe(true);
    expect(authLifecycleConstants.requireEmailVerification).toBe(true);
    expect(serverSource).toMatch(/requireEmailVerification:\s*true/);
    expect(serverSource).toMatch(/autoSignInAfterVerification:\s*true/);
  });

  it("wires verification and reset email callbacks through the Phase 2C1 provider", async () => {
    expect(serverSource).toMatch(/createLocalEmailProvider/);
    expect(serverSource).toMatch(/dispatchVerificationEmail/);
    expect(serverSource).toMatch(/dispatchPasswordResetEmail/);
    expect(serverSource).toMatch(/sendVerificationEmail:/);
    expect(serverSource).toMatch(/sendResetPassword:/);

    const provider = new RecordingEmailProvider();
    const verificationUrl =
      "http://127.0.0.1:3100/api/auth/verify-email?token=VERIFICATION_TOKEN_VALUE";
    const resetUrl = "http://127.0.0.1:3100/api/auth/reset-password/RESET_TOKEN_VALUE";

    await dispatchVerificationEmail(provider, {
      to: "customer@example.com",
      url: verificationUrl,
    });
    await dispatchPasswordResetEmail(provider, {
      to: "customer@example.com",
      url: resetUrl,
    });

    expect(provider.sent).toHaveLength(2);
    expect(provider.sent[0]?.to).toBe("customer@example.com");
    expect(provider.sent[0]?.subject).toMatch(/verify/i);
    expect(provider.sent[0]?.text).toContain(verificationUrl);
    expect(provider.sent[1]?.to).toBe("customer@example.com");
    expect(provider.sent[1]?.subject).toMatch(/reset/i);
    expect(provider.sent[1]?.text).toContain(resetUrl);
  });

  it("keeps forgot-password recovery generic in Better Auth configuration", () => {
    // Better Auth request-password-reset always returns the same message
    // whether or not the account exists; requireEmailVerification also
    // enables non-enumerating duplicate signup responses.
    expect(serverSource).toMatch(/sendResetPassword:/);
    expect(serverSource).toMatch(/requireEmailVerification:\s*true/);
    expect(authFoundationConstants.requireEmailVerification).toBe(true);
  });

  it("preserves authorization and infrastructure-error semantics", async () => {
    const getSession = vi.fn().mockResolvedValue(null);
    vi.mocked(getAuth).mockReturnValue({
      api: { getSession },
    } as unknown as ReturnType<typeof getAuth>);

    const headers = new Headers();
    await expect(getAuthorizationPrincipal(headers)).resolves.toBeNull();
    await expect(requireAuthenticated(headers)).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });

    getSession.mockResolvedValue({ user: { id: "c1", role: "customer" } });
    await expect(requireCustomer(headers)).resolves.toEqual({
      userId: "c1",
      role: "customer",
    });
    await expect(requireAdmin(headers)).rejects.toMatchObject({ code: "FORBIDDEN" });

    const authConfigFailure = new AuthEnvValidationError("TEST_SENTINEL_AUTH_CONFIG");
    vi.mocked(getAuth).mockImplementation(() => {
      throw authConfigFailure;
    });
    await expect(requireAuthenticated(headers)).rejects.toBe(authConfigFailure);
    expect(authConfigFailure).not.toBeInstanceOf(AuthorizationError);

    const emailConfigFailure = new EmailEnvValidationError("TEST_SENTINEL_EMAIL_CONFIG");
    vi.mocked(getAuth).mockImplementation(() => {
      throw emailConfigFailure;
    });
    await expect(requireAuthenticated(headers)).rejects.toBe(emailConfigFailure);
    expect(emailConfigFailure).not.toBeInstanceOf(AuthorizationError);
  });
});
