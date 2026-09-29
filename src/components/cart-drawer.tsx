"use client";

import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { useCartUI, useCartData, useCartApi } from "@/cart/client";
import { submitCheckout } from "@/lib/api/checkout-api";
import { formatPublicMoney } from "@/catalog/public/format-money";
import type { CatalogCurrency } from "@/catalog/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";

export function CartDrawer() {
  const { isCartOpen, closeCart } = useCartUI();
  const { cart, isLoading } = useCartData();
  const { updateItem, removeItem } = useCartApi();
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const attemptKey = useRef<string | null>(null);
  const router = useRouter();

  // Reset idempotency key when cart contents change.
  const cartSignature = cart?.items
    ? cart.items
        .map((item) => `${item.variantId}:${item.quantity}`)
        .sort()
        .join("|")
    : "";
  useEffect(() => {
    attemptKey.current = null;
  }, [cartSignature]);

  const handleCheckout = async () => {
    setCheckoutError(null);
    if (!email.trim()) {
      setCheckoutError("Enter the email address for your receipt.");
      return;
    }

    setIsCheckingOut(true);
    attemptKey.current ??= crypto.randomUUID();

    try {
      const result = await submitCheckout({
        email: email.trim(),
        idempotencyKey: attemptKey.current,
      });

      if (!result.ok) {
        if (result.isInventoryConflict) {
          // Inventory issue — show inline error and let the user review their cart.
          setCheckoutError(result.error);
        } else {
          toast.error(result.error);
        }
        return;
      }

      // Success
      attemptKey.current = null;
      closeCart();
      router.push(result.successPath);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsCheckingOut(false);
    }
  };

  const itemCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  return (
    <Sheet open={isCartOpen} onOpenChange={(open) => !open && closeCart()}>
      <SheetContent side="right" className="flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-0">
          <SheetTitle>
            Your Cart
            {itemCount > 0 && (
              <span className="ml-2 text-base font-normal text-muted-foreground">
                ({itemCount} {itemCount === 1 ? "item" : "items"})
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {/* Error banner — inventory conflicts only */}
        {checkoutError && (
          <div className="mx-6 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {checkoutError}
          </div>
        )}

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto px-6">
          {isLoading ? (
            <div className="space-y-4 py-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : !cart?.items || cart.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-muted-foreground">Your cart is empty.</p>
              <Button
                variant="link"
                className="mt-2"
                onClick={closeCart}
                asChild={false}
              >
                Continue shopping
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-border py-2" aria-label="Cart items">
              {cart.items.map((item) => (
                <li key={item.id} className="flex items-start gap-4 py-4">
                  <div className="flex-1 space-y-1 min-w-0">
                    <p className="truncate font-medium text-foreground">{item.title}</p>
                    <p className="text-sm font-medium text-primary">
                      {formatPublicMoney({
                        currency: cart.currency as CatalogCurrency,
                        amountMinor: item.unitPrice,
                        compareAtAmountMinor: null,
                      })}
                    </p>
                    {!item.isActive && (
                      <p className="text-xs text-destructive">Item is no longer available.</p>
                    )}
                    {item.isActive && item.available < item.quantity && (
                      <p className="text-xs text-destructive">
                        Only {item.available} available.
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      aria-label={`Decrease quantity of ${item.title}`}
                      onClick={async () => {
                        const result = await updateItem(item.id, item.quantity - 1);
                        if (!result.ok) toast.error(result.error);
                      }}
                    >
                      –
                    </Button>
                    <span className="w-6 text-center text-sm tabular-nums">
                      {item.quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      aria-label={`Increase quantity of ${item.title}`}
                      disabled={!item.isActive || item.quantity >= item.available}
                      onClick={async () => {
                        const result = await updateItem(item.id, item.quantity + 1);
                        if (!result.ok) toast.error(result.error);
                      }}
                    >
                      +
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${item.title} from cart`}
                      onClick={async () => {
                        const result = await removeItem(item.id);
                        if (!result.ok) toast.error(result.error);
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Checkout footer */}
        {cart?.items && cart.items.length > 0 && (
          <SheetFooter className="border-t border-border bg-surface/60 backdrop-blur-sm px-6 pb-6 pt-4 gap-4">
            <div className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span>
                {formatPublicMoney({
                  currency: cart.currency as CatalogCurrency,
                  amountMinor: cart.totalAmount,
                  compareAtAmountMinor: null,
                })}
              </span>
            </div>
            <Separator />
            <label className="block space-y-1.5" htmlFor="checkout-email">
              <span className="text-sm font-medium">Receipt email</span>
              <Input
                id="checkout-email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <Button
              className="w-full"
              disabled={isCheckingOut}
              onClick={handleCheckout}
            >
              {isCheckingOut ? "Processing…" : "Proceed to Checkout"}
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
