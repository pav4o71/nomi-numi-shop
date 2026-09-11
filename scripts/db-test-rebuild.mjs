#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import postgres from "postgres";

import {
  EXPECTED_ROOT,
  assertSafeConnectionTarget,
  fail,
  loadValidatedCredentials,
} from "./drizzle-credentials.mjs";
import {
  FIXED_MIGRATE_TRANSPORT,
  requireCanonicalMigrationsFolder,
} from "./drizzle-path-safety.mjs";

export const TEST_REBUILD_CONFIRMATION = "RESET-NOMI-TEST-DATABASE";

export const WRAPPER_CAPABILITY_ENV = "NOMI_TEST_REBUILD_CAPABILITY";
export const WRAPPER_CAPABILITY_LENGTH = 43;
export const WRAPPER_CAPABILITY_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export const TEST_REBUILD_IDENTITY = Object.freeze({
  environment: "test",
  composeProject: "nomi-numi-shop-test",
  containerName: "nomi-numi-shop-test-postgres-1",
  database: "nomi_numi_shop_test",
  user: "nomi_numi_test",
  host: "127.0.0.1",
  hostPort: "55433",
  internalHost: FIXED_MIGRATE_TRANSPORT.host,
  internalPort: FIXED_MIGRATE_TRANSPORT.port,
  network: "nomi-numi-shop-test_postgres_net",
  volume: "nomi-numi-shop-test_postgres_data",
  maintenanceDatabase: "postgres",
});

const TRUSTED_SQL_IDENTIFIERS = Object.freeze({
  maintenanceDatabase: TEST_REBUILD_IDENTITY.maintenanceDatabase,
  targetDatabase: TEST_REBUILD_IDENTITY.database,
  targetOwner: TEST_REBUILD_IDENTITY.user,
});

const BANNED_AMBIENT_VARS = Object.freeze([
  "NOMI_DRIZZLE_CONNECT_HOST",
  "NOMI_DRIZZLE_CONNECT_PORT",
  "DATABASE_URL",
  "POSTGRES_HOST",
  "PGHOST",
  "PGPORT",
  "PGDATABASE",
  "PGUSER",
  "PGPASSWORD",
]);

const EXPECTED_NON_TEMPLATE_DATABASES = Object.freeze([
  TEST_REBUILD_IDENTITY.maintenanceDatabase,
  TEST_REBUILD_IDENTITY.database,
]);

export function quoteTrustedIdent(identifier) {
  const allowed = new Set(Object.values(TRUSTED_SQL_IDENTIFIERS));
  if (!allowed.has(identifier)) {
    fail("refusing untrusted SQL identifier");
  }

  if (!/^[a-z][a-z0-9_]*$/.test(identifier)) {
    fail("SQL identifier failed shape check");
  }

  return `"${identifier}"`;
}

export function parseRunnerArguments(argv = process.argv) {
  const args = argv.slice(2);

  if (args.length === 2 && args[0] === "--confirm" && args[1] === TEST_REBUILD_CONFIRMATION) {
    return "recreate";
  }

  if (
    args.length === 3 &&
    args[0] === "--confirm" &&
    args[1] === TEST_REBUILD_CONFIRMATION &&
    args[2] === "verify"
  ) {
    return "verify";
  }

  if (args.length === 2 && args[0] === "--confirm") {
    fail("confirmation token mismatch; refusing TEST rebuild");
  }

  fail("usage: node scripts/db-test-rebuild.mjs --confirm RESET-NOMI-TEST-DATABASE [verify]");
}

export function assertCapabilityChannels(envValue, stdinValue) {
  if (envValue === undefined || envValue === "") {
    fail("wrapper execution context missing; refusing TEST rebuild");
  }

  if (envValue.length !== WRAPPER_CAPABILITY_LENGTH || !WRAPPER_CAPABILITY_PATTERN.test(envValue)) {
    fail("wrapper execution context invalid; refusing TEST rebuild");
  }

  if (stdinValue === undefined || stdinValue === "") {
    fail("wrapper execution context missing; refusing TEST rebuild");
  }

  if (stdinValue !== envValue) {
    fail("wrapper execution context mismatch; refusing TEST rebuild");
  }
}

function consumeWrapperCapability() {
  // Process-local execution guardrail against accidental direct invocation.
  // Not a security boundary against a user who already controls this account.
  const envValue = process.env[WRAPPER_CAPABILITY_ENV];
  let stdinValue = "";

  if (process.stdin.isTTY) {
    fail("wrapper execution context missing; refusing TEST rebuild");
  }

  try {
    stdinValue = fs.readFileSync(0, "utf8");
  } catch {
    fail("wrapper execution context missing; refusing TEST rebuild");
  }

  assertCapabilityChannels(envValue, stdinValue);
  delete process.env[WRAPPER_CAPABILITY_ENV];
}

function refuseAmbientOverrides() {
  for (const banned of BANNED_AMBIENT_VARS) {
    if (process.env[banned]) {
      fail(`refusing ambient transport/credential override ${banned}`);
    }
  }
}

