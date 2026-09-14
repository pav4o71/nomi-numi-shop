import { describe, expect, it } from "vitest";

import { DatabaseEnvValidationError, parseDatabaseRuntimeEnv } from "@/db/env";

const validDatabaseUrl =
  "postgresql://nomi_numi_dev:local-dev-password-value-here@127.0.0.1:55432/nomi_numi_shop_dev";

function validEnv(overrides: Record<string, string | undefined> = {}) {
  return {
    DATABASE_URL: validDatabaseUrl,
    ...overrides,
  };
}

describe("parseDatabaseRuntimeEnv", () => {
  it("accepts owned local DEV DATABASE_URL without Better Auth secrets", () => {
    const config = parseDatabaseRuntimeEnv(validEnv());
    expect(config.databaseUrl).toBe(validDatabaseUrl);
    expect(config.database).toEqual({
      protocol: "postgresql",
      hostname: "127.0.0.1",
      port: 55432,
      database: "nomi_numi_shop_dev",
      username: "nomi_numi_dev",
    });
  });

  it("refuses production deployment markers", () => {
    expect(() => parseDatabaseRuntimeEnv(validEnv({ NODE_ENV: "production" }))).toThrow(
      /refuses production/,
    );
    expect(() => parseDatabaseRuntimeEnv(validEnv({ VERCEL: "1" }))).toThrow(
      DatabaseEnvValidationError,
    );
  });

  it("refuses protected port, TEST database, and non-DEV targets", () => {
    expect(() =>
      parseDatabaseRuntimeEnv(
        validEnv({
          DATABASE_URL:
            "postgresql://nomi_numi_dev:local-dev-password-value-here@127.0.0.1:5433/nomi_numi_shop_dev",
        }),
      ),
    ).toThrow(/5433/);

    expect(() =>
      parseDatabaseRuntimeEnv(
        validEnv({
          DATABASE_URL:
            "postgresql://nomi_numi_dev:local-dev-password-value-here@127.0.0.1:55433/nomi_numi_shop_test",
        }),
      ),
    ).toThrow(/TEST database|55432/);

    expect(() => parseDatabaseRuntimeEnv(validEnv({ DATABASE_URL: undefined }))).toThrow(
      /DATABASE_URL is required/,
    );
  });
});
