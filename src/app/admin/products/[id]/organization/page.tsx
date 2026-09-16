import { CatalogService } from "@/catalog/service";
import { DrizzleCatalogRepository } from "@/catalog/repository";
import { getRuntimeDb } from "@/db/runtime";
import { ProductOrganizationForm } from "@/components/admin/product-organization-form";

export default async function AdminEditProductOrganizationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const repo = new DrizzleCatalogRepository(getRuntimeDb());
  const service = new CatalogService(repo);

  const [assignedCatsRaw, assignedColsRaw] = await Promise.all([
    service.listProductCategories(id),
    service.listProductCollections(id),
  ]);

  const initialCategories = await Promise.all(
    assignedCatsRaw.map(async (c) => {
      const cat = await service.getCategoryById(c.categoryId);
      return { id: cat.id, name: cat.name, isPrimary: c.isPrimary, position: c.position };
    }),
  );

  const initialCollections = await Promise.all(
    assignedColsRaw.map(async (c) => {
      const col = await service.getCollectionById(c.collectionId);
      return { id: col.id, name: col.name, position: c.position };
    }),
  );

  return (
    <div data-testid="admin-product-organization" className="mt-6">
      <p className="mb-6 text-sm text-muted-foreground">
        Organize how this product appears across the storefront.
      </p>

      <ProductOrganizationForm
        productId={id}
        initialCategories={initialCategories}
        initialCollections={initialCollections}
      />
    </div>
  );
}
