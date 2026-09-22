import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { PostgresJsDatabase, PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";

import * as schema from "@/db/schema";

export type CheckoutSchema = typeof schema;
export type CheckoutDb = PostgresJsDatabase<CheckoutSchema>;

export type CheckoutExecutor =
  | CheckoutDb
  | PgTransaction<
      PostgresJsQueryResultHKT,
      CheckoutSchema,
      ExtractTablesWithRelations<CheckoutSchema>
    >;
