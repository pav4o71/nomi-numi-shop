/**
 * Phase 2C3 public auth UI routes and Phase 2C5 protected surface paths.
 *
 * Public auth pages do not authorize access. Protected surfaces require the
 * server authorization primitives (Phase 2B/2C5).
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
 * Minimal Phase 2C5 protected surfaces + denial landing.
 * Authorization is enforced by server guards / route handlers — not by these
 * path constants alone.
 */
export const PROTECTED_SURFACE_ROUTES = {
  account: "/account",
  admin: "/admin",
  forbidden: "/forbidden",
  apiAccount: "/api/account",
  apiAdmin: "/api/admin",
} as const;

export type ProtectedSurfaceRoute =
  (typeof PROTECTED_SURFACE_ROUTES)[keyof typeof PROTECTED_SURFACE_ROUTES];

/**
 * Verification email callback target.
 * Success lands here after auto-sign-in; failures arrive as `?error=`.
 */
export const AUTH_EMAIL_VERIFICATION_CALLBACK_PATH = AUTH_UI_ROUTES.emailVerified;

/** Password-reset email redirect target (receives ?token= or ?error=). */
export const AUTH_PASSWORD_RESET_REDIRECT_PATH = AUTH_UI_ROUTES.resetPassword;
