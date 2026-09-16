import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { isCatalogError } from "@/catalog/errors";
import { CatalogService } from "@/catalog/service";
import { DrizzleCatalogRepository } from "@/catalog/repository";
import { getRuntimeDb } from "@/db/runtime";

export const metadata: Metadata = {
  title: "Edit Product",
};

export default async function AdminProductLayout({
  children,
  params,
}: {
  children: React.ReactNode;
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
        {product.title}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        ID: <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{product.id}</code>
      </p>

      <div className="mt-6 border-b border-border/60">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <Link
            href={`/admin/products/${product.id}`}
            className="border-transparent text-muted-foreground hover:border-muted-foreground hover:text-foreground whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium"
          >
            General
          </Link>
          <Link
            href={`/admin/products/${product.id}/options`}
            className="border-transparent text-muted-foreground hover:border-muted-foreground hover:text-foreground whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium"
          >
            Options
          </Link>
          <Link
            href={`/admin/products/${product.id}/variants`}
            className="border-transparent text-muted-foreground hover:border-muted-foreground hover:text-foreground whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium"
          >
            Variants
          </Link>
          <Link
            href={`/admin/products/${product.id}/organization`}
            className="border-transparent text-muted-foreground hover:border-muted-foreground hover:text-foreground whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium"
          >
            Organization
          </Link>
        </nav>
      </div>

      <div className="mt-6">{children}</div>
    </div>
  );
}
