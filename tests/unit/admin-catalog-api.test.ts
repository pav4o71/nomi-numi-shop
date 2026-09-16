/**
 * Phase 4A portable admin catalog API helper tests.
 *
 * Validates the contract of catalogErrorResponse, adminCatalogErrorResponse,
 * and parseJsonBody in src/catalog/admin/api-helpers.ts without requiring
 * a live database or HTTP server.
 */
import { describe, expect, it } from "vitest";

import { catalogErrorResponse, adminCatalogErrorResponse, parseJsonBody } from "@/catalog/admin";
import { CatalogError } from "@/catalog/errors";
import { AuthorizationError } from "@/auth/authorization";

// ---------------------------------------------------------------------------
// catalogErrorResponse
// ---------------------------------------------------------------------------

describe("catalogErrorResponse", () => {
  it("maps CatalogError INVALID_INPUT to 400 with code, message, and issues", async () => {
    const issues = [{ path: ["name"], message: "required" }];
    const error = new CatalogError("INVALID_INPUT", "Validation failed", issues);
    const response = catalogErrorResponse(error);

    expect(response).not.toBeNull();
    expect(response!.status).toBe(400);

    const body = await response!.json();
    expect(body.code).toBe("INVALID_INPUT");
    expect(body.message).toBe("Validation failed");
    expect(body.issues).toEqual(issues);
  });

  it("maps CatalogError NOT_FOUND to 404 with code and message", async () => {
    const error = new CatalogError("NOT_FOUND", "Category not found");
    const response = catalogErrorResponse(error);

    expect(response).not.toBeNull();
    expect(response!.status).toBe(404);

    const body = await response!.json();
    expect(body.code).toBe("NOT_FOUND");
    expect(body.message).toBe("Category not found");
    expect(body.issues).toEqual([]);
  });

  it("maps CatalogError CONFLICT to 409 with code, message, and issues", async () => {
    const issues = [{ path: ["slug"], message: "already exists", code: "unique_violation" }];
    const error = new CatalogError("CONFLICT", "Slug conflict", issues);
    const response = catalogErrorResponse(error);

    expect(response).not.toBeNull();
    expect(response!.status).toBe(409);

    const body = await response!.json();
    expect(body.code).toBe("CONFLICT");
    expect(body.message).toBe("Slug conflict");
    expect(body.issues).toEqual(issues);
  });

  it("returns null for non-CatalogError (infrastructure errors not masked)", () => {
    const genericError = new Error("DB connection lost");
    expect(catalogErrorResponse(genericError)).toBeNull();

    expect(catalogErrorResponse("string error")).toBeNull();
    expect(catalogErrorResponse(null)).toBeNull();
    expect(catalogErrorResponse(undefined)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// adminCatalogErrorResponse
// ---------------------------------------------------------------------------

describe("adminCatalogErrorResponse", () => {
  it("returns 401 for AuthorizationError with code UNAUTHENTICATED", async () => {
    const error = new AuthorizationError("UNAUTHENTICATED", "Authentication required");
    const response = adminCatalogErrorResponse(error);

    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.code).toBe("UNAUTHENTICATED");
  });

  it("returns 403 for AuthorizationError with code FORBIDDEN", async () => {
    const error = new AuthorizationError("FORBIDDEN", "Required application role not granted");
    const response = adminCatalogErrorResponse(error);

    expect(response.status).toBe(403);

    const body = await response.json();
    expect(body.code).toBe("FORBIDDEN");
  });

  it("returns 404 for CatalogError NOT_FOUND", async () => {
    const error = new CatalogError("NOT_FOUND", "Not found");
    const response = adminCatalogErrorResponse(error);

    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.code).toBe("NOT_FOUND");
  });

  it("re-throws unknown errors (infrastructure errors propagate to 500)", () => {
    const infraError = new Error("Connection refused");
    expect(() => adminCatalogErrorResponse(infraError)).toThrow("Connection refused");
  });
});

// ---------------------------------------------------------------------------
// parseJsonBody
// ---------------------------------------------------------------------------

describe("parseJsonBody", () => {
  it("returns parsed object from valid JSON body", async () => {
    const payload = { name: "Summer Dresses", slug: "summer-dresses" };
    const request = new Request("http://test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await parseJsonBody(request);
    expect(result).toEqual(payload);
  });

  it("returns null for empty / missing body", async () => {
    const request = new Request("http://test", { method: "GET" });
    const result = await parseJsonBody(request);
    expect(result).toBeNull();
  });

  it("returns null for malformed JSON body", async () => {
    const request = new Request("http://test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not valid json {{{",
    });

    const result = await parseJsonBody(request);
    expect(result).toBeNull();
  });
});
