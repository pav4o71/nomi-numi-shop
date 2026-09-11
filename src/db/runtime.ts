/**
 * Lazy server-only Drizzle runtime client for Phase 2A auth.
 *
 * Storefront modules must not import this file.
 * Connection is created only when auth infrastructure needs the database.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { parseAuthRuntimeEnv } from "@/auth/env";
import * as schema from "@/db/schema";

type RuntimeSql = ReturnType<typeof postgres>;
type RuntimeDb = ReturnType<typeof drizzle<typeof schema>>;

type RuntimeCache = {
  sql: RuntimeSql;
  db: RuntimeDb;
};

const globalForRuntime = globalThis as typeof globalThis & {
  __nomiNumiShopRuntimeDb?: RuntimeCache;
};

function createRuntimeDb(): RuntimeCache {
  const config = parseAuthRuntimeEnv({
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV,
  });

  const sql = postgres(config.databaseUrl, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  const db = drizzle(sql, { schema });
  return { sql, db };
}

/**
 * Lazily create (and reuse in development) the runtime Drizzle client.
 */
export function getRuntimeDb(): RuntimeDb {
  if (!globalForRuntime.__nomiNumiShopRuntimeDb) {
    globalForRuntime.__nomiNumiShopRuntimeDb = createRuntimeDb();
  }
  return globalForRuntime.__nomiNumiShopRuntimeDb.db;
}
