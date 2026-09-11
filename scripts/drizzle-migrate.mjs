#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
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

if (process.argv.length !== 3) {
  fail("usage: node scripts/drizzle-migrate.mjs <dev|test>");
}

const envId = process.argv[2];

if (process.cwd() !== EXPECTED_ROOT) {
  fail(`Run drizzle migrate from ${EXPECTED_ROOT}`);
}

// Refuse ambient transport overrides entirely. Transport is structural.
for (const banned of [
  "NOMI_DRIZZLE_CONNECT_HOST",
  "NOMI_DRIZZLE_CONNECT_PORT",
  "DATABASE_URL",
  "POSTGRES_HOST",
  "PGHOST",
  "PGPORT",
  "PGDATABASE",
  "PGUSER",
  "PGPASSWORD",
]) {
  if (process.env[banned]) {
    fail(`refusing ambient transport/credential override ${banned}`);
  }
}

const credentials = loadValidatedCredentials(envId);
assertSafeConnectionTarget(credentials);

const migrationsFolder = requireCanonicalMigrationsFolder();
const journalPath = path.join(migrationsFolder, "meta/_journal.json");
if (!fs.existsSync(journalPath) || fs.lstatSync(journalPath).isSymbolicLink()) {
  fail(`migration journal missing or symlink: ${journalPath}`);
}

const sql = postgres({
  host: FIXED_MIGRATE_TRANSPORT.host,
  port: FIXED_MIGRATE_TRANSPORT.port,
  database: credentials.database,
  username: credentials.user,
  password: credentials.password,
  max: 1,
  idle_timeout: 5,
  connect_timeout: 10,
  onnotice: () => {},
});

try {
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

  if (row.database_name !== credentials.identity.database) {
    fail(
      `database identity mismatch: expected '${credentials.identity.database}', got '${row.database_name}'`,
    );
  }

  if (row.database_user !== credentials.identity.user) {
    fail(
      `database user identity mismatch: expected '${credentials.identity.user}', got '${row.database_user}'`,
    );
  }

  const versionNum = Number(row.server_version_num);
  if (!Number.isInteger(versionNum) || versionNum < 160000 || versionNum >= 170000) {
    fail(
      `PostgreSQL major version must be 16 (server_version_num=${row.server_version_num ?? "NONE"})`,
    );
  }

  const db = drizzle(sql);
  await migrate(db, { migrationsFolder });

  process.stderr.write(
    `Applied committed migrations for ${credentials.identity.id} against ${credentials.identity.database}.\n`,
  );
  process.stderr.write(`Journal: ${pathToFileURL(journalPath).pathname}\n`);
  process.stderr.write(
    `Transport: ${FIXED_MIGRATE_TRANSPORT.host}:${FIXED_MIGRATE_TRANSPORT.port} (exact container network namespace)\n`,
  );
} finally {
  await sql.end({ timeout: 5 });
}
