import { notFound } from "next/navigation";
import Link from "next/link";

import { isCatalogError } from "@/catalog/errors";
import { CatalogService } from "@/catalog/service";
import { DrizzleCatalogRepository } from "@/catalog/repository";
import { getRuntimeDb } from "@/db/runtime";
import { InventoryForm } from "@/components/admin/inventory-form";

export default async function AdminVariantInventoryPage({
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

  const balance = (await service.getVariantInventoryBalance(variantId)) ?? {
    variantId,
    onHand: 0,
    reserved: 0,
  };
  const movements = await service.getVariantInventoryMovements(variantId);

  // Convert Date to string for client component props
  const serializedMovements = movements.map((m) => ({
    ...m,
    createdAt: m.createdAt.toISOString(),
  }));

  return (
    <div data-testid="admin-variant-inventory" className="mt-6">
      <div className="mb-6">
        <Link
          href={`/admin/products/${id}/variants`}
          className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          &larr; Back to Variants
        </Link>
      </div>

      <h2 className="mb-2 text-xl font-semibold">Inventory Ledger</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        Variant SKU: <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{variant.sku}</code>
      </p>

      <InventoryForm variantId={variantId} balance={balance} movements={serializedMovements} />
    </div>
  );
}
