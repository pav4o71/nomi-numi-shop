import type { Metadata } from "next";
import Link from "next/link";

import { AUTH_UI_ROUTES } from "@/auth/routes";
import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Access denied · Nomi Numi",
  description: "You do not have access to that page.",
};

/**
 * Shared denial landing for authenticated wrong-role / invalid-role page
 * access. Not an authorization primitive — pages redirect here after a
 * server-side FORBIDDEN or INVALID_AUTHORIZATION_STATE decision.
 */
export default function ForbiddenPage() {
  return (
    <main className="section-shell py-12 sm:py-16">
      <Container className="max-w-md space-y-6">
        <div className="space-y-2">
          <p className="font-display text-2xl font-semibold tracking-tight text-primary">
            Nomi Numi
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Access denied
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            You do not have permission to view that page.
          </p>
        </div>

        <div data-testid="forbidden-surface" className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/">Back to storefront</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={AUTH_UI_ROUTES.login}>Sign in</Link>
          </Button>
        </div>
      </Container>
    </main>
  );
}
