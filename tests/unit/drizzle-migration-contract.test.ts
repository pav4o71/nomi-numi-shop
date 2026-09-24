import { readFileSync, readdirSync } from "node:fs";

import { describe, expect, it } from "vitest";

interface DrizzleJournal {
  entries: Array<{
    idx: number;
    tag: string;
  }>;
}

const migrationsDirectory = new URL("../../drizzle/", import.meta.url);

const journal = JSON.parse(
  readFileSync(new URL("meta/_journal.json", migrationsDirectory), "utf8"),
) as DrizzleJournal;

const sqlMigrationFileNames = readdirSync(migrationsDirectory, {
  withFileTypes: true,
})
  .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
  .map((entry) => entry.name)
  .sort();

const journalTags = journal.entries.map((entry) => entry.tag);

const establishedLineage = [
  "0000_phase1e_baseline",
  "0001_phase2a_better_auth",
  "0002_phase2b_auth_role",
  "0003_phase3a_catalog_schema",
  "0004_tiny_slipstream",
  "0005_inventory_ledger_contract",
  "0006_acoustic_valkyrie",
  "0007_romantic_ender_wiggin",
  "0008_elite_yellowjacket",
] as const;

const forbiddenWorkstationTargets = [
  "/home/pav4o71/Projects/nomi-numi-shop",
  "beautybook3-pg",
  "nomi_numi_shop_dev",
  "nomi_numi_shop_test",
  "127.0.0.1:5433",
  "127.0.0.1:55432",
  "127.0.0.1:55433",
  "localhost:5433",
  "localhost:55432",
  "localhost:55433",
] as const;

describe("portable Drizzle migration contract", () => {
  it("keeps migration SQL files aligned one-to-one with journal order", () => {
    expect(journal.entries.map((entry) => entry.idx)).toEqual(
      journal.entries.map((_, index) => index),
    );
    expect(new Set(journalTags).size).toBe(journalTags.length);
    expect(sqlMigrationFileNames).toEqual(journalTags.map((tag) => `${tag}.sql`));
  });

  it("keeps the established migration lineage append-only", () => {
    expect(journalTags.slice(0, establishedLineage.length)).toEqual(establishedLineage);
  });

  it("keeps committed migration SQL free of workstation-specific targets", () => {
    for (const fileName of sqlMigrationFileNames) {
      const sql = readFileSync(new URL(fileName, migrationsDirectory), "utf8");
      const violations = forbiddenWorkstationTargets.filter((target) => sql.includes(target));

      expect({ fileName, violations }).toEqual({
        fileName,
        violations: [],
      });
    }
  });
});
