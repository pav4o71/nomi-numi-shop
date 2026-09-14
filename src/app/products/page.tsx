import type { Metadata } from "next";

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
        <header className="space-y-2">
          <p className="font-display text-2xl font-semibold tracking-tight text-primary">
            Nomi Numi
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Products
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
            Published catalog products for the current storefront currency (USD).
          </p>
        </header>
        <ProductListingGrid products={products} />
      </Container>
    </main>
  );
}
