import { lstatSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  EXPECTED_ROOT,
  MIGRATIONS_FOLDER,
  PASSWORD_EXPECTED_LENGTH,
  PASSWORD_PATTERN,
  PROTECTED_HOST_PORT,
  resolveEnvironment,
} from "../../scripts/drizzle-credentials.mjs";
import {
  FIXED_MIGRATE_TRANSPORT,
  assertMigrationsTreeSafe,
  assertProjectToolingPathsSafe,
  requireCanonicalMigrationsFolder,
} from "../../scripts/drizzle-path-safety.mjs";

interface PackageManifest {
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

const packageManifest = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
) as PackageManifest;

const drizzleHelper = readFileSync(
  new URL("../../scripts/drizzle-local.sh", import.meta.url),
  "utf8",
);

const migrateRunner = readFileSync(
  new URL("../../scripts/drizzle-migrate.mjs", import.meta.url),
  "utf8",
);

const migrationSqlFiles = readdirSync(new URL("../../drizzle", import.meta.url))
  .filter((name) => name.endsWith(".sql"))
  .map((name) => ({
    name,
    contents: readFileSync(new URL(`../../drizzle/${name}`, import.meta.url), "utf8"),
  }));

const forbiddenDomainMarkers = [
  "create table users",
  "create table sessions",
  "create table products",
  "create table categories",
  "create table collections",
  "create table orders",
  "create table carts",
  "create table payments",
];

