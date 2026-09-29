import Link from "next/link";

import type { PublicProductListingCard } from "@/catalog/public/types";
import { formatListingPrice } from "@/catalog/public/format-money";
import { MediaPlaceholder } from "@/components/catalog/media-placeholder";
import { Container } from "@/components/container";

// Stagger delays for featured product cards.
const STAGGER_DELAYS = ["0ms", "80ms", "160ms", "240ms"];

type HomeFeaturedProductsProps = {
  products: PublicProductListingCard[];
};

export function HomeFeaturedProducts({ products }: HomeFeaturedProductsProps) {
  return (
    <section
      id="featured-products"
      className="section-shell border-t border-border/70 py-16 sm:py-20"
      aria-labelledby="featured-products-heading"
      data-testid="home-featured-products"
    >
      <Container>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <h2
              id="featured-products-heading"
              className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
            >
              Featured products
            </h2>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg">
              Highlights from the published catalog, ordered for storefront merchandising.
            </p>
          </div>
          <Link
            href="/products"
            className="focus-ring inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Browse all products
            <span aria-hidden="true">→</span>
          </Link>
        </div>

        {products.length === 0 ? (
          <p
            data-testid="home-featured-products-empty"
            className="surface-card mt-10 px-6 py-8 text-sm text-muted-foreground sm:text-base"
          >
            Featured products will appear here once the catalog is published.
          </p>
        ) : (
          <ul
            data-testid="home-featured-products-grid"
            className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
          >
            {products.map((product, index) => {
              const delay = STAGGER_DELAYS[Math.min(index, STAGGER_DELAYS.length - 1)];
              return (
                <li
                  key={product.slug}
                  className="motion-safe:animate-[fade-up_500ms_ease-out_both]"
                  style={{ animationDelay: delay }}
                >
                  <Link
                    href={`/products/${product.slug}`}
                    className="surface-card focus-ring group flex h-full flex-col overflow-hidden transition-all duration-200 ease-out motion-safe:hover:-translate-y-1.5 hover:shadow-soft border-t-2 border-t-primary/10 hover:border-t-primary/50"
                    data-testid={`home-featured-product-${product.slug}`}
                  >
                    <MediaPlaceholder
                      className="rounded-none rounded-t-[inherit] shadow-none"
                      label={`${product.title} image`}
                    />
                    <div className="flex flex-1 flex-col gap-1.5 px-5 py-4">
                      <h3 className="font-display text-lg font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
                        {product.title}
                      </h3>
                      <p className="text-sm font-semibold text-primary">
                        {formatListingPrice(product.price, product.priceDisplayMode)}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Container>
    </section>
  );
}
