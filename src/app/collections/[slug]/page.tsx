import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CatalogPageHeader } from "@/components/catalog/catalog-page-header";
import { ProductListingGrid } from "@/components/catalog/product-listing-grid";
import { Container } from "@/components/container";
import { getPublicCatalogReads, PUBLIC_STOREFRONT_CURRENCY } from "@/catalog/public/storefront";

export const dynamic = "force-dynamic";

type CollectionPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: CollectionPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPublicCatalogReads().getPublishedCollectionBySlug(
    slug,
    PUBLIC_STOREFRONT_CURRENCY,
  );
  if (!page) {
    return { title: "Collection not found · Nomi Numi" };
  }
  return {
    title: `${page.collection.name} · Nomi Numi`,
    description: page.collection.description ?? undefined,
  };
}

export default async function CollectionDetailPage({ params }: CollectionPageProps) {
  const { slug } = await params;
  const page = await getPublicCatalogReads().getPublishedCollectionBySlug(
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
          eyebrow="Collection"
          title={page.collection.name}
          description={page.collection.description}
        />
        <ProductListingGrid products={page.products} />
      </Container>
    </main>
  );
}
