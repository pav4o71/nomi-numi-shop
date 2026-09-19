/**
 * Portable Phase 3D public-catalog eligibility / pricing unit tests (no live DB).
 */
import { describe, expect, it } from "vitest";

import {
  buildListingPrice,
  compareEligibleVariants,
  isCategoryPublic,
  isCollectionPublic,
  isProductPublished,
  selectInitialEligibleVariant,
  type EligibleVariantCandidate,
} from "@/catalog/public";
import type {
  CategoryRow,
  CollectionRow,
  ProductOptionWithValues,
  ProductRow,
  VariantPriceRow,
  VariantRow,
} from "@/catalog/repository";

function category(overrides: Partial<CategoryRow> = {}): CategoryRow {
  return {
    id: "cat_1",
    slug: "plush",
    name: "Plush",
    description: null,
    position: 0,
    published: true,
    archivedAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function collection(overrides: Partial<CollectionRow> = {}): CollectionRow {
  return {
    id: "col_1",
    slug: "gifts",
    name: "Gifts",
    description: null,
    position: 0,
    published: true,
    publishedFrom: null,
    publishedUntil: null,
    archivedAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function product(overrides: Partial<ProductRow> = {}): ProductRow {
  return {
    id: "prod_1",
    slug: "hug",
    title: "Hug",
    description: null,
    status: "published",
    position: 0,
    seoTitle: null,
    seoDescription: null,
    publishedAt: new Date("2026-01-01T00:00:00.000Z"),
    archivedAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function variant(overrides: Partial<VariantRow> = {}): VariantRow {
  return {
    id: "var_1",
    productId: "prod_1",
    sku: "SKU-A",
    isActive: true,
    weightGrams: null,
    lengthMm: null,
    widthMm: null,
    heightMm: null,
    fulfillmentHint: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function price(overrides: Partial<VariantPriceRow> = {}): VariantPriceRow {
  return {
    id: "price_1",
    variantId: "var_1",
    currency: "USD",
    amountMinor: 1000,
    compareAtAmountMinor: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function candidate(args: {
  id: string;
  sku: string;
  amountMinor: number;
  compareAtAmountMinor?: number | null;
  selections?: EligibleVariantCandidate["selections"];
}): EligibleVariantCandidate {
  return {
    variant: variant({ id: args.id, sku: args.sku }),
    price: price({
      id: `price_${args.id}`,
      variantId: args.id,
      amountMinor: args.amountMinor,
      compareAtAmountMinor: args.compareAtAmountMinor ?? null,
    }),
    selections: args.selections ?? [],
  };
}

describe("public catalog visibility predicates", () => {
  it("requires published and non-archived categories", () => {
    expect(isCategoryPublic(category())).toBe(true);
    expect(isCategoryPublic(category({ published: false }))).toBe(false);
    expect(isCategoryPublic(category({ archivedAt: new Date() }))).toBe(false);
  });

  it("honors collection publish windows", () => {
    const now = new Date("2026-06-15T12:00:00.000Z");
    expect(isCollectionPublic(collection(), now)).toBe(true);
    expect(
      isCollectionPublic(collection({ publishedFrom: new Date("2026-07-01T00:00:00.000Z") }), now),
    ).toBe(false);
    expect(
      isCollectionPublic(collection({ publishedUntil: new Date("2026-06-01T00:00:00.000Z") }), now),
    ).toBe(false);
    expect(
      isCollectionPublic(
        collection({
          publishedFrom: new Date("2026-06-01T00:00:00.000Z"),
          publishedUntil: new Date("2026-07-01T00:00:00.000Z"),
        }),
        now,
      ),
    ).toBe(true);
  });

  it("treats only published products as storefront parents", () => {
    expect(isProductPublished(product())).toBe(true);
    expect(isProductPublished(product({ status: "draft" }))).toBe(false);
    expect(isProductPublished(product({ status: "archived" }))).toBe(false);
  });
});

describe("listing price and initial variant selection", () => {
  it("uses exact mode when all eligible amounts match", () => {
    const eligible = [
      candidate({ id: "v1", sku: "B", amountMinor: 2000, compareAtAmountMinor: 3000 }),
      candidate({ id: "v2", sku: "A", amountMinor: 2000 }),
    ];
    const listing = buildListingPrice(eligible, "USD", []);
    expect(listing).toEqual({
      price: { currency: "USD", amountMinor: 2000, compareAtAmountMinor: null },
      priceDisplayMode: "exact",
    });
    // SKU tie-break picks A when amounts equal and no options
    expect(selectInitialEligibleVariant(eligible, [])?.variant.sku).toBe("A");
  });

  it("uses From mode and compare-at from the min-price variant only", () => {
    const eligible = [
      candidate({ id: "v1", sku: "HIGH", amountMinor: 3000, compareAtAmountMinor: 4000 }),
      candidate({ id: "v2", sku: "LOW", amountMinor: 1000, compareAtAmountMinor: 1500 }),
    ];
    const listing = buildListingPrice(eligible, "USD", []);
    expect(listing).toEqual({
      price: { currency: "USD", amountMinor: 1000, compareAtAmountMinor: 1500 },
      priceDisplayMode: "from",
    });
  });

  it("tie-breaks equal prices by option-axis then option-value then SKU", () => {
    const options: ProductOptionWithValues[] = [
      {
        id: "opt_size",
        productId: "prod_1",
        name: "Size",
        position: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        values: [
          {
            id: "val_s",
            optionId: "opt_size",
            value: "S",
            position: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: "val_m",
            optionId: "opt_size",
            value: "M",
            position: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      },
    ];

    const small = candidate({
      id: "v_s",
      sku: "SKU-Z",
      amountMinor: 1000,
      selections: [{ optionId: "opt_size", optionValueId: "val_s" }],
    });
    const medium = candidate({
      id: "v_m",
      sku: "SKU-A",
      amountMinor: 1000,
      selections: [{ optionId: "opt_size", optionValueId: "val_m" }],
    });

    expect(compareEligibleVariants(small, medium, options)).toBeLessThan(0);
    expect(selectInitialEligibleVariant([medium, small], options)?.variant.id).toBe("v_s");
  });
});

describe("public money display formatting", () => {
  it("formats USD and PHP minor units and From mode", async () => {
    const { formatListingPrice, formatPublicMoney } = await import("@/catalog/public/format-money");
    expect(
      formatPublicMoney({ currency: "USD", amountMinor: 2499, compareAtAmountMinor: null }),
    ).toBe("$24.99");
    expect(
      formatPublicMoney({ currency: "PHP", amountMinor: 89900, compareAtAmountMinor: null }),
    ).toMatch(/899/);
    expect(
      formatListingPrice(
        { currency: "USD", amountMinor: 1000, compareAtAmountMinor: null },
        "from",
      ),
    ).toBe("From $10.00");
    expect(
      formatListingPrice(
        { currency: "USD", amountMinor: 1000, compareAtAmountMinor: null },
        "exact",
      ),
    ).toBe("$10.00");
  });
});

describe("Phase 6 merchandising selection", () => {
  it("takeFeatured returns the leading slice and clamps bad limits", async () => {
    const { takeFeatured } = await import("@/catalog/public/merchandising");
    expect(takeFeatured(["a", "b", "c"], 2)).toEqual(["a", "b"]);
    expect(takeFeatured(["a", "b"], 10)).toEqual(["a", "b"]);
    expect(takeFeatured(["a"], 0)).toEqual([]);
    expect(takeFeatured(["a"], -3)).toEqual([]);
  });

  it("selectSeasonalCollections prefers windowed collections then falls back", async () => {
    const { selectSeasonalCollections } = await import("@/catalog/public/merchandising");
    const openEnded = {
      slug: "always",
      publishedFrom: null,
      publishedUntil: null,
    };
    const seasonal = {
      slug: "holiday",
      publishedFrom: new Date("2026-12-01T00:00:00.000Z"),
      publishedUntil: new Date("2026-12-31T00:00:00.000Z"),
    };
    expect(selectSeasonalCollections([openEnded, seasonal], 4).map((c) => c.slug)).toEqual([
      "holiday",
    ]);
    expect(selectSeasonalCollections([openEnded], 4).map((c) => c.slug)).toEqual(["always"]);
  });
});
