import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

const postgresConstructor = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("PostgreSQL constructor must not run during unit tests");
  }),
);

vi.mock("postgres", () => ({ default: postgresConstructor }));

import {
  CI_POSTGRES_IDENTITY,
  assertCiRuntime,
  assertDatabaseIdentity,
  assertDatabaseMetadata,
  assertExpectedRelations,
  assertExpectedSchemas,
  assertFreshDatabaseState,
  assertMigrationBookkeeping,
  assertNoAmbientDatabaseConfiguration,
  assertNoArguments,
  assertNonTemplateDatabases,
  assertWorkspace,
  buildFixedConnectionOptions,
  deriveExpectedMigrationRows,
  deriveExpectedRelations,
  deriveLatestSnapshotPath,
  parseAndValidateJournal,
  parseAndValidateSnapshot,
  validateMigrationArtifacts,
} from "../../scripts/drizzle-migrate-ci.mjs";

const validRuntime = {
  CI: "true",
  GITHUB_ACTIONS: "true",
  GITHUB_JOB: "postgres-integration",
  RUNNER_OS: "Linux",
  RUNNER_ENVIRONMENT: "github-hosted",
  GITHUB_REPOSITORY: "pav4o71/nomi-numi-shop",
};

interface SnapshotRelationFixture {
  name: string;
  schema: string;
  policies?: Record<string, unknown>;
  isRLSEnabled?: boolean;
  materialized?: boolean;
  isExisting?: boolean;
}

interface SnapshotFixture {
  id: string;
  prevId: string;
  version: string;
  dialect: string;
  tables: Record<string, SnapshotRelationFixture>;
  enums: Record<string, unknown>;
  schemas: Record<string, string>;
  sequences: Record<string, SnapshotRelationFixture>;
  roles: Record<string, unknown>;
  policies: Record<string, unknown>;
  views: Record<string, SnapshotRelationFixture>;
  _meta: Record<string, unknown>;
}

function journalFixture() {
  return {
    version: "7",
    dialect: "postgresql",
    entries: [
      {
        idx: 0,
        version: "7",
        when: 1_700_000_000_001,
        tag: "0000_first",
        breakpoints: true,
      },
      {
        idx: 1,
        version: "7",
        when: 1_700_000_000_002,
        tag: "0001_second",
        breakpoints: true,
      },
    ],
  };
}

function snapshotFixture(): SnapshotFixture {
  return {
    id: "snapshot-id",
    prevId: "previous-snapshot-id",
    version: "7",
    dialect: "postgresql",
    tables: {
      "public.widgets": {
        name: "widgets",
        schema: "",
        policies: {},
        isRLSEnabled: false,
      },
    },
    enums: {},
    schemas: {},
    sequences: {},
    roles: {},
    policies: {},
    views: {},
    _meta: {},
  };
}

const fixtureDirectories: string[] = [];

function makeTemporaryDirectory() {
  const directory = mkdtempSync(path.join(tmpdir(), "nomi-drizzle-ci-"));
  fixtureDirectories.push(directory);
  return directory;
}

function writeMigrationFixture(journal = journalFixture(), latestSnapshot = snapshotFixture()) {
  const workspace = makeTemporaryDirectory();
  const drizzleDirectory = path.join(workspace, "drizzle");
  const metadataDirectory = path.join(drizzleDirectory, "meta");
  mkdirSync(metadataDirectory, { recursive: true });
  writeFileSync(path.join(metadataDirectory, "_journal.json"), JSON.stringify(journal));
  for (const entry of journal.entries) {
    writeFileSync(path.join(drizzleDirectory, `${entry.tag}.sql`), `SELECT ${entry.idx};\n`);
    writeFileSync(
      path.join(metadataDirectory, `${String(entry.idx).padStart(4, "0")}_snapshot.json`),
      JSON.stringify(latestSnapshot),
    );
  }
  return workspace;
}

