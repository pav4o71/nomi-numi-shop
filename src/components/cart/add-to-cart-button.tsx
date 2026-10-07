"use client";

import React, { useState } from "react";
import { toast } from "sonner";

import { useCartUI, useCartApi } from "@/cart/client";
import { Button } from "@/components/ui/button";

export function AddToCartButton({
  variantId,
  disabled,
}: {
  variantId: string;
  disabled?: boolean;
}) {
  const { openCart } = useCartUI();
  const { addItem } = useCartApi();
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async () => {
    setIsAdding(true);
    try {
      const result = await addItem(variantId, 1);
      if (result.ok) {
        openCart();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Could not add item to cart. Please try again.");
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
      {isAdding ? "Adding…" : "Add to Cart"}
    </Button>
  );
}
