import type { Metadata } from "next";

import { CategoryForm } from "@/components/admin/category-form";

export const metadata: Metadata = {
  title: "New Category",
};

/**
 * Phase 4A admin category creation page.
 * Authorization is enforced by the admin layout.
 */
export default function AdminNewCategoryPage() {
  return (
    <div data-testid="admin-category-new">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
        New Category
      </h1>
      <CategoryForm action="create" />
    </div>
  );
}
