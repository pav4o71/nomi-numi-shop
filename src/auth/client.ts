"use client";

/**
 * Phase 2C3 Better Auth browser client.
 *
 * Client session state is for UX only (forms, header affordances). It is never
 * authorization. Server primitives in `src/auth/authorization.ts` remain
 * authoritative. Role is server-owned (`input: false`); this client must never
 * submit a role field.
 *
 * Phase 2C6: omit `baseURL` so browser requests stay same-origin. That lets
 * local DEV (:3100) and Playwright E2E (:3101) share one client without
 * hard-coding a port. Server `BETTER_AUTH_URL` / trustedOrigins remain the
 * allowlisted loopback origins only.
 */
import { createAuthClient } from "better-auth/react";

import { LOCAL_AUTH_ORIGINS, PHASE2A_AUTH_BASE_PATH, PHASE2A_AUTH_ORIGIN } from "@/auth/env";

export const authClient = createAuthClient({
  basePath: PHASE2A_AUTH_BASE_PATH,
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  requestPasswordReset,
  resetPassword,
  sendVerificationEmail,
} = authClient;

/** Documented Phase 2C3/2C6 client surface for tests and docs. */
export const authClientConstants = {
  packageImport: "better-auth/react",
  /** Documented primary local origin; browser uses same-origin requests. */
  baseURL: PHASE2A_AUTH_ORIGIN,
  allowedLocalOrigins: LOCAL_AUTH_ORIGINS,
  basePath: PHASE2A_AUTH_BASE_PATH,
  roleInputAllowed: false,
  clientStateIsAuthorization: false,
  socialProvidersConfigured: false,
  usesSameOriginRequests: true,
} as const;
