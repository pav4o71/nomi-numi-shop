"use client";

import { useCartUI, useCartData } from "@/cart/client";
import { Button } from "@/components/ui/button";

export function CartTriggerButton() {
  const { toggleCart } = useCartUI();
  const { cart } = useCartData();

  const itemCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  return (
    <Button variant="outline" size="sm" onClick={toggleCart} className="relative">
      Cart
      {itemCount > 0 && (
        <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
          {itemCount}
        </span>
      )}
    </Button>
  );
}
