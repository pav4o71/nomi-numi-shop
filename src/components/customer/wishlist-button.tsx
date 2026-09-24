"use client";

import { useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export function WishlistButton({ variantId }: { variantId: string }) {
  const [isAdded, setIsAdded] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [isPending, setIsPending] = useState(false);

  async function toggle() {
    setIsPending(true);
    const next = !isAdded;
    try {
      const response = await fetch("/api/account/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId, isAdded: next }),
      });
      if (response.status === 401) {
        setNeedsLogin(true);
        return;
      }
      if (!response.ok) return;
      setIsAdded(next);
      setNeedsLogin(false);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" disabled={isPending} onClick={toggle}>
        {isAdded ? "Saved" : "Save"}
      </Button>
      {needsLogin ? (
        <Link className="text-xs underline" href="/login">
          Sign in to save
        </Link>
      ) : null}
    </div>
  );
}
