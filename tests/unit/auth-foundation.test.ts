import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { getTableColumns, getTableName } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";

import {
  AuthEnvValidationError,
  LOCAL_AUTH_ORIGINS,
  PHASE2A_AUTH_BASE_PATH,
  PHASE2A_AUTH_E2E_ORIGIN,
  PHASE2A_AUTH_ORIGIN,
  parseAuthRuntimeEnv,
} from "@/auth/env";
import { authFoundationConstants, authLogger } from "@/auth/server";
import * as schema from "@/db/schema";
import { account, session, user, verification } from "@/db/schema/auth";

interface PackageManifest {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

const packageManifest = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
) as PackageManifest;

const validSecret = "a".repeat(32);
const validDatabaseUrl =
  "postgresql://nomi_numi_dev:local-dev-password-value-here@127.0.0.1:55432/nomi_numi_shop_dev";

function validEnv(overrides: Record<string, string | undefined> = {}) {
  return {
    BETTER_AUTH_SECRET: validSecret,
    BETTER_AUTH_URL: PHASE2A_AUTH_ORIGIN,
    DATABASE_URL: validDatabaseUrl,
    ...overrides,
  };
}

describe("Phase 2A Better Auth foundation", () => {
  it("pins Better Auth and Drizzle adapter to 1.7.3", () => {
    expect(packageManifest.dependencies["better-auth"]).toBe("1.7.3");
    expect(packageManifest.dependencies["@better-auth/drizzle-adapter"]).toBe("1.7.3");
    expect(packageManifest.dependencies).not.toHaveProperty("@better-auth/cli");
    expect(packageManifest.devDependencies).not.toHaveProperty("@better-auth/cli");
    expect(packageManifest.dependencies).not.toHaveProperty("next-auth");
    expect(packageManifest.dependencies).not.toHaveProperty("@auth/core");
    expect(packageManifest.dependencies).not.toHaveProperty("passport");
    expect(packageManifest.dependencies).not.toHaveProperty("jsonwebtoken");
    expect(packageManifest.dependencies).not.toHaveProperty("bcrypt");
    expect(packageManifest.dependencies).not.toHaveProperty("pg");
    expect(packageManifest.dependencies).not.toHaveProperty("prisma");
    expect(authFoundationConstants.packageVersion).toBe("1.7.3");
    expect(authFoundationConstants.adapterPackageVersion).toBe("1.7.3");
  });

  it("exports Better Auth core schema tables with Phase 2B role only", () => {
    expect(getTableName(user)).toBe("user");
    expect(getTableName(session)).toBe("session");
    expect(getTableName(account)).toBe("account");
    expect(getTableName(verification)).toBe("verification");

    expect(schema.user).toBe(user);
    expect(schema.session).toBe(session);
    expect(schema.account).toBe(account);
    expect(schema.verification).toBe(verification);

    const userColumns = Object.keys(getTableColumns(user));
    expect(userColumns).toEqual(
      expect.arrayContaining([
        "id",
        "name",
        "email",
        "emailVerified",
        "image",
        "createdAt",
        "updatedAt",
        "role",
      ]),
    );
    expect(userColumns).toContain("role");
    expect(userColumns).not.toContain("isAdmin");
    expect(userColumns).not.toContain("permissions");
    expect(userColumns).not.toContain("organizationId");
    expect(userColumns).not.toContain("tenantId");
    expect(userColumns).not.toContain("customerType");
    expect(userColumns).not.toContain("banned");
    expect(userColumns).not.toContain("banReason");
    expect(userColumns).not.toContain("banExpires");
  });

  it("accepts the Phase 2A local DEV auth runtime identity", () => {
    const config = parseAuthRuntimeEnv(validEnv());
    expect(config.baseURL).toBe("http://127.0.0.1:3100");
    expect(config.basePath).toBe("/api/auth");
    expect(config.database).toEqual({
      protocol: "postgresql",
      hostname: "127.0.0.1",
      port: 55432,
      database: "nomi_numi_shop_dev",
      username: "nomi_numi_dev",
    });
    expect(config.secret).toBe(validSecret);

    const e2eConfig = parseAuthRuntimeEnv(validEnv({ BETTER_AUTH_URL: PHASE2A_AUTH_E2E_ORIGIN }));
    expect(e2eConfig.baseURL).toBe(PHASE2A_AUTH_E2E_ORIGIN);
    expect(LOCAL_AUTH_ORIGINS).toEqual([PHASE2A_AUTH_ORIGIN, PHASE2A_AUTH_E2E_ORIGIN]);
  });

  it("rejects production while accepting explicit development runtime", () => {
    expect(() => parseAuthRuntimeEnv(validEnv({ NODE_ENV: "production" }))).toThrow(/production/);
    expect(parseAuthRuntimeEnv(validEnv({ NODE_ENV: "development" })).database.port).toBe(55432);
  });

  it("rejects the exact tracked .env.example secret placeholder", () => {
    const exampleEnv = readFileSync(new URL("../../.env.example", import.meta.url), "utf8");
    const exampleSecret = exampleEnv.match(/^BETTER_AUTH_SECRET=(.*)$/m)?.[1];
    expect(exampleSecret).toBeDefined();

    expect(() => parseAuthRuntimeEnv(validEnv({ BETTER_AUTH_SECRET: exampleSecret }))).toThrow(
      AuthEnvValidationError,
    );
  });

  it("rejects DATABASE_URL queries and fragments while accepting the canonical URL", () => {
    expect(parseAuthRuntimeEnv(validEnv()).database.port).toBe(55432);

    for (const suffix of ["?sslmode=disable", "#anything", "?query=value#anything"]) {
      const databaseUrl = `${validDatabaseUrl}${suffix}`;
      try {
        parseAuthRuntimeEnv(validEnv({ DATABASE_URL: databaseUrl }));
        expect.unreachable("expected DATABASE_URL validation failure");
      } catch (error) {
        expect(error).toBeInstanceOf(AuthEnvValidationError);
        const message = error instanceof Error ? error.message : String(error);
        expect(message).not.toContain(databaseUrl);
        expect(message).not.toContain("local-dev-password-value-here");
      }
    }
  });

  it("rejects protected 5433, TEST DB, foreign hosts, and wrong identities", () => {
    const cases: Array<{ env: Record<string, string | undefined>; pattern: RegExp }> = [
      {
        env: validEnv({
          DATABASE_URL:
            "postgresql://nomi_numi_dev:local-dev-password-value-here@127.0.0.1:5433/nomi_numi_shop_dev",
        }),
        pattern: /5433/,
      },
      {
        env: validEnv({
          DATABASE_URL:
            "postgresql://nomi_numi_test:local-test-password-value-here@127.0.0.1:55433/nomi_numi_shop_test",
        }),
        pattern: /55432|TEST/,
      },
      {
        env: validEnv({
          DATABASE_URL:
            "postgresql://nomi_numi_dev:local-dev-password-value-here@example.com:55432/nomi_numi_shop_dev",
        }),
        pattern: /127\.0\.0\.1/,
      },
      {
        env: validEnv({
          DATABASE_URL:
            "postgresql://nomi_numi_dev:local-dev-password-value-here@127.0.0.1:55432/wrong_db",
        }),
        pattern: /nomi_numi_shop_dev/,
      },
      {
        env: validEnv({
          DATABASE_URL:
            "postgresql://wrong_user:local-dev-password-value-here@127.0.0.1:55432/nomi_numi_shop_dev",
        }),
        pattern: /nomi_numi_dev/,
      },
    ];

    for (const testCase of cases) {
      expect(() => parseAuthRuntimeEnv(testCase.env)).toThrow(AuthEnvValidationError);
      expect(() => parseAuthRuntimeEnv(testCase.env)).toThrow(testCase.pattern);
    }
  });

  it("rejects missing/short secrets and wrong base URLs without leaking secrets", () => {
    const secretCases = [
      validEnv({ BETTER_AUTH_SECRET: undefined }),
      validEnv({ BETTER_AUTH_SECRET: "short" }),
      validEnv({ BETTER_AUTH_SECRET: "change-me-change-me-change-me-change" }),
    ];

    for (const env of secretCases) {
      try {
        parseAuthRuntimeEnv(env);
        expect.unreachable("expected validation failure");
      } catch (error) {
        expect(error).toBeInstanceOf(AuthEnvValidationError);
        const message = error instanceof Error ? error.message : String(error);
        expect(message).not.toContain(validSecret);
        expect(message).not.toContain(validDatabaseUrl);
        if (typeof env.BETTER_AUTH_SECRET === "string" && env.BETTER_AUTH_SECRET.length > 0) {
          expect(message).not.toContain(env.BETTER_AUTH_SECRET);
        }
      }
    }

    expect(() =>
      parseAuthRuntimeEnv(validEnv({ BETTER_AUTH_URL: "http://localhost:3100" })),
    ).toThrow(/BETTER_AUTH_URL/);
    expect(() => parseAuthRuntimeEnv(validEnv({ BETTER_AUTH_URL: "https://example.com" }))).toThrow(
      /BETTER_AUTH_URL/,
    );
    expect(() =>
      parseAuthRuntimeEnv(
        validEnv({
          VERCEL_ENV: "production",
        }),
      ),
    ).toThrow(/production/);
  });

  it("enables email/password while keeping social providers and plugins disabled", () => {
    expect(authFoundationConstants.emailAndPasswordEnabled).toBe(true);
    expect(authFoundationConstants.requireEmailVerification).toBe(true);
    expect(authFoundationConstants.socialProvidersConfigured).toBe(false);
    expect(authFoundationConstants.pluginsConfigured).toBe(false);
    expect(authFoundationConstants.adminPluginConfigured).toBe(false);
    expect(authFoundationConstants.roleInputAllowed).toBe(false);
    expect(authFoundationConstants.defaultAppRole).toBe("customer");
    expect(authFoundationConstants.basePath).toBe(PHASE2A_AUTH_BASE_PATH);
    expect(authFoundationConstants.baseURL).toBe(PHASE2A_AUTH_ORIGIN);

    const serverSource = readFileSync(new URL("../../src/auth/server.ts", import.meta.url), "utf8");
    expect(serverSource).toMatch(/emailAndPassword\s*:\s*\{/);
    expect(serverSource).not.toMatch(/socialProviders\s*:/);
    expect(serverSource).not.toMatch(/plugins\s*:/);
    expect(serverSource).not.toMatch(/nextCookies/);
    expect(serverSource).not.toMatch(/from\s+["']better-auth\/plugins["']/);
    expect(serverSource).not.toMatch(/\badmin\s*\(/);
  });

  it("keeps the auth route at /api/auth and includes the Phase 2C3 client instance", () => {
    const routePath = path.join(process.cwd(), "src/app/api/auth/[...all]/route.ts");
    expect(existsSync(routePath)).toBe(true);
    const routeSource = readFileSync(routePath, "utf8");
    expect(routeSource).toContain('from "better-auth/next-js"');
    expect(routeSource).toContain("toNextJsHandler");
    expect(routeSource).toContain('export const runtime = "nodejs"');
    expect(routeSource).toContain("getAuth()");

    expect(existsSync(path.join(process.cwd(), "src/auth/client.ts"))).toBe(true);
    expect(existsSync(path.join(process.cwd(), "src/lib/auth-client.ts"))).toBe(false);
  });

  it("logs only a safe high-level auth message and drops sensitive arguments", () => {
    const token = "NOMI_DO_NOT_LOG_SESSION_TOKEN_TEST";
    const output: string[] = [];
    const errorSpy = vi.spyOn(console, "error").mockImplementation((...args) => {
      output.push(args.map(String).join(" "));
    });

    authLogger.log(
      "error",
      "INTERNAL_SERVER_ERROR",
      new Error(token),
      token,
      validDatabaseUrl,
      "local-dev-password-value-here",
    );
    authLogger.log("error", token, { token, databaseUrl: validDatabaseUrl });

    expect(output.join("\n")).toContain("[better-auth:error] INTERNAL_SERVER_ERROR");
    expect(output.join("\n")).toContain("[better-auth:error] Authentication request failed");
    expect(output.join("\n")).not.toContain(token);
    expect(output.join("\n")).not.toContain(validDatabaseUrl);
    expect(output.join("\n")).not.toContain("local-dev-password-value-here");
    errorSpy.mockRestore();
  });
});
