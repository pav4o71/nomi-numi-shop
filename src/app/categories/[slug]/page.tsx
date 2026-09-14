import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CatalogPageHeader } from "@/components/catalog/catalog-page-header";
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
        <CatalogPageHeader
          eyebrow="Merchandise family"
          title={page.category.name}
          description={page.category.description}
        />
        <ProductListingGrid products={page.products} />
      </Container>
    </main>
  );
}
