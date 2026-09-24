#!/usr/bin/env node

import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

export const CI_POSTGRES_IDENTITY = Object.freeze({
  host: "127.0.0.1",
  port: 55433,
  database: "nomi_numi_shop_test",
  user: "nomi_numi_test",
  ssl: false,
});

export const CI_PASSWORD_LENGTH = 43;
export const CI_PASSWORD_PATTERN = /^[A-Za-z0-9_-]{43}$/;

const EXPECTED_RUNTIME = Object.freeze({
  CI: "true",
  GITHUB_ACTIONS: "true",
  GITHUB_JOB: "postgres-integration",
  RUNNER_OS: "Linux",
  RUNNER_ENVIRONMENT: "github-hosted",
  GITHUB_REPOSITORY: "pav4o71/nomi-numi-shop",
});
const EXPECTED_METADATA_VERSION = "7";
const EXPECTED_DIALECT = "postgresql";
const DRIZZLE_SCHEMA = "drizzle";
const DRIZZLE_MIGRATIONS_TABLE = "__drizzle_migrations";
const DRIZZLE_MIGRATIONS_SEQUENCE = "__drizzle_migrations_id_seq";
const SAFE_IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
const SAFE_MIGRATION_TAG_PATTERN = /^\d{4}_[A-Za-z0-9_]+$/;

function fail(message) {
  throw new Error(message);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseJson(value, label) {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    fail(`${label} must contain valid JSON`);
  }
}

function sortedStrings(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function assertExactArray(actual, expected, label) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    fail(`${label} mismatch: expected ${expectedJson}, received ${actualJson}`);
  }
}

function assertSafeIdentifier(value, label) {
  if (typeof value !== "string" || !SAFE_IDENTIFIER_PATTERN.test(value)) {
    fail(`${label} is not a safe PostgreSQL identifier`);
  }
  return value;
}

function normalizeSchema(value, label) {
  if (value === "" || value === undefined) {
    return "public";
  }
  return assertSafeIdentifier(value, label);
}

function assertDirectory(pathname, workspaceRoot, label) {
  const stat = lstatSync(pathname, { throwIfNoEntry: false });
  if (!stat) fail(`${label} does not exist`);
  if (stat.isSymbolicLink()) fail(`${label} must not be a symbolic link`);
  if (!stat.isDirectory()) fail(`${label} must be a directory`);
  assertContainedRealPath(pathname, workspaceRoot, label);
}

function assertRegularFile(pathname, workspaceRoot, label) {
  const stat = lstatSync(pathname, { throwIfNoEntry: false });
  if (!stat) fail(`${label} does not exist`);
  if (stat.isSymbolicLink()) fail(`${label} must not be a symbolic link`);
  if (!stat.isFile()) fail(`${label} must be a regular file`);
  assertContainedRealPath(pathname, workspaceRoot, label);
}

function assertContainedRealPath(pathname, workspaceRoot, label) {
  const real = realpathSync(pathname);
  const relative = path.relative(workspaceRoot, real);
  if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) {
    return real;
  }
  fail(`${label} must resolve beneath GITHUB_WORKSPACE`);
}

function assertNoSymlinksOrSpecialFiles(directory, workspaceRoot) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const pathname = path.join(directory, entry.name);
    const label = path.relative(workspaceRoot, pathname);
    if (entry.isSymbolicLink()) fail(`${label} must not be a symbolic link`);
    if (entry.isDirectory()) {
      assertContainedRealPath(pathname, workspaceRoot, label);
      assertNoSymlinksOrSpecialFiles(pathname, workspaceRoot);
    } else if (entry.isFile()) {
      assertContainedRealPath(pathname, workspaceRoot, label);
    } else {
      fail(`${label} must be a regular file or directory`);
    }
  }
}

export function assertNoArguments(argv) {
  if (!Array.isArray(argv) || argv.length < 2) {
    fail("argv must include the executable and script path");
  }
  if (argv.slice(2).length !== 0) {
    fail("db:migrate:ci accepts no positional arguments");
  }
}

