import { CatalogService } from "@/catalog/service";
import { DrizzleCatalogRepository } from "@/catalog/repository";
import { getRuntimeDb } from "@/db/runtime";
import { VariantForm } from "@/components/admin/variant-form";

export default async function AdminNewVariantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = new DrizzleCatalogRepository(getRuntimeDb());
  const service = new CatalogService(repo);

  const productOptions = await service.getProductOptions(id);

  return (
    <div data-testid="admin-variant-new" className="mt-6">
      <h2 className="mb-4 text-xl font-semibold">New Variant</h2>
      <VariantForm productId={id} productOptions={productOptions} action="create" />
    </div>
  );
}
