import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { isCatalogError } from "@/catalog/errors";
import { CatalogService } from "@/catalog/service";
import { DrizzleCatalogRepository } from "@/catalog/repository";
import { getRuntimeDb } from "@/db/runtime";
import { CollectionForm } from "@/components/admin/collection-form";

export const metadata: Metadata = {
  title: "Edit Collection",
};

/**
 * Phase 4B admin collection edit page.
 *
 * Loads the collection by ID and pre-populates the form.
 * Authorization is enforced by the admin layout.
 */
export default async function AdminEditCollectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const service = new CatalogService(new DrizzleCatalogRepository(getRuntimeDb()));

  let collection;
  try {
    collection = await service.getCollectionById(id);
  } catch (error) {
    if (isCatalogError(error) && error.code === "NOT_FOUND") {
      notFound();
    }
    throw error;
  }

  return (
    <div data-testid="admin-collection-edit">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
        Edit Collection
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        ID: <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{collection.id}</code>
      </p>
      <CollectionForm action="update" collection={collection} />
    </div>
  );
}
