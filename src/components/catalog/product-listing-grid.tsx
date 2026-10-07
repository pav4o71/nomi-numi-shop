import Link from "next/link";

import type { PublicProductListingCard } from "@/catalog/public/types";
import { formatListingPrice } from "@/catalog/public/format-money";
import { MediaPlaceholder } from "@/components/catalog/media-placeholder";

// Stagger delays for the first 6 cards; subsequent cards share the last delay.
const STAGGER_DELAYS = ["0ms", "60ms", "120ms", "180ms", "240ms", "300ms"];

export function ProductListingGrid({ products }: { products: PublicProductListingCard[] }) {
  if (products.length === 0) {
    return (
      <p
        data-testid="catalog-empty"
        className="surface-card px-6 py-8 text-sm text-muted-foreground sm:text-base"
      >
        No products are available here yet.
      </p>
    );
  }

  return (
    <ul data-testid="product-listing-grid" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
              className="surface-card focus-ring group flex h-full flex-col overflow-hidden transition-all duration-200 ease-out motion-safe:hover:-translate-y-1 hover:shadow-soft border-t-2 border-t-primary/20 hover:border-t-primary/60"
              data-testid={`product-card-${product.slug}`}
            >
              <MediaPlaceholder
                className="rounded-none rounded-t-[inherit] shadow-none"
                label={`${product.title} image`}
              />
              <div className="flex flex-1 flex-col gap-2 px-5 py-4 sm:px-6">
                <h2 className="font-display text-xl font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
                  {product.title}
                </h2>
                {product.description ? (
                  <p className="flex-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                    {product.description}
                  </p>
                ) : null}
                <div className="mt-1 flex items-center justify-between">
                  <p className="text-sm font-semibold text-primary">
                    {formatListingPrice(product.price, product.priceDisplayMode)}
                  </p>
                  <span
                    aria-hidden="true"
                    className="inline-flex translate-y-2 items-center gap-1 text-xs font-medium text-primary opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100"
                  >
                    View <span className="transition-transform duration-150 group-hover:translate-x-0.5">→</span>
                  </span>
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
