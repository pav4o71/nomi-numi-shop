import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  fetchCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
} from "@/lib/api/cart-api";
import type { PublicCart } from "@/cart/public";

const mockCart: PublicCart = {
  id: "cart_123",
  items: [],
  totalAmount: 0,
  currency: "USD",
};

describe("Client-side cart API", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetchCart returns data on 200", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockCart,
    });
    const result = await fetchCart();
    expect(result).toEqual(mockCart);
  });

  it("fetchCart throws on non-200", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: async () => ({}),
    });
    await expect(fetchCart()).rejects.toThrow("Internal Server Error");
  });

  it("updateCartItem returns CartResult on 200", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockCart,
    });
    const result = await updateCartItem("item_1", 2);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.cart).toEqual(mockCart);
    }
  });

  it("updateCartItem handles 409 conflict safely without throwing", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: "Not enough inventory" }),
    });
    const result = await updateCartItem("item_1", 99);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(409);
      expect(result.error).toBe("Not enough inventory");
    }
  });

  it("removeCartItem returns VoidResult on success", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
    });
    const result = await removeCartItem("item_1");
    expect(result.ok).toBe(true);
  });

  it("removeCartItem handles 404 gracefully", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: "Not found" }),
    });
    const result = await removeCartItem("item_1");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(404);
    }
  });
});
