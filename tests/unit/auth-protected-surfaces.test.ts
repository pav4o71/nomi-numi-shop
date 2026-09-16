import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/auth/server")>();
  return {
    ...actual,
    getAuth: vi.fn(),
  };
});

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

import { AuthorizationError } from "@/auth/authorization";
import { AuthEnvValidationError } from "@/auth/env";
import { requireAdminPage, requireCustomerPage } from "@/auth/guards";
import { authorizationErrorResponse } from "@/auth/http";
import { PROTECTED_SURFACE_ROUTES } from "@/auth/routes";
import { buildLoginHref, resolvePostLoginPath, sanitizeNextPath } from "@/auth/safe-navigation";
import { getAuth } from "@/auth/server";
import { redirect } from "next/navigation";

function readSrc(...parts: string[]) {
  return readFileSync(path.join(process.cwd(), ...parts), "utf8");
}

function mockSessionGetter(getSession: ReturnType<typeof vi.fn>) {
  vi.mocked(getAuth).mockReturnValue({
    api: { getSession },
  } as unknown as ReturnType<typeof getAuth>);
}

describe("Phase 2C5 safe navigation", () => {
  it("accepts only relative in-app next paths", () => {
    expect(sanitizeNextPath("/account")).toBe("/account");
    expect(sanitizeNextPath("/admin")).toBe("/admin");
    expect(sanitizeNextPath("/account?tab=1")).toBe("/account?tab=1");
    expect(sanitizeNextPath(null)).toBeNull();
    expect(sanitizeNextPath(undefined)).toBeNull();
    expect(sanitizeNextPath("")).toBeNull();
    expect(sanitizeNextPath("account")).toBeNull();
  });

  it("rejects open-redirect candidates", () => {
    const rejected = [
      "https://evil.example",
      "http://evil.example/account",
      "//evil.example",
      "/\\evil.example",
      "\\\\evil.example",
      "/account@evil.example",
      "/%2f%2fevil.example",
      encodeURIComponent("//evil.example"),
      "/\tevil",
      "javascript:alert(1)",
    ];

    for (const candidate of rejected) {
      expect(sanitizeNextPath(candidate)).toBeNull();
    }
  });

  it("builds login href only with a sanitized next path", () => {
    expect(buildLoginHref("/login", "/account")).toBe("/login?next=%2Faccount");
    expect(buildLoginHref("/login", "//evil.example")).toBe("/login");
    expect(resolvePostLoginPath("/admin")).toBe("/admin");
    expect(resolvePostLoginPath("https://evil.example")).toBe("/");
    expect(resolvePostLoginPath(null)).toBe("/");
  });
});

describe("Phase 2C5 authorization HTTP mapping", () => {
  it("maps unauthenticated to 401 and wrong/invalid role to 403", async () => {
    const unauthenticated = authorizationErrorResponse(
      new AuthorizationError("UNAUTHENTICATED", "Authentication required"),
    );
    expect(unauthenticated?.status).toBe(401);
    await expect(unauthenticated!.json()).resolves.toEqual({ code: "UNAUTHENTICATED" });

    const forbidden = authorizationErrorResponse(
      new AuthorizationError("FORBIDDEN", "Required application role not granted"),
    );
    expect(forbidden?.status).toBe(403);
    await expect(forbidden!.json()).resolves.toEqual({ code: "FORBIDDEN" });

    const invalid = authorizationErrorResponse(
      new AuthorizationError(
        "INVALID_AUTHORIZATION_STATE",
        "Authenticated session has an invalid application role",
      ),
    );
    expect(invalid?.status).toBe(403);
    await expect(invalid!.json()).resolves.toEqual({
      code: "INVALID_AUTHORIZATION_STATE",
    });
  });

  it("does not translate infrastructure failures into auth denial", () => {
    const sentinel = new Error("TEST_SENTINEL_AUTH_INFRA_FAILURE");
    expect(authorizationErrorResponse(sentinel)).toBeNull();
    expect(authorizationErrorResponse(new AuthEnvValidationError("config"))).toBeNull();
  });
});

