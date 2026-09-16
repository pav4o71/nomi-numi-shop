import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { isCatalogError } from "@/catalog/errors";
import { CatalogService } from "@/catalog/service";
import { DrizzleCatalogRepository } from "@/catalog/repository";
import { getRuntimeDb } from "@/db/runtime";
import { ProductForm } from "@/components/admin/product-form";

export const metadata: Metadata = {
  title: "Edit Product",
};

/**
 * Phase 4C admin product edit page.
 *
 * Loads the product by ID and pre-populates the base form.
 * Authorization is enforced by the admin layout.
 */
export default async function AdminEditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const service = new CatalogService(new DrizzleCatalogRepository(getRuntimeDb()));

  let product;
  try {
    product = await service.getProductById(id);
  } catch (error) {
    if (isCatalogError(error) && error.code === "NOT_FOUND") {
      notFound();
    }
    throw error;
  }

  return (
    <div data-testid="admin-product-edit">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
        Edit Product
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        ID: <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{product.id}</code>
      </p>

      {/* 
        In Phase 4D, we will add tabs or sections here to manage 
        Options, Variants, and Prices. For Phase 4C, we only edit the base entity. 
      */}
      <ProductForm action="update" product={{ ...product, status: product.status as "draft" | "published" | "archived" }} />
    </div>
  );
}
