import { readFileSync } from "node:fs";
import path from "node:path";

import { parseUserInput } from "better-auth/db";
import { getTableColumns } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/auth/server")>();
  return {
    ...actual,
    getAuth: vi.fn(),
  };
});

import {
  AuthorizationError,
  assertAuthenticated,
  assertRole,
  getAuthorizationPrincipal,
  principalFromSession,
  requireAdmin,
  requireAuthenticated,
  requireCustomer,
} from "@/auth/authorization";
import { AuthEnvValidationError } from "@/auth/env";
import { APP_ROLE_ADDITIONAL_FIELD, APP_ROLES, DEFAULT_APP_ROLE, isAppRole } from "@/auth/roles";
import { authFoundationConstants, getAuth } from "@/auth/server";
import { user } from "@/db/schema/auth";

const migrationSql = readFileSync(
  path.join(process.cwd(), "drizzle/0002_phase2b_auth_role.sql"),
  "utf8",
);

function mockSessionGetter(getSession: ReturnType<typeof vi.fn>) {
  vi.mocked(getAuth).mockReturnValue({
    api: { getSession },
  } as unknown as ReturnType<typeof getAuth>);
}

function expectAuthorizationError(
  run: () => unknown,
  code: AuthorizationError["code"],
): AuthorizationError {
  try {
    run();
    expect.unreachable(`expected AuthorizationError with code ${code}`);
  } catch (error) {
    expect(error).toBeInstanceOf(AuthorizationError);
    const authError = error as AuthorizationError;
    expect(authError.code).toBe(code);
    expect(authError.message).not.toMatch(/postgresql:\/\//i);
    expect(authError.message).not.toMatch(/BETTER_AUTH_SECRET|password|session token/i);
    return authError;
  }
}

describe("Phase 2B application roles", () => {
  it("supports exactly customer and admin with customer default", () => {
    expect(APP_ROLES).toEqual(["customer", "admin"]);
    expect(DEFAULT_APP_ROLE).toBe("customer");
    expect(isAppRole("customer")).toBe(true);
    expect(isAppRole("admin")).toBe(true);
    expect(isAppRole("owner")).toBe(false);
    expect(isAppRole("user")).toBe(false);
    expect(isAppRole(null)).toBe(false);
    expect(isAppRole(undefined)).toBe(false);
    expect(isAppRole("")).toBe(false);
    expect(isAppRole(["customer"])).toBe(false);
    expect(isAppRole({ role: "admin" })).toBe(false);
  });

  it("configures Better Auth role as server-owned additionalField", () => {
    expect(APP_ROLE_ADDITIONAL_FIELD).toEqual({
      type: ["customer", "admin"],
      required: false,
      defaultValue: "customer",
      input: false,
      returned: true,
    });
    expect(APP_ROLE_ADDITIONAL_FIELD.input).toBe(false);
    expect(APP_ROLE_ADDITIONAL_FIELD.defaultValue).toBe("customer");
    expect(authFoundationConstants.roleInputAllowed).toBe(false);
    expect(authFoundationConstants.adminPluginConfigured).toBe(false);
  });

  it("rejects ordinary user input setting role via Better Auth parseUserInput", () => {
    const options = {
      user: {
        additionalFields: {
          role: {
            type: [...APP_ROLE_ADDITIONAL_FIELD.type],
            required: APP_ROLE_ADDITIONAL_FIELD.required,
            defaultValue: APP_ROLE_ADDITIONAL_FIELD.defaultValue,
            input: APP_ROLE_ADDITIONAL_FIELD.input,
            returned: APP_ROLE_ADDITIONAL_FIELD.returned,
          },
        },
      },
    };

    // On create, input:false + defaultValue applies the server default and
    // ignores a client-supplied admin attempt.
    expect(parseUserInput(options, { role: "admin" }, "create")).toEqual({
      role: "customer",
    });
    expect(parseUserInput(options, {}, "create")).toEqual({ role: "customer" });

    // On update, input:false rejects a truthy role value.
    expect(() => parseUserInput(options, { role: "admin" }, "update")).toThrow(/not allowed/i);
    expect(() => parseUserInput(options, { role: "customer" }, "update")).toThrow(/not allowed/i);
  });
});

describe("Phase 2B pure authorization decisions", () => {
  it("maps unauthenticated sessions to null", () => {
    expect(principalFromSession(null)).toBeNull();
  });

  it("resolves customer and admin principals from validated sessions", () => {
    expect(principalFromSession({ user: { id: "user-customer", role: "customer" } })).toEqual({
      userId: "user-customer",
      role: "customer",
    });
    expect(principalFromSession({ user: { id: "user-admin", role: "admin" } })).toEqual({
      userId: "user-admin",
      role: "admin",
    });
  });

  it("fails closed for missing, unknown, and malformed roles", () => {
    expectAuthorizationError(
      () => principalFromSession({ user: { id: "u1" } }),
      "INVALID_AUTHORIZATION_STATE",
    );
    expectAuthorizationError(
      () => principalFromSession({ user: { id: "u1", role: null } }),
      "INVALID_AUTHORIZATION_STATE",
    );
    expectAuthorizationError(
      () => principalFromSession({ user: { id: "u1", role: undefined } }),
      "INVALID_AUTHORIZATION_STATE",
    );
    expectAuthorizationError(
      () => principalFromSession({ user: { id: "u1", role: "owner" } }),
      "INVALID_AUTHORIZATION_STATE",
    );
    expectAuthorizationError(
      () => principalFromSession({ user: { id: "u1", role: "CUSTOMER" } }),
      "INVALID_AUTHORIZATION_STATE",
    );
    expectAuthorizationError(
      () => principalFromSession({ user: { id: "u1", role: ["admin"] } }),
      "INVALID_AUTHORIZATION_STATE",
    );
    expectAuthorizationError(
      () => principalFromSession({ user: { id: "", role: "customer" } }),
      "INVALID_AUTHORIZATION_STATE",
    );
  });

  it("enforces exact-role privilege separation without hierarchy", () => {
    const customer = principalFromSession({ user: { id: "c1", role: "customer" } });
    const admin = principalFromSession({ user: { id: "a1", role: "admin" } });
    expect(customer).not.toBeNull();
    expect(admin).not.toBeNull();

    expect(assertAuthenticated(customer)).toEqual(customer);
    expect(assertAuthenticated(admin)).toEqual(admin);
    expect(assertRole(customer!, "customer")).toEqual(customer);
    expect(assertRole(admin!, "admin")).toEqual(admin);

    expectAuthorizationError(() => assertRole(customer!, "admin"), "FORBIDDEN");
    expectAuthorizationError(() => assertRole(admin!, "customer"), "FORBIDDEN");
    expectAuthorizationError(() => assertAuthenticated(null), "UNAUTHENTICATED");
  });

  it("fails all privileged access for invalid authorization state", () => {
    expectAuthorizationError(
      () => assertAuthenticated(principalFromSession({ user: { id: "u1", role: "hacker" } })),
      "INVALID_AUTHORIZATION_STATE",
    );
    expectAuthorizationError(
      () => assertAuthenticated(principalFromSession({ user: { id: "u1" } })),
      "INVALID_AUTHORIZATION_STATE",
    );
  });
});

describe("Phase 2B authorization error model", () => {
  it("distinguishes unauthenticated, forbidden, and invalid-state codes", () => {
    const unauthenticated = new AuthorizationError("UNAUTHENTICATED", "Authentication required");
    const forbidden = new AuthorizationError("FORBIDDEN", "Required application role not granted");
    const invalid = new AuthorizationError(
      "INVALID_AUTHORIZATION_STATE",
      "Authenticated session has an invalid application role",
    );

    expect(unauthenticated.code).toBe("UNAUTHENTICATED");
    expect(forbidden.code).toBe("FORBIDDEN");
    expect(invalid.code).toBe("INVALID_AUTHORIZATION_STATE");
    for (const error of [unauthenticated, forbidden, invalid]) {
      expect(error.message).not.toContain("postgresql://");
      expect(error.message).not.toMatch(/secret|password|token/i);
    }
  });
});

describe("Phase 2B role schema and migration", () => {
  it("adds only a nullable text role column with customer default", () => {
    const roleColumn = getTableColumns(user).role;
    expect(roleColumn).toBeDefined();
    expect(roleColumn.name).toBe("role");
    expect(roleColumn.notNull).toBe(false);
    expect(roleColumn.hasDefault).toBe(true);

    expect(migrationSql).toContain(
      'ALTER TABLE "user" ADD COLUMN "role" text DEFAULT \'customer\'',
    );
    expect(migrationSql).not.toMatch(/DROP\s+(TABLE|COLUMN|DATABASE)/i);
    expect(migrationSql).not.toMatch(/\b(TRUNCATE|DELETE)\b/i);
    expect(migrationSql).not.toMatch(/banned|ban_reason|ban_expires|impersonated/i);
  });
});

describe("Phase 2B runtime authorization boundary", () => {
  beforeEach(() => {
    vi.mocked(getAuth).mockReset();
  });

  it("treats only an actual null Better Auth session as unauthenticated", async () => {
    const getSession = vi.fn().mockResolvedValue(null);
    mockSessionGetter(getSession);

    const headers = new Headers();
    await expect(getAuthorizationPrincipal(headers)).resolves.toBeNull();
    await expect(requireAuthenticated(headers)).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
    await expect(requireCustomer(headers)).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    await expect(requireAdmin(headers)).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    expect(getSession).toHaveBeenCalledTimes(4);
  });

  it("preserves exact customer/admin separation through the public helpers", async () => {
    const getSession = vi.fn().mockResolvedValue({
      user: { id: "customer-runtime", role: "customer" },
    });
    mockSessionGetter(getSession);

    const headers = new Headers();
    await expect(requireAuthenticated(headers)).resolves.toEqual({
      userId: "customer-runtime",
      role: "customer",
    });
    await expect(requireCustomer(headers)).resolves.toEqual({
      userId: "customer-runtime",
      role: "customer",
    });
    await expect(requireAdmin(headers)).rejects.toMatchObject({ code: "FORBIDDEN" });

    getSession.mockResolvedValue({ user: { id: "admin-runtime", role: "admin" } });
    await expect(requireAuthenticated(headers)).resolves.toEqual({
      userId: "admin-runtime",
      role: "admin",
    });
    await expect(requireAdmin(headers)).resolves.toEqual({
      userId: "admin-runtime",
      role: "admin",
    });
    await expect(requireCustomer(headers)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("fails closed on invalid runtime session roles through every public helper", async () => {
    const getSession = vi.fn().mockResolvedValue({ user: { id: "invalid-runtime", role: null } });
    mockSessionGetter(getSession);

    const headers = new Headers();
    const entryPoints = [
      () => getAuthorizationPrincipal(headers),
      () => requireAuthenticated(headers),
      () => requireCustomer(headers),
      () => requireAdmin(headers),
    ];

    for (const callAuthorizationEntryPoint of entryPoints) {
      await expect(callAuthorizationEntryPoint()).rejects.toMatchObject({
        code: "INVALID_AUTHORIZATION_STATE",
      });
    }
  });

  it("preserves exact infrastructure-error identity through every public helper", async () => {
    const sentinel = new Error("TEST_SENTINEL_AUTH_INFRA_FAILURE");
    const getSession = vi.fn().mockRejectedValue(sentinel);
    mockSessionGetter(getSession);

    const headers = new Headers();
    const entryPoints = [
      () => getAuthorizationPrincipal(headers),
      () => requireAuthenticated(headers),
      () => requireCustomer(headers),
      () => requireAdmin(headers),
    ];

    for (const callAuthorizationEntryPoint of entryPoints) {
      await expect(callAuthorizationEntryPoint()).rejects.toBe(sentinel);
    }

    expect(sentinel).not.toBeInstanceOf(AuthorizationError);
    expect(getSession).toHaveBeenCalledTimes(4);
  });

  it("preserves AuthEnvValidationError identity instead of converting it to authorization", async () => {
    const configFailure = new AuthEnvValidationError("TEST_SENTINEL_AUTH_CONFIG_FAILURE");
    vi.mocked(getAuth).mockImplementation(() => {
      throw configFailure;
    });

    const headers = new Headers();
    const entryPoints = [
      () => getAuthorizationPrincipal(headers),
      () => requireAuthenticated(headers),
      () => requireCustomer(headers),
      () => requireAdmin(headers),
    ];

    for (const callAuthorizationEntryPoint of entryPoints) {
      await expect(callAuthorizationEntryPoint()).rejects.toBe(configFailure);
    }

    expect(configFailure).toBeInstanceOf(AuthEnvValidationError);
    expect(configFailure).not.toBeInstanceOf(AuthorizationError);
  });
});
