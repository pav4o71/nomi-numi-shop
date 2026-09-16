/**
 * Phase 4E portable admin catalog organization authorization contract tests.
 */
import { describe, expect, it } from "vitest";

describe("admin organization API route exports", () => {
  it("category search route exports GET", async () => {
    const route = await import("@/app/api/admin/catalog/categories/search/route");
    expect(typeof route.GET).toBe("function");
  });

  it("collection search route exports GET", async () => {
    const route = await import("@/app/api/admin/catalog/collections/search/route");
    expect(typeof route.GET).toBe("function");
  });

  it("product categories route exports GET and PUT", async () => {
    const route = await import("@/app/api/admin/catalog/products/[id]/categories/route");
    expect(typeof route.GET).toBe("function");
    expect(typeof route.PUT).toBe("function");
  });

  it("product collections route exports GET and PUT", async () => {
    const route = await import("@/app/api/admin/catalog/products/[id]/collections/route");
    expect(typeof route.GET).toBe("function");
    expect(typeof route.PUT).toBe("function");
  });
});
