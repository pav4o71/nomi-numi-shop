"use client";

import { ShoppingBag } from "lucide-react";
import { useCartData, useCartUI } from "@/cart/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function CartTriggerButton() {
  const { toggleCart } = useCartUI();
  const { cart } = useCartData();

  const itemCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleCart}
      aria-label={itemCount > 0 ? `Cart, ${itemCount} item${itemCount === 1 ? "" : "s"}` : "Cart"}
      className="relative h-10 w-10 transition-transform motion-safe:hover:scale-105"
    >
      <ShoppingBag className="h-4 w-4" />
      {itemCount > 0 && (
        <Badge
          variant="default"
          aria-hidden="true"
          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center p-0 text-[10px] shadow-sm"
        >
          {itemCount > 9 ? "9+" : itemCount}
        </Badge>
      )}
    </Button>
  );
}
