import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/container";
import { getPublicCatalogReads } from "@/catalog/public/storefront";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Categories · Nomi Numi",
  description: "Browse published Nomi Numi categories.",
};

export default async function CategoriesIndexPage() {
  const categories = await getPublicCatalogReads().listPublishedCategories();

  return (
    <main className="section-shell py-12 sm:py-16">
      <Container className="space-y-8">
        <header className="space-y-2">
          <p className="font-display text-2xl font-semibold tracking-tight text-primary">
            Nomi Numi
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Categories
          </h1>
        </header>
        {categories.length === 0 ? (
          <p data-testid="catalog-empty" className="text-sm text-muted-foreground">
            No categories are published yet.
          </p>
        ) : (
          <ul data-testid="category-listing" className="grid gap-4 sm:grid-cols-2">
            {categories.map((category) => (
              <li key={category.slug}>
                <Link
                  href={`/categories/${category.slug}`}
                  className="block rounded-xl border border-border/80 bg-surface px-5 py-4 hover:border-primary/40"
                  data-testid={`category-card-${category.slug}`}
                >
                  <h2 className="font-display text-xl font-semibold">{category.name}</h2>
                  {category.description ? (
                    <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>
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
