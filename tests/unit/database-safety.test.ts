import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { EXPECTED_ROOT, PROTECTED_HOST_PORT } from "../../scripts/drizzle-credentials.mjs";
import { FIXED_MIGRATE_TRANSPORT } from "../../scripts/drizzle-path-safety.mjs";
import {
  TEST_REBUILD_CONFIRMATION,
  TEST_REBUILD_IDENTITY,
  WRAPPER_CAPABILITY_ENV,
  WRAPPER_CAPABILITY_LENGTH,
  WRAPPER_CAPABILITY_PATTERN,
  assertCapabilityChannels,
  parseRunnerArguments,
  quoteTrustedIdent,
} from "../../scripts/db-test-rebuild.mjs";

interface PackageManifest {
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

const packageManifest = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
) as PackageManifest;

const rebuildHelper = readFileSync(
  new URL("../../scripts/db-test-rebuild.sh", import.meta.url),
  "utf8",
);

const rebuildRunner = readFileSync(
  new URL("../../scripts/db-test-rebuild.mjs", import.meta.url),
  "utf8",
);

const drizzleHelper = readFileSync(
  new URL("../../scripts/drizzle-local.sh", import.meta.url),
  "utf8",
);

const dbLocalHelper = readFileSync(new URL("../../scripts/db-local.sh", import.meta.url), "utf8");

const forbiddenPublicDbCommands = [
  "db:dev:reset",
  "db:dev:rebuild",
  "db:dev:drop",
  "db:dev:destroy",
  "db:reset",
  "db:drop",
  "db:destroy",
  "db:query",
  "db:psql",
  "db:sql",
  "db:exec",
  "db:shell",
];

function runRebuild(args: string[], extraEnv: Record<string, string> = {}) {
  return spawnSync("./scripts/db-test-rebuild.sh", args, {
    cwd: EXPECTED_ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      ...extraEnv,
    },
  });
}

function runRunner(args: string[], options: { env?: Record<string, string>; input?: string } = {}) {
  return spawnSync("node", ["scripts/db-test-rebuild.mjs", ...args], {
    cwd: EXPECTED_ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      ...options.env,
    },
    input: options.input,
  });
}

function withMockedExit(callback: () => void) {
  const previousExit = process.exit;
  let exitCode: number | undefined;
  process.exit = ((code?: number) => {
    exitCode = code ?? 1;
    throw new Error(`exit:${exitCode}`);
  }) as typeof process.exit;

  try {
    callback();
    return exitCode;
  } finally {
    process.exit = previousExit;
  }
}

