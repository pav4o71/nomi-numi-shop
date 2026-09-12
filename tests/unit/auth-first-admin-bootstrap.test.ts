import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  FIRST_ADMIN_CONFIRMATION,
  FIRST_ADMIN_LOCK_KEY1,
  FIRST_ADMIN_LOCK_KEY2,
  FirstAdminBootstrapError,
  normalizeBootstrapEmail,
  parseBootstrapArguments,
  refuseAmbientOverrides,
  refuseProductionLikeEnvironment,
} from "../../scripts/auth-first-admin-bootstrap.mjs";

interface PackageManifest {
  scripts: Record<string, string>;
}

const packageManifest = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
) as PackageManifest;

const bootstrapHelper = readFileSync(
  new URL("../../scripts/auth-first-admin-bootstrap.sh", import.meta.url),
  "utf8",
);

const bootstrapRunner = readFileSync(
  new URL("../../scripts/auth-first-admin-bootstrap.mjs", import.meta.url),
  "utf8",
);

const clientSource = readFileSync(new URL("../../src/auth/client.ts", import.meta.url), "utf8");
const serverSource = readFileSync(new URL("../../src/auth/server.ts", import.meta.url), "utf8");
const authRouteSource = readFileSync(
  new URL("../../src/app/api/auth/[...all]/route.ts", import.meta.url),
  "utf8",
);

function expectBootstrapError(callback: () => void, pattern: RegExp) {
  expect(callback).toThrow(FirstAdminBootstrapError);
  try {
    callback();
  } catch (error) {
    expect(error).toBeInstanceOf(FirstAdminBootstrapError);
    expect((error as Error).message).toMatch(pattern);
  }
}

describe("Phase 2C4 first-admin bootstrap surface", () => {
  it("exposes only the guarded package script and confirmation token", () => {
    expect(packageManifest.scripts["auth:bootstrap-first-admin"]).toBe(
      "./scripts/auth-first-admin-bootstrap.sh",
    );
    expect(packageManifest.scripts["auth:promote-admin"]).toBeUndefined();
    expect(packageManifest.scripts["auth:demote-admin"]).toBeUndefined();
    expect(FIRST_ADMIN_CONFIRMATION).toBe("PROMOTE-FIRST-NOMI-ADMIN");
    expect(bootstrapHelper).toContain(FIRST_ADMIN_CONFIRMATION);
    expect(bootstrapHelper).toContain('PROTECTED_HOST_PORT="5433"');
    expect(bootstrapHelper).toContain("com.nomimumi.project");
    expect(bootstrapHelper).toContain('COMPOSE_SERVICE_NAME="postgres"');
    expect(bootstrapRunner).toContain("pg_advisory_xact_lock");
    expect(bootstrapRunner).toContain("NOT EXISTS");
    expect(bootstrapRunner).toContain("email_verified");
    expect(FIRST_ADMIN_LOCK_KEY1).toBe(0x4e4f4d49);
    expect(FIRST_ADMIN_LOCK_KEY2).toBe(0x41444d4e);
  });

  it("keeps role mutation off the HTTP auth client and Better Auth route", () => {
    expect(clientSource).not.toMatch(/admin\.|setRole|promote|demote|bootstrap-first-admin/);
    expect(clientSource).not.toMatch(/role\s*:/);
    expect(serverSource).not.toMatch(/\badmin\s*\(/);
    expect(serverSource).not.toMatch(/promoteFirstAdmin|bootstrap-first-admin|setRole/);
    expect(authRouteSource).not.toMatch(/promote|demote|bootstrap-first-admin|setRole/);
    expect(bootstrapHelper).not.toMatch(/api\/auth|http:\/\/|localhost:\d+/);
  });

  it("parses valid CLI arguments and refuses malformed or incomplete input", () => {
    expect(
      parseBootstrapArguments([
        "node",
        "runner",
        "--env",
        "test",
        "--email",
        "Owner@Example.com",
        "--confirm",
        FIRST_ADMIN_CONFIRMATION,
      ]),
    ).toEqual({
      envId: "test",
      email: "owner@example.com",
      confirmation: FIRST_ADMIN_CONFIRMATION,
    });

    expectBootstrapError(
      () => parseBootstrapArguments(["node", "runner", "--env", "test"]),
      /usage:/i,
    );
    expectBootstrapError(
      () =>
        parseBootstrapArguments([
          "node",
          "runner",
          "--env",
          "test",
          "--email",
          "a@b.com",
          "--confirm",
          "WRONG",
        ]),
      /confirmation token mismatch/i,
    );
    expectBootstrapError(
      () =>
        parseBootstrapArguments([
          "node",
          "runner",
          "--env",
          "prod",
          "--email",
          "a@b.com",
          "--confirm",
          FIRST_ADMIN_CONFIRMATION,
        ]),
      /unsupported environment/i,
    );
    expectBootstrapError(() => normalizeBootstrapEmail("not-an-email"), /malformed email/i);
    expectBootstrapError(() => normalizeBootstrapEmail(" "), /malformed email/i);
  });

  it("refuses production-like environments and ambient transport overrides", () => {
    expectBootstrapError(
      () => refuseProductionLikeEnvironment({ NODE_ENV: "production" }),
      /NODE_ENV=production/,
    );
    expectBootstrapError(() => refuseProductionLikeEnvironment({ VERCEL: "1" }), /VERCEL=1/);
    expectBootstrapError(
      () => refuseProductionLikeEnvironment({ VERCEL_ENV: "production" }),
      /VERCEL_ENV=production/,
    );
    expectBootstrapError(
      () => refuseAmbientOverrides({ DATABASE_URL: "postgres://example" }),
      /DATABASE_URL/,
    );
    expectBootstrapError(() => refuseAmbientOverrides({ PGHOST: "127.0.0.1" }), /PGHOST/);
  });
});

describe("Phase 2C4 does not weaken Phase 1F database safety", () => {
  it("keeps TEST rebuild as the only destructive public DB command", () => {
    expect(packageManifest.scripts["db:test:rebuild"]).toBe("./scripts/db-test-rebuild.sh");
    for (const scriptName of [
      "db:dev:reset",
      "db:dev:rebuild",
      "db:dev:drop",
      "db:reset",
      "db:drop",
      "db:destroy",
    ]) {
      expect(packageManifest.scripts[scriptName]).toBeUndefined();
    }

    expect(bootstrapHelper).not.toContain("DROP DATABASE");
    expect(bootstrapHelper).not.toContain("docker compose down -v");
    expect(bootstrapRunner).not.toContain("DROP DATABASE");
    expect(path.basename(packageManifest.scripts["auth:bootstrap-first-admin"])).toBe(
      "auth-first-admin-bootstrap.sh",
    );
  });
});
