import type { Metadata } from "next";

import { CatalogEntityCard } from "@/components/catalog/catalog-entity-card";
import { CatalogPageHeader } from "@/components/catalog/catalog-page-header";
import { Container } from "@/components/container";
import { getPublicCatalogReads } from "@/catalog/public/storefront";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Categories · Nomi Numi",
  description: "Browse published Nomi Numi merchandise families.",
};

export default async function CategoriesIndexPage() {
  const categories = await getPublicCatalogReads().listPublishedCategories();

  return (
    <main className="section-shell py-12 sm:py-16">
      <Container className="space-y-8">
        <CatalogPageHeader
          title="Categories"
          description="Stable merchandise families — the structural taxonomy of Nomi Numi gifts, not seasonal campaigns."
        />
        {categories.length === 0 ? (
          <p data-testid="catalog-empty" className="text-sm text-muted-foreground sm:text-base">
            No categories are published yet.
          </p>
        ) : (
          <ul data-testid="category-listing" className="grid gap-6 sm:grid-cols-2">
            {categories.map((category) => (
              <li key={category.slug}>
                <CatalogEntityCard
                  href={`/categories/${category.slug}`}
                  name={category.name}
                  description={category.description}
                  data-testid={`category-card-${category.slug}`}
                />
              </li>
            ))}
          </ul>
        )}
      </Container>
    </main>
  );
}
