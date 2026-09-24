import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import * as schema from "../../src/db/schema";

const migrationSql = readFileSync(
  new URL("../../drizzle/0008_elite_yellowjacket.sql", import.meta.url),
  "utf8",
);

describe("Phase 8 guest order capability schema", () => {
  it("exports the append-only guest capability table", () => {
    expect(schema.guestOrderAccessCapabilities).toBeDefined();
    expect(schema.guestOrderAccessCapabilitiesRelations).toBeDefined();
  });

  it("preserves legacy digests before removing the single-digest column", () => {
    expect(migrationSql).toContain('CREATE TABLE "guest_order_access_capabilities"');
    expect(migrationSql).toContain('"token_digest" text PRIMARY KEY NOT NULL');
    expect(migrationSql).toContain("ON DELETE cascade");
    expect(migrationSql).toContain('CREATE INDEX "guest_order_access_capabilities_order_idx"');

    const backfill = migrationSql.indexOf(
      'INSERT INTO "guest_order_access_capabilities" ("token_digest", "order_id")',
    );
    const oldIndexDrop = migrationSql.indexOf('DROP INDEX "orders_guest_access_digest_uidx"');
    const oldColumnDrop = migrationSql.indexOf(
      'ALTER TABLE "orders" DROP COLUMN "guest_access_token_digest"',
    );

    expect(backfill).toBeGreaterThan(-1);
    expect(oldIndexDrop).toBeGreaterThan(backfill);
    expect(oldColumnDrop).toBeGreaterThan(oldIndexDrop);
    expect(migrationSql).toContain('WHERE "guest_access_token_digest" IS NOT NULL');
  });
});