describe("Phase 1F TEST-only destructive safety", () => {
  it("exposes only the guarded TEST rebuild command", () => {
    expect(packageManifest.scripts["db:test:rebuild"]).toBe("./scripts/db-test-rebuild.sh");
    expect(packageManifest.scripts["db:test:rebuild"]).not.toContain("RESET-NOMI-TEST-DATABASE");

    for (const scriptName of forbiddenPublicDbCommands) {
      expect(packageManifest.scripts[scriptName]).toBeUndefined();
    }

    for (const scriptName of Object.keys(packageManifest.scripts)) {
      expect(scriptName).not.toMatch(/^db:(?:dev:)?(?:reset|drop|destroy)$/);
      expect(scriptName).not.toMatch(/^db:(?:query|psql|sql|exec|shell)$/);
    }
  });

  it("fixes the destructive target to the exact TEST identity", () => {
    expect(TEST_REBUILD_IDENTITY.environment).toBe("test");
    expect(TEST_REBUILD_IDENTITY.composeProject).toBe("nomi-numi-shop-test");
    expect(TEST_REBUILD_IDENTITY.containerName).toBe("nomi-numi-shop-test-postgres-1");
    expect(TEST_REBUILD_IDENTITY.database).toBe("nomi_numi_shop_test");
    expect(TEST_REBUILD_IDENTITY.user).toBe("nomi_numi_test");
    expect(TEST_REBUILD_IDENTITY.host).toBe("127.0.0.1");
    expect(TEST_REBUILD_IDENTITY.hostPort).toBe("55433");
    expect(TEST_REBUILD_IDENTITY.internalHost).toBe("127.0.0.1");
    expect(TEST_REBUILD_IDENTITY.internalPort).toBe(5432);
    expect(TEST_REBUILD_IDENTITY.network).toBe("nomi-numi-shop-test_postgres_net");
    expect(TEST_REBUILD_IDENTITY.volume).toBe("nomi-numi-shop-test_postgres_data");
    expect(TEST_REBUILD_IDENTITY.maintenanceDatabase).toBe("postgres");
    expect(TEST_REBUILD_CONFIRMATION).toBe("RESET-NOMI-TEST-DATABASE");
    expect(PROTECTED_HOST_PORT).toBe("5433");
    expect(TEST_REBUILD_IDENTITY.hostPort).not.toBe(PROTECTED_HOST_PORT);
    expect(FIXED_MIGRATE_TRANSPORT).toEqual({ host: "127.0.0.1", port: 5432 });

    expect(rebuildHelper).toContain('ENV_ID="test"');
    expect(rebuildHelper).toContain('COMPOSE_PROJECT="nomi-numi-shop-test"');
    expect(rebuildHelper).toContain('EXPECTED_CONTAINER="nomi-numi-shop-test-postgres-1"');
    expect(rebuildHelper).toContain('DATABASE_NAME="nomi_numi_shop_test"');
    expect(rebuildHelper).toContain('EXPECTED_USER="nomi_numi_test"');
    expect(rebuildHelper).toContain('HOST_PORT="55433"');
    expect(rebuildHelper).toContain('EXPECTED_NETWORK="nomi-numi-shop-test_postgres_net"');
    expect(rebuildHelper).toContain('EXPECTED_VOLUME="nomi-numi-shop-test_postgres_data"');
    expect(rebuildHelper).toContain('MAINTENANCE_DATABASE="postgres"');
    expect(rebuildHelper).toContain('CONFIRMATION_TOKEN="RESET-NOMI-TEST-DATABASE"');
    expect(rebuildHelper).not.toContain("nomi_numi_shop_dev");
    expect(rebuildHelper).not.toContain("nomi-numi-shop-dev");
    expect(rebuildHelper).not.toContain("55432");
    expect(rebuildRunner).not.toContain("nomi_numi_shop_dev");
    expect(rebuildRunner).not.toContain("loadValidatedCredentials(process.argv");
    expect(rebuildRunner).toContain('loadValidatedCredentials("test")');
  });

  it("rejects missing, wrong, and extra confirmation arguments before SQL", () => {
    const missing = runRebuild([]);
    expect(missing.status).toBe(1);
    expect(missing.stderr).toMatch(/rebuild requires exactly: --confirm RESET-NOMI-TEST-DATABASE/);
    expect(missing.stderr).not.toMatch(/DROP DATABASE/i);

    const flagOnly = runRebuild(["--confirm"]);
    expect(flagOnly.status).toBe(1);
    expect(flagOnly.stderr).toMatch(/rebuild requires exactly: --confirm RESET-NOMI-TEST-DATABASE/);

    const wrong = runRebuild(["--confirm", "WRONG"]);
    expect(wrong.status).toBe(1);
    expect(wrong.stderr).toMatch(/confirmation token mismatch/);
    expect(wrong.stderr).not.toMatch(/DROP DATABASE/i);

    const extra = runRebuild(["--confirm", TEST_REBUILD_CONFIRMATION, "extra"]);
    expect(extra.status).toBe(1);
    expect(extra.stderr).toMatch(/rebuild requires exactly: --confirm RESET-NOMI-TEST-DATABASE/);

    const envSelector = runRebuild(["test", "--confirm", TEST_REBUILD_CONFIRMATION]);
    expect(envSelector.status).toBe(1);

    const pnpmSeparator = runRebuild(["--", "--confirm", TEST_REBUILD_CONFIRMATION, "extra"]);
    expect(pnpmSeparator.status).toBe(1);
    expect(pnpmSeparator.stderr).toMatch(
      /rebuild requires exactly: --confirm RESET-NOMI-TEST-DATABASE/,
    );
  });

  it("ignores ambient DATABASE_URL and PG* selectors", () => {
    expect(rebuildHelper).toContain("-u DATABASE_URL");
    expect(rebuildHelper).toContain("-u PGHOST");
    expect(rebuildHelper).toContain("-u PGPORT");
    expect(rebuildHelper).toContain("-u PGDATABASE");
    expect(rebuildHelper).toContain("-u PGUSER");
    expect(rebuildHelper).toContain("-u PGPASSWORD");
    expect(rebuildRunner).toContain("refusing ambient transport/credential override");
    expect(rebuildRunner).toContain("DATABASE_URL");
    expect(rebuildRunner).toContain("PGHOST");
    expect(rebuildRunner).toContain("PGPORT");
    expect(rebuildRunner).not.toMatch(/postgres\(\s*process\.env\.DATABASE_URL/);
    expect(rebuildRunner).not.toMatch(/host:\s*process\.env/);
    expect(rebuildRunner).not.toMatch(/port:\s*Number\(process\.env/);
    expect(rebuildHelper).not.toContain("PGHOST=");
    expect(rebuildHelper).not.toContain("PGPORT=");

    const hostile = runRebuild(["--confirm", "WRONG"], {
      DATABASE_URL: "postgres://attacker@127.0.0.1:5433/not_nomi",
      PGHOST: "127.0.0.1",
      PGPORT: "5433",
      PGDATABASE: "wrong",
      PGUSER: "wrong",
    });
    expect(hostile.status).toBe(1);
    expect(hostile.stderr).not.toContain("attacker");
    expect(hostile.stderr).not.toContain("not_nomi");
    expect(hostile.stderr).toMatch(/confirmation token mismatch/);
  });

  it("binds destructive SQL to the exact immutable TEST container namespace", () => {
    expect(rebuildHelper).toContain("verify_exact_postgres_container");
    expect(rebuildHelper).toContain('--network "container:${VERIFIED_CONTAINER_ID}"');
    expect(rebuildHelper).toContain("127.0.0.1:5432");
    expect(rebuildHelper).not.toContain('--network "$EXPECTED_NETWORK"');
    expect(rebuildHelper).not.toContain("NOMI_DRIZZLE_CONNECT_HOST=postgres");
    expect(rebuildHelper).not.toMatch(/CONNECT_HOST=postgres\b/);
    expect(rebuildHelper).not.toContain("hostname postgres");
    expect(rebuildRunner).toContain("FIXED_MIGRATE_TRANSPORT");
    expect(rebuildRunner).toContain("host: FIXED_MIGRATE_TRANSPORT.host");
    expect(rebuildRunner).toContain("port: FIXED_MIGRATE_TRANSPORT.port");
    expect(rebuildRunner).toContain("current_database()");
    expect(rebuildRunner).toContain("TEST_REBUILD_IDENTITY.maintenanceDatabase");
    expect(rebuildHelper).toContain("com.nomimumi.project");
    expect(rebuildHelper).toContain("com.nomimumi.environment");
    expect(rebuildHelper).toContain("com.docker.compose.project");
    expect(rebuildHelper).toContain("com.docker.compose.network");
    expect(rebuildHelper).toContain("com.docker.compose.volume");
  });

  it("keeps destructive SQL fixed to DROP/CREATE of nomi_numi_shop_test", () => {
    expect(rebuildRunner).toContain(
      "DROP DATABASE ${quoteTrustedIdent(TEST_REBUILD_IDENTITY.database)}",
    );
    expect(rebuildRunner).toContain(
      "CREATE DATABASE ${quoteTrustedIdent(TEST_REBUILD_IDENTITY.database)} OWNER ${quoteTrustedIdent(TEST_REBUILD_IDENTITY.user)}",
    );
    expect(rebuildRunner).not.toMatch(/DROP DATABASE \$\{process\./);
    expect(rebuildRunner).not.toContain("DROP SCHEMA");
    expect(rebuildRunner).not.toContain("TRUNCATE");
    expect(rebuildRunner).not.toContain("DELETE FROM");
    expect(rebuildRunner).not.toContain("pg_terminate_backend");
    expect(rebuildHelper).not.toContain("pg_terminate_backend");
    expect(rebuildRunner).toContain("pg_stat_activity");
    expect(rebuildRunner).toMatch(/unexpected active sessions/);
    expect(quoteTrustedIdent(TEST_REBUILD_IDENTITY.database)).toBe('"nomi_numi_shop_test"');
    expect(quoteTrustedIdent(TEST_REBUILD_IDENTITY.user)).toBe('"nomi_numi_test"');
    expect(quoteTrustedIdent(TEST_REBUILD_IDENTITY.maintenanceDatabase)).toBe('"postgres"');

    withMockedExit(() => {
      expect(() => quoteTrustedIdent("nomi_numi_shop_dev")).toThrow(/exit:1/);
      expect(() => quoteTrustedIdent("template1")).toThrow(/exit:1/);
    });
  });

  it("reuses Phase 1E migrate after TEST database recreation", () => {
    expect(rebuildHelper).toContain('scripts/drizzle-local.sh" migrate test');
    expect(rebuildHelper).toContain("run_namespaced_rebuild_runner verify");
    expect(rebuildHelper).toContain('node "$REBUILD_RUNNER" --confirm "$CONFIRMATION_TOKEN" "$@"');
    expect(rebuildRunner).toContain("__drizzle_migrations");
    expect(drizzleHelper).toContain('--network "container:${VERIFIED_CONTAINER_ID}"');
    expect(dbLocalHelper).not.toContain("rebuild");
    expect(dbLocalHelper).not.toContain("DROP DATABASE");
    expect(drizzleHelper).not.toContain("DROP DATABASE");
  });

  it("does not add Docker destruction or a public SQL console", () => {
    expect(rebuildHelper).not.toContain("docker rm");
    expect(rebuildHelper).not.toContain("docker volume rm");
    expect(rebuildHelper).not.toContain("docker network rm");
    expect(rebuildHelper).not.toContain("docker system prune");
    expect(rebuildHelper).not.toContain("down -v");
    expect(rebuildHelper).not.toContain("compose down");
    expect(rebuildRunner).not.toMatch(/\bpsql\b/);
    expect(packageManifest.dependencies).not.toHaveProperty("prisma");
    expect(packageManifest.devDependencies).not.toHaveProperty("prisma");
  });
});

describe("Phase 1F runner confirmation and wrapper capability", () => {
  const validCapability = "A".repeat(WRAPPER_CAPABILITY_LENGTH);
  const otherCapability = "B".repeat(WRAPPER_CAPABILITY_LENGTH);

  it("rejects direct runner invocation without exact confirmation", () => {
    const noArgs = runRunner([]);
    expect(noArgs.status).toBe(1);
    expect(noArgs.stderr).toMatch(
      /usage: node scripts\/db-test-rebuild\.mjs --confirm RESET-NOMI-TEST-DATABASE/,
    );
    expect(noArgs.stderr).not.toMatch(/credentials file/);
    expect(noArgs.stderr).not.toMatch(/DROP DATABASE/i);

    const flagOnly = runRunner(["--confirm"]);
    expect(flagOnly.status).toBe(1);
    expect(flagOnly.stderr).toMatch(/usage: node scripts\/db-test-rebuild\.mjs --confirm/);

    const wrong = runRunner(["--confirm", "WRONG"]);
    expect(wrong.status).toBe(1);
    expect(wrong.stderr).toMatch(/confirmation token mismatch/);
    expect(wrong.stderr).not.toMatch(/credentials file/);

    const bareToken = runRunner([TEST_REBUILD_CONFIRMATION]);
    expect(bareToken.status).toBe(1);

    const extra = runRunner(["--confirm", TEST_REBUILD_CONFIRMATION, "extra"]);
    expect(extra.status).toBe(1);

    const prod = runRunner(["prod"]);
    expect(prod.status).toBe(1);

    withMockedExit(() => {
      expect(() => parseRunnerArguments(["node", "scripts/db-test-rebuild.mjs"])).toThrow(/exit:1/);
      expect(() => parseRunnerArguments(["node", "scripts/db-test-rebuild.mjs", "dev"])).toThrow(
        /exit:1/,
      );
      expect(
        parseRunnerArguments([
          "node",
          "scripts/db-test-rebuild.mjs",
          "--confirm",
          TEST_REBUILD_CONFIRMATION,
        ]),
      ).toBe("recreate");
      expect(
        parseRunnerArguments([
          "node",
          "scripts/db-test-rebuild.mjs",
          "--confirm",
          TEST_REBUILD_CONFIRMATION,
          "verify",
        ]),
      ).toBe("verify");
    });
  });

  it("requires wrapper capability independent of confirmation", () => {
    expect(WRAPPER_CAPABILITY_ENV).toBe("NOMI_TEST_REBUILD_CAPABILITY");
    expect(WRAPPER_CAPABILITY_LENGTH).toBe(43);
    expect(WRAPPER_CAPABILITY_PATTERN.test(validCapability)).toBe(true);

    const confirmOnly = runRunner(["--confirm", TEST_REBUILD_CONFIRMATION]);
    expect(confirmOnly.status).toBe(1);
    expect(confirmOnly.stderr).toMatch(/wrapper execution context missing/);
    expect(confirmOnly.stderr).not.toMatch(/credentials file/);
    expect(confirmOnly.stderr).not.toMatch(/DROP DATABASE/i);

    const malformed = runRunner(["--confirm", TEST_REBUILD_CONFIRMATION], {
      env: { [WRAPPER_CAPABILITY_ENV]: "not-a-capability" },
      input: "not-a-capability",
    });
    expect(malformed.status).toBe(1);
    expect(malformed.stderr).toMatch(/wrapper execution context invalid/);
    expect(malformed.stderr).not.toContain("not-a-capability");

    const mismatched = runRunner(["--confirm", TEST_REBUILD_CONFIRMATION], {
      env: { [WRAPPER_CAPABILITY_ENV]: validCapability },
      input: otherCapability,
    });
    expect(mismatched.status).toBe(1);
    expect(mismatched.stderr).toMatch(/wrapper execution context mismatch/);
    expect(mismatched.stderr).not.toContain(validCapability);
    expect(mismatched.stderr).not.toContain(otherCapability);

    withMockedExit(() => {
      expect(() => assertCapabilityChannels(undefined, validCapability)).toThrow(/exit:1/);
      expect(() => assertCapabilityChannels("short", "short")).toThrow(/exit:1/);
      expect(() => assertCapabilityChannels(validCapability, "")).toThrow(/exit:1/);
      expect(() => assertCapabilityChannels(validCapability, otherCapability)).toThrow(/exit:1/);
      expect(() => assertCapabilityChannels(validCapability, validCapability)).not.toThrow();
    });
  });

  it("does not accept capability through argv and generates it dynamically in the wrapper", () => {
    const viaArgv = runRunner(["--confirm", TEST_REBUILD_CONFIRMATION, validCapability]);
    expect(viaArgv.status).toBe(1);
    expect(viaArgv.stderr).toMatch(/usage: node scripts\/db-test-rebuild\.mjs --confirm/);

    expect(rebuildHelper).toContain("randomBytes(32)");
    expect(rebuildHelper).toContain('toString("base64url")');
    expect(rebuildHelper).toContain("--env NOMI_TEST_REBUILD_CAPABILITY");
    expect(rebuildHelper).toContain("docker run --rm -i");
    expect(rebuildHelper).not.toContain("-e NOMI_TEST_REBUILD_CAPABILITY=");
    expect(rebuildHelper).not.toContain('--env NOMI_TEST_REBUILD_CAPABILITY="$');
    expect(rebuildHelper).not.toContain('echo "$wrapper_capability"');
    expect(rebuildRunner).not.toContain("process.argv.slice(4)");
    expect(rebuildRunner).toContain("delete process.env[WRAPPER_CAPABILITY_ENV]");
  });

  it("applies runner safety gates before credential or SQL operations", () => {
    const mainStart = rebuildRunner.indexOf("async function main");
    const mainBody = rebuildRunner.slice(mainStart);
    expect(mainStart).toBeGreaterThan(-1);
    expect(mainBody.indexOf("parseRunnerArguments")).toBeLessThan(
      mainBody.indexOf("consumeWrapperCapability"),
    );
    expect(mainBody.indexOf("consumeWrapperCapability")).toBeLessThan(
      mainBody.indexOf("requireTestCredentials"),
    );
    expect(mainBody.indexOf("requireTestCredentials")).toBeLessThan(
      mainBody.indexOf("runRecreate(credentials)"),
    );
  });
});
