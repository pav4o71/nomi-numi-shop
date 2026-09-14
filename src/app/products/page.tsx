import type { Metadata } from "next";

import { CatalogPageHeader } from "@/components/catalog/catalog-page-header";
import { ProductListingGrid } from "@/components/catalog/product-listing-grid";
import { Container } from "@/components/container";
import { getPublicCatalogReads, PUBLIC_STOREFRONT_CURRENCY } from "@/catalog/public/storefront";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Products · Nomi Numi",
  description: "Browse published Nomi Numi products.",
};

export default async function ProductsIndexPage() {
  const products = await getPublicCatalogReads().listPublishedProducts(PUBLIC_STOREFRONT_CURRENCY);

  return (
    <main className="section-shell py-12 sm:py-16">
      <Container className="space-y-8">
        <CatalogPageHeader
          title="Products"
          description="Browse published catalog products. Prices are shown temporarily in USD."
        />
        <ProductListingGrid products={products} />
      </Container>
    </main>
  );
}
