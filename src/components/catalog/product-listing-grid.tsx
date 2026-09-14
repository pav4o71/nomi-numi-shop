import Link from "next/link";

import type { PublicProductListingCard } from "@/catalog/public/types";
import { formatListingPrice } from "@/catalog/public/format-money";
import { DecorativeMotif } from "@/components/brand/decorative-motif";
import { MediaPlaceholder } from "@/components/catalog/media-placeholder";

export function ProductListingGrid({ products }: { products: PublicProductListingCard[] }) {
  if (products.length === 0) {
    return (
      <p data-testid="catalog-empty" className="text-sm text-muted-foreground sm:text-base">
        No products are available here yet.
      </p>
    );
  }

  return (
    <ul data-testid="product-listing-grid" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <li key={product.slug}>
          <Link
            href={`/products/${product.slug}`}
            className="surface-card focus-ring block overflow-hidden transition-transform motion-safe:hover:-translate-y-0.5"
            data-testid={`product-card-${product.slug}`}
          >
            <MediaPlaceholder
              className="rounded-none rounded-t-[inherit] shadow-none"
              label="Image coming soon"
            >
              <DecorativeMotif variant="paw" className="relative h-8 w-8 text-blush/45" />
            </MediaPlaceholder>
            <div className="space-y-2 px-5 py-4 sm:px-6">
              <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
                {product.title}
              </h2>
              {product.description ? (
                <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                  {product.description}
                </p>
              ) : null}
              <p className="text-sm font-medium text-foreground">
                {formatListingPrice(product.price, product.priceDisplayMode)}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
