/**
 * Typed client-side fetch wrappers for /api/cart and /api/cart/[itemId].
 *
 * All functions return a discriminated union so callers can branch on
 * `result.ok` without catching exceptions. Network errors (fetch throws)
 * are re-thrown so SWR / React error boundaries can handle them.
 */

import type { PublicCart } from "@/cart/public";

// ─── Error shape ─────────────────────────────────────────────────────────────

export type ApiFieldError = { path: string[]; message: string; code?: string };

export type CartApiError = {
  ok: false;
  status: number;
  error: string;
  fields?: ApiFieldError[];
};

// ─── Success/failure union ────────────────────────────────────────────────────

export type CartResult =
  | { ok: true; cart: PublicCart }
  | CartApiError;

export type VoidResult =
  | { ok: true }
  | CartApiError;

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function parseCartError(response: Response): Promise<CartApiError> {
  let body: { error?: string; fields?: ApiFieldError[] } = {};
  try {
    body = (await response.json()) as typeof body;
  } catch {
    // ignore parse failure — use status text
  }
  return {
    ok: false,
    status: response.status,
    error: body.error ?? response.statusText ?? "Request failed",
    fields: body.fields,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch the current cart (used by SWR via `useCartData`).
 * Throws on non-2xx so SWR can mark the key as errored.
 */
export async function fetchCart(): Promise<PublicCart> {
  const response = await fetch("/api/cart");
  if (!response.ok) {
    const err = await parseCartError(response);
    throw new Error(err.error);
  }
  return response.json() as Promise<PublicCart>;
}

/**
 * Add an item to the cart.
 */
export async function addCartItem(
  variantId: string,
  quantity: number,
): Promise<CartResult> {
  const response = await fetch("/api/cart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ variantId, quantity }),
  });
  if (!response.ok) return parseCartError(response);
  const cart = (await response.json()) as PublicCart;
  return { ok: true, cart };
}

/**
 * Update the quantity of a specific cart item.
 * Passing quantity 0 is equivalent to calling `removeCartItem`.
 */
export async function updateCartItem(
  itemId: string,
  quantity: number,
): Promise<CartResult> {
  const response = await fetch(`/api/cart/${itemId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quantity }),
  });
  if (!response.ok) return parseCartError(response);
  const cart = (await response.json()) as PublicCart;
  return { ok: true, cart };
}

/**
 * Remove a specific cart item entirely.
 */
export async function removeCartItem(itemId: string): Promise<VoidResult> {
  const response = await fetch(`/api/cart/${itemId}`, { method: "DELETE" });
  if (!response.ok) return parseCartError(response);
  return { ok: true };
}

/**
 * Apply or remove a promo code.
 */
export async function applyPromoCode(promoCode: string | null): Promise<CartResult> {
  const response = await fetch("/api/cart", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ promoCode }),
  });
  if (!response.ok) return parseCartError(response);
  const cart = (await response.json()) as PublicCart;
  return { ok: true, cart };
}
