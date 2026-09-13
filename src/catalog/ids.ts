import { randomUUID } from "node:crypto";

/** Opaque catalog entity ids (text primary keys). */
export function createCatalogId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}
