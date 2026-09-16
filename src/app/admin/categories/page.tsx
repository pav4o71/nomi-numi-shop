import type { Metadata } from "next";
import Link from "next/link";

import { CatalogService } from "@/catalog/service";
import { DrizzleCatalogRepository } from "@/catalog/repository";
import { getRuntimeDb } from "@/db/runtime";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Categories",
};

/**
 * Phase 4A admin category list page.
 *
 * Displays all categories (published, unpublished, and archived) with
 * links to create and edit. Authorization is enforced by the admin layout.
 */
export default async function AdminCategoriesPage() {
  const service = new CatalogService(new DrizzleCatalogRepository(getRuntimeDb()));
  const categories = await service.listAllCategories();

  return (
    <div data-testid="admin-categories">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Categories
        </h1>
        <Button asChild size="sm">
          <Link href="/admin/categories/new">New category</Link>
        </Button>
      </div>

      {categories.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          No categories yet.{" "}
          <Link href="/admin/categories/new" className="text-primary hover:underline">
            Create one
          </Link>
          .
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full text-sm" data-testid="categories-table">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30 text-left">
                <th className="px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Slug</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Position</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Published</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Archived</th>
                <th className="px-4 py-3 font-medium text-muted-foreground" />
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id} className="border-b border-border/30 last:border-b-0">
                  <td className="px-4 py-3 font-medium">{cat.name}</td>
                  <td className="px-4 py-3">
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{cat.slug}</code>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{cat.position}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        cat.published
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-muted-foreground"
                      }
                    >
                      {cat.published ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {cat.archivedAt ? "Yes" : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/categories/${cat.id}`}
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
