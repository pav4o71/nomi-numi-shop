/**
 * Phase 4D portable admin catalog variants authorization contract tests.
 */
import { describe, expect, it } from "vitest";

describe("admin variants API route exports", () => {
  it("options route exports GET and PUT", async () => {
    const route = await import("@/app/api/admin/catalog/products/[id]/options/route");
    expect(typeof route.GET).toBe("function");
    expect(typeof route.PUT).toBe("function");
  });

  it("product variants route exports GET and POST", async () => {
    const route = await import("@/app/api/admin/catalog/products/[id]/variants/route");
    expect(typeof route.GET).toBe("function");
    expect(typeof route.POST).toBe("function");
  });

  it("variant detail route exports GET and PATCH", async () => {
    const route = await import("@/app/api/admin/catalog/variants/[id]/route");
    expect(typeof route.GET).toBe("function");
    expect(typeof route.PATCH).toBe("function");
  });
});