export function assertCiRuntime(env, platform) {
  for (const [name, expected] of Object.entries(EXPECTED_RUNTIME)) {
    if (env[name] !== expected) {
      fail(`${name} must equal ${JSON.stringify(expected)}`);
    }
  }
  if (platform !== "linux") fail("db:migrate:ci requires process.platform linux");
}

export function assertWorkspace(workspace, cwd) {
  if (typeof workspace !== "string" || !path.isAbsolute(workspace)) {
    fail("GITHUB_WORKSPACE must be an absolute path");
  }
  const stat = lstatSync(workspace, { throwIfNoEntry: false });
  if (!stat) fail("GITHUB_WORKSPACE does not exist");
  if (stat.isSymbolicLink()) fail("GITHUB_WORKSPACE must not be a symbolic link");
  if (!stat.isDirectory()) fail("GITHUB_WORKSPACE must be a directory");

  const realWorkspace = realpathSync(workspace);
  const realCwd = realpathSync(cwd);
  if (realCwd !== realWorkspace) {
    fail("The current directory must equal GITHUB_WORKSPACE");
  }
  return realWorkspace;
}

export function assertNoAmbientDatabaseConfiguration(env) {
  const conflicts = Object.keys(env)
    .filter(
      (name) => name === "DATABASE_URL" || name.startsWith("PG") || name.startsWith("POSTGRES_"),
    )
    .sort();
  if (conflicts.length > 0) {
    fail(`Ambient database configuration is forbidden: ${conflicts.join(", ")}`);
  }
}

export function readValidatedCiPassword(env) {
  const password = env.NOMI_CI_POSTGRES_PASSWORD;
  if (
    typeof password !== "string" ||
    password.length !== CI_PASSWORD_LENGTH ||
    !CI_PASSWORD_PATTERN.test(password)
  ) {
    fail(`NOMI_CI_POSTGRES_PASSWORD must be ${CI_PASSWORD_LENGTH} URL-safe characters`);
  }
  return password;
}

export function buildFixedConnectionOptions(password) {
  readValidatedCiPassword({ NOMI_CI_POSTGRES_PASSWORD: password });
  if (CI_POSTGRES_IDENTITY.port === 5433) fail("Protected port 5433 is forbidden");
  return {
    host: CI_POSTGRES_IDENTITY.host,
    port: CI_POSTGRES_IDENTITY.port,
    database: CI_POSTGRES_IDENTITY.database,
    username: CI_POSTGRES_IDENTITY.user,
    password,
    ssl: CI_POSTGRES_IDENTITY.ssl,
    max: 1,
    idle_timeout: 5,
    connect_timeout: 10,
    prepare: false,
    onnotice: () => {},
  };
}

export function parseAndValidateJournal(value) {
  const journal = parseJson(value, "Drizzle journal");
  if (!isPlainObject(journal)) fail("Drizzle journal must be an object");
  if (journal.version !== EXPECTED_METADATA_VERSION) {
    fail(`Drizzle journal version must be ${EXPECTED_METADATA_VERSION}`);
  }
  if (journal.dialect !== EXPECTED_DIALECT) {
    fail(`Drizzle journal dialect must be ${EXPECTED_DIALECT}`);
  }
  if (!Array.isArray(journal.entries) || journal.entries.length === 0) {
    fail("Drizzle journal must contain migration entries");
  }

  const tags = new Set();
  let previousWhen = 0;
  for (const [index, entry] of journal.entries.entries()) {
    if (!isPlainObject(entry)) fail(`Journal entry ${index} must be an object`);
    if (entry.idx !== index) fail(`Journal entry ${index} must have idx ${index}`);
    if (entry.version !== EXPECTED_METADATA_VERSION) {
      fail(`Journal entry ${index} version must be ${EXPECTED_METADATA_VERSION}`);
    }
    if (typeof entry.tag !== "string" || !SAFE_MIGRATION_TAG_PATTERN.test(entry.tag)) {
      fail(`Journal entry ${index} has an unsafe tag`);
    }
    if (tags.has(entry.tag)) fail(`Journal migration tag is duplicated: ${entry.tag}`);
    tags.add(entry.tag);
    if (!Number.isSafeInteger(entry.when) || entry.when <= 0 || entry.when <= previousWhen) {
      fail(`Journal entry ${index} must have a strictly increasing safe timestamp`);
    }
    previousWhen = entry.when;
    if (typeof entry.breakpoints !== "boolean") {
      fail(`Journal entry ${index} breakpoints must be boolean`);
    }
  }
  return journal;
}

