import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";

import { requireAdminPage } from "@/auth/guards";
import { AUTH_UI_ROUTES, PROTECTED_SURFACE_ROUTES } from "@/auth/routes";
import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Admin · Nomi Numi",
  description: "Nomi Numi admin surface.",
};

/**
 * Minimal admin protected surface. Exact `admin` role required via
 * `requireAdmin`. No general admin-management UI in Phase 2C5.
 */
export default async function AdminPage() {
  const headerList = await headers();
  // Exact-role gate; principal identity is not rendered in the DOM.
  await requireAdminPage(headerList, PROTECTED_SURFACE_ROUTES.admin);

  return (
    <main className="section-shell py-12 sm:py-16">
      <Container className="max-w-lg space-y-6">
        <div className="space-y-2">
          <p className="font-display text-2xl font-semibold tracking-tight text-primary">
            Nomi Numi
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Admin
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            You are signed in with an admin account. This page proves server authorization only —
            there is no catalog or user-management UI here.
          </p>
        </div>

        <div
          data-testid="admin-surface"
          className="rounded-xl border border-border/80 bg-surface px-5 py-4 text-sm text-muted-foreground"
        >
          <p>
            Role: <span className="font-medium text-foreground">admin</span>
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
