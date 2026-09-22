"use client";

import React, { useState } from "react";
import { useCartUI, useCartData } from "@/cart/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function CartDrawer() {
  const { isCartOpen, closeCart } = useCartUI();
  const { cart, isLoading, mutateCart } = useCartData();
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const router = useRouter();

  if (!isCartOpen) return null;

  const handleCheckout = async () => {
    setCheckoutError(null);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "guest@example.com", // In a real flow, this would come from an auth context or a form
          idempotencyKey: crypto.randomUUID(),
        }),
      });

      if (response.status === 409) {
        setCheckoutError("Some items became unavailable. Please review your cart.");
        mutateCart(); // Refresh cart to show unavailable items
        return;
      }

      if (!response.ok) {
        throw new Error("Checkout failed");
      }

      const order = await response.json();
      mutateCart(); // Cart is now empty
      closeCart();
      router.push(`/checkout/${order.id}/success`);
    } catch (err) {
      setCheckoutError("An unexpected error occurred during checkout.");
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
            <Button className="w-full" onClick={handleCheckout}>
              Proceed to Checkout
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
