/**
 * Path-locked execution of the 0005 reason-aware backfill against a temp table.
 * Excluded from portable `pnpm test:ci` (see package.json).
 */
import { readFileSync } from "node:fs";

import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { loadValidatedCredentials } from "../../scripts/drizzle-credentials.mjs";

const credentials = loadValidatedCredentials("test");

const migrationSql = readFileSync(
  new URL("../../drizzle/0005_inventory_ledger_contract.sql", import.meta.url),
  "utf8",
);

const backfillUpdate = migrationSql.match(/UPDATE "inventory_movements" SET[\s\S]*?;/)?.[0];

describe("inventory ledger 0005 reason-aware backfill (local)", () => {
  let sql: ReturnType<typeof postgres>;

  beforeAll(() => {
    expect(backfillUpdate).toBeTruthy();
    sql = postgres({
      host: credentials.host,
      port: credentials.port,
      database: credentials.database,
      username: credentials.user,
      password: credentials.password,
      max: 1,
      onnotice: () => {},
    });
  });

  afterAll(async () => {
    await sql.end({ timeout: 5 });
  });

  it("maps reserve/release rows onto delta_reserved and leaves on-hand reasons on delta_on_hand", async () => {
    await sql.begin(async (tx) => {
      await tx.unsafe(`
        CREATE TEMP TABLE inventory_movements (
          id text PRIMARY KEY,
          delta integer NOT NULL,
          reason text NOT NULL,
          delta_on_hand integer,
          delta_reserved integer
        ) ON COMMIT DROP
      `);

      await tx.unsafe(`
        INSERT INTO inventory_movements (id, delta, reason) VALUES
          ('restock', 10, 'restock'),
          ('manual', -5, 'manual_adjustment'),
          ('return_row', 1, 'return'),
          ('reserve', 4, 'reserve'),
          ('release', -2, 'release'),
          ('reserve_case', 3, 'Reserve'),
          ('release_ws', -1, '  release  '),
          ('mixed_lost_reserved', -2, 'manual_adjustment')
      `);

      await tx.unsafe(backfillUpdate!);

      const rows = await tx<{ id: string; delta_on_hand: number; delta_reserved: number }[]>`
        SELECT id, delta_on_hand, delta_reserved
        FROM inventory_movements
        ORDER BY id
      `;

      const byId = Object.fromEntries(rows.map((row) => [row.id, row]));
      expect(byId.restock).toMatchObject({ delta_on_hand: 10, delta_reserved: 0 });
      expect(byId.manual).toMatchObject({ delta_on_hand: -5, delta_reserved: 0 });
      expect(byId.return_row).toMatchObject({ delta_on_hand: 1, delta_reserved: 0 });
      expect(byId.reserve).toMatchObject({ delta_on_hand: 0, delta_reserved: 4 });
      expect(byId.release).toMatchObject({ delta_on_hand: 0, delta_reserved: -2 });
      expect(byId.reserve_case).toMatchObject({ delta_on_hand: 0, delta_reserved: 3 });
      expect(byId.release_ws).toMatchObject({ delta_on_hand: 0, delta_reserved: -1 });
      // Mixed-row limit: reserved magnitude was never stored in overloaded delta.
      expect(byId.mixed_lost_reserved).toMatchObject({ delta_on_hand: -2, delta_reserved: 0 });
    });
  });
});
