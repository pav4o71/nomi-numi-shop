/**
 * Portable Phase 5 inventory ledger contract checks (no live database).
 * Live backfill execution lives in inventory-ledger-backfill-local.test.ts.
 */
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  new URL("../../drizzle/0005_inventory_ledger_contract.sql", import.meta.url),
  "utf8",
);

const snapshot = JSON.parse(
  readFileSync(new URL("../../drizzle/meta/0005_snapshot.json", import.meta.url), "utf8"),
) as {
  id: string;
  prevId: string;
  tables: {
    "public.inventory_movements": {
      columns: Record<string, { name: string }>;
      foreignKeys: {
        inventory_movements_variant_id_product_variants_id_fk: { onDelete: string };
      };
    };
  };
};

const prevSnapshot = JSON.parse(
  readFileSync(new URL("../../drizzle/meta/0004_snapshot.json", import.meta.url), "utf8"),
) as { id: string };

/**
 * Mirrors the 0005 CASE backfill: reserved-magnitude reasons used by
 * recordInventoryMovement / admin inventory tests are `reserve` and `release`.
 */
function classifyLegacyInventoryDelta(
  reason: string,
  delta: number,
): {
  deltaOnHand: number;
  deltaReserved: number;
} {
  const key = reason.trim().toLowerCase();
  if (key === "reserve" || key === "release") {
    return { deltaOnHand: 0, deltaReserved: delta };
  }
  return { deltaOnHand: delta, deltaReserved: 0 };
}

const LEGACY_LEDGER_FIXTURE = [
  { reason: "restock", delta: 10, deltaOnHand: 10, deltaReserved: 0 },
  { reason: "manual_adjustment", delta: -5, deltaOnHand: -5, deltaReserved: 0 },
  { reason: "return", delta: 1, deltaOnHand: 1, deltaReserved: 0 },
  { reason: "reserve", delta: 4, deltaOnHand: 0, deltaReserved: 4 },
  { reason: "release", delta: -2, deltaOnHand: 0, deltaReserved: -2 },
  { reason: "Reserve", delta: 3, deltaOnHand: 0, deltaReserved: 3 },
  { reason: "  release  ", delta: -1, deltaOnHand: 0, deltaReserved: -1 },
  // Mixed row limit: old encoder stored only on-hand when both deltas were non-zero.
  { reason: "manual_adjustment", delta: -2, deltaOnHand: -2, deltaReserved: 0 },
] as const;

describe("Phase 5 inventory ledger 0005 contract (portable)", () => {
  it("backfills reserve/release into delta_reserved instead of treating them as on-hand", () => {
    expect(migrationSql).toContain(`WHEN lower(btrim("reason")) IN ('reserve', 'release') THEN 0`);
    expect(migrationSql).toContain(
      `WHEN lower(btrim("reason")) IN ('reserve', 'release') THEN "delta"`,
    );
    expect(migrationSql).not.toMatch(
      /UPDATE "inventory_movements" SET "delta_on_hand" = "delta", "delta_reserved" = 0/,
    );
    expect(migrationSql).toMatch(/mixed rows/i);
  });

  it("classifies the overloaded-delta fixture the same way as the SQL CASE", () => {
    for (const row of LEGACY_LEDGER_FIXTURE) {
      expect(classifyLegacyInventoryDelta(row.reason, row.delta)).toEqual({
        deltaOnHand: row.deltaOnHand,
        deltaReserved: row.deltaReserved,
      });
    }

    const reservedHistory = LEGACY_LEDGER_FIXTURE.filter(
      (row) =>
        row.reason.trim().toLowerCase() === "reserve" ||
        row.reason.trim().toLowerCase() === "release",
    );
    expect(reservedHistory.every((row) => row.deltaOnHand === 0)).toBe(true);
    expect(reservedHistory.every((row) => row.deltaReserved === row.delta)).toBe(true);
  });

  it("replaces overloaded delta with dual columns and restrict FK", () => {
    expect(migrationSql).toContain('ADD COLUMN "delta_on_hand" integer');
    expect(migrationSql).toContain('ADD COLUMN "delta_reserved" integer');
    expect(migrationSql).toContain('DROP COLUMN "delta"');
    expect(migrationSql).toContain("ON DELETE restrict");

    const movements = snapshot.tables["public.inventory_movements"];
    expect(snapshot.prevId).toBe(prevSnapshot.id);
    expect(Object.keys(movements.columns)).toEqual(
      expect.arrayContaining(["delta_on_hand", "delta_reserved", "reason"]),
    );
    expect(movements.columns).not.toHaveProperty("delta");
    expect(
      movements.foreignKeys.inventory_movements_variant_id_product_variants_id_fk.onDelete,
    ).toBe("restrict");
  });
});
