import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

/**
 * Phase 4A admin dashboard placeholder.
 *
 * Authorization is enforced by the admin layout; no per-page guard needed.
 * The `data-testid="admin-surface"` attribute is preserved for existing
 * Phase 2C5 E2E tests.
 */
export default function AdminDashboardPage() {
  return (
    <div data-testid="admin-surface">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
        Dashboard
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Welcome to the Nomi Numi admin panel. Use the sidebar to manage your catalog.
      </p>
    </div>
  );
}
