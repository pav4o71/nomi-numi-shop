/**
 * Pure local DEV PostgreSQL DATABASE_URL validation for server runtime.
 * No Better Auth secrets. Fail closed. Never log credential-bearing values.
 */

export type DatabaseRuntimeEnvInput = {
  DATABASE_URL?: string | undefined;
  NODE_ENV?: string | undefined;
  VERCEL?: string | undefined;
  VERCEL_ENV?: string | undefined;
  NOMI_ALLOW_TEST_DB?: string | undefined;
};

export type DatabaseRuntimeConfig = {
  databaseUrl: string;
  database: {
    protocol: "postgres" | "postgresql";
    hostname: "127.0.0.1";
    port: 55432 | 55433;
    database: "nomi_numi_shop_dev" | "nomi_numi_shop_test";
    username: "nomi_numi_dev" | "nomi_numi_test";
  };
};

export class DatabaseEnvValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseEnvValidationError";
  }
}

function reject(message: string): never {
  throw new DatabaseEnvValidationError(message);
}

/**
 * Validate local DEV-only DATABASE_URL for server Drizzle runtime.
 * Does not connect to PostgreSQL.
 */
export function parseDatabaseRuntimeEnv(input: DatabaseRuntimeEnvInput): DatabaseRuntimeConfig {
  if (
    input.NODE_ENV === "production" ||
    input.VERCEL === "1" ||
    input.VERCEL_ENV === "production"
  ) {
    reject("Database runtime refuses production deployment environments");
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

  const allowTestDb = input.NOMI_ALLOW_TEST_DB === "1";
  if (!allowTestDb && port !== 55432) {
    reject("DATABASE_URL port must be 55432 (DEV)");
  }
  if (allowTestDb && port !== 55432 && port !== 55433) {
    reject("DATABASE_URL port must be 55432 (DEV) or 55433 (TEST)");
  }

  const isTest = port === 55433;
  const expectedDatabase = isTest ? "nomi_numi_shop_test" : "nomi_numi_shop_dev";
  const expectedUsername = isTest ? "nomi_numi_test" : "nomi_numi_dev";

  const databaseName = decodeURIComponent(parsedDb.pathname.replace(/^\//, ""));
  if (databaseName !== expectedDatabase) {
    if (!allowTestDb && databaseName === "nomi_numi_shop_test") {
      reject("DATABASE_URL must not target the TEST database");
    }
    reject(`DATABASE_URL database must be ${expectedDatabase}`);
  }

  const username = decodeURIComponent(parsedDb.username);
  if (username !== expectedUsername) {
    reject(`DATABASE_URL username must be ${expectedUsername}`);
  }

  const password = decodeURIComponent(parsedDb.password);
  if (password.length === 0) {
    reject("DATABASE_URL password must be non-empty");
  }

  return {
    databaseUrl,
    database: {
      protocol,
      hostname: "127.0.0.1",
      port: port as 55432 | 55433,
      database: expectedDatabase,
      username: expectedUsername,
    },
  };
}
