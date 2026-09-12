import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";

import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  EXPECTED_ROOT,
  PROTECTED_HOST_PORT,
  loadValidatedCredentials,
} from "../../scripts/drizzle-credentials.mjs";
import {
  FIRST_ADMIN_CONFIRMATION,
  promoteFirstAdmin,
  requireSafeBootstrapCredentials,
} from "../../scripts/auth-first-admin-bootstrap.mjs";

/**
 * Path-locked / DB-backed Phase 2C4 coverage.
 * Excluded from portable `pnpm test:ci` (see package.json).
 */

function runBootstrap(args: string[], extraEnv: Record<string, string | undefined> = {}) {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries({ ...process.env, ...extraEnv })) {
    if (value !== undefined) {
      env[key] = value;
    }
  }
  for (const key of Object.keys(extraEnv)) {
    if (extraEnv[key] === undefined) {
      delete env[key];
    }
  }

  return spawnSync("./scripts/auth-first-admin-bootstrap.sh", args, {
    cwd: EXPECTED_ROOT,
    encoding: "utf8",
    env: env as NodeJS.ProcessEnv,
  });
}

describe("Phase 2C4 first-admin bootstrap local safety", () => {
  it("loads only allowlisted DEV/TEST credentials and refuses bad CLI confirmations", () => {
    const testCredentials = requireSafeBootstrapCredentials("test");
    expect(testCredentials.database).toBe("nomi_numi_shop_test");
    expect(testCredentials.port).toBe(55433);
    expect(String(testCredentials.port)).not.toBe(PROTECTED_HOST_PORT);

    const devCredentials = requireSafeBootstrapCredentials("dev");
    expect(devCredentials.database).toBe("nomi_numi_shop_dev");
    expect(devCredentials.port).toBe(55432);

    const missing = runBootstrap([]);
    expect(missing.status).not.toBe(0);
    expect(`${missing.stdout}${missing.stderr}`).toMatch(/usage:|--env/i);

    const wrongConfirm = runBootstrap([
      "--env",
      "test",
      "--email",
      "nobody@example.com",
      "--confirm",
      "NOPE",
    ]);
    expect(wrongConfirm.status).not.toBe(0);
    expect(`${wrongConfirm.stdout}${wrongConfirm.stderr}`).toMatch(/confirmation token mismatch/i);

    const productionLike = runBootstrap(
      ["--env", "test", "--email", "nobody@example.com", "--confirm", FIRST_ADMIN_CONFIRMATION],
      { NODE_ENV: "production" },
    );
    expect(productionLike.status).not.toBe(0);
    expect(`${productionLike.stdout}${productionLike.stderr}`).toMatch(/NODE_ENV=production/);
  });
});

