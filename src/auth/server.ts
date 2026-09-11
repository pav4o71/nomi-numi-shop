/**
 * Phase 2A Better Auth server foundation.
 *
 * Local development only. Email/password, social providers, plugins,
 * roles, and client auth are intentionally absent.
 */
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";

import { PHASE2A_AUTH_BASE_PATH, PHASE2A_AUTH_ORIGIN, parseAuthRuntimeEnv } from "@/auth/env";
import * as schema from "@/db/schema";
import { getRuntimeDb } from "@/db/runtime";

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

/** Phase 2A constants for tests and documentation alignment. */
export const authFoundationConstants = {
  packageName: "better-auth",
  packageVersion: "1.7.3",
  adapterPackageName: "@better-auth/drizzle-adapter",
  adapterPackageVersion: "1.7.3",
  baseURL: PHASE2A_AUTH_ORIGIN,
  basePath: PHASE2A_AUTH_BASE_PATH,
  emailAndPasswordEnabled: false,
  socialProvidersConfigured: false,
  pluginsConfigured: false,
} as const;
