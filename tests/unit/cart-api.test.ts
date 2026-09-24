import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/cart/route";
import { PATCH } from "@/app/api/cart/[itemId]/route";
import * as auth from "@/auth/authorization";

vi.mock("@/auth/authorization", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/auth/authorization")>();
  return {
    ...actual,
    getAuthorizationPrincipal: vi.fn(),
  };
});

vi.mock("next/headers", () => ({
  headers: vi.fn(() => new Headers()),
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

// Mock the services completely since this is an isolated API test
vi.mock("@/cart/service", () => {
  return {
    CartService: vi.fn().mockImplementation(() => ({
      getCart: vi.fn().mockResolvedValue({ id: "cart_123", items: [], totalAmount: 0 }),
      addItem: vi.fn(),
      mergeCart: vi.fn(),
      updateItemQuantity: vi.fn(),
      removeItem: vi.fn(),
    })),
  };
});

vi.mock("@/catalog/service", () => ({
  CatalogService: vi.fn(),
}));
vi.mock("@/cart/repository", () => ({
  DrizzleCartRepository: vi.fn(),
}));
vi.mock("@/catalog/repository", () => ({
  DrizzleCatalogRepository: vi.fn(),
}));
vi.mock("@/db/runtime", () => ({
  getRuntimeDb: vi.fn(),
}));

describe("Cart API route error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POST /api/cart returns 400 on malformed JSON", async () => {
    vi.mocked(auth.getAuthorizationPrincipal).mockResolvedValueOnce({
      userId: "u_1",
      role: "customer",
    });
    const res = await POST(
      new Request("http://localhost", { method: "POST", body: "invalid json" }),
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid JSON");
  });

  it("POST /api/cart returns 400 on missing variantId", async () => {
    vi.mocked(auth.getAuthorizationPrincipal).mockResolvedValueOnce({
      userId: "u_1",
      role: "customer",
    });
    const res = await POST(
      new Request("http://localhost", { method: "POST", body: JSON.stringify({ quantity: 1 }) }),
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid input");
  });

  it("PATCH /api/cart/[itemId] returns 400 on malformed JSON", async () => {
    vi.mocked(auth.getAuthorizationPrincipal).mockResolvedValueOnce({
      userId: "u_1",
      role: "customer",
    });
    const res = await PATCH(
      new Request("http://localhost", { method: "PATCH", body: "invalid json" }),
      { params: Promise.resolve({ itemId: "item_1" }) },
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid JSON");
  });

  it("PATCH /api/cart/[itemId] returns 400 on invalid quantity", async () => {
    vi.mocked(auth.getAuthorizationPrincipal).mockResolvedValueOnce({
      userId: "u_1",
      role: "customer",
    });
    const res = await PATCH(
      new Request("http://localhost", { method: "PATCH", body: JSON.stringify({ quantity: -5 }) }),
      { params: Promise.resolve({ itemId: "item_1" }) },
    );
    expect(res.status).toBe(400);
  });
});
