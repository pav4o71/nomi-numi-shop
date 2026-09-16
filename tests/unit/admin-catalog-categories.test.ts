/**
 * Phase 4A portable admin catalog category authorization contract tests.
 *
 * Validates the error-to-HTTP mapping priorities (auth before catalog)
 * and verifies that admin category route modules export the expected
 * HTTP method handlers. No live database or HTTP server required.
 */
import { describe, expect, it } from "vitest";

import { catalogErrorResponse, adminCatalogErrorResponse } from "@/catalog/admin";
import { CatalogError } from "@/catalog/errors";
import { AuthorizationError } from "@/auth/authorization";

// ---------------------------------------------------------------------------
// admin catalog category API authorization contract
// ---------------------------------------------------------------------------

describe("admin catalog category API authorization contract", () => {
  it("maps CatalogError INVALID_INPUT to 400", async () => {
    const issues = [{ path: ["name"], message: "required" }];
    const error = new CatalogError("INVALID_INPUT", "Invalid input", issues);
    const response = catalogErrorResponse(error);

    expect(response).not.toBeNull();
    expect(response!.status).toBe(400);

    const body = await response!.json();
    expect(body).toEqual(
      expect.objectContaining({ code: "INVALID_INPUT", message: "Invalid input", issues }),
    );
  });

  it("maps CatalogError NOT_FOUND to 404", async () => {
    const error = new CatalogError("NOT_FOUND", "Category not found");
    const response = catalogErrorResponse(error);

    expect(response).not.toBeNull();
    expect(response!.status).toBe(404);

    const body = await response!.json();
    expect(body).toEqual(
      expect.objectContaining({ code: "NOT_FOUND", message: "Category not found" }),
    );
  });

  it("maps CatalogError CONFLICT to 409", async () => {
    const issues = [{ path: ["slug"], message: "already taken" }];
    const error = new CatalogError("CONFLICT", "Duplicate slug", issues);
    const response = catalogErrorResponse(error);

    expect(response).not.toBeNull();
    expect(response!.status).toBe(409);

    const body = await response!.json();
    expect(body).toEqual(
      expect.objectContaining({ code: "CONFLICT", message: "Duplicate slug", issues }),
    );
  });

  it("prioritizes auth errors over catalog errors in adminCatalogErrorResponse", async () => {
    // AuthorizationError is checked first, before CatalogError mapping.
    const authError = new AuthorizationError("UNAUTHENTICATED", "Not signed in");
    const response = adminCatalogErrorResponse(authError);

    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.code).toBe("UNAUTHENTICATED");
  });

  it("re-throws unknown errors from adminCatalogErrorResponse", () => {
    const infraError = new TypeError("Cannot read properties of undefined");
    expect(() => adminCatalogErrorResponse(infraError)).toThrow(TypeError);
  });

  it("returns 401 for UNAUTHENTICATED via adminCatalogErrorResponse", async () => {
    const error = new AuthorizationError("UNAUTHENTICATED", "Authentication required");
    const response = adminCatalogErrorResponse(error);

    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.code).toBe("UNAUTHENTICATED");
  });

  it("returns 403 for FORBIDDEN via adminCatalogErrorResponse", async () => {
    const error = new AuthorizationError("FORBIDDEN", "Admin role required");
    const response = adminCatalogErrorResponse(error);

    expect(response.status).toBe(403);

    const body = await response.json();
    expect(body.code).toBe("FORBIDDEN");
  });
});

// ---------------------------------------------------------------------------
// admin category API route exports
// ---------------------------------------------------------------------------

describe("admin category API route exports", () => {
  it("categories collection route exports GET and POST", async () => {
    const route = await import("@/app/api/admin/catalog/categories/route");
    expect(typeof route.GET).toBe("function");
    expect(typeof route.POST).toBe("function");
  });

  it("categories detail route exports GET and PATCH", async () => {
    const route = await import("@/app/api/admin/catalog/categories/[id]/route");
    expect(typeof route.GET).toBe("function");
    expect(typeof route.PATCH).toBe("function");
  });
});
