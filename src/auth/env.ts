/**
 * Pure Phase 2A Better Auth runtime environment validation.
 * Local development only. Fail closed. Never log credential-bearing values.
 */

import {
  DatabaseEnvValidationError,
  parseDatabaseRuntimeEnv,
  type DatabaseRuntimeConfig,
} from "@/db/env";

/** Primary local app origin (pnpm dev). */
export const PHASE2A_AUTH_ORIGIN = "http://127.0.0.1:3100";

/** Playwright E2E app origin (pnpm dev:e2e). Same auth policy; distinct port. */
export const PHASE2A_AUTH_E2E_ORIGIN = "http://127.0.0.1:3101";

/**
 * Allowed local Better Auth base URLs. Loopback only — never production hosts.
 * Phase 2C6 accepts the E2E origin so live browser coverage can run on :3101
 * without redesigning auth.
 */
export const LOCAL_AUTH_ORIGINS = [PHASE2A_AUTH_ORIGIN, PHASE2A_AUTH_E2E_ORIGIN] as const;

export type LocalAuthOrigin = (typeof LOCAL_AUTH_ORIGINS)[number];

export const PHASE2A_AUTH_BASE_PATH = "/api/auth";

const PLACEHOLDER_SECRET_MARKERS = [
  "change-me",
  "changeme",
  "placeholder",
  "your-secret",
  "replace-me",
  "replace_me",
  "replace-with",
  "replace_with",
  "example",
  "todo",
] as const;

export type AuthRuntimeEnvInput = {
  BETTER_AUTH_SECRET?: string | undefined;
  BETTER_AUTH_URL?: string | undefined;
  DATABASE_URL?: string | undefined;
  NODE_ENV?: string | undefined;
  VERCEL?: string | undefined;
  VERCEL_ENV?: string | undefined;
  NOMI_ALLOW_TEST_DB?: string | undefined;
};

export type AuthRuntimeConfig = {
  secret: string;
  baseURL: LocalAuthOrigin;
  basePath: typeof PHASE2A_AUTH_BASE_PATH;
  databaseUrl: string;
  database: DatabaseRuntimeConfig["database"];
};

function isLocalAuthOrigin(value: string): value is LocalAuthOrigin {
  return (LOCAL_AUTH_ORIGINS as readonly string[]).includes(value);
}

export class AuthEnvValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthEnvValidationError";
  }
}

function reject(message: string): never {
  throw new AuthEnvValidationError(message);
}

function isPlaceholderSecret(secret: string): boolean {
  const normalized = secret.trim().toLowerCase();
  return PLACEHOLDER_SECRET_MARKERS.some((marker) => normalized.includes(marker));
}

function parseAuthDatabaseUrl(input: AuthRuntimeEnvInput): DatabaseRuntimeConfig {
  try {
    return parseDatabaseRuntimeEnv({
      DATABASE_URL: input.DATABASE_URL,
      NODE_ENV: input.NODE_ENV,
      VERCEL: input.VERCEL,
      VERCEL_ENV: input.VERCEL_ENV,
      NOMI_ALLOW_TEST_DB: input.NOMI_ALLOW_TEST_DB,
    });
  } catch (error) {
    if (error instanceof DatabaseEnvValidationError) {
      // Preserve auth error identity/messages for existing auth callers/tests.
      // Map the DB-runtime production refusal to the historical auth copy.
      if (error.message === "Database runtime refuses production deployment environments") {
        reject("Phase 2A auth refuses production deployment environments");
      }
      reject(error.message);
    }
    throw error;
  }
}

/**
 * Validate Phase 2A local-only Better Auth runtime environment.
 * Returns structured config. Does not connect to PostgreSQL.
 */
export function parseAuthRuntimeEnv(input: AuthRuntimeEnvInput): AuthRuntimeConfig {
  if (
    input.NODE_ENV === "production" ||
    input.VERCEL === "1" ||
    input.VERCEL_ENV === "production"
  ) {
    reject("Phase 2A auth refuses production deployment environments");
  }

  const secret = input.BETTER_AUTH_SECRET;
  if (typeof secret !== "string" || secret.length === 0) {
    reject("BETTER_AUTH_SECRET is required");
  }
  if (secret.length < 32) {
    reject("BETTER_AUTH_SECRET must be at least 32 characters");
  }
  if (isPlaceholderSecret(secret)) {
    reject("BETTER_AUTH_SECRET must not be a placeholder value");
  }

  const baseURLRaw = input.BETTER_AUTH_URL;
  if (typeof baseURLRaw !== "string" || baseURLRaw.length === 0) {
    reject("BETTER_AUTH_URL is required");
  }

  let baseURL: URL;
  try {
    baseURL = new URL(baseURLRaw);
  } catch {
    reject("BETTER_AUTH_URL must be a valid absolute URL");
  }

  const normalizedBaseURL = baseURL.href.replace(/\/$/, "");
  if (!isLocalAuthOrigin(normalizedBaseURL)) {
    reject(`BETTER_AUTH_URL must be exactly ${PHASE2A_AUTH_ORIGIN} or ${PHASE2A_AUTH_E2E_ORIGIN}`);
  }

  const database = parseAuthDatabaseUrl(input);

  return {
    secret,
    baseURL: normalizedBaseURL,
    basePath: PHASE2A_AUTH_BASE_PATH,
    databaseUrl: database.databaseUrl,
    database: database.database,
  };
}
