import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { PostgresJsDatabase, PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";

import * as schema from "@/db/schema";

export type CartSchema = typeof schema;
export type CartDb = PostgresJsDatabase<CartSchema>;

export type CartExecutor =
  | CartDb
  | PgTransaction<PostgresJsQueryResultHKT, CartSchema, ExtractTablesWithRelations<CartSchema>>;
