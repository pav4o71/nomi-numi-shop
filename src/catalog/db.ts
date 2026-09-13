/**
 * Catalog database boundary types for dependency injection.
 *
 * Intentionally independent from Better Auth env parsing in src/db/runtime.ts.
 */

import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { PostgresJsDatabase, PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";

import type * as schema from "@/db/schema";

export type CatalogSchema = typeof schema;

export type CatalogDb = PostgresJsDatabase<CatalogSchema>;

export type CatalogTx = PgTransaction<
  PostgresJsQueryResultHKT,
  CatalogSchema,
  ExtractTablesWithRelations<CatalogSchema>
>;

export type CatalogExecutor = CatalogDb | CatalogTx;