export function deriveLatestSnapshotPath(journal) {
  const validated = parseAndValidateJournal(journal);
  const latest = validated.entries.at(-1);
  return path.join("meta", `${String(latest.idx).padStart(4, "0")}_snapshot.json`);
}

export function parseAndValidateSnapshot(value, journal) {
  const validatedJournal = parseAndValidateJournal(journal);
  const snapshot = parseJson(value, "Drizzle snapshot");
  if (!isPlainObject(snapshot)) fail("Drizzle snapshot must be an object");
  if (snapshot.version !== validatedJournal.version) {
    fail("Drizzle snapshot version must match the journal");
  }
  if (snapshot.dialect !== validatedJournal.dialect) {
    fail("Drizzle snapshot dialect must match the journal");
  }

  for (const key of ["tables", "views", "schemas", "sequences", "enums", "roles", "policies"]) {
    if (!isPlainObject(snapshot[key])) fail(`Snapshot ${key} must be an object`);
  }
  for (const key of ["enums", "roles", "policies"]) {
    if (Object.keys(snapshot[key]).length !== 0) {
      fail(`Snapshot ${key} are not yet supported by the CI verifier`);
    }
  }
  return snapshot;
}

function deriveDeclaredSchemas(snapshot) {
  const schemas = new Set(["public"]);
  for (const [key, value] of Object.entries(snapshot.schemas)) {
    const schemaName =
      typeof value === "string"
        ? value
        : isPlainObject(value) && typeof value.name === "string"
          ? value.name
          : null;
    if (!schemaName || key !== schemaName) {
      fail(`Snapshot schema ${key} must map to the same schema name`);
    }
    if (schemaName === DRIZZLE_SCHEMA) {
      fail(`Snapshot schema ${key} conflicts with Drizzle bookkeeping`);
    }
    schemas.add(assertSafeIdentifier(schemaName, `Snapshot schema ${key}`));
  }
  return schemas;
}

function deriveSnapshotObjectRelations(records, kind, declaredSchemas, options = {}) {
  const relations = [];
  for (const [key, record] of Object.entries(records)) {
    if (!isPlainObject(record)) fail(`Snapshot relation ${key} must be an object`);
    const schema = normalizeSchema(record.schema, `Snapshot relation ${key} schema`);
    const name = assertSafeIdentifier(record.name, `Snapshot relation ${key} name`);
    if (!declaredSchemas.has(schema)) {
      fail(`Snapshot relation ${key} uses undeclared schema ${schema}`);
    }
    if (key !== `${schema}.${name}`) {
      fail(`Snapshot relation key ${key} must match ${schema}.${name}`);
    }
    if (record.isExisting === true) {
      fail(`Snapshot relation ${key} must not be marked as existing`);
    }
    if (options.table) {
      if (!isPlainObject(record.policies) || Object.keys(record.policies).length !== 0) {
        fail(`Snapshot table ${key} policies are not yet supported`);
      }
      if (record.isRLSEnabled !== false) {
        fail(`Snapshot table ${key} RLS is not yet supported`);
      }
    }
    const relationKind = options.view ? (record.materialized === true ? "m" : "v") : kind;
    relations.push({ schema_name: schema, relation_name: name, relation_kind: relationKind });
  }
  return relations;
}

