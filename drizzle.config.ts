import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit configuration for local schema/migration tooling.
 *
 * Credentials are intentionally omitted. Generation and consistency
 * checks do not need a live database. Migration application is owned by
 * scripts/drizzle-local.sh + scripts/drizzle-migrate.mjs, which connect
 * only after Phase 1D credential and identity guards pass.
 *
 * Direct `drizzle-kit migrate`, `push`, `drop`, or `studio` are not part
 * of the project workflow.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  strict: true,
  verbose: true,
});
