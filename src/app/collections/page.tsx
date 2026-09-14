import type { Metadata } from "next";

import { CatalogEntityCard } from "@/components/catalog/catalog-entity-card";
import { CatalogPageHeader } from "@/components/catalog/catalog-page-header";
import { Container } from "@/components/container";
import { getPublicCatalogReads } from "@/catalog/public/storefront";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Collections · Nomi Numi",
  description: "Browse published Nomi Numi merchandising collections.",
};

export default async function CollectionsIndexPage() {
  const collections = await getPublicCatalogReads().listPublishedCollections();

  return (
    <main className="section-shell py-12 sm:py-16">
      <Container className="space-y-8">
        <CatalogPageHeader
          title="Collections"
          description="Seasonal, campaign, editorial, or merchandising groupings — separate from category taxonomy."
        />
        {collections.length === 0 ? (
          <p data-testid="catalog-empty" className="text-sm text-muted-foreground sm:text-base">
            No collections are published yet.
          </p>
        ) : (
          <ul data-testid="collection-listing" className="grid gap-6 sm:grid-cols-2">
            {collections.map((collection) => (
              <li key={collection.slug}>
                <CatalogEntityCard
                  href={`/collections/${collection.slug}`}
                  name={collection.name}
                  description={collection.description}
                  data-testid={`collection-card-${collection.slug}`}
                />
              </li>
            ))}
          </ul>
        )}
      </Container>
    </main>
  );
}