export function deriveExpectedRelations(snapshotValue) {
  if (!isPlainObject(snapshotValue)) fail("Drizzle snapshot must be an object");
  const declaredSchemas = deriveDeclaredSchemas(snapshotValue);
  const relations = [
    ...deriveSnapshotObjectRelations(snapshotValue.tables, "r", declaredSchemas, {
      table: true,
    }),
    ...deriveSnapshotObjectRelations(snapshotValue.views, "v", declaredSchemas, {
      view: true,
    }),
    ...deriveSnapshotObjectRelations(snapshotValue.sequences, "S", declaredSchemas),
  ];
  relations.sort(compareRelations);
  return { schemas: sortedStrings(declaredSchemas), relations };
}

export function deriveExpectedMigrationRows(journalValue, sqlFiles) {
  const journal = parseAndValidateJournal(journalValue);
  return journal.entries.map((entry, index) => {
    const sqlText = sqlFiles instanceof Map ? sqlFiles.get(entry.tag) : sqlFiles[entry.tag];
    if (typeof sqlText !== "string") fail(`Missing SQL text for migration ${entry.tag}`);
    return {
      id: index + 1,
      hash: createHash("sha256").update(sqlText).digest("hex"),
      created_at: entry.when,
    };
  });
}

export function validateMigrationArtifacts(workspace) {
  const workspaceRoot = realpathSync(workspace);
  const migrationsFolder = path.join(workspaceRoot, "drizzle");
  const metadataFolder = path.join(migrationsFolder, "meta");
  assertDirectory(migrationsFolder, workspaceRoot, "drizzle directory");
  assertDirectory(metadataFolder, workspaceRoot, "drizzle metadata directory");
  assertNoSymlinksOrSpecialFiles(migrationsFolder, workspaceRoot);

  const journalPath = path.join(metadataFolder, "_journal.json");
  assertRegularFile(journalPath, workspaceRoot, "Drizzle journal");
  const journal = parseAndValidateJournal(readFileSync(journalPath, "utf8"));

  const expectedRootEntries = sortedStrings([
    "meta",
    ...journal.entries.map((entry) => `${entry.tag}.sql`),
  ]);
  assertExactArray(
    sortedStrings(readdirSync(migrationsFolder)),
    expectedRootEntries,
    "Drizzle root entries",
  );

  const expectedMetadataEntries = sortedStrings([
    "_journal.json",
    ...journal.entries.map((entry) => `${String(entry.idx).padStart(4, "0")}_snapshot.json`),
  ]);
  assertExactArray(
    sortedStrings(readdirSync(metadataFolder)),
    expectedMetadataEntries,
    "Drizzle metadata entries",
  );

  const sqlFiles = new Map();
  for (const entry of journal.entries) {
    const sqlPath = path.join(migrationsFolder, `${entry.tag}.sql`);
    assertRegularFile(sqlPath, workspaceRoot, `Migration ${entry.tag}`);
    sqlFiles.set(entry.tag, readFileSync(sqlPath).toString());
  }
  let snapshot;
  for (const entry of journal.entries) {
    const snapshotPath = path.join(
      metadataFolder,
      `${String(entry.idx).padStart(4, "0")}_snapshot.json`,
    );
    assertRegularFile(snapshotPath, workspaceRoot, `Snapshot ${entry.idx}`);
    const parsedSnapshot = parseAndValidateSnapshot(readFileSync(snapshotPath, "utf8"), journal);
    if (entry.idx === journal.entries.at(-1).idx) snapshot = parsedSnapshot;
  }

  if (!snapshot) fail(`Latest snapshot ${deriveLatestSnapshotPath(journal)} is missing`);
  const expectedSchema = deriveExpectedRelations(snapshot);
  const expectedMigrationRows = deriveExpectedMigrationRows(journal, sqlFiles);

  return {
    migrationsFolder,
    journal,
    snapshot,
    expectedSchemas: expectedSchema.schemas,
    expectedRelations: expectedSchema.relations,
    expectedMigrationRows,
  };
}

