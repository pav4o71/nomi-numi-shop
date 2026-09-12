"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { authClient } from "@/auth/client";
import { AUTH_UI_COPY } from "@/auth/ui-messages";
import { AuthAlert } from "@/components/auth/auth-form-field";
import { Button } from "@/components/ui/button";

/**
 * Explicit logout action. Invalidates the current server session via Better Auth.
 * Client session absence afterward is UX only — not an authorization decision.
 */
export function LogoutForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onLogout() {
    setError(null);
    startTransition(async () => {
      const { error: signOutError } = await authClient.signOut();
      if (signOutError) {
        setError(AUTH_UI_COPY.genericFailure);
        return;
      }
      router.push("/");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Sign out ends your current session on this device.
      </p>
      {error ? <AuthAlert tone="error">{error}</AuthAlert> : null}
      <Button
        type="button"
        className="w-full"
        onClick={onLogout}
        disabled={pending}
        aria-busy={pending}
      >
        {pending ? "Signing out…" : "Sign out"}
      </Button>
    </div>
  );
}
