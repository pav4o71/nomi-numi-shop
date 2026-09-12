import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";

import { requireCustomerPage } from "@/auth/guards";
import { AUTH_UI_ROUTES, PROTECTED_SURFACE_ROUTES } from "@/auth/routes";
import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Account · Nomi Numi",
  description: "Your Nomi Numi customer account.",
};

/**
 * Minimal customer protected surface. Exact `customer` role required.
 * Admin is not implicitly a customer.
 */
export default async function AccountPage() {
  const headerList = await headers();
  const principal = await requireCustomerPage(headerList, PROTECTED_SURFACE_ROUTES.account);

  return (
    <main className="section-shell py-12 sm:py-16">
      <Container className="max-w-lg space-y-6">
        <div className="space-y-2">
          <p className="font-display text-2xl font-semibold tracking-tight text-primary">
            Nomi Numi
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Customer account
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            You are signed in with a customer account. This page is a minimal protected surface —
            not a full profile dashboard.
          </p>
        </div>

        <div
          data-testid="customer-account-surface"
          data-user-id={principal.userId}
          className="rounded-xl border border-border/80 bg-surface px-5 py-4 text-sm text-muted-foreground"
        >
          <p>
            Role: <span className="font-medium text-foreground">customer</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href="/">Back to storefront</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={AUTH_UI_ROUTES.logout}>Sign out</Link>
          </Button>
        </div>
      </Container>
    </main>
  );
}
