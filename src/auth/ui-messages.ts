/**
 * Phase 2C3 safe customer-facing auth copy.
 *
 * Public messages must not reveal whether an email/account exists when the
 * backend is intentionally non-enumerating. Client session/role data is never
 * treated as authorization proof here — these helpers only shape UX text.
 */

export const AUTH_UI_COPY = {
  checkEmailHeading: "Check your email",
  checkEmailBody:
    "If an account needs verification, we sent a link. Open it to continue. The link expires in 24 hours.",
  resendSuccess:
    "If that email can receive messages from us, check your inbox for a verification link.",
  loginInvalid: "Invalid email or password.",
  loginUnverified:
    "Verify your email before signing in. Check your inbox for a verification link, or request a new one.",
  forgotPasswordGeneric:
    "If an account exists for that email, we sent password-reset instructions. The link expires in 1 hour.",
  resetSuccess: "Your password was updated. Sign in with your new password.",
  resetInvalidToken:
    "This password-reset link is invalid or has expired. Request a new one to continue.",
  resetMissingToken: "This password-reset link is missing or incomplete. Request a new one.",
  verificationInvalid:
    "This verification link is invalid or has expired. Request a new verification email to continue.",
  verificationSuccess:
    "Your email is verified. You can continue shopping. If you are not signed in yet, use Sign in.",
  verificationInconclusive:
    "Open the verification link from your email to finish. This page does not confirm verification by itself.",
  logoutSuccess: "You are signed out.",
  genericFailure: "Something went wrong. Please try again.",
  passwordTooShort: "Password must be at least 8 characters.",
  passwordMismatch: "Passwords do not match.",
} as const;

export type AuthClientErrorLike = {
  code?: string | null;
  message?: string | null;
  status?: number | null;
};

export type VerificationLandingState = "error" | "verified" | "inconclusive";

/**
 * Resolve `/email-verified` UX.
 *
 * Absence of `?error=` is not proof of verification. Success is only shown
 * when a server session reports `emailVerified: true` (Better Auth may
 * auto-sign-in after a successful verification click). Query params are never
 * authorization.
 */
export function resolveVerificationLandingState(input: {
  errorParam?: string | null;
  sessionUser?: { emailVerified?: boolean | null } | null;
}): { state: VerificationLandingState; errorMessage: string | null } {
  const errorMessage = tokenQueryErrorMessage(input.errorParam, "verification");
  if (errorMessage) {
    return { state: "error", errorMessage };
  }
  if (input.sessionUser?.emailVerified === true) {
    return { state: "verified", errorMessage: null };
  }
  return { state: "inconclusive", errorMessage: null };
}

/**
 * Signup outcomes that must share the public check-email path so duplicate
 * emails stay non-enumerating. Genuine infrastructure failures stay false.
 */
export function shouldContinueToCheckEmailAfterSignup(
  error: AuthClientErrorLike | null | undefined,
): boolean {
  if (!error) return true;
  const code = error.code?.toUpperCase() ?? "";
  if (code === "USER_ALREADY_EXISTS" || code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") {
    return true;
  }
  if (/already\s+(exists|registered)/i.test(error.message ?? "")) {
    return true;
  }
  return false;
}

/**
 * Map Better Auth client errors to safe login copy.
 * Does not invent account-existence details beyond known verification state.
 */
export function loginErrorMessage(error: AuthClientErrorLike | null | undefined): string {
  const code = error?.code?.toUpperCase() ?? "";
  if (code === "EMAIL_NOT_VERIFIED") {
    return AUTH_UI_COPY.loginUnverified;
  }
  if (code === "INVALID_EMAIL_OR_PASSWORD" || code === "INVALID_PASSWORD") {
    return AUTH_UI_COPY.loginInvalid;
  }
  if (error?.message && /invalid email or password/i.test(error.message)) {
    return AUTH_UI_COPY.loginInvalid;
  }
  return AUTH_UI_COPY.genericFailure;
}

/**
 * Map verification / reset token query errors to safe copy.
 */
export function tokenQueryErrorMessage(
  errorParam: string | null | undefined,
  kind: "verification" | "reset",
): string | null {
  if (!errorParam) return null;
  const normalized = errorParam.toUpperCase();
  if (
    normalized === "INVALID_TOKEN" ||
    normalized === "TOKEN_EXPIRED" ||
    normalized === "EXPIRED_TOKEN"
  ) {
    return kind === "reset" ? AUTH_UI_COPY.resetInvalidToken : AUTH_UI_COPY.verificationInvalid;
  }
  return kind === "reset" ? AUTH_UI_COPY.resetInvalidToken : AUTH_UI_COPY.verificationInvalid;
}

/**
 * Map reset-password submission errors without revealing account state.
 */
export function resetPasswordErrorMessage(error: AuthClientErrorLike | null | undefined): string {
  const code = error?.code?.toUpperCase() ?? "";
  if (code === "INVALID_TOKEN" || code === "TOKEN_EXPIRED" || code === "EXPIRED_TOKEN") {
    return AUTH_UI_COPY.resetInvalidToken;
  }
  if (code === "PASSWORD_TOO_SHORT") {
    return AUTH_UI_COPY.passwordTooShort;
  }
  return AUTH_UI_COPY.genericFailure;
}
