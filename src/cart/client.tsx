"use client";

import React, { createContext, useContext } from "react";
import { createStore, useStore } from "zustand";
import useSWR from "swr";
import type { ResolvedCart } from "./service";

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

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useCartData() {
  const { data, error, mutate, isLoading } = useSWR<ResolvedCart>("/api/cart", fetcher);

  return {
    cart: data,
    isLoading,
    isError: error,
    mutateCart: mutate,
  };
}
