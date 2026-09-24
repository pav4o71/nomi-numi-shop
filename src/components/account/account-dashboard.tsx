"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

type Address = {
  id: string;
  type: "billing" | "shipping";
  name: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
};

type WishlistItem = { id: string; variantId: string };
type Order = {
  id: string;
  currency: string;
  totalAmount: number;
  orderStatus: string;
  paymentStatus: string;
  createdAt: string;
};

export function AccountDashboard({
  initialAddresses,
  initialWishlist,
  orders,
}: {
  initialAddresses: Address[];
  initialWishlist: WishlistItem[];
  orders: Order[];
}) {
  const [addresses, setAddresses] = useState(initialAddresses);
  const [wishlist, setWishlist] = useState(initialWishlist);
  const [error, setError] = useState<string | null>(null);

  async function addAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/account/addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: form.get("type"),
        name: form.get("name"),
        street: form.get("street"),
        city: form.get("city"),
        postalCode: form.get("postalCode"),
        country: form.get("country"),
        isDefault: form.get("isDefault") === "on",
      }),
    });
    const body = (await response.json()) as Address & { error?: string };
    if (!response.ok) {
      setError(body.error ?? "Could not save address");
      return;
    }
    setAddresses((current) => [
      ...current.map((address) =>
        body.isDefault && address.type === body.type ? { ...address, isDefault: false } : address,
      ),
      body,
    ]);
    event.currentTarget.reset();
  }

  async function deleteAddress(addressId: string) {
    const response = await fetch(`/api/account/addresses/${addressId}`, { method: "DELETE" });
    if (!response.ok) {
      setError("Could not delete address");
      return;
    }
    setAddresses((current) => current.filter((address) => address.id !== addressId));
  }

  async function removeWishlistItem(variantId: string) {
    const response = await fetch("/api/account/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variantId, isAdded: false }),
    });
    if (!response.ok) {
      setError("Could not update wishlist");
      return;
    }
    setWishlist((current) => current.filter((item) => item.variantId !== variantId));
  }

  return (
    <div className="space-y-10">
      {error ? (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
      ) : null}

      <section className="space-y-4">
        <h2 className="font-display text-2xl font-semibold">Orders</h2>
        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No orders yet.</p>
        ) : null}
        <ul className="space-y-3">
          {orders.map((order) => (
            <li
              key={order.id}
              className="surface-card flex flex-wrap items-center justify-between gap-3 p-4 text-sm"
            >
              <div>
                <Link className="font-medium underline" href={`/checkout/${order.id}/success`}>
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
                {order.currency} {(order.totalAmount / 100).toFixed(2)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl font-semibold">Addresses</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {addresses.map((address) => (
            <li key={address.id} className="surface-card space-y-2 p-4 text-sm">
              <p className="font-medium capitalize">
                {address.type}
                {address.isDefault ? " · Default" : ""}
              </p>
              <p>
                {address.name}
                <br />
                {address.street}
                <br />
                {address.postalCode} {address.city}
                <br />
                {address.country}
              </p>
              <Button size="sm" variant="outline" onClick={() => deleteAddress(address.id)}>
                Delete
              </Button>
            </li>
          ))}
        </ul>
        <form onSubmit={addAddress} className="surface-card grid gap-3 p-4 sm:grid-cols-2">
          <select
            name="type"
            className="h-11 rounded-md border bg-background px-3"
            defaultValue="shipping"
          >
            <option value="shipping">Shipping</option>
            <option value="billing">Billing</option>
          </select>
          {[
            ["name", "Full name"],
            ["street", "Street"],
            ["city", "City"],
            ["postalCode", "Postal code"],
            ["country", "Country"],
          ].map(([name, placeholder]) => (
            <input
              key={name}
              required
              name={name}
              placeholder={placeholder}
              className="h-11 rounded-md border bg-background px-3"
            />
          ))}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isDefault" /> Make default
          </label>
          <Button type="submit">Add address</Button>
        </form>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl font-semibold">Wishlist</h2>
        {wishlist.length === 0 ? (
          <p className="text-sm text-muted-foreground">Your wishlist is empty.</p>
        ) : null}
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
                onClick={() => removeWishlistItem(item.variantId)}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
