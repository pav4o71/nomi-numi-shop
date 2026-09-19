import Link from "next/link";

import type { PublicCollectionSummary } from "@/catalog/public/types";
import { CatalogEntityCard } from "@/components/catalog/catalog-entity-card";
import { Container } from "@/components/container";

type HomeSeasonalCollectionsProps = {
  collections: PublicCollectionSummary[];
};

export function HomeSeasonalCollections({ collections }: HomeSeasonalCollectionsProps) {
  return (
    <section
      id="seasonal-collections"
      className="section-shell border-t border-border/70 py-16 sm:py-20"
      aria-labelledby="seasonal-collections-heading"
      data-testid="home-seasonal-collections"
    >
      <Container>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <h2
              id="seasonal-collections-heading"
              className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
            >
              Seasonal collections
            </h2>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg">
              Seasonal and campaign collections drawn from published catalog data.
            </p>
          </div>
          <Link
            href="/collections"
            className="focus-ring text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Explore collections
          </Link>
        </div>

        {collections.length === 0 ? (
          <p
            data-testid="home-seasonal-collections-empty"
            className="surface-card mt-10 px-6 py-8 text-sm text-muted-foreground sm:text-base"
          >
            Seasonal collections will appear here when campaign collections are published.
          </p>
        ) : (
          <ul
            data-testid="home-seasonal-collections-grid"
            className="mt-10 grid gap-6 sm:grid-cols-2"
          >
            {collections.map((collection) => (
              <li key={collection.slug}>
                <CatalogEntityCard
                  href={`/collections/${collection.slug}`}
                  name={collection.name}
                  description={collection.description}
                  data-testid={`home-seasonal-collection-${collection.slug}`}
                  titleAs="h3"
                />
              </li>
            ))}
          </ul>
        )}
      </Container>
    </section>
  );
}