describe("Phase 1E drizzle foundation invariants", () => {
  it("pins drizzle-orm, drizzle-kit, and postgres.js", () => {
    expect(packageManifest.dependencies["drizzle-orm"]).toBe("0.45.2");
    expect(packageManifest.dependencies.postgres).toBe("3.4.9");
    expect(packageManifest.devDependencies["drizzle-kit"]).toBe("0.31.10");
  });

  it("exposes generate/check/migrate scripts without push/drop/reset", () => {
    expect(packageManifest.scripts["db:generate"]).toBe("./scripts/drizzle-local.sh generate");
    expect(packageManifest.scripts["db:check"]).toBe("./scripts/drizzle-local.sh check");
    expect(packageManifest.scripts["db:dev:migrate"]).toBe(
      "./scripts/drizzle-local.sh migrate dev",
    );
    expect(packageManifest.scripts["db:test:migrate"]).toBe(
      "./scripts/drizzle-local.sh migrate test",
    );

    for (const scriptName of Object.keys(packageManifest.scripts)) {
      expect(scriptName).not.toMatch(/db:.*(?:push|drop|reset|destroy|studio)/);
    }

    expect(drizzleHelper).toContain("Forbidden in this helper:");
    expect(drizzleHelper).toContain("push, drop, reset, studio, query, sql, shell");
  });

  it("keeps environment allowlist fixed to dev and test loopback ports", () => {
    const dev = resolveEnvironment("dev");
    const test = resolveEnvironment("test");

    expect(dev.port).toBe("55432");
    expect(dev.database).toBe("nomi_numi_shop_dev");
    expect(test.port).toBe("55433");
    expect(test.database).toBe("nomi_numi_shop_test");
    expect(dev.host).toBe("127.0.0.1");
    expect(test.host).toBe("127.0.0.1");
    expect(PROTECTED_HOST_PORT).toBe("5433");
    expect(dev.port).not.toBe(PROTECTED_HOST_PORT);
    expect(test.port).not.toBe(PROTECTED_HOST_PORT);
    expect(EXPECTED_ROOT).toBe("/home/pav4o71/Projects/nomi-numi-shop");
    expect(PASSWORD_EXPECTED_LENGTH).toBe(43);
    expect(PASSWORD_PATTERN.test("a".repeat(43))).toBe(true);
  });

  it("rejects unsupported environments at the credential resolver boundary", () => {
    const previousExit = process.exit;
    let exitCode: number | undefined;
    process.exit = ((code?: number) => {
      exitCode = code ?? 1;
      throw new Error(`exit:${exitCode}`);
    }) as typeof process.exit;

    try {
      expect(() => resolveEnvironment("prod")).toThrow(/exit:1/);
      expect(exitCode).toBe(1);
    } finally {
      process.exit = previousExit;
    }
  });

  it("fixes migration SQL transport to 127.0.0.1:5432 with no caller overrides", () => {
    expect(FIXED_MIGRATE_TRANSPORT.host).toBe("127.0.0.1");
    expect(FIXED_MIGRATE_TRANSPORT.port).toBe(5432);
    expect(migrateRunner).toContain("FIXED_MIGRATE_TRANSPORT");
    expect(migrateRunner).toContain("process.argv.length !== 3");
    expect(migrateRunner).toContain("refusing ambient transport/credential override");
    expect(migrateRunner).toContain("host: FIXED_MIGRATE_TRANSPORT.host");
    expect(migrateRunner).toContain("port: FIXED_MIGRATE_TRANSPORT.port");
    expect(migrateRunner).not.toMatch(/host:\s*connectHost/);
    expect(migrateRunner).not.toMatch(/port:\s*connectPort/);
    expect(migrateRunner).not.toContain("Number(connectPortRaw)");
  });

  it("binds migration runner to exact verified PostgreSQL container namespace", () => {
    expect(drizzleHelper).toContain('--network "container:${VERIFIED_CONTAINER_ID}"');
    expect(drizzleHelper).toContain("verify_exact_postgres_container");
    expect(drizzleHelper).not.toContain('--network "$EXPECTED_NETWORK"');
    expect(drizzleHelper).not.toContain("NOMI_DRIZZLE_CONNECT_HOST=postgres");
    expect(drizzleHelper).not.toMatch(/--env NOMI_DRIZZLE_CONNECT_HOST=postgres/);
    expect(drizzleHelper).not.toContain("hostname postgres");
    // Generic Compose DNS alias must not be the SQL transport target.
    expect(drizzleHelper).not.toMatch(/CONNECT_HOST=postgres\b/);
  });

  it("rejects excess CLI arguments in the helper contract", () => {
    expect(drizzleHelper).toContain("validate_cli_arguments");
    expect(drizzleHelper).toContain("accepts no additional arguments");
    expect(drizzleHelper).toContain("migrate requires exactly one environment argument");
  });

  it("protects the migration directory tree against symlinks and escapes", () => {
    expect(() => assertProjectToolingPathsSafe()).not.toThrow();
    expect(() => assertMigrationsTreeSafe({ requireExisting: true })).not.toThrow();
    expect(requireCanonicalMigrationsFolder()).toBe(MIGRATIONS_FOLDER);
    expect(realpathSync(MIGRATIONS_FOLDER)).toBe(MIGRATIONS_FOLDER);
    expect(lstatSync(MIGRATIONS_FOLDER).isSymbolicLink()).toBe(false);
    expect(lstatSync(path.join(MIGRATIONS_FOLDER, "meta")).isSymbolicLink()).toBe(false);

    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const child = path.join(dir, entry.name);
        expect(entry.isSymbolicLink()).toBe(false);
        if (entry.isDirectory()) {
          walk(child);
        } else {
          expect(entry.isFile()).toBe(true);
        }
      }
    };
    walk(MIGRATIONS_FOLDER);
  });

  it("keeps committed migrations free of domain tables and protected port bindings", () => {
    expect(migrationSqlFiles.length).toBeGreaterThan(0);

    for (const file of migrationSqlFiles) {
      const normalized = file.contents.toLowerCase();
      for (const marker of forbiddenDomainMarkers) {
        expect(normalized).not.toContain(marker);
      }
      expect(file.contents).not.toContain("5433");
      expect(file.contents).not.toContain("nomi_numi_shop_dev");
      expect(file.contents).not.toContain("nomi_numi_shop_test");
      expect(file.contents).not.toMatch(/drop\s+table/i);
    }

    const journal = JSON.parse(
      readFileSync(new URL("../../drizzle/meta/_journal.json", import.meta.url), "utf8"),
    ) as { entries: Array<{ tag: string }> };

    expect(journal.entries).toHaveLength(1);
    expect(journal.entries[0]?.tag).toBe("0000_phase1e_baseline");
    expect(
      path.basename(new URL("../../drizzle/0000_phase1e_baseline.sql", import.meta.url).pathname),
    ).toBe("0000_phase1e_baseline.sql");
  });
});
