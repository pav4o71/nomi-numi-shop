import type { PublicProductDetail } from "@/catalog/public/types";
import { formatPublicMoney } from "@/catalog/public/format-money";

export function ProductDetailView({ product }: { product: PublicProductDetail }) {
  const initial =
    product.variants.find((variant) => variant.id === product.initialVariantId) ??
    product.variants[0];

  return (
    <article data-testid="product-detail" className="space-y-8">
      <header className="space-y-3">
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

      {product.options.length > 0 ? (
        <section aria-labelledby="product-options-heading" className="space-y-3">
          <h2 id="product-options-heading" className="font-display text-xl font-semibold">
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
        <h2 id="product-variants-heading" className="font-display text-xl font-semibold">
          Available variants
        </h2>
        <ul data-testid="product-variant-list" className="space-y-2 text-sm">
          {product.variants.map((variant) => (
            <li
              key={variant.id}
              data-testid={`product-variant-${variant.sku}`}
              data-initial={variant.id === product.initialVariantId ? "true" : "false"}
              className="rounded-lg border border-border/70 bg-surface px-4 py-3"
            >
              <span className="font-medium text-foreground">{variant.sku}</span>
              <span className="mx-2 text-muted-foreground">·</span>
              <span>{formatPublicMoney(variant.price)}</span>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
