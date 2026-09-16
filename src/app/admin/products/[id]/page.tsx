import { notFound } from "next/navigation";

import { isCatalogError } from "@/catalog/errors";
import { CatalogService } from "@/catalog/service";
import { DrizzleCatalogRepository } from "@/catalog/repository";
import { getRuntimeDb } from "@/db/runtime";
import { ProductForm } from "@/components/admin/product-form";

export default async function AdminEditProductGeneralPage({
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
    <div data-testid="admin-product-general">
      <ProductForm action="update" product={{ ...product, status: product.status as "draft" | "published" | "archived" }} />
    </div>
  );
}
