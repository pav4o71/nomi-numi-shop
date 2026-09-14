import Link from "next/link";

import type { PublicProductListingCard } from "@/catalog/public/types";
import { formatListingPrice } from "@/catalog/public/format-money";

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
            className="block space-y-2 rounded-xl border border-border/80 bg-surface px-5 py-4 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-testid={`product-card-${product.slug}`}
          >
            <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
              {product.title}
            </h2>
            {product.description ? (
              <p className="line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
            ) : null}
            <p className="text-sm font-medium text-foreground">
              {formatListingPrice(product.price, product.priceDisplayMode)}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
