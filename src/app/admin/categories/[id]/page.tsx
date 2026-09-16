import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { isCatalogError } from "@/catalog/errors";
import { CatalogService } from "@/catalog/service";
import { DrizzleCatalogRepository } from "@/catalog/repository";
import { getRuntimeDb } from "@/db/runtime";
import { CategoryForm } from "@/components/admin/category-form";

export const metadata: Metadata = {
  title: "Edit Category",
};

/**
 * Phase 4A admin category edit page.
 *
 * Loads the category by ID and pre-populates the form.
 * Authorization is enforced by the admin layout.
 */
export default async function AdminEditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const service = new CatalogService(new DrizzleCatalogRepository(getRuntimeDb()));

  let category;
  try {
    category = await service.getCategoryById(id);
  } catch (error) {
    if (isCatalogError(error) && error.code === "NOT_FOUND") {
      notFound();
    }
    throw error;
  }

  return (
    <div data-testid="admin-category-edit">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
        Edit Category
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        ID: <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{category.id}</code>
      </p>
      <CategoryForm action="update" category={category} />
    </div>
  );
}