describe("Phase 2C4 first-admin bootstrap against TEST database", () => {
  const credentials = loadValidatedCredentials("test");
  let sql: ReturnType<typeof postgres>;
  const createdUserIds: string[] = [];

  async function insertUser(options: {
    email: string;
    emailVerified: boolean;
    role: "customer" | "admin" | null;
  }) {
    const userId = randomUUID();
    await sql`
      INSERT INTO "user" (id, name, email, email_verified, role, created_at, updated_at)
      VALUES (
        ${userId},
        ${"Bootstrap Fixture"},
        ${options.email},
        ${options.emailVerified},
        ${options.role},
        now(),
        now()
      )
    `;
    createdUserIds.push(userId);
    return userId;
  }

  async function readRole(userId: string) {
    const rows = await sql`SELECT role FROM "user" WHERE id = ${userId}`;
    return rows[0]?.role ?? null;
  }

  async function deleteCreatedUsers() {
    for (const userId of createdUserIds) {
      await sql`DELETE FROM "user" WHERE id = ${userId}`;
    }
    createdUserIds.length = 0;
  }

  beforeAll(async () => {
    expect(credentials.database).toBe("nomi_numi_shop_test");
    expect(credentials.port).toBe(55433);
    sql = postgres({
      host: credentials.host,
      port: credentials.port,
      database: credentials.database,
      username: credentials.user,
      password: credentials.password,
      max: 1,
      idle_timeout: 5,
      connect_timeout: 10,
      prepare: false,
    });

    const identity = await sql`
      SELECT current_database() AS database_name, current_user AS database_user
    `;
    expect(identity[0]?.database_name).toBe("nomi_numi_shop_test");
    expect(identity[0]?.database_user).toBe("nomi_numi_test");
  });

  afterAll(async () => {
    await deleteCreatedUsers();
    await sql.end({ timeout: 5 });
  });

  it("promotes a verified customer when zero admins exist", async () => {
    await sql`DELETE FROM "user" WHERE role = 'admin'`;
    const email = `first-admin-${randomUUID()}@example.com`;
    const userId = await insertUser({ email, emailVerified: true, role: "customer" });

    const promoted = await promoteFirstAdmin({
      envId: "test",
      email,
      confirmation: FIRST_ADMIN_CONFIRMATION,
      env: { NODE_ENV: "test" },
    });

    expect(promoted).toMatchObject({
      userId,
      email,
      role: "admin",
      environment: "test",
      database: "nomi_numi_shop_test",
    });
    expect(await readRole(userId)).toBe("admin");
  });

  it("refuses when an admin already exists (zero-admin requirement)", async () => {
    const existingAdminEmail = `existing-admin-${randomUUID()}@example.com`;
    const candidateEmail = `candidate-${randomUUID()}@example.com`;
    await insertUser({ email: existingAdminEmail, emailVerified: true, role: "admin" });
    const candidateId = await insertUser({
      email: candidateEmail,
      emailVerified: true,
      role: "customer",
    });

    await expect(
      promoteFirstAdmin({
        envId: "test",
        email: candidateEmail,
        confirmation: FIRST_ADMIN_CONFIRMATION,
        env: { NODE_ENV: "test" },
      }),
    ).rejects.toThrow(/admin already exists/i);

    expect(await readRole(candidateId)).toBe("customer");
  });

  it("refuses unverified users", async () => {
    await sql`DELETE FROM "user" WHERE role = 'admin'`;
    const email = `unverified-${randomUUID()}@example.com`;
    const userId = await insertUser({ email, emailVerified: false, role: "customer" });

    await expect(
      promoteFirstAdmin({
        envId: "test",
        email,
        confirmation: FIRST_ADMIN_CONFIRMATION,
        env: { NODE_ENV: "test" },
      }),
    ).rejects.toThrow(/not verified/i);

    expect(await readRole(userId)).toBe("customer");
  });

  it("refuses missing users", async () => {
    await sql`DELETE FROM "user" WHERE role = 'admin'`;
    await expect(
      promoteFirstAdmin({
        envId: "test",
        email: `missing-${randomUUID()}@example.com`,
        confirmation: FIRST_ADMIN_CONFIRMATION,
        env: { NODE_ENV: "test" },
      }),
    ).rejects.toThrow(/no matching user/i);
  });

  it("refuses repeated bootstrap after the first admin exists", async () => {
    await sql`DELETE FROM "user" WHERE role = 'admin'`;
    const firstEmail = `repeat-first-${randomUUID()}@example.com`;
    const secondEmail = `repeat-second-${randomUUID()}@example.com`;
    await insertUser({ email: firstEmail, emailVerified: true, role: "customer" });
    const secondId = await insertUser({
      email: secondEmail,
      emailVerified: true,
      role: "customer",
    });

    await promoteFirstAdmin({
      envId: "test",
      email: firstEmail,
      confirmation: FIRST_ADMIN_CONFIRMATION,
      env: { NODE_ENV: "test" },
    });

    await expect(
      promoteFirstAdmin({
        envId: "test",
        email: secondEmail,
        confirmation: FIRST_ADMIN_CONFIRMATION,
        env: { NODE_ENV: "test" },
      }),
    ).rejects.toThrow(/admin already exists/i);

    expect(await readRole(secondId)).toBe("customer");
  });

  it("allows only one winner under concurrent bootstrap attempts", async () => {
    await sql`DELETE FROM "user" WHERE role = 'admin'`;
    const emailA = `race-a-${randomUUID()}@example.com`;
    const emailB = `race-b-${randomUUID()}@example.com`;
    const idA = await insertUser({ email: emailA, emailVerified: true, role: "customer" });
    const idB = await insertUser({ email: emailB, emailVerified: true, role: "customer" });

    const results = await Promise.allSettled([
      promoteFirstAdmin({
        envId: "test",
        email: emailA,
        confirmation: FIRST_ADMIN_CONFIRMATION,
        env: { NODE_ENV: "test" },
      }),
      promoteFirstAdmin({
        envId: "test",
        email: emailB,
        confirmation: FIRST_ADMIN_CONFIRMATION,
        env: { NODE_ENV: "test" },
      }),
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason.message).toMatch(/admin already exists/i);

    const roleA = await readRole(idA);
    const roleB = await readRole(idB);
    expect([roleA, roleB].filter((role) => role === "admin")).toHaveLength(1);
    expect([roleA, roleB].filter((role) => role === "customer")).toHaveLength(1);
  });

  it("runs successfully through the public shell wrapper on TEST", async () => {
    await sql`DELETE FROM "user" WHERE role = 'admin'`;
    const email = `wrapper-${randomUUID()}@example.com`;
    const userId = await insertUser({ email, emailVerified: true, role: "customer" });

    const result = runBootstrap([
      "--env",
      "test",
      "--email",
      email,
      "--confirm",
      FIRST_ADMIN_CONFIRMATION,
    ]);

    expect(result.status).toBe(0);
    expect(`${result.stdout}${result.stderr}`).toMatch(/OK: promoted verified customer/i);
    expect(await readRole(userId)).toBe("admin");
  });
});
