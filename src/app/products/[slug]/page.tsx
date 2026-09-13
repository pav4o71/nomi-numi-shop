import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductDetailView } from "@/components/catalog/product-detail-view";
import { Container } from "@/components/container";
import { getPublicCatalogReads, PUBLIC_STOREFRONT_CURRENCY } from "@/catalog/public/storefront";

export const dynamic = "force-dynamic";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getPublicCatalogReads().getPublishedProductBySlug(
    slug,
    PUBLIC_STOREFRONT_CURRENCY,
  );
  if (!product) {
    return { title: "Product not found · Nomi Numi" };
  }
  return {
    title: `${product.seoTitle ?? product.title} · Nomi Numi`,
    description: product.seoDescription ?? product.description ?? undefined,
  };
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getPublicCatalogReads().getPublishedProductBySlug(
    slug,
    PUBLIC_STOREFRONT_CURRENCY,
  );
  if (!product) {
    notFound();
  }

  return (
    <main className="section-shell py-12 sm:py-16">
      <Container>
        <ProductDetailView product={product} />
      </Container>
    </main>
  );
}