export function assertDatabaseIdentity(row) {
  if (!isPlainObject(row)) fail("Database identity query must return one row");
  if (row.database_name !== CI_POSTGRES_IDENTITY.database) {
    fail("Connected database identity is not the isolated CI database");
  }
  if (row.database_user !== CI_POSTGRES_IDENTITY.user) {
    fail("Connected database user is not the isolated CI user");
  }
  const version = Number(row.server_version_num);
  if (!Number.isInteger(version) || version < 160000 || version >= 170000) {
    fail("PostgreSQL major version must be exactly 16");
  }
}

export function assertDatabaseMetadata(rows) {
  if (!Array.isArray(rows) || rows.length !== 1) {
    fail("Database metadata query must return exactly one row");
  }
  const row = rows[0];
  if (
    row.database_name !== CI_POSTGRES_IDENTITY.database ||
    row.owner_name !== CI_POSTGRES_IDENTITY.user ||
    row.is_template !== false ||
    row.allow_connections !== true
  ) {
    fail("Isolated CI database metadata does not match the required identity");
  }
}

export function assertNonTemplateDatabases(rows) {
  const names = rows.map((row) => row.database_name ?? row.datname);
  assertExactArray(names, [CI_POSTGRES_IDENTITY.database, "postgres"], "Database set");
}

export function assertFreshDatabaseState({ schemas, relations, bookkeepingPresent }) {
  assertExactArray(schemas, ["public"], "Fresh database schema set");
  assertExactArray(relations, [], "Fresh database relation set");
  if (bookkeepingPresent !== false) {
    fail("Drizzle bookkeeping must not exist before migration");
  }
}

function compareRelations(left, right) {
  return (
    left.schema_name.localeCompare(right.schema_name) ||
    left.relation_name.localeCompare(right.relation_name) ||
    left.relation_kind.localeCompare(right.relation_kind)
  );
}

function normalizeRelations(rows) {
  return rows
    .map((row) => ({
      schema_name: row.schema_name,
      relation_name: row.relation_name,
      relation_kind: row.relation_kind,
    }))
    .sort(compareRelations);
}

export function assertExpectedSchemas(actualSchemas, snapshotSchemas) {
  const expected = sortedStrings([...snapshotSchemas, DRIZZLE_SCHEMA]);
  assertExactArray(actualSchemas, expected, "Post-migration schema set");
}

export function assertExpectedRelations(actualRows, snapshotRelations) {
  const expected = normalizeRelations([
    ...snapshotRelations,
    {
      schema_name: DRIZZLE_SCHEMA,
      relation_name: DRIZZLE_MIGRATIONS_TABLE,
      relation_kind: "r",
    },
    {
      schema_name: DRIZZLE_SCHEMA,
      relation_name: DRIZZLE_MIGRATIONS_SEQUENCE,
      relation_kind: "S",
    },
  ]);
  assertExactArray(normalizeRelations(actualRows), expected, "Post-migration relation set");
}

export function assertMigrationBookkeeping(actualRows, expectedRows) {
  const actual = actualRows.map((row) => {
    const id = Number(row.id);
    const createdAt = Number(row.created_at);
    if (!Number.isSafeInteger(id) || !Number.isSafeInteger(createdAt)) {
      fail("Migration bookkeeping numbers must be safe integers");
    }
    return { id, hash: row.hash, created_at: createdAt };
  });
  assertExactArray(actual, expectedRows, "Migration bookkeeping rows");
}

export function redactErrorMessage(error, password) {
  const message = error instanceof Error ? error.message : String(error);
  if (typeof password !== "string" || password.length === 0) return message;
  return message.split(password).join("[REDACTED]");
}

async function readDatabaseIdentity(sql) {
  const rows = await sql`
    SELECT
      current_database() AS database_name,
      current_user AS database_user,
      current_setting('server_version_num') AS server_version_num
  `;
  return rows;
}

async function readDatabaseMetadata(sql) {
  return sql`
    SELECT
      d.datname AS database_name,
      pg_catalog.pg_get_userbyid(d.datdba) AS owner_name,
      d.datistemplate AS is_template,
      d.datallowconn AS allow_connections
    FROM pg_database d
    WHERE d.datname = current_database()
  `;
}

