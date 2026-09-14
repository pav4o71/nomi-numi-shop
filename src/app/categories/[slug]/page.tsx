import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductListingGrid } from "@/components/catalog/product-listing-grid";
import { Container } from "@/components/container";
import { getPublicCatalogReads, PUBLIC_STOREFRONT_CURRENCY } from "@/catalog/public/storefront";

export const dynamic = "force-dynamic";

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPublicCatalogReads().getPublishedCategoryBySlug(
    slug,
    PUBLIC_STOREFRONT_CURRENCY,
  );
  if (!page) {
    return { title: "Category not found · Nomi Numi" };
  }
  return {
    title: `${page.category.name} · Nomi Numi`,
    description: page.category.description ?? undefined,
  };
}

export default async function CategoryDetailPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const page = await getPublicCatalogReads().getPublishedCategoryBySlug(
    slug,
    PUBLIC_STOREFRONT_CURRENCY,
  );
  if (!page) {
    notFound();
  }

  return (
    <main className="section-shell py-12 sm:py-16">
      <Container className="space-y-8">
        <header className="space-y-2">
          <p className="font-display text-2xl font-semibold tracking-tight text-primary">
            Nomi Numi
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {page.category.name}
          </h1>
          {page.category.description ? (
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
              {page.category.description}
            </p>
          ) : null}
        </header>
        <ProductListingGrid products={page.products} />
      </Container>
    </main>
  );
}
