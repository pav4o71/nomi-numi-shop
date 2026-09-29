"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import {
  type SerializedOrder,
  type Address,
  type WishlistItem,
  type CreateAddressInput,
  createAddress,
  deleteAddress,
  toggleWishlistItem,
} from "@/lib/api/account-api";
import { formatPublicMoney } from "@/catalog/public/format-money";
import type { CatalogCurrency } from "@/catalog/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

export function AccountDashboard({
  initialAddresses,
  initialWishlist,
  orders,
}: {
  initialAddresses: Address[];
  initialWishlist: WishlistItem[];
  orders: SerializedOrder[];
}) {
  const [addresses, setAddresses] = useState(initialAddresses);
  const [wishlist, setWishlist] = useState(initialWishlist);

  async function handleAddAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const input: CreateAddressInput = {
      type: (form.get("type") as "billing" | "shipping") ?? "shipping",
      name: String(form.get("name") ?? ""),
      street: String(form.get("street") ?? ""),
      city: String(form.get("city") ?? ""),
      postalCode: String(form.get("postalCode") ?? ""),
      country: String(form.get("country") ?? ""),
      isDefault: form.get("isDefault") === "on",
    };
    const result = await createAddress(input);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setAddresses((current) => [
      ...current.map((addr) =>
        result.address.isDefault && addr.type === result.address.type
          ? { ...addr, isDefault: false }
          : addr,
      ),
      result.address,
    ]);
    formElement.reset();
    toast.success("Address saved.");
  }

  async function handleDeleteAddress(addressId: string) {
    const result = await deleteAddress(addressId);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setAddresses((current) => current.filter((addr) => addr.id !== addressId));
    toast.success("Address removed.");
  }

  async function handleRemoveWishlistItem(variantId: string) {
    const result = await toggleWishlistItem(variantId, false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setWishlist((current) => current.filter((item) => item.variantId !== variantId));
  }

  return (
    <div className="space-y-10">
      {/* ── Orders ─────────────────────────────────────────────────────── */}
      <section className="space-y-4" aria-labelledby="orders-heading">
        <h2 id="orders-heading" className="font-display text-2xl font-semibold">
          Orders
        </h2>
        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No orders yet.</p>
        ) : (
          <ul className="space-y-3">
            {orders.map((order) => (
              <li
                key={order.id}
                className="surface-card flex flex-wrap items-center justify-between gap-3 p-4 text-sm"
              >
                <div>
                  <Link
                    className="font-medium text-primary underline-offset-4 hover:underline"
                    href={`/checkout/${order.id}/success`}
                  >
                    {order.id}
                  </Link>
                  <p className="text-muted-foreground">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <p>
                  {order.paymentStatus} · {order.orderStatus}
                </p>
                <p className="font-medium">
                  {formatPublicMoney({
                    currency: order.currency as CatalogCurrency,
                    amountMinor: order.totalAmount,
                    compareAtAmountMinor: null,
                  })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Separator />

      {/* ── Addresses ──────────────────────────────────────────────────── */}
      <section className="space-y-4" aria-labelledby="addresses-heading">
        <h2 id="addresses-heading" className="font-display text-2xl font-semibold">
          Addresses
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {addresses.map((address) => (
            <li key={address.id} className="surface-card space-y-2 p-4 text-sm">
              <p className="font-medium capitalize">
                {address.type}
                {address.isDefault ? " · Default" : ""}
              </p>
              <address className="not-italic leading-relaxed text-muted-foreground">
                {address.name}
                <br />
                {address.street}
                <br />
                {address.postalCode} {address.city}
                <br />
                {address.country}
              </address>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDeleteAddress(address.id)}
              >
                Delete
              </Button>
            </li>
          ))}
        </ul>

        <form
          onSubmit={handleAddAddress}
          className="surface-card grid gap-3 p-4 sm:grid-cols-2"
          aria-label="Add new address"
        >
          <select
            name="type"
            className="h-11 rounded-md border border-input bg-background px-3 text-sm"
            defaultValue="shipping"
          >
            <option value="shipping">Shipping</option>
            <option value="billing">Billing</option>
          </select>
          {(
            [
              ["name", "Full name"],
              ["street", "Street"],
              ["city", "City"],
              ["postalCode", "Postal code"],
              ["country", "Country"],
            ] as const
          ).map(([name, placeholder]) => (
            <Input key={name} required name={name} placeholder={placeholder} />
          ))}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isDefault" /> Make default
          </label>
          <Button type="submit">Add address</Button>
        </form>
      </section>

      <Separator />

      {/* ── Wishlist ───────────────────────────────────────────────────── */}
      <section className="space-y-4" aria-labelledby="wishlist-heading">
        <h2 id="wishlist-heading" className="font-display text-2xl font-semibold">
          Wishlist
        </h2>
        {wishlist.length === 0 ? (
          <p className="text-sm text-muted-foreground">Your wishlist is empty.</p>
        ) : (
          <ul className="space-y-2">
            {wishlist.map((item) => (
              <li
                key={item.id}
                className="surface-card flex items-center justify-between gap-3 p-4 text-sm"
              >
                <span>Variant {item.variantId}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRemoveWishlistItem(item.variantId)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
