import type { Metadata } from "next";

import { CollectionForm } from "@/components/admin/collection-form";

export const metadata: Metadata = {
  title: "New Collection",
};

/**
 * Phase 4B admin collection creation page.
 * Authorization is enforced by the admin layout.
 */
export default function AdminNewCollectionPage() {
  return (
    <div data-testid="admin-collection-new">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
        New Collection
      </h1>
      <CollectionForm action="create" />
    </div>
  );
}
