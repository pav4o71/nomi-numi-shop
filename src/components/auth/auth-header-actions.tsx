"use client";

import Link from "next/link";

import { useSession } from "@/auth/client";
import { AUTH_UI_ROUTES } from "@/auth/routes";
import { Button } from "@/components/ui/button";

/**
 * Header auth affordances.
 *
 * IMPORTANT: `useSession` is client UX state only. It must never be used as
 * authorization. Protected surfaces (Phase 2C5) require server primitives.
 * Role is never displayed or selected here.
 */
export function AuthHeaderActions() {
  const { data, isPending } = useSession();
  const appearsSignedIn = Boolean(data?.session);

  if (isPending) {
    return (
      <div className="flex items-center gap-2" aria-busy="true">
        <span className="sr-only">Checking sign-in state</span>
      </div>
    );
  }

  if (appearsSignedIn) {
    return (
      <Button asChild variant="outline" className="w-fit self-start sm:self-auto">
        <Link href={AUTH_UI_ROUTES.logout}>Sign out</Link>
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
      <Button asChild variant="outline" className="w-fit">
        <Link href={AUTH_UI_ROUTES.login}>Sign in</Link>
      </Button>
      <Button asChild className="w-fit">
        <Link href={AUTH_UI_ROUTES.signup}>Sign up</Link>
      </Button>
    </div>
  );
}
