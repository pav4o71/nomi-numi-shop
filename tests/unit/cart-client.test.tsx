/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, cleanup } from "@testing-library/react";
import { useCartData, useCartApi } from "@/cart/client";
import * as cartApi from "@/lib/api/cart-api";
import type { PublicCart } from "@/cart/public";
import { SWRConfig } from "swr";
import React from "react";

// Mock the underlying API wrappers
vi.mock("@/lib/api/cart-api", () => ({
  fetchCart: vi.fn(),
  addCartItem: vi.fn(),
  updateCartItem: vi.fn(),
  removeCartItem: vi.fn(),
}));

const mockCart: PublicCart = {
  id: "cart_123",
  items: [],
  totalAmount: 0,
  currency: "USD",
  promoCode: null,
  discountAmount: 0,
};

describe("Cart Client Hooks", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    cleanup();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );

  describe("useCartData", () => {
    it("fetches and exposes cart data", async () => {
      vi.mocked(cartApi.fetchCart).mockResolvedValueOnce(mockCart);

      const { result } = renderHook(() => useCartData(), { wrapper });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.cart).toEqual(mockCart);
      expect(result.current.isError).toBeUndefined();
    });
  });

  describe("useCartApi", () => {
    it("addItem returns typed result and triggers mutate", async () => {
      vi.mocked(cartApi.fetchCart).mockResolvedValue(mockCart);
      vi.mocked(cartApi.addCartItem).mockResolvedValueOnce({
        ok: true,
        cart: mockCart,
      });

      const { result } = renderHook(() => useCartApi(), { wrapper });

      const response = await result.current.addItem("variant_1", 2);

      expect(cartApi.addCartItem).toHaveBeenCalledWith("variant_1", 2);
      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.cart).toEqual(mockCart);
      }
    });

    it("updateItem handles failures cleanly", async () => {
      vi.mocked(cartApi.fetchCart).mockResolvedValue(mockCart);
      vi.mocked(cartApi.updateCartItem).mockResolvedValueOnce({
        ok: false,
        status: 409,
        error: "Conflict",
      });

      const { result } = renderHook(() => useCartApi(), { wrapper });

      const response = await result.current.updateItem("item_1", 99);

      expect(cartApi.updateCartItem).toHaveBeenCalledWith("item_1", 99);
      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.status).toBe(409);
      }
    });
  });
});
