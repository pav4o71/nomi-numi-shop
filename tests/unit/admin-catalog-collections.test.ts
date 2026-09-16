/**
 * Phase 4B portable admin catalog collection authorization contract tests.
 *
 * Verifies that admin collection route modules export the expected
 * HTTP method handlers.
 */
import { describe, expect, it } from "vitest";

describe("admin collection API route exports", () => {
  it("collections collection route exports GET and POST", async () => {
    const route = await import("@/app/api/admin/catalog/collections/route");
    expect(typeof route.GET).toBe("function");
    expect(typeof route.POST).toBe("function");
  });

  it("collections detail route exports GET and PATCH", async () => {
    const route = await import("@/app/api/admin/catalog/collections/[id]/route");
    expect(typeof route.GET).toBe("function");
    expect(typeof route.PATCH).toBe("function");
  });
});