afterEach(() => {
  for (const directory of fixtureDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
  vi.clearAllMocks();
});

describe("CI migration command contract", () => {
  it("exposes only the dedicated command and keeps health database-free", () => {
    const packageManifest = JSON.parse(
      readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
    ) as { scripts: Record<string, string> };

    expect(packageManifest.scripts["db:migrate:ci"]).toBe("node scripts/drizzle-migrate-ci.mjs");
    expect(packageManifest.scripts.health).not.toContain("db:migrate:ci");
    expect(packageManifest.scripts["health:local"]).not.toContain("db:migrate:ci");
  });

  it("imports without constructing a PostgreSQL client", () => {
    expect(postgresConstructor).not.toHaveBeenCalled();
  });
});

describe("CI runtime boundary", () => {
  it("accepts only the exact simulated GitHub-hosted runtime", () => {
    expect(() => assertCiRuntime(validRuntime, "linux")).not.toThrow();
  });

  it.each([
    "CI",
    "GITHUB_ACTIONS",
    "GITHUB_JOB",
    "RUNNER_OS",
    "RUNNER_ENVIRONMENT",
    "GITHUB_REPOSITORY",
  ])("rejects an invalid %s guard", (name) => {
    expect(() => assertCiRuntime({ ...validRuntime, [name]: "unexpected" }, "linux")).toThrow(name);
  });

  it("rejects a non-Linux platform", () => {
    expect(() => assertCiRuntime(validRuntime, "darwin")).toThrow("process.platform linux");
  });

  it("rejects positional arguments", () => {
    expect(() => assertNoArguments(["node", "runner.mjs"])).not.toThrow();
    expect(() => assertNoArguments(["node"])).toThrow("executable and script path");
    expect(() => assertNoArguments(["node", "runner.mjs", "extra"])).toThrow(
      "no positional arguments",
    );
  });

  it.each([
    "DATABASE_URL",
    "PGHOST",
    "PGPASSWORD",
    "PGSERVICEFILE",
    "POSTGRES_URL",
    "POSTGRES_URL_NON_POOLING",
    "POSTGRES_PASSWORD",
  ])("rejects ambient database variable %s even when empty", (name) => {
    expect(() => assertNoAmbientDatabaseConfiguration({ [name]: "" })).toThrow(name);
  });

  it("builds only the immutable passwordless loopback identity", () => {
    const options = buildFixedConnectionOptions();
    expect(options).toMatchObject({
      host: "127.0.0.1",
      port: 55433,
      database: "nomi_numi_shop_test",
      username: "nomi_numi_test",
      ssl: false,
      max: 1,
      prepare: false,
    });
    expect(options).not.toHaveProperty("password");
    expect(options).not.toHaveProperty("pass");
    expect(options).not.toHaveProperty("url");
    expect(options).not.toHaveProperty("connectionString");
    expect(options.port).not.toBe(5433);
    expect(CI_POSTGRES_IDENTITY).toEqual({
      host: "127.0.0.1",
      port: 55433,
      database: "nomi_numi_shop_test",
      user: "nomi_numi_test",
      ssl: false,
    });
  });

  it("requires a real absolute workspace equal to cwd", () => {
    const workspace = makeTemporaryDirectory();
    expect(assertWorkspace(workspace, workspace)).toBe(workspace);
    expect(() => assertWorkspace("relative", workspace)).toThrow("absolute path");
    expect(() => assertWorkspace(path.join(workspace, "missing"), workspace)).toThrow(
      "does not exist",
    );
    expect(() => assertWorkspace(workspace, tmpdir())).toThrow("must equal GITHUB_WORKSPACE");

    const filePath = path.join(workspace, "not-a-directory");
    writeFileSync(filePath, "file");
    expect(() => assertWorkspace(filePath, workspace)).toThrow("must be a directory");

    const link = `${workspace}-link`;
    fixtureDirectories.push(link);
    symlinkSync(workspace, link, "dir");
    expect(() => assertWorkspace(link, workspace)).toThrow("symbolic link");
  });
});

describe("migration artifact contract", () => {
  it("validates a contained regular migration tree", () => {
    const workspace = writeMigrationFixture();
    const result = validateMigrationArtifacts(workspace);

    expect(result.expectedSchemas).toEqual(["public"]);
    expect(result.expectedRelations).toEqual([
      {
        schema_name: "public",
        relation_name: "widgets",
        relation_kind: "r",
      },
    ]);
    expect(result.expectedMigrationRows).toHaveLength(2);
  });

  it("rejects migration symlinks, wrong file types, and unexpected files", () => {
    const symlinkWorkspace = writeMigrationFixture();
    const sqlPath = path.join(symlinkWorkspace, "drizzle", "0000_first.sql");
    rmSync(sqlPath);
    symlinkSync("0001_second.sql", sqlPath);
    expect(() => validateMigrationArtifacts(symlinkWorkspace)).toThrow("symbolic link");

    const wrongTypeWorkspace = writeMigrationFixture();
    const snapshotPath = path.join(wrongTypeWorkspace, "drizzle/meta/0000_snapshot.json");
    rmSync(snapshotPath);
    mkdirSync(snapshotPath);
    expect(() => validateMigrationArtifacts(wrongTypeWorkspace)).toThrow("regular file");

    const unexpectedWorkspace = writeMigrationFixture();
    writeFileSync(path.join(unexpectedWorkspace, "drizzle/unexpected.sql"), "SELECT 1;");
    expect(() => validateMigrationArtifacts(unexpectedWorkspace)).toThrow(
      "Drizzle root entries mismatch",
    );

    const missingWorkspace = writeMigrationFixture();
    rmSync(path.join(missingWorkspace, "drizzle/0000_first.sql"));
    expect(() => validateMigrationArtifacts(missingWorkspace)).toThrow(
      "Drizzle root entries mismatch",
    );
  });

  it("validates journal structure and derives the latest index dynamically", () => {
    const journal = journalFixture();
    journal.entries[1].idx = 12;
    expect(() => parseAndValidateJournal(journal)).toThrow("idx 1");

    const dynamicJournal = journalFixture();
    dynamicJournal.entries = Array.from({ length: 13 }, (_, idx) => ({
      idx,
      version: "7",
      when: 1_700_000_000_000 + idx,
      tag: `${String(idx).padStart(4, "0")}_migration`,
      breakpoints: true,
    }));
    expect(deriveLatestSnapshotPath(dynamicJournal)).toBe("meta/0012_snapshot.json");
  });

  it.each([
    ["dialect", "sqlite"],
    ["version", "6"],
    ["entries", []],
  ])("rejects invalid journal %s", (key, value) => {
    expect(() => parseAndValidateJournal({ ...journalFixture(), [key]: value })).toThrow();
  });

  it("rejects duplicate tags, unsafe timestamps, and non-boolean breakpoints", () => {
    const duplicate = journalFixture();
    duplicate.entries[1].tag = duplicate.entries[0].tag;
    expect(() => parseAndValidateJournal(duplicate)).toThrow("duplicated");

    const unsafeTag = journalFixture();
    unsafeTag.entries[1].tag = "../escape";
    expect(() => parseAndValidateJournal(unsafeTag)).toThrow("unsafe tag");

    const timestamp = journalFixture();
    timestamp.entries[1].when = timestamp.entries[0].when;
    expect(() => parseAndValidateJournal(timestamp)).toThrow("strictly increasing");

    const breakpoints = journalFixture();
    Object.assign(breakpoints.entries[1], { breakpoints: "true" });
    expect(() => parseAndValidateJournal(breakpoints)).toThrow("must be boolean");
  });

  it("derives public and declared-schema table, view, and sequence relations", () => {
    const snapshot = snapshotFixture();
    snapshot.schemas.audit = "audit";
    snapshot.tables["audit.events"] = {
      name: "events",
      schema: "audit",
      policies: {},
      isRLSEnabled: false,
    };
    snapshot.views["public.widget_view"] = {
      name: "widget_view",
      schema: "",
      materialized: false,
      isExisting: false,
    };
    snapshot.views["audit.rollup"] = {
      name: "rollup",
      schema: "audit",
      materialized: true,
      isExisting: false,
    };
    snapshot.sequences["audit.event_sequence"] = {
      name: "event_sequence",
      schema: "audit",
      isExisting: false,
    };

    const parsed = parseAndValidateSnapshot(snapshot, journalFixture());
    const expected = deriveExpectedRelations(parsed);
    expect(expected.schemas).toEqual(["audit", "public"]);
    expect(expected.relations.map((relation) => relation.relation_kind)).toEqual([
      "S",
      "r",
      "m",
      "v",
      "r",
    ]);
  });

  it("fails closed for undeclared schemas and unsupported snapshot features", () => {
    const undeclared = snapshotFixture();
    undeclared.tables["audit.events"] = {
      name: "events",
      schema: "audit",
      policies: {},
      isRLSEnabled: false,
    };
    expect(() => deriveExpectedRelations(undeclared)).toThrow("undeclared schema");

    for (const key of ["enums", "roles", "policies"] as const) {
      const unsupported = snapshotFixture();
      unsupported[key].unsupported = {};
      expect(() => parseAndValidateSnapshot(unsupported, journalFixture())).toThrow(
        "not yet supported",
      );
    }
  });

  it("derives exact bookkeeping from raw SQL text and journal timestamps", () => {
    const journal = journalFixture();
    const rawSql = "SELECT 1;\n--> statement-breakpoint\nSELECT 2;\n";
    const rows = deriveExpectedMigrationRows(journal, {
      "0000_first": rawSql,
      "0001_second": "SELECT 3;\n",
    });

    expect(rows[0]).toEqual({
      id: 1,
      hash: createHash("sha256").update(rawSql).digest("hex"),
      created_at: journal.entries[0].when,
    });
    expect(rows[0].hash).not.toBe(
      createHash("sha256").update("SELECT 1;\nSELECT 2;\n").digest("hex"),
    );
  });
});

describe("live-result assertion helpers", () => {
  it("validates exact identity, metadata, and cluster database rows", () => {
    expect(() =>
      assertDatabaseIdentity({
        database_name: "nomi_numi_shop_test",
        database_user: "nomi_numi_test",
        server_version_num: "160015",
      }),
    ).not.toThrow();
    expect(() =>
      assertDatabaseMetadata([
        {
          database_name: "nomi_numi_shop_test",
          owner_name: "nomi_numi_test",
          is_template: false,
          allow_connections: true,
        },
      ]),
    ).not.toThrow();
    expect(() =>
      assertNonTemplateDatabases([
        { database_name: "nomi_numi_shop_test" },
        { database_name: "postgres" },
      ]),
    ).not.toThrow();

    expect(() =>
      assertDatabaseIdentity({
        database_name: "nomi_numi_shop_test",
        database_user: "nomi_numi_test",
        server_version_num: "170000",
      }),
    ).toThrow("exactly 16");
  });

  it("requires a completely fresh pre-migration state", () => {
    expect(() =>
      assertFreshDatabaseState({
        schemas: ["public"],
        relations: [],
        bookkeepingPresent: false,
      }),
    ).not.toThrow();
    expect(() =>
      assertFreshDatabaseState({
        schemas: ["drizzle", "public"],
        relations: [],
        bookkeepingPresent: false,
      }),
    ).toThrow("schema set");
  });

  it("requires exact post-migration schemas and relations", () => {
    const applicationRelations = [
      { schema_name: "public", relation_name: "widgets", relation_kind: "r" },
    ];
    const actualRelations = [
      ...applicationRelations,
      {
        schema_name: "drizzle",
        relation_name: "__drizzle_migrations",
        relation_kind: "r",
      },
      {
        schema_name: "drizzle",
        relation_name: "__drizzle_migrations_id_seq",
        relation_kind: "S",
      },
    ];

    expect(() => assertExpectedSchemas(["drizzle", "public"], ["public"])).not.toThrow();
    expect(() => assertExpectedRelations(actualRelations, applicationRelations)).not.toThrow();
    expect(() =>
      assertExpectedRelations(
        [...actualRelations, { schema_name: "public", relation_name: "extra", relation_kind: "v" }],
        applicationRelations,
      ),
    ).toThrow("relation set");
  });

  it("requires every bookkeeping field with no missing or extra rows", () => {
    const expected = [
      { id: 1, hash: "abc", created_at: 1_700_000_000_001 },
      { id: 2, hash: "def", created_at: 1_700_000_000_002 },
    ];
    expect(() =>
      assertMigrationBookkeeping(
        expected.map((row) => ({ ...row, id: String(row.id), created_at: String(row.created_at) })),
        expected,
      ),
    ).not.toThrow();
    expect(() => assertMigrationBookkeeping(expected.slice(0, 1), expected)).toThrow(
      "bookkeeping rows",
    );
  });
});
