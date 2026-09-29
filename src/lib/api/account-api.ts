/**
 * Typed client-side fetch wrappers for /api/account/* endpoints.
 *
 * `PublicOrder` from `@/checkout/public` uses `Date` objects, but JSON
 * serialization turns them into ISO strings. `SerializedOrder` reflects
 * what actually arrives over the wire from `GET /api/account/orders`.
 */

import { toPublicOrder } from "@/checkout/public";

// Derive the public order shape from the server-side transformer's return type.
type PublicOrder = ReturnType<typeof toPublicOrder>;

// ─── Serialized types (what JSON delivers) ────────────────────────────────────

/** `createdAt` / `updatedAt` arrive as ISO strings, not Date objects. */
export type SerializedOrder = Omit<PublicOrder, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

export type AddressType = "billing" | "shipping";

export type Address = {
  id: string;
  type: AddressType;
  name: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WishlistItem = {
  id: string;
  variantId: string;
  createdAt: string;
};

// ─── Error shape ─────────────────────────────────────────────────────────────

export type AccountApiError = {
  ok: false;
  status: number;
  error: string;
};

async function parseAccountError(response: Response): Promise<AccountApiError> {
  let body: { error?: string } = {};
  try {
    body = (await response.json()) as typeof body;
  } catch {
    // ignore
  }
  return {
    ok: false,
    status: response.status,
    error: body.error ?? response.statusText ?? "Request failed",
  };
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export async function fetchOrders(): Promise<SerializedOrder[]> {
  const response = await fetch("/api/account/orders");
  if (!response.ok) throw new Error(`Failed to load orders (${response.status})`);
  return response.json() as Promise<SerializedOrder[]>;
}

// ─── Addresses ───────────────────────────────────────────────────────────────

export type CreateAddressInput = {
  type: AddressType;
  name: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
};

export type AddressResult =
  | { ok: true; address: Address }
  | AccountApiError;

export async function createAddress(input: CreateAddressInput): Promise<AddressResult> {
  const response = await fetch("/api/account/addresses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) return parseAccountError(response);
  const address = (await response.json()) as Address;
  return { ok: true, address };
}

export type VoidResult = { ok: true } | AccountApiError;

export async function deleteAddress(addressId: string): Promise<VoidResult> {
  const response = await fetch(`/api/account/addresses/${addressId}`, { method: "DELETE" });
  if (!response.ok) return parseAccountError(response);
  return { ok: true };
}

// ─── Wishlist ─────────────────────────────────────────────────────────────────

export async function toggleWishlistItem(
  variantId: string,
  isAdded: boolean,
): Promise<VoidResult> {
  const response = await fetch("/api/account/wishlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ variantId, isAdded }),
  });
  if (!response.ok) return parseAccountError(response);
  return { ok: true };
}
