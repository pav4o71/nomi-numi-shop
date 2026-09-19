import Link from "next/link";

import type { PublicCategorySummary } from "@/catalog/public/types";
import { CatalogEntityCard } from "@/components/catalog/catalog-entity-card";
import { Container } from "@/components/container";

type HomeFeaturedCategoriesProps = {
  categories: PublicCategorySummary[];
};

export function HomeFeaturedCategories({ categories }: HomeFeaturedCategoriesProps) {
  return (
    <section
      id="featured-categories"
      className="section-shell border-t border-border/70 py-16 sm:py-20"
      aria-labelledby="featured-categories-heading"
      data-testid="home-featured-categories"
    >
      <Container>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <h2
              id="featured-categories-heading"
              className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
            >
              Featured categories
            </h2>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg">
              Stable merchandise families from the published category taxonomy.
            </p>
          </div>
          <Link
            href="/categories"
            className="focus-ring text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Browse all categories
          </Link>
        </div>

        {categories.length === 0 ? (
          <p
            data-testid="home-featured-categories-empty"
            className="surface-card mt-10 px-6 py-8 text-sm text-muted-foreground sm:text-base"
          >
            Featured categories will appear here once categories are published.
          </p>
        ) : (
          <ul
            data-testid="home-featured-categories-grid"
            className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {categories.map((category) => (
              <li key={category.slug}>
                <CatalogEntityCard
                  href={`/categories/${category.slug}`}
                  name={category.name}
                  description={category.description}
                  data-testid={`home-featured-category-${category.slug}`}
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
