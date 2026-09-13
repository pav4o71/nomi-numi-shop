/**
 * Phase 3C DEV-only catalog seed CLI entrypoint (TypeScript).
 *
 * Invoked only through scripts/catalog-seed-dev.sh after ownership checks.
 * Public confirmation token: SEED-NOMI-DEV-CATALOG
 */

import { createRequire } from "node:module";
import path from "node:path";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { CatalogService, DrizzleCatalogRepository } from "@/catalog";
import { installDevCatalogFixtures, summarizePreflight } from "@/catalog/fixtures";
import { parseDevCatalogSeedArgs } from "@/catalog/fixtures/seed-args";
import * as schema from "@/db/schema";

type DevCredentials = {
  identity: { id: string; port: string; database: string; user: string };
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
};

type CredentialsModule = {
  EXPECTED_ROOT: string;
  PROTECTED_HOST_PORT: string;
  loadValidatedCredentials: (envId: string) => DevCredentials;
  assertSafeConnectionTarget: (credentials: DevCredentials) => void;
};

const require = createRequire(path.join(process.cwd(), "package.json"));
const { EXPECTED_ROOT, PROTECTED_HOST_PORT, loadValidatedCredentials, assertSafeConnectionTarget } =
  require("./scripts/drizzle-credentials.mjs") as CredentialsModule;

export { parseDevCatalogSeedArgs } from "@/catalog/fixtures/seed-args";

export function requireSafeDevSeedCredentials(): DevCredentials {
  const credentials = loadValidatedCredentials("dev");
  assertSafeConnectionTarget(credentials);

  if (String(credentials.port) === PROTECTED_HOST_PORT) {
    throw new Error(`refusing protected host port ${PROTECTED_HOST_PORT}`);
  }

  if (
    credentials.identity.id !== "dev" ||
    credentials.host !== "127.0.0.1" ||
    credentials.port !== 55432 ||
    credentials.database !== "nomi_numi_shop_dev" ||
    credentials.user !== "nomi_numi_dev"
  ) {
    throw new Error("DEV seed connection identity drifted from fixed allowlist");
  }

  return credentials;
}

function refuseProductionLikeEnvironment(): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("refusing production-like environment (NODE_ENV=production)");
  }
  if (process.env.VERCEL === "1") {
    throw new Error("refusing production-like environment (VERCEL=1)");
  }
  if (process.env.VERCEL_ENV === "production") {
    throw new Error("refusing production-like environment (VERCEL_ENV=production)");
  }
}

async function assertLiveDevIdentity(
  sql: ReturnType<typeof postgres>,
  credentials: DevCredentials,
): Promise<void> {
  const rows = await sql`
    SELECT
      current_database() AS database_name,
      current_user AS database_user
  `;
  const row = rows[0];
  if (!row) {
    throw new Error("failed to read database identity");
  }
  if (row.database_name !== credentials.database) {
    throw new Error(
      `database identity mismatch: expected '${credentials.database}', got '${row.database_name}'`,
    );
  }
  if (row.database_user !== credentials.user) {
    throw new Error(
      `database user mismatch: expected '${credentials.user}', got '${row.database_user}'`,
    );
  }
}

export async function runDevCatalogSeed(argv: string[] = process.argv.slice(2)): Promise<void> {
  refuseProductionLikeEnvironment();

  if (process.cwd() !== EXPECTED_ROOT) {
    throw new Error(`Run DEV catalog seed from ${EXPECTED_ROOT}`);
  }

  parseDevCatalogSeedArgs(argv);
  const credentials = requireSafeDevSeedCredentials();

  const sql = postgres({
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

  try {
    await assertLiveDevIdentity(sql, credentials);
    const db = drizzle(sql, { schema });
    const repo = new DrizzleCatalogRepository(db);
    const service = new CatalogService(repo);

    process.stdout.write(
      "DEV catalog seed: complete read-only fixture preflight starting (no writes yet)\n",
    );

    const result = await installDevCatalogFixtures({ service, repo, db });

    if (result.mode === "aborted-conflict") {
      process.stderr.write("DEV catalog seed ABORTED: conflicting fixture state detected\n");
      for (const component of result.preflight.components) {
        if (component.classification !== "CONFLICTING") {
          continue;
        }
        process.stderr.write(
          [
            `- ${component.key}`,
            component.field ? `field=${component.field}` : null,
            component.expected != null ? `expected=${component.expected}` : null,
            component.actual != null ? `actual=${component.actual}` : null,
            component.message ?? null,
          ]
            .filter(Boolean)
            .join(" | ") + "\n",
        );
      }
      process.exitCode = 1;
      return;
    }

    if (result.mode === "noop") {
      process.stdout.write(`DEV catalog seed OK (noop): ${summarizePreflight(result.preflight)}\n`);
      return;
    }

    process.stdout.write(
      `DEV catalog seed OK (install): ${summarizePreflight(result.preflight)} created=${result.createdKeys.length}\n`,
    );
    for (const key of result.createdKeys) {
      process.stdout.write(`  created ${key}\n`);
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

const isDirectCli =
  typeof process.argv[1] === "string" &&
  (process.argv[1].endsWith("seed-dev-cli.ts") || process.argv[1].endsWith("seed-dev-cli.js"));

if (isDirectCli) {
  runDevCatalogSeed().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`ERROR: ${message}\n`);
    process.exitCode = 1;
  });
}
