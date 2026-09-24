import type { ResolvedCart } from "./service";

export function toPublicCart(cart: ResolvedCart) {
  return {
    id: cart.id,
    currency: cart.currency,
    items: cart.items,
    totalAmount: cart.totalAmount,
  };
}

export type PublicCart = ReturnType<typeof toPublicCart>;
