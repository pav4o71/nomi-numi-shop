import type { Metadata } from "next";
import Link from "next/link";

import { CatalogService } from "@/catalog/service";
import { DrizzleCatalogRepository } from "@/catalog/repository";
import { getRuntimeDb } from "@/db/runtime";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Products",
};

/**
 * Phase 4C admin product list page.
 *
 * Displays all products (published, drafts, and archived) with
 * links to create and edit. Authorization is enforced by the admin layout.
 */
export default async function AdminProductsPage() {
  const service = new CatalogService(new DrizzleCatalogRepository(getRuntimeDb()));
  const products = await service.listAllProducts();

  return (
    <div data-testid="admin-products">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Products
        </h1>
        <Button asChild size="sm">
          <Link href="/admin/products/new">New product</Link>
        </Button>
      </div>

      {products.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          No products yet.{" "}
          <Link href="/admin/products/new" className="text-primary hover:underline">
            Create one
          </Link>
          .
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full text-sm" data-testid="products-table">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30 text-left">
                <th className="px-4 py-3 font-medium text-muted-foreground">Title</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Slug</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Position</th>
                <th className="px-4 py-3 font-medium text-muted-foreground" />
              </tr>
            </thead>
            <tbody>
              {products.map((prod) => (
                <tr key={prod.id} className="border-b border-border/30 last:border-b-0">
                  <td className="px-4 py-3 font-medium">{prod.title}</td>
                  <td className="px-4 py-3">
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{prod.slug}</code>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        prod.status === "published"
                          ? "text-emerald-600 dark:text-emerald-400 capitalize"
                          : "text-muted-foreground capitalize"
                      }
                    >
                      {prod.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{prod.position}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/products/${prod.id}`}
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