describe("Phase 2C5 page guards", () => {
  beforeEach(() => {
    vi.mocked(getAuth).mockReset();
    vi.mocked(redirect).mockClear();
  });

  it("redirects anonymous callers to login with a safe next path", async () => {
    mockSessionGetter(vi.fn().mockResolvedValue(null));
    const headers = new Headers();

    await expect(requireCustomerPage(headers, "/account")).rejects.toThrow(
      "NEXT_REDIRECT:/login?next=%2Faccount",
    );
    await expect(requireAdminPage(headers, "/admin")).rejects.toThrow(
      "NEXT_REDIRECT:/login?next=%2Fadmin",
    );
  });

  it("allows customer on account and denies customer on admin", async () => {
    mockSessionGetter(vi.fn().mockResolvedValue({ user: { id: "customer-1", role: "customer" } }));
    const headers = new Headers();

    await expect(requireCustomerPage(headers)).resolves.toEqual({
      userId: "customer-1",
      role: "customer",
    });
    await expect(requireAdminPage(headers)).rejects.toThrow(
      `NEXT_REDIRECT:${PROTECTED_SURFACE_ROUTES.forbidden}`,
    );
  });

  it("allows admin on admin and denies admin on customer account", async () => {
    mockSessionGetter(vi.fn().mockResolvedValue({ user: { id: "admin-1", role: "admin" } }));
    const headers = new Headers();

    await expect(requireAdminPage(headers)).resolves.toEqual({
      userId: "admin-1",
      role: "admin",
    });
    await expect(requireCustomerPage(headers)).rejects.toThrow(
      `NEXT_REDIRECT:${PROTECTED_SURFACE_ROUTES.forbidden}`,
    );
  });

  it("fails closed on invalid/null role instead of treating as unauthenticated", async () => {
    mockSessionGetter(vi.fn().mockResolvedValue({ user: { id: "broken", role: null } }));
    const headers = new Headers();

    await expect(requireCustomerPage(headers)).rejects.toThrow(
      `NEXT_REDIRECT:${PROTECTED_SURFACE_ROUTES.forbidden}`,
    );
    await expect(requireAdminPage(headers)).rejects.toThrow(
      `NEXT_REDIRECT:${PROTECTED_SURFACE_ROUTES.forbidden}`,
    );
  });

  it("preserves infrastructure-error identity through page guards", async () => {
    const sentinel = new Error("TEST_SENTINEL_AUTH_INFRA_FAILURE");
    mockSessionGetter(vi.fn().mockRejectedValue(sentinel));
    const headers = new Headers();

    await expect(requireCustomerPage(headers)).rejects.toBe(sentinel);
    await expect(requireAdminPage(headers)).rejects.toBe(sentinel);
    expect(sentinel).not.toBeInstanceOf(AuthorizationError);
  });
});

describe("Phase 2C5 protected API route handlers", () => {
  beforeEach(() => {
    vi.mocked(getAuth).mockReset();
  });

  it("returns 401 for anonymous account and admin API access", async () => {
    mockSessionGetter(vi.fn().mockResolvedValue(null));
    const { GET: getAccount } = await import("../../src/app/api/account/route");
    const { GET: getAdmin } = await import("../../src/app/api/admin/route");

    const account = await getAccount(new Request("http://127.0.0.1:3100/api/account"));
    expect(account.status).toBe(401);
    await expect(account.json()).resolves.toEqual({ code: "UNAUTHENTICATED" });

    const admin = await getAdmin(new Request("http://127.0.0.1:3100/api/admin"));
    expect(admin.status).toBe(401);
    await expect(admin.json()).resolves.toEqual({ code: "UNAUTHENTICATED" });
  });

  it("allows customer account API and denies customer admin API", async () => {
    mockSessionGetter(
      vi.fn().mockResolvedValue({ user: { id: "customer-api", role: "customer" } }),
    );
    const { GET: getAccount } = await import("../../src/app/api/account/route");
    const { GET: getAdmin } = await import("../../src/app/api/admin/route");

    const account = await getAccount(new Request("http://127.0.0.1:3100/api/account"));
    expect(account.status).toBe(200);
    await expect(account.json()).resolves.toEqual({
      ok: true,
      role: "customer",
      userId: "customer-api",
    });

    const admin = await getAdmin(new Request("http://127.0.0.1:3100/api/admin"));
    expect(admin.status).toBe(403);
    await expect(admin.json()).resolves.toEqual({ code: "FORBIDDEN" });
  });

  it("allows admin admin API and denies admin customer API", async () => {
    mockSessionGetter(vi.fn().mockResolvedValue({ user: { id: "admin-api", role: "admin" } }));
    const { GET: getAccount } = await import("../../src/app/api/account/route");
    const { GET: getAdmin } = await import("../../src/app/api/admin/route");

    const admin = await getAdmin(new Request("http://127.0.0.1:3100/api/admin"));
    expect(admin.status).toBe(200);
    await expect(admin.json()).resolves.toEqual({
      ok: true,
      role: "admin",
      userId: "admin-api",
    });

    const account = await getAccount(new Request("http://127.0.0.1:3100/api/account"));
    expect(account.status).toBe(403);
    await expect(account.json()).resolves.toEqual({ code: "FORBIDDEN" });
  });

  it("fails closed on invalid role for protected APIs", async () => {
    mockSessionGetter(vi.fn().mockResolvedValue({ user: { id: "invalid-api", role: null } }));
    const { GET: getAccount } = await import("../../src/app/api/account/route");
    const { GET: getAdmin } = await import("../../src/app/api/admin/route");

    const account = await getAccount(new Request("http://127.0.0.1:3100/api/account"));
    expect(account.status).toBe(403);
    await expect(account.json()).resolves.toEqual({ code: "INVALID_AUTHORIZATION_STATE" });

    const admin = await getAdmin(new Request("http://127.0.0.1:3100/api/admin"));
    expect(admin.status).toBe(403);
    await expect(admin.json()).resolves.toEqual({ code: "INVALID_AUTHORIZATION_STATE" });
  });

  it("does not convert infrastructure failures into 401/403", async () => {
    const sentinel = new Error("TEST_SENTINEL_AUTH_INFRA_FAILURE");
    mockSessionGetter(vi.fn().mockRejectedValue(sentinel));
    const { GET: getAccount } = await import("../../src/app/api/account/route");
    const { GET: getAdmin } = await import("../../src/app/api/admin/route");

    await expect(getAccount(new Request("http://127.0.0.1:3100/api/account"))).rejects.toBe(
      sentinel,
    );
    await expect(getAdmin(new Request("http://127.0.0.1:3100/api/admin"))).rejects.toBe(sentinel);
  });
});

