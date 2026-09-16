import Link from "next/link";
import { Button } from "@/components/ui/button";

import { CatalogService } from "@/catalog/service";
import { DrizzleCatalogRepository } from "@/catalog/repository";
import { getRuntimeDb } from "@/db/runtime";

export default async function AdminEditProductVariantsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const service = new CatalogService(new DrizzleCatalogRepository(getRuntimeDb()));
  
  const variants = await service.listVariantDetailsForProduct(id);

  return (
    <div data-testid="admin-product-variants">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Manage SKUs, inventory details, and pricing.</p>
        <Button asChild size="sm">
          <Link href={`/admin/products/${id}/variants/new`}>Add Variant</Link>
        </Button>
      </div>

      {variants.length === 0 ? (
        <div className="mt-6 py-12 text-center border rounded-xl border-dashed">
          <p className="text-sm text-muted-foreground">No variants found.</p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30 text-left">
                <th className="px-4 py-3 font-medium text-muted-foreground">SKU</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Prices</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Weight</th>
                <th className="px-4 py-3 font-medium text-muted-foreground" />
              </tr>
            </thead>
            <tbody>
              {variants.map((v) => (
                <tr key={v.id} className="border-b border-border/30 last:border-b-0">
                  <td className="px-4 py-3 font-medium">
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{v.sku}</code>
                  </td>
                  <td className="px-4 py-3">
                    {v.isActive ? (
                      <span className="text-emerald-600 dark:text-emerald-400">Active</span>
                    ) : (
                      <span className="text-muted-foreground">Inactive</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {v.prices.map((p) => (
                      <div key={p.currency} className="text-xs">
                        {p.currency} {p.amountMinor / 100}
                      </div>
                    ))}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {v.weightGrams !== null ? `${v.weightGrams}g` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/products/${id}/variants/${v.id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
