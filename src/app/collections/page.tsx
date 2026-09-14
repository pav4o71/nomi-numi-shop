import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/container";
import { getPublicCatalogReads } from "@/catalog/public/storefront";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Collections · Nomi Numi",
  description: "Browse published Nomi Numi collections.",
};

export default async function CollectionsIndexPage() {
  const collections = await getPublicCatalogReads().listPublishedCollections();

  return (
    <main className="section-shell py-12 sm:py-16">
      <Container className="space-y-8">
        <header className="space-y-2">
          <p className="font-display text-2xl font-semibold tracking-tight text-primary">
            Nomi Numi
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Collections
          </h1>
        </header>
        {collections.length === 0 ? (
          <p data-testid="catalog-empty" className="text-sm text-muted-foreground">
            No collections are published yet.
          </p>
        ) : (
          <ul data-testid="collection-listing" className="grid gap-4 sm:grid-cols-2">
            {collections.map((collection) => (
              <li key={collection.slug}>
                <Link
                  href={`/collections/${collection.slug}`}
                  className="block rounded-xl border border-border/80 bg-surface px-5 py-4 hover:border-primary/40"
                  data-testid={`collection-card-${collection.slug}`}
                >
                  <h2 className="font-display text-xl font-semibold">{collection.name}</h2>
                  {collection.description ? (
                    <p className="mt-1 text-sm text-muted-foreground">{collection.description}</p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </main>
  );
}