describe("Phase 2C5 protected surface wiring", () => {
  it("registers customer/admin pages and APIs with server authorization", () => {
    for (const relativePath of [
      "src/app/account/page.tsx",
      "src/app/admin/page.tsx",
      "src/app/forbidden/page.tsx",
      "src/app/api/account/route.ts",
      "src/app/api/admin/route.ts",
      "src/auth/guards.ts",
      "src/auth/http.ts",
      "src/auth/safe-navigation.ts",
    ]) {
      expect(existsSync(path.join(process.cwd(), relativePath))).toBe(true);
    }

    expect(PROTECTED_SURFACE_ROUTES).toEqual({
      account: "/account",
      admin: "/admin",
      forbidden: "/forbidden",
      apiAccount: "/api/account",
      apiAdmin: "/api/admin",
    });

    const accountPage = readSrc("src/app/account/page.tsx");
    expect(accountPage).toMatch(/requireCustomerPage/);
    expect(accountPage).not.toMatch(/useSession/);
    expect(accountPage).not.toMatch(/role\s*===/);

    const adminLayout = readSrc("src/app/admin/layout.tsx");
    expect(adminLayout).toMatch(/requireAdminPage/);
    expect(adminLayout).not.toMatch(/useSession/);
    expect(adminLayout).not.toMatch(/role\s*===/);

    const adminPage = readSrc("src/app/admin/page.tsx");
    expect(adminPage).not.toMatch(/useSession/);
    expect(adminPage).not.toMatch(/role\s*===/);

    const accountApi = readSrc("src/app/api/account/route.ts");
    expect(accountApi).toMatch(/requireCustomer/);
    expect(accountApi).toMatch(/authorizationErrorResponse/);

    const adminApi = readSrc("src/app/api/admin/route.ts");
    expect(adminApi).toMatch(/requireAdmin/);
    expect(adminApi).toMatch(/authorizationErrorResponse/);
  });

  it("keeps header Account/Admin links as UX only without client authorization", () => {
    const header = readSrc("src/components/auth/auth-header-actions.tsx");
    expect(header).toMatch(/useSession/);
    expect(header).toMatch(/PROTECTED_SURFACE_ROUTES\.account/);
    expect(header).toMatch(/PROTECTED_SURFACE_ROUTES\.admin/);
    expect(header).toMatch(/never be used as\s*\n\s*\*\s*authorization|never be used as/);
    expect(header).not.toMatch(/requireAdmin|requireCustomer|getAuthorizationPrincipal/);
    expect(header).not.toMatch(/role\s*===|data\?\.user\?\.role|session\.user\.role/);
  });

  it("sanitizes login next on the server before handing it to the client form", () => {
    const loginPage = readSrc("src/app/login/page.tsx");
    expect(loginPage).toMatch(/sanitizeNextPath/);
    expect(loginPage).toMatch(/nextPath=\{nextPath\}/);
    expect(loginPage).toMatch(/redirect\(/);
    expect(loginPage).toMatch(/rawNext/);

    const loginForm = readSrc("src/components/auth/login-form.tsx");
    expect(loginForm).toMatch(/resolvePostLoginPath/);
    expect(loginForm).not.toMatch(/requireAdmin|requireCustomer/);
  });

  it("does not let client UI become the authorization boundary", () => {
    const clientSurfaces = [
      "src/components/auth/auth-header-actions.tsx",
      "src/components/auth/login-form.tsx",
      "src/auth/client.ts",
    ];
    for (const relativePath of clientSurfaces) {
      const source = readSrc(relativePath);
      expect(source).not.toMatch(/from\s+["']@\/auth\/authorization["']/);
      expect(source).not.toMatch(/from\s+["']@\/auth\/guards["']/);
    }
  });
});
