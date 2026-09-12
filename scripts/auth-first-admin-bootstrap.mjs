#!/usr/bin/env node

/**
 * Phase 2C4 — guarded DEV/TEST-only first-admin bootstrap.
 *
 * Promotes an existing verified customer to admin only while zero admins
 * exist. No HTTP surface. No self-promotion. No env-email auto-promotion.
 * Production remains out of scope.
 */

import fs from "node:fs";
import { pathToFileURL } from "node:url";

import postgres from "postgres";

import {
  EXPECTED_ROOT,
  PROTECTED_HOST_PORT,
  assertSafeConnectionTarget,
  fail as exitFail,
  loadValidatedCredentials,
  resolveEnvironment,
} from "./drizzle-credentials.mjs";

export const FIRST_ADMIN_CONFIRMATION = "PROMOTE-FIRST-NOMI-ADMIN";

/** Fixed advisory-lock pair serializing first-admin bootstrap attempts. */
export const FIRST_ADMIN_LOCK_KEY1 = 0x4e4f4d49; // NOMI
export const FIRST_ADMIN_LOCK_KEY2 = 0x41444d4e; // ADMN

const BANNED_AMBIENT_VARS = Object.freeze([
  "DATABASE_URL",
  "POSTGRES_HOST",
  "PGHOST",
  "PGPORT",
  "PGDATABASE",
  "PGUSER",
  "PGPASSWORD",
  "NOMI_DRIZZLE_CONNECT_HOST",
  "NOMI_DRIZZLE_CONNECT_PORT",
]);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class FirstAdminBootstrapError extends Error {
  constructor(message) {
    super(message);
    this.name = "FirstAdminBootstrapError";
  }
}

/**
 * Fail closed without hard-exiting so callers (transactions/tests) can unwind.
 * CLI `main` maps this to process.exit(1).
 */
export function fail(message) {
  throw new FirstAdminBootstrapError(message);
}

/**
 * @param {Record<string, string | undefined>} [env]
 */
export function refuseProductionLikeEnvironment(env = process.env) {
  if (env.NODE_ENV === "production") {
    fail("refusing production-like environment (NODE_ENV=production)");
  }
  if (env.VERCEL === "1") {
    fail("refusing production-like environment (VERCEL=1)");
  }
  if (env.VERCEL_ENV === "production") {
    fail("refusing production-like environment (VERCEL_ENV=production)");
  }
}

/**
 * @param {Record<string, string | undefined>} [env]
 */
export function refuseAmbientOverrides(env = process.env) {
  for (const banned of BANNED_AMBIENT_VARS) {
    if (env[banned]) {
      fail(`refusing ambient transport/credential override ${banned}`);
    }
  }
}

export function normalizeBootstrapEmail(rawEmail) {
  if (typeof rawEmail !== "string") {
    fail("email is required");
  }

  const email = rawEmail.trim().toLowerCase();
  if (email.length === 0 || email.length > 320 || !EMAIL_PATTERN.test(email)) {
    fail("malformed email; refusing first-admin bootstrap");
  }

  return email;
}

/**
 * @returns {{ envId: "dev" | "test", email: string, confirmation: string }}
 */
export function parseBootstrapArguments(argv = process.argv) {
  const args = argv.slice(2);
  const parsed = {
    envId: undefined,
    email: undefined,
    confirmation: undefined,
  };

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    const next = args[index + 1];

    if (token === "--env") {
      if (next === undefined) {
        fail("usage: --env <dev|test> --email <email> --confirm PROMOTE-FIRST-NOMI-ADMIN");
      }
      parsed.envId = next;
      index += 1;
      continue;
    }

    if (token === "--email") {
      if (next === undefined) {
        fail("usage: --env <dev|test> --email <email> --confirm PROMOTE-FIRST-NOMI-ADMIN");
      }
      parsed.email = next;
      index += 1;
      continue;
    }

    if (token === "--confirm") {
      if (next === undefined) {
        fail("confirmation token missing; refusing first-admin bootstrap");
      }
      parsed.confirmation = next;
      index += 1;
      continue;
    }

    fail(`unexpected argument '${token}'; refusing first-admin bootstrap`);
  }

  if (
    parsed.envId === undefined ||
    parsed.email === undefined ||
    parsed.confirmation === undefined
  ) {
    fail("usage: --env <dev|test> --email <email> --confirm PROMOTE-FIRST-NOMI-ADMIN");
  }

  if (parsed.confirmation !== FIRST_ADMIN_CONFIRMATION) {
    fail("confirmation token mismatch; refusing first-admin bootstrap");
  }

  if (parsed.envId !== "dev" && parsed.envId !== "test") {
    fail(`unsupported environment '${parsed.envId}' (only 'dev' or 'test')`);
  }

  return {
    envId: parsed.envId,
    email: normalizeBootstrapEmail(parsed.email),
    confirmation: parsed.confirmation,
  };
}

export function requireSafeBootstrapCredentials(envId) {
  const identity = resolveEnvironment(envId);
  const credentials = loadValidatedCredentials(envId);
  assertSafeConnectionTarget(credentials);

  if (String(credentials.port) === PROTECTED_HOST_PORT) {
    fail(`refusing protected host port ${PROTECTED_HOST_PORT}`);
  }

  if (
    credentials.identity.id !== identity.id ||
    credentials.host !== identity.host ||
    String(credentials.port) !== identity.port ||
    credentials.database !== identity.database ||
    credentials.user !== identity.user
  ) {
    fail("connection identity drifted from fixed environment allowlist");
  }

  return credentials;
}

