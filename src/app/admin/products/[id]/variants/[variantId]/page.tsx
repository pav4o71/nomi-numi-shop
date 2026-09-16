import { notFound } from "next/navigation";
import { isCatalogError } from "@/catalog/errors";
import { CatalogService } from "@/catalog/service";
import { DrizzleCatalogRepository } from "@/catalog/repository";
import { getRuntimeDb } from "@/db/runtime";
import { VariantForm } from "@/components/admin/variant-form";

export default async function AdminEditVariantPage({
  params,
}: {
  params: Promise<{ id: string; variantId: string }>;
}) {
  const { id, variantId } = await params;
  const repo = new DrizzleCatalogRepository(getRuntimeDb());
  const service = new CatalogService(repo);

  let variant;
  try {
    variant = await service.getVariantDetails(variantId);
  } catch (error) {
    if (isCatalogError(error) && error.code === "NOT_FOUND") {
      notFound();
    }
    throw error;
  }

  const productOptions = await service.getProductOptions(id);

  return (
    <div data-testid="admin-variant-edit" className="mt-6">
      <h2 className="mb-4 text-xl font-semibold">Edit Variant</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        ID: <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{variant.id}</code>
      </p>
      
      <VariantForm
        productId={id}
        productOptions={productOptions}
        action="update"
        variant={{
          ...variant,
          prices: variant.prices.map((p) => ({ ...p, currency: p.currency as "PHP" | "USD" })),
        }}
      />
    </div>
  );
}
