/**
 * Pure Phase 2A Better Auth runtime environment validation.
 * Local development only. Fail closed. Never log credential-bearing values.
 */

export const PHASE2A_AUTH_ORIGIN = "http://127.0.0.1:3100";
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
};

export type AuthRuntimeConfig = {
  secret: string;
  baseURL: typeof PHASE2A_AUTH_ORIGIN;
  basePath: typeof PHASE2A_AUTH_BASE_PATH;
  databaseUrl: string;
  database: {
    protocol: "postgres" | "postgresql";
    hostname: "127.0.0.1";
    port: 55432;
    database: "nomi_numi_shop_dev";
    username: "nomi_numi_dev";
  };
};

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

  if (baseURL.href.replace(/\/$/, "") !== PHASE2A_AUTH_ORIGIN) {
    reject(`BETTER_AUTH_URL must be exactly ${PHASE2A_AUTH_ORIGIN}`);
  }

  const databaseUrl = input.DATABASE_URL;
  if (typeof databaseUrl !== "string" || databaseUrl.length === 0) {
    reject("DATABASE_URL is required");
  }

  let parsedDb: URL;
  try {
    parsedDb = new URL(databaseUrl);
  } catch {
    reject("DATABASE_URL must be a valid PostgreSQL URL");
  }

  if (parsedDb.search !== "" || parsedDb.hash !== "") {
    reject("DATABASE_URL must not include query parameters or fragments");
  }

  const protocol = parsedDb.protocol.replace(/:$/, "");
  if (protocol !== "postgres" && protocol !== "postgresql") {
    reject("DATABASE_URL protocol must be postgres or postgresql");
  }

  if (parsedDb.hostname !== "127.0.0.1") {
    reject("DATABASE_URL hostname must be 127.0.0.1");
  }

  const port = parsedDb.port === "" ? 5432 : Number(parsedDb.port);
  if (port === 5433) {
    reject("DATABASE_URL must not target protected port 5433");
  }
  if (port !== 55432) {
    reject("DATABASE_URL port must be 55432 (DEV)");
  }

  const databaseName = decodeURIComponent(parsedDb.pathname.replace(/^\//, ""));
  if (databaseName === "nomi_numi_shop_test") {
    reject("DATABASE_URL must not target the TEST database");
  }
  if (databaseName !== "nomi_numi_shop_dev") {
    reject("DATABASE_URL database must be nomi_numi_shop_dev");
  }

  const username = decodeURIComponent(parsedDb.username);
  if (username !== "nomi_numi_dev") {
    reject("DATABASE_URL username must be nomi_numi_dev");
  }

  const password = decodeURIComponent(parsedDb.password);
  if (password.length === 0) {
    reject("DATABASE_URL password must be non-empty");
  }

  return {
    secret,
    baseURL: PHASE2A_AUTH_ORIGIN,
    basePath: PHASE2A_AUTH_BASE_PATH,
    databaseUrl,
    database: {
      protocol,
      hostname: "127.0.0.1",
      port: 55432,
      database: "nomi_numi_shop_dev",
      username: "nomi_numi_dev",
    },
  };
}