function requireTestCredentials() {
  const credentials = loadValidatedCredentials("test");
  assertSafeConnectionTarget(credentials);

  if (
    credentials.identity.id !== TEST_REBUILD_IDENTITY.environment ||
    credentials.identity.database !== TEST_REBUILD_IDENTITY.database ||
    credentials.identity.user !== TEST_REBUILD_IDENTITY.user ||
    credentials.identity.port !== TEST_REBUILD_IDENTITY.hostPort ||
    credentials.identity.host !== TEST_REBUILD_IDENTITY.host ||
    credentials.identity.composeProject !== TEST_REBUILD_IDENTITY.composeProject ||
    credentials.identity.containerName !== TEST_REBUILD_IDENTITY.containerName
  ) {
    fail("TEST rebuild identity drifted from fixed allowlist");
  }

  return credentials;
}

function createSqlClient(database, password) {
  return postgres({
    host: FIXED_MIGRATE_TRANSPORT.host,
    port: FIXED_MIGRATE_TRANSPORT.port,
    database,
    username: TEST_REBUILD_IDENTITY.user,
    password,
    max: 1,
    idle_timeout: 5,
    connect_timeout: 10,
    prepare: false,
    onnotice: () => {},
  });
}

function assertPostgres16(versionNumRaw) {
  const versionNum = Number(versionNumRaw);
  if (!Number.isInteger(versionNum) || versionNum < 160000 || versionNum >= 170000) {
    fail(`PostgreSQL major version must be 16 (server_version_num=${versionNumRaw ?? "NONE"})`);
  }
}

async function readConnectionIdentity(sql) {
  const identityRows = await sql`
    SELECT
      current_database() AS database_name,
      current_user AS database_user,
      current_setting('server_version_num') AS server_version_num
  `;

  const row = identityRows[0];
  if (!row) {
    fail("failed to read database identity");
  }

  assertPostgres16(row.server_version_num);
  return row;
}

async function readTargetDatabaseMetadata(sql) {
  return sql`
    SELECT
      d.datname AS database_name,
      pg_catalog.pg_get_userbyid(d.datdba) AS owner_name,
      d.datistemplate AS is_template,
      d.datallowconn AS allow_connections
    FROM pg_database d
    WHERE d.datname = ${TEST_REBUILD_IDENTITY.database}
  `;
}

function assertTargetMetadata(row, { requireAllowConnections }) {
  if (!row) {
    fail("target TEST database metadata is missing");
  }

  if (row.database_name !== TEST_REBUILD_IDENTITY.database) {
    fail("target database name drifted from nomi_numi_shop_test");
  }

  if (row.owner_name !== TEST_REBUILD_IDENTITY.user) {
    fail("target TEST database owner must be nomi_numi_test");
  }

  if (row.is_template === true) {
    fail("refusing to mutate a template database");
  }

  if (requireAllowConnections && row.allow_connections !== true) {
    fail("recreated TEST database must allow connections");
  }
}

async function assertNonTemplateDatabases(sql, expectedNames) {
  const rows = await sql`
    SELECT datname AS database_name
    FROM pg_database
    WHERE datistemplate = false
    ORDER BY datname
  `;

  const actual = rows.map((row) => row.database_name).sort();
  const expected = [...expectedNames].sort();

  if (actual.length !== expected.length || actual.some((name, index) => name !== expected[index])) {
    fail("unexpected database present on the TEST cluster; refusing rebuild");
  }
}

async function assertNoActiveTargetSessions(sql) {
  const sessions = await sql`
    SELECT pid
    FROM pg_stat_activity
    WHERE datname = ${TEST_REBUILD_IDENTITY.database}
      AND pid <> pg_backend_pid()
  `;

  if (sessions.length > 0) {
    fail(
      `TEST database nomi_numi_shop_test is in use by ${sessions.length} unexpected active sessions; refusing rebuild. Close the other test connection and retry. Active sessions are not terminated.`,
    );
  }
}

function expectedMigrationCount() {
  const migrationsFolder = requireCanonicalMigrationsFolder();
  const journalPath = path.join(migrationsFolder, "meta/_journal.json");
  if (!fs.existsSync(journalPath) || fs.lstatSync(journalPath).isSymbolicLink()) {
    fail(`migration journal missing or symlink: ${journalPath}`);
  }

  const journal = JSON.parse(fs.readFileSync(journalPath, "utf8"));
  if (!Array.isArray(journal.entries) || journal.entries.length < 1) {
    fail("committed migration journal has no entries");
  }

  return journal.entries.length;
}

