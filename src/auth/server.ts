/**
 * Phase 2A/2B/2C2 Better Auth server.
 *
 * Local development only. Phase 2C2 enables email/password with required
 * verification and password reset through the Phase 2C1 email abstraction.
 * Social providers, plugins, and client auth remain intentionally absent.
 */
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";

import { PHASE2A_AUTH_BASE_PATH, PHASE2A_AUTH_ORIGIN, parseAuthRuntimeEnv } from "@/auth/env";
import {
  AUTH_EMAIL_VERIFICATION_EXPIRES_IN_SECONDS,
  AUTH_PASSWORD_RESET_EXPIRES_IN_SECONDS,
  AUTH_SESSION_EXPIRES_IN_SECONDS,
  AUTH_SESSION_UPDATE_AGE_SECONDS,
  authLifecycleConstants,
  dispatchPasswordResetEmail,
  dispatchVerificationEmail,
} from "@/auth/lifecycle";
import { APP_ROLE_ADDITIONAL_FIELD } from "@/auth/roles";
import * as schema from "@/db/schema";
import { getRuntimeDb } from "@/db/runtime";
import { createLocalEmailProvider } from "@/email/index";

type AuthLogLevel = "debug" | "info" | "warn" | "error";

const SAFE_AUTH_LOG_MESSAGES = new Set(["INTERNAL_SERVER_ERROR", "Failed to get session"]);

function sanitizeAuthLogMessage(message: unknown): string {
  return typeof message === "string" && SAFE_AUTH_LOG_MESSAGES.has(message)
    ? message
    : "Authentication request failed";
}

/**
 * Better Auth logger that preserves high-level failures while intentionally
 * dropping arbitrary error/request objects (which may contain bearer tokens,
 * cookies, credentials, or SQL parameters).
 */
export const authLogger = {
  level: "error" as const,
  log(level: AuthLogLevel, message: unknown, ..._args: unknown[]) {
    void _args;
    const line = `[better-auth:${level}] ${sanitizeAuthLogMessage(message)}`;
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  },
};

export type AuthInstance = ReturnType<typeof createAuthInstance>;

const globalForAuth = globalThis as typeof globalThis & {
  __nomiNumiShopAuth?: AuthInstance;
};

function createAuthInstance() {
  const env = parseAuthRuntimeEnv({
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV,
  });

  // Email transport is required for verification/reset. Misconfiguration
  // fails closed as EmailEnvValidationError (infrastructure), not auth denial.
  const emailProvider = createLocalEmailProvider(process.env);

  return betterAuth({
    baseURL: env.baseURL,
    basePath: env.basePath,
    secret: env.secret,
    trustedOrigins: [PHASE2A_AUTH_ORIGIN],
    logger: authLogger,
    database: drizzleAdapter(getRuntimeDb(), {
      provider: "pg",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
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
    session: {
      expiresIn: AUTH_SESSION_EXPIRES_IN_SECONDS,
      updateAge: AUTH_SESSION_UPDATE_AGE_SECONDS,
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: AUTH_PASSWORD_RESET_EXPIRES_IN_SECONDS,
      sendResetPassword: async ({ user, url }) => {
        await dispatchPasswordResetEmail(emailProvider, { to: user.email, url });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: false,
      autoSignInAfterVerification: true,
      expiresIn: AUTH_EMAIL_VERIFICATION_EXPIRES_IN_SECONDS,
      sendVerificationEmail: async ({ user, url }) => {
        await dispatchVerificationEmail(emailProvider, { to: user.email, url });
      },
    },
  });
}

/**
 * Lazily construct the Better Auth instance when an auth route is invoked.
 */
export function getAuth(): AuthInstance {
  if (!globalForAuth.__nomiNumiShopAuth) {
    globalForAuth.__nomiNumiShopAuth = createAuthInstance();
  }
  return globalForAuth.__nomiNumiShopAuth;
}

/** Phase 2A/2B/2C2 constants for tests and documentation alignment. */
export const authFoundationConstants = {
  packageName: "better-auth",
  packageVersion: "1.7.3",
  adapterPackageName: "@better-auth/drizzle-adapter",
  adapterPackageVersion: "1.7.3",
  baseURL: PHASE2A_AUTH_ORIGIN,
  basePath: PHASE2A_AUTH_BASE_PATH,
  emailAndPasswordEnabled: true,
  requireEmailVerification: authLifecycleConstants.requireEmailVerification,
  revokeSessionsOnPasswordReset: authLifecycleConstants.revokeSessionsOnPasswordReset,
  sessionExpiresInSeconds: authLifecycleConstants.sessionExpiresInSeconds,
  sessionUpdateAgeSeconds: authLifecycleConstants.sessionUpdateAgeSeconds,
  emailVerificationExpiresInSeconds: authLifecycleConstants.emailVerificationExpiresInSeconds,
  passwordResetExpiresInSeconds: authLifecycleConstants.passwordResetExpiresInSeconds,
  socialProvidersConfigured: false,
  pluginsConfigured: false,
  adminPluginConfigured: false,
  roleInputAllowed: false,
  defaultAppRole: APP_ROLE_ADDITIONAL_FIELD.defaultValue,
} as const;
