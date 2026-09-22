import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "@/db/schema";

export type CustomerDb = PostgresJsDatabase<typeof schema>;
export type CustomerExecutor = Parameters<Parameters<CustomerDb["transaction"]>[0]>[0] & {
  $client?: unknown;
};
