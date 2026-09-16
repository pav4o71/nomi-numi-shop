import { CatalogService } from "@/catalog/service";
import { DrizzleCatalogRepository } from "@/catalog/repository";
import { getRuntimeDb } from "@/db/runtime";
import { ProductOptionsForm } from "@/components/admin/product-options-form";

export default async function AdminEditProductOptionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const repo = new DrizzleCatalogRepository(getRuntimeDb());
  const service = new CatalogService(repo);

  const [options, variants] = await Promise.all([
    service.getProductOptions(id),
    service.listVariantsForProduct(id),
  ]);

  const hasVariants = variants.length > 0;

  return (
    <div data-testid="admin-product-options">
      <ProductOptionsForm
        productId={id}
        initialOptions={options}
        hasVariants={hasVariants}
      />
    </div>
  );
}
