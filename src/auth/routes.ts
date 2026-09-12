/**
 * Phase 2C3 public auth UI routes.
 *
 * These are customer-facing pages only. They do not authorize access —
 * server authorization primitives remain the sole authority (Phase 2B/2C5).
 */

export const AUTH_UI_ROUTES = {
  signup: "/signup",
  login: "/login",
  logout: "/logout",
  checkEmail: "/check-email",
  emailVerified: "/email-verified",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
} as const;

export type AuthUiRoute = (typeof AUTH_UI_ROUTES)[keyof typeof AUTH_UI_ROUTES];

/**
 * Verification email callback target.
 * Success lands here after auto-sign-in; failures arrive as `?error=`.
 */
export const AUTH_EMAIL_VERIFICATION_CALLBACK_PATH = AUTH_UI_ROUTES.emailVerified;

/** Password-reset email redirect target (receives ?token= or ?error=). */
export const AUTH_PASSWORD_RESET_REDIRECT_PATH = AUTH_UI_ROUTES.resetPassword;
