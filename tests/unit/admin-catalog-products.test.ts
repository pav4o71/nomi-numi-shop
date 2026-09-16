/**
 * Phase 4C portable admin catalog product authorization contract tests.
 *
 * Verifies that admin product route modules export the expected
 * HTTP method handlers.
 */
import { describe, expect, it } from "vitest";

describe("admin product API route exports", () => {
  it("products collection route exports GET and POST", async () => {
    const route = await import("@/app/api/admin/catalog/products/route");
    expect(typeof route.GET).toBe("function");
    expect(typeof route.POST).toBe("function");
  });

  it("products detail route exports GET and PATCH", async () => {
    const route = await import("@/app/api/admin/catalog/products/[id]/route");
    expect(typeof route.GET).toBe("function");
    expect(typeof route.PATCH).toBe("function");
  });
});
