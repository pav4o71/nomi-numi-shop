"use client";

import React, { useState } from "react";
import { useCartUI, useCartData } from "@/cart/client";
import { Button } from "@/components/ui/button";

export function AddToCartButton({
  variantId,
  disabled,
}: {
  variantId: string;
  disabled?: boolean;
}) {
  const { openCart } = useCartUI();
  const { mutateCart } = useCartData();
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async () => {
    setIsAdding(true);
    try {
      const response = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId, quantity: 1 }),
      });
      if (response.ok) {
        await mutateCart();
        openCart();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Button
      size="sm"
      onClick={handleAdd}
      disabled={disabled || isAdding}
      className="ml-auto shrink-0"
    >
      {isAdding ? "Adding..." : "Add to Cart"}
    </Button>
  );
}