async function readNonTemplateDatabases(sql) {
  return sql`
    SELECT datname AS database_name
    FROM pg_database
    WHERE datistemplate = false
    ORDER BY datname
  `;
}

async function readApplicationSchemas(sql) {
  return sql`
    SELECT nspname AS schema_name
    FROM pg_namespace
    WHERE nspname <> 'pg_catalog'
      AND nspname <> 'information_schema'
      AND nspname NOT LIKE 'pg_toast%'
      AND nspname NOT LIKE 'pg_temp%'
    ORDER BY nspname
  `;
}

async function readApplicationRelations(sql) {
  return sql`
    SELECT
      n.nspname AS schema_name,
      c.relname AS relation_name,
      c.relkind AS relation_kind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname <> 'pg_catalog'
      AND n.nspname <> 'information_schema'
      AND n.nspname NOT LIKE 'pg_toast%'
      AND n.nspname NOT LIKE 'pg_temp%'
      AND c.relkind IN ('r', 'p', 'v', 'm', 'f', 'S')
    ORDER BY n.nspname, c.relname, c.relkind
  `;
}

async function readBookkeepingPresence(sql) {
  const rows = await sql`
    SELECT EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'drizzle'
        AND c.relname = '__drizzle_migrations'
        AND c.relkind = 'r'
    ) AS present
  `;
  return rows[0]?.present === true;
}

async function readBookkeepingRows(sql) {
  return sql`
    SELECT id, hash, created_at
    FROM drizzle.__drizzle_migrations
    ORDER BY id
  `;
}

async function assertLiveDatabaseIdentity(sql) {
  const identityRows = await readDatabaseIdentity(sql);
  if (identityRows.length !== 1) fail("Database identity query must return exactly one row");
  assertDatabaseIdentity(identityRows[0]);
  assertDatabaseMetadata(await readDatabaseMetadata(sql));
  assertNonTemplateDatabases(await readNonTemplateDatabases(sql));
}

async function runPreMigrationAssertions(sql) {
  await assertLiveDatabaseIdentity(sql);
  const schemas = (await readApplicationSchemas(sql)).map((row) => row.schema_name);
  const relations = await readApplicationRelations(sql);
  const bookkeepingPresent = await readBookkeepingPresence(sql);
  assertFreshDatabaseState({ schemas, relations, bookkeepingPresent });
}

async function runPostMigrationAssertions(sql, expectedState) {
  await assertLiveDatabaseIdentity(sql);
  const schemas = (await readApplicationSchemas(sql)).map((row) => row.schema_name);
  const relations = await readApplicationRelations(sql);
  if (!(await readBookkeepingPresence(sql))) fail("Drizzle bookkeeping table is missing");
  assertExpectedSchemas(schemas, expectedState.expectedSchemas);
  assertExpectedRelations(relations, expectedState.expectedRelations);
  assertMigrationBookkeeping(await readBookkeepingRows(sql), expectedState.expectedMigrationRows);
}

export async function main({
  argv = process.argv,
  env = process.env,
  platform = process.platform,
  cwd = process.cwd(),
} = {}) {
  assertNoArguments(argv);
  assertCiRuntime(env, platform);
  assertNoAmbientDatabaseConfiguration(env);
  const password = readValidatedCiPassword(env);
  const workspace = assertWorkspace(env.GITHUB_WORKSPACE, cwd);
  const expectedState = validateMigrationArtifacts(workspace);
  const connectionOptions = buildFixedConnectionOptions(password);
  const sql = postgres(connectionOptions);

  try {
    await runPreMigrationAssertions(sql);
    const db = drizzle(sql);
    await migrate(db, { migrationsFolder: expectedState.migrationsFolder });
    await runPostMigrationAssertions(sql, expectedState);
    process.stdout.write("Committed Drizzle migrations applied and verified.\n");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

function isMainModule() {
  return process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
}

if (isMainModule()) {
  main().catch((error) => {
    const message = redactErrorMessage(error, process.env.NOMI_CI_POSTGRES_PASSWORD);
    process.stderr.write(`ERROR: ${message}\n`);
    process.exitCode = 1;
  });
}
