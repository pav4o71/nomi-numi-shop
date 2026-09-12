/**
 * Phase 2C2 locked auth lifecycle constants and email callbacks.
 *
 * Session, verification, and reset TTLs are intentional security policy —
 * do not loosen them casually. Email delivery uses the Phase 2C1 provider
 * abstraction only (local Mailpit in development).
 */
import type { EmailProvider } from "@/email/index";

/** Session cookie lifetime: 7 days. */
export const AUTH_SESSION_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7;

/** Session sliding refresh interval: 1 day. */
export const AUTH_SESSION_UPDATE_AGE_SECONDS = 60 * 60 * 24;

/** Email verification token lifetime: 24 hours. */
export const AUTH_EMAIL_VERIFICATION_EXPIRES_IN_SECONDS = 60 * 60 * 24;

/** Password-reset token lifetime: 1 hour. */
export const AUTH_PASSWORD_RESET_EXPIRES_IN_SECONDS = 60 * 60;

export type AuthEmailDispatchInput = {
  to: string;
  url: string;
};

/**
 * Send the email-verification message through the configured provider.
 * Does not log the URL/token.
 */
export async function dispatchVerificationEmail(
  provider: EmailProvider,
  input: AuthEmailDispatchInput,
): Promise<void> {
  await provider.send({
    to: input.to,
    subject: "Verify your Nomi Numi email",
    text: [
      "Verify your email address for Nomi Numi Shop.",
      "",
      "Open this link to continue:",
      input.url,
      "",
      "If you did not create an account, you can ignore this message.",
    ].join("\n"),
  });
}

/**
 * Send the password-reset message through the configured provider.
 * Does not log the URL/token.
 */
export async function dispatchPasswordResetEmail(
  provider: EmailProvider,
  input: AuthEmailDispatchInput,
): Promise<void> {
  await provider.send({
    to: input.to,
    subject: "Reset your Nomi Numi password",
    text: [
      "A password reset was requested for your Nomi Numi Shop account.",
      "",
      "Open this link to choose a new password:",
      input.url,
      "",
      "If you did not request a reset, you can ignore this message.",
    ].join("\n"),
  });
}

/** Locked Phase 2C2 lifecycle policy surfaced for tests and docs alignment. */
export const authLifecycleConstants = {
  sessionExpiresInSeconds: AUTH_SESSION_EXPIRES_IN_SECONDS,
  sessionUpdateAgeSeconds: AUTH_SESSION_UPDATE_AGE_SECONDS,
  emailVerificationExpiresInSeconds: AUTH_EMAIL_VERIFICATION_EXPIRES_IN_SECONDS,
  passwordResetExpiresInSeconds: AUTH_PASSWORD_RESET_EXPIRES_IN_SECONDS,
  requireEmailVerification: true,
  revokeSessionsOnPasswordReset: true,
  autoSignInAfterVerification: true,
  sendVerificationOnSignUp: true,
  sendVerificationOnSignIn: false,
  socialProvidersConfigured: false,
  pluginsConfigured: false,
  adminPluginConfigured: false,
} as const;
