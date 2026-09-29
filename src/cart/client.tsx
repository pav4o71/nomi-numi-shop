"use client";

import React, { createContext, useContext } from "react";
import { createStore, useStore } from "zustand";
import useSWR from "swr";
import type { PublicCart } from "./public";
import {
  fetchCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  type CartResult,
  type VoidResult,
} from "@/lib/api/cart-api";

// ─── UI state (Zustand) ───────────────────────────────────────────────────────

interface CartState {
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
}

type CartStore = ReturnType<typeof createCartStore>;

const createCartStore = () =>
  createStore<CartState>()((set) => ({
    isCartOpen: false,
    openCart: () => set({ isCartOpen: true }),
    closeCart: () => set({ isCartOpen: false }),
    toggleCart: () => set((state) => ({ isCartOpen: !state.isCartOpen })),
  }));

const CartContext = createContext<CartStore | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [store] = React.useState(() => createCartStore());
  return <CartContext.Provider value={store}>{children}</CartContext.Provider>;
}

export function useCartUI() {
  const store = useContext(CartContext);
  if (!store) throw new Error("Missing CartContext.Provider in the tree");
  return useStore(store);
}

// ─── Data state (SWR) ────────────────────────────────────────────────────────

export function useCartData() {
  const { data, error, mutate, isLoading } = useSWR<PublicCart>("/api/cart", fetchCart);

  return {
    cart: data,
    isLoading,
    isError: error,
    mutateCart: mutate,
  };
}

// ─── Mutation helpers (typed, error-safe) ─────────────────────────────────────

/**
 * Returns typed wrappers for cart mutations.
 * Each function revalidates the SWR cache after the request completes,
 * regardless of success or failure, so the UI always reflects server state.
 * Callers receive a discriminated union — they MUST check `result.ok`.
 */
export function useCartApi() {
  const { mutateCart } = useCartData();

  const addItem = async (variantId: string, quantity: number): Promise<CartResult> => {
    const result = await addCartItem(variantId, quantity);
    await mutateCart();
    return result;
  };

  const updateItem = async (itemId: string, quantity: number): Promise<CartResult> => {
    const result = await updateCartItem(itemId, quantity);
    await mutateCart();
    return result;
  };

  const removeItem = async (itemId: string): Promise<VoidResult> => {
    const result = await removeCartItem(itemId);
    await mutateCart();
    return result;
  };

  return { addItem, updateItem, removeItem };
}
