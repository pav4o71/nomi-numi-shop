"use client";

/**
 * Phase 2C3 Better Auth browser client.
 *
 * Client session state is for UX only (forms, header affordances). It is never
 * authorization. Server primitives in `src/auth/authorization.ts` remain
 * authoritative. Role is server-owned (`input: false`); this client must never
 * submit a role field.
 */
import { createAuthClient } from "better-auth/react";

import { PHASE2A_AUTH_BASE_PATH, PHASE2A_AUTH_ORIGIN } from "@/auth/env";

export const authClient = createAuthClient({
  baseURL: PHASE2A_AUTH_ORIGIN,
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

/** Documented Phase 2C3 client surface for tests and docs. */
export const authClientConstants = {
  packageImport: "better-auth/react",
  baseURL: PHASE2A_AUTH_ORIGIN,
  basePath: PHASE2A_AUTH_BASE_PATH,
  roleInputAllowed: false,
  clientStateIsAuthorization: false,
  socialProvidersConfigured: false,
} as const;
