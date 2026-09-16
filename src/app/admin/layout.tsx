import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";

import { requireAdminPage } from "@/auth/guards";
import { AUTH_UI_ROUTES, PROTECTED_SURFACE_ROUTES } from "@/auth/routes";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: {
    template: "%s · Admin · Nomi Numi",
    default: "Admin · Nomi Numi",
  },
};

const ADMIN_NAV_ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/collections", label: "Collections" },
  { href: "/admin/products", label: "Products" },
] as const;

/**
 * Phase 4A admin layout shell.
 *
 * All `/admin/*` pages inherit this layout. Authorization is enforced
 * at the layout level — child pages do not need to call requireAdminPage.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const headerList = await headers();
  await requireAdminPage(headerList, PROTECTED_SURFACE_ROUTES.admin);

  return (
    <div className="flex min-h-screen" data-testid="admin-layout">
      {/* Sidebar */}
      <aside className="hidden w-56 shrink-0 border-r border-border/60 bg-muted/30 px-4 py-6 sm:block">
        <Link
          href="/admin"
          className="font-display text-lg font-semibold tracking-tight text-primary"
        >
          Nomi Numi
          <span className="ml-1 text-xs font-normal text-muted-foreground">Admin</span>
        </Link>

        <nav className="mt-8 space-y-1" data-testid="admin-nav">
          {ADMIN_NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "block rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-1 pt-8 text-sm">
          <Link
            href="/"
            className="rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            ← Storefront
          </Link>
          <Link
            href={AUTH_UI_ROUTES.logout}
            className="rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Sign out
          </Link>
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto p-6 sm:p-8">{children}</main>
    </div>
  );
}
