"use client";

import React, { useEffect, useRef, useState } from "react";
import { useCartUI, useCartData } from "@/cart/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function CartDrawer() {
  const { isCartOpen, closeCart } = useCartUI();
  const { cart, isLoading, mutateCart } = useCartData();
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const attemptKey = useRef<string | null>(null);
  const router = useRouter();

  const cartSignature = cart?.items
    ? cart.items
        .map((item) => `${item.variantId}:${item.quantity}`)
        .sort()
        .join("|")
    : "";
  useEffect(() => {
    attemptKey.current = null;
  }, [cartSignature]);

  if (!isCartOpen) return null;

  const handleCheckout = async () => {
    setCheckoutError(null);
    if (!email.trim()) {
      setCheckoutError("Enter the email address for your receipt.");
      return;
    }
    setIsCheckingOut(true);
    attemptKey.current ??= crypto.randomUUID();
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          idempotencyKey: attemptKey.current,
        }),
      });

      if (response.status === 409) {
        const body = (await response.json()) as { error?: string };
        setCheckoutError(body.error ?? "Some items became unavailable. Please review your cart.");
        await mutateCart();
        return;
      }

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "Checkout failed");
      }

      const result = (await response.json()) as { successPath: string };
      attemptKey.current = null;
      await mutateCart();
      closeCart();
      router.push(result.successPath);
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Checkout failed");
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
      <div className="w-full max-w-md bg-background p-6 shadow-xl h-full flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Your Cart</h2>
          <Button variant="ghost" onClick={closeCart}>
            Close
          </Button>
        </div>

        {checkoutError && (
          <div className="mb-4 rounded bg-destructive/15 p-3 text-sm text-destructive">
            {checkoutError}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <p>Loading cart...</p>
          ) : !cart?.items || cart.items.length === 0 ? (
            <p>Your cart is empty.</p>
          ) : (
            <ul className="space-y-4">
              {cart.items.map((item) => (
                <li key={item.id} className="flex justify-between border-b pb-2">
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6"
                        onClick={async () => {
                          await fetch(`/api/cart/${item.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ quantity: item.quantity - 1 }),
                          });
                          mutateCart();
                        }}
                      >
                        -
                      </Button>
                      <span className="text-sm">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6"
                        disabled={!item.isActive || item.quantity >= item.available}
                        onClick={async () => {
                          await fetch(`/api/cart/${item.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ quantity: item.quantity + 1 }),
                          });
                          mutateCart();
                        }}
                      >
                        +
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs text-muted-foreground"
                        onClick={async () => {
                          await fetch(`/api/cart/${item.id}`, { method: "DELETE" });
                          mutateCart();
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                    {!item.isActive && (
                      <p className="text-xs text-destructive mt-1">Item is no longer available.</p>
                    )}
                    {item.isActive && item.available < item.quantity && (
                      <p className="text-xs text-destructive mt-1">
                        Only {item.available} available.
                      </p>
                    )}
                  </div>
                  <p className="font-medium text-right">${(item.unitPrice / 100).toFixed(2)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {cart?.items && cart.items.length > 0 && (
          <div className="mt-6 border-t pt-4">
            <div className="flex justify-between mb-4 font-semibold text-lg">
              <span>Total</span>
              <span>${(cart.totalAmount / 100).toFixed(2)}</span>
            </div>
            <label className="mb-4 block text-sm font-medium" htmlFor="checkout-email">
              Receipt email
              <input
                id="checkout-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3 font-normal"
              />
            </label>
            <Button className="w-full" disabled={isCheckingOut} onClick={handleCheckout}>
              {isCheckingOut ? "Processing…" : "Proceed to Checkout"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