async function runRecreate(credentials) {
  const sql = createSqlClient(TEST_REBUILD_IDENTITY.maintenanceDatabase, credentials.password);

  try {
    const identity = await readConnectionIdentity(sql);

    if (identity.database_name !== TEST_REBUILD_IDENTITY.maintenanceDatabase) {
      fail(
        `maintenance database identity mismatch: expected '${TEST_REBUILD_IDENTITY.maintenanceDatabase}', got '${identity.database_name}'`,
      );
    }

    if (identity.database_user !== TEST_REBUILD_IDENTITY.user) {
      fail(
        `database user identity mismatch: expected '${TEST_REBUILD_IDENTITY.user}', got '${identity.database_user}'`,
      );
    }

    const existing = await readTargetDatabaseMetadata(sql);
    if (existing.length > 1) {
      fail("ambiguous TEST database metadata; refusing rebuild");
    }

    if (existing.length === 1) {
      assertTargetMetadata(existing[0], { requireAllowConnections: false });
      await assertNonTemplateDatabases(sql, EXPECTED_NON_TEMPLATE_DATABASES);
      await assertNoActiveTargetSessions(sql);

      process.stderr.write("Dropping exactly nomi_numi_shop_test ...\n");
      await sql
        .unsafe(`DROP DATABASE ${quoteTrustedIdent(TEST_REBUILD_IDENTITY.database)}`)
        .simple();
    } else {
      await assertNonTemplateDatabases(sql, [TEST_REBUILD_IDENTITY.maintenanceDatabase]);
      process.stderr.write("TEST database is absent; proceeding to create it.\n");
    }

    process.stderr.write("Creating exactly nomi_numi_shop_test owned by nomi_numi_test ...\n");
    await sql
      .unsafe(
        `CREATE DATABASE ${quoteTrustedIdent(TEST_REBUILD_IDENTITY.database)} OWNER ${quoteTrustedIdent(TEST_REBUILD_IDENTITY.user)}`,
      )
      .simple();

    const created = await readTargetDatabaseMetadata(sql);
    if (created.length !== 1) {
      fail("recreated TEST database was not found");
    }
    assertTargetMetadata(created[0], { requireAllowConnections: true });
    await assertNonTemplateDatabases(sql, EXPECTED_NON_TEMPLATE_DATABASES);

    process.stderr.write("TEST database recreation complete. Migrations will be reapplied next.\n");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function runVerify(credentials) {
  const expectedCount = expectedMigrationCount();
  const sql = createSqlClient(TEST_REBUILD_IDENTITY.database, credentials.password);

  try {
    const identity = await readConnectionIdentity(sql);

    if (identity.database_name !== TEST_REBUILD_IDENTITY.database) {
      fail(
        `database identity mismatch: expected '${TEST_REBUILD_IDENTITY.database}', got '${identity.database_name}'`,
      );
    }

    if (identity.database_user !== TEST_REBUILD_IDENTITY.user) {
      fail(
        `database user identity mismatch: expected '${TEST_REBUILD_IDENTITY.user}', got '${identity.database_user}'`,
      );
    }

    const metadata = await readTargetDatabaseMetadata(sql);
    if (metadata.length !== 1) {
      fail("TEST database metadata missing after migrate");
    }
    assertTargetMetadata(metadata[0], { requireAllowConnections: true });
    await assertNonTemplateDatabases(sql, EXPECTED_NON_TEMPLATE_DATABASES);

    const migrationRows = await sql`
      SELECT count(*)::int AS migration_count
      FROM drizzle.__drizzle_migrations
    `;
    const migrationCount = migrationRows[0]?.migration_count;
    if (migrationCount !== expectedCount) {
      fail(
        `migration bookkeeping count mismatch: expected ${expectedCount}, got ${migrationCount ?? "NONE"}`,
      );
    }

    const tables = await sql`
      SELECT n.nspname AS schema_name, c.relname AS table_name
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind = 'r'
        AND n.nspname NOT IN ('pg_catalog', 'information_schema')
      ORDER BY 1, 2
    `;

    if (
      tables.length !== 1 ||
      tables[0]?.schema_name !== "drizzle" ||
      tables[0]?.table_name !== "__drizzle_migrations"
    ) {
      fail("unexpected relations present after TEST rebuild");
    }

    process.stderr.write("TEST database exists\n");
    process.stderr.write(`database = ${TEST_REBUILD_IDENTITY.database}\n`);
    process.stderr.write(`user = ${TEST_REBUILD_IDENTITY.user}\n`);
    process.stderr.write("PostgreSQL major = 16\n");
    process.stderr.write("Drizzle migrations applied\n");
    process.stderr.write(`migration bookkeeping count = ${migrationCount}\n`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

function isMainModule() {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }
  return pathToFileURL(path.resolve(entry)).href === import.meta.url;
}

async function main() {
  const mode = parseRunnerArguments(process.argv);
  consumeWrapperCapability();

  if (process.cwd() !== EXPECTED_ROOT) {
    fail(`Run TEST rebuild from ${EXPECTED_ROOT}`);
  }

  refuseAmbientOverrides();
  requireCanonicalMigrationsFolder();
  const credentials = requireTestCredentials();

  if (mode === "recreate") {
    await runRecreate(credentials);
    return;
  }

  await runVerify(credentials);
}

if (isMainModule()) {
  await main();
}