function createSqlClient(credentials) {
  return postgres({
    host: credentials.host,
    port: credentials.port,
    database: credentials.database,
    username: credentials.user,
    password: credentials.password,
    max: 1,
    idle_timeout: 5,
    connect_timeout: 10,
    prepare: false,
    onnotice: () => {},
  });
}

async function assertLiveConnectionIdentity(sql, credentials) {
  const identityRows = await sql`
    SELECT
      current_database() AS database_name,
      current_user AS database_user,
      inet_server_port() AS server_port
  `;

  const row = identityRows[0];
  if (!row) {
    fail("failed to read database identity");
  }

  if (row.database_name !== credentials.database) {
    fail(
      `database identity mismatch: expected '${credentials.database}', got '${row.database_name}'`,
    );
  }

  if (row.database_user !== credentials.user) {
    fail(
      `database user identity mismatch: expected '${credentials.user}', got '${row.database_user}'`,
    );
  }
}

/**
 * Race-safe first-admin promotion.
 *
 * Uses a transaction-scoped advisory lock so concurrent bootstrap attempts
 * serialize, then re-checks zero-admin + verified customer conditions before
 * the guarded UPDATE.
 *
 * @param {{
 *   envId: "dev" | "test",
 *   email: string,
 *   confirmation?: string,
 *   env?: Record<string, string | undefined>,
 *   sqlClient?: ReturnType<typeof postgres>,
 * }} options
 */
export async function promoteFirstAdmin(options) {
  const env = options.env ?? process.env;
  refuseProductionLikeEnvironment(env);
  refuseAmbientOverrides(env);

  if (options.confirmation !== undefined && options.confirmation !== FIRST_ADMIN_CONFIRMATION) {
    fail("confirmation token mismatch; refusing first-admin bootstrap");
  }

  const email = normalizeBootstrapEmail(options.email);
  const credentials = requireSafeBootstrapCredentials(options.envId);
  const ownsClient = options.sqlClient === undefined;
  const sql = options.sqlClient ?? createSqlClient(credentials);

  try {
    await assertLiveConnectionIdentity(sql, credentials);

    const result = await sql.begin(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(${FIRST_ADMIN_LOCK_KEY1}, ${FIRST_ADMIN_LOCK_KEY2})`;

      const adminRows = await tx`
        SELECT id
        FROM "user"
        WHERE role = 'admin'
        LIMIT 1
      `;

      if (adminRows.length > 0) {
        fail("an admin already exists; refusing first-admin bootstrap");
      }

      const userRows = await tx`
        SELECT id, email, email_verified, role
        FROM "user"
        WHERE lower(email) = ${email}
        LIMIT 1
        FOR UPDATE
      `;

      if (userRows.length === 0) {
        fail("no matching user; refusing first-admin bootstrap");
      }

      const candidate = userRows[0];
      if (candidate.email_verified !== true) {
        fail("user email is not verified; refusing first-admin bootstrap");
      }

      if (candidate.role === "admin") {
        fail("an admin already exists; refusing first-admin bootstrap");
      }

      if (candidate.role !== "customer") {
        fail("user role is not an eligible customer; refusing first-admin bootstrap");
      }

      const updated = await tx`
        UPDATE "user"
        SET
          role = 'admin',
          updated_at = now()
        WHERE id = ${candidate.id}
          AND role = 'customer'
          AND email_verified = true
          AND NOT EXISTS (
            SELECT 1
            FROM "user" existing_admin
            WHERE existing_admin.role = 'admin'
          )
        RETURNING id, email, role
      `;

      if (updated.length !== 1) {
        fail("first-admin promotion refused by guarded update");
      }

      return updated[0];
    });

    return {
      userId: result.id,
      email: result.email,
      role: result.role,
      environment: credentials.identity.id,
      database: credentials.database,
    };
  } finally {
    if (ownsClient) {
      await sql.end({ timeout: 5 });
    }
  }
}

function writeBootstrapFailure(error) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.startsWith("ERROR:")) {
    process.stderr.write(`${message}\n`);
  } else {
    process.stderr.write(`ERROR: ${message}\n`);
  }
}

async function main(argv = process.argv) {
  if (process.cwd() !== EXPECTED_ROOT) {
    exitFail(`Run first-admin bootstrap from ${EXPECTED_ROOT}`);
  }

  if (!fs.existsSync(EXPECTED_ROOT)) {
    exitFail(`expected repository root missing: ${EXPECTED_ROOT}`);
  }

  try {
    const parsed = parseBootstrapArguments(argv);
    const promoted = await promoteFirstAdmin({
      envId: parsed.envId,
      email: parsed.email,
      confirmation: parsed.confirmation,
    });

    process.stdout.write(
      `OK: promoted verified customer ${promoted.email} to admin in ${promoted.environment} (${promoted.database})\n`,
    );
  } catch (error) {
    writeBootstrapFailure(error);
    process.exit(1);
  }
}

const isDirectExecution =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  main().catch((error) => {
    writeBootstrapFailure(error);
    process.exit(1);
  });
}
