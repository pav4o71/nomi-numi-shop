import Link from "next/link";

import type { PublicProductDetail } from "@/catalog/public/types";
import { formatPublicMoney } from "@/catalog/public/format-money";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { MediaPlaceholder } from "@/components/catalog/media-placeholder";
import { WishlistButton } from "@/components/customer/wishlist-button";

export function ProductDetailView({ product }: { product: PublicProductDetail }) {
  const initial =
    product.variants.find((variant) => variant.id === product.initialVariantId) ??
    product.variants[0];
  const hasMembership = product.categories.length > 0 || product.collections.length > 0;

  return (
    <article data-testid="product-detail" className="space-y-10">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start lg:gap-10">
        <MediaPlaceholder
          className="aspect-[4/3] w-full shadow-soft sm:aspect-[5/4]"
          label="Image coming soon"
        />

        <header className="space-y-4">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {product.title}
          </h1>
          {product.description ? (
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              {product.description}
            </p>
          ) : null}
          {initial ? (
            <p data-testid="product-detail-price" className="text-lg font-medium text-foreground">
              {formatPublicMoney(initial.price)}
              {initial.price.compareAtAmountMinor != null ? (
                <span className="ml-2 text-sm text-muted-foreground line-through">
                  {formatPublicMoney({
                    currency: initial.price.currency,
                    amountMinor: initial.price.compareAtAmountMinor,
                    compareAtAmountMinor: null,
                  })}
                </span>
              ) : null}
            </p>
          ) : null}
        </header>
      </div>

      {product.options.length > 0 ? (
        <section aria-labelledby="product-options-heading" className="space-y-3">
          <h2
            id="product-options-heading"
            className="font-display text-xl font-semibold tracking-tight text-foreground"
          >
            Options
          </h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {product.options.map((option) => (
              <li key={option.id}>
                <span className="font-medium text-foreground">{option.name}: </span>
                {option.values.map((value) => value.value).join(", ")}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="product-variants-heading" className="space-y-3">
        <h2
          id="product-variants-heading"
          className="font-display text-xl font-semibold tracking-tight text-foreground"
        >
          Available variants
        </h2>
        <ul data-testid="product-variant-list" className="grid gap-3 sm:grid-cols-2">
          {product.variants.map((variant) => (
            <li
              key={variant.id}
              data-testid={`product-variant-${variant.sku}`}
              data-initial={variant.id === product.initialVariantId ? "true" : "false"}
              className="surface-card flex items-center justify-between px-4 py-3 text-sm"
            >
              <div>
                <span className="font-medium text-foreground">{variant.sku}</span>
                <span className="mx-2 text-muted-foreground">·</span>
                <span>{formatPublicMoney(variant.price)}</span>
              </div>
              <div className="flex items-center gap-2">
                <WishlistButton variantId={variant.id} />
                <AddToCartButton variantId={variant.id} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      {hasMembership ? (
        <section aria-labelledby="product-membership-heading" className="space-y-4">
          <h2
            id="product-membership-heading"
            className="font-display text-xl font-semibold tracking-tight text-foreground"
          >
            Also found in
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {product.categories.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold tracking-[0.14em] text-brown uppercase">
                  Merchandise families
                </p>
                <ul className="space-y-2 text-sm">
                  {product.categories.map((category) => (
                    <li key={category.slug}>
                      <Link
                        href={`/categories/${category.slug}`}
                        className="font-medium text-primary underline-offset-4 transition-colors hover:text-primary-hover hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      >
                        {category.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {product.collections.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold tracking-[0.14em] text-brown uppercase">
                  Collections
                </p>
                <ul className="space-y-2 text-sm">
                  {product.collections.map((collection) => (
                    <li key={collection.slug}>
                      <Link
                        href={`/collections/${collection.slug}`}
                        className="font-medium text-primary underline-offset-4 transition-colors hover:text-primary-hover hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      >
                        {collection.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </article>
  );
}
