/**
 * Phase 3C deterministic DEV catalog fixture manifest.
 *
 * Development fixtures only — not production merchandise or pricing.
 * Ownership is expressed solely via reserved logical keys:
 * - slugs begin with `dev-fixture-`
 * - variant SKUs begin with `DEVFIX-`
 */

import type { CatalogCurrency } from "@/catalog/money";
import type { ProductStatus } from "@/catalog/validators";

export const DEV_FIXTURE_SLUG_PREFIX = "dev-fixture-";
export const DEV_FIXTURE_SKU_PREFIX = "DEVFIX-";
export const DEV_CATALOG_SEED_CONFIRMATION = "SEED-NOMI-DEV-CATALOG";

export type FixturePrice = {
  currency: CatalogCurrency;
  amountMinor: number;
  compareAtAmountMinor?: number | null;
};

export type FixtureOptionValue = {
  value: string;
  position: number;
};

export type FixtureOption = {
  name: string;
  position: number;
  values: FixtureOptionValue[];
};

export type FixtureVariant = {
  sku: string;
  isActive: boolean;
  /** Map of option name → option value. Empty for default/no-option products. */
  optionValues: Record<string, string>;
  prices: FixturePrice[];
};

export type FixtureCategoryMembership = {
  categorySlug: string;
  position: number;
  isPrimary: boolean;
};

export type FixtureCollectionMembership = {
  collectionSlug: string;
  position: number;
};

export type FixtureCategory = {
  slug: string;
  name: string;
  description: string;
  position: number;
  published: boolean;
};

export type FixtureCollection = {
  slug: string;
  name: string;
  description: string;
  position: number;
  published: boolean;
};

export type FixtureProduct = {
  slug: string;
  title: string;
  description: string;
  status: ProductStatus;
  position: number;
  categories: FixtureCategoryMembership[];
  collections: FixtureCollectionMembership[];
  options: FixtureOption[];
  variants: FixtureVariant[];
};

export type DevCatalogFixtureManifest = {
  categories: FixtureCategory[];
  collections: FixtureCollection[];
  products: FixtureProduct[];
};

function price(currency: CatalogCurrency, amountMinor: number): FixturePrice {
  return { currency, amountMinor, compareAtAmountMinor: null };
}

function priceWithCompare(
  currency: CatalogCurrency,
  amountMinor: number,
  compareAtAmountMinor: number,
): FixturePrice {
  return { currency, amountMinor, compareAtAmountMinor };
}

export const DEV_CATALOG_FIXTURE_MANIFEST: DevCatalogFixtureManifest = {
  categories: [
    {
      slug: "dev-fixture-plushies",
      name: "Plushies",
      description: "DEV fixture structural category for plush merchandise.",
      position: 10,
      published: true,
    },
    {
      slug: "dev-fixture-apparel",
      name: "Apparel",
      description: "DEV fixture structural category for apparel.",
      position: 20,
      published: true,
    },
    {
      slug: "dev-fixture-drinkware",
      name: "Drinkware",
      description: "DEV fixture structural category for drinkware.",
      position: 30,
      published: true,
    },
    {
      slug: "dev-fixture-accessories",
      name: "Accessories",
      description: "DEV fixture structural category for accessories.",
      position: 40,
      published: true,
    },
    {
      slug: "dev-fixture-tote-bags",
      name: "Tote Bags",
      description: "DEV fixture structural category for tote bags.",
      position: 50,
      published: true,
    },
    {
      slug: "dev-fixture-home-decor",
      name: "Home Decor",
      description: "DEV fixture structural category for home decor.",
      position: 60,
      published: true,
    },
  ],
  collections: [
    {
      slug: "dev-fixture-christmas",
      name: "Christmas",
      description: "DEV fixture seasonal Christmas merchandising collection.",
      position: 10,
      published: true,
    },
    {
      slug: "dev-fixture-valentines-day",
      name: "Valentine's Day",
      description: "DEV fixture seasonal Valentine's Day merchandising collection.",
      position: 20,
      published: true,
    },
  ],
  products: [
    {
      slug: "dev-fixture-hug-plush",
      title: "Hug Plush",
      description: "DEV fixture plush with Size option axis.",
      status: "published",
      position: 10,
      categories: [{ categorySlug: "dev-fixture-plushies", position: 0, isPrimary: true }],
      collections: [
        { collectionSlug: "dev-fixture-christmas", position: 0 },
        { collectionSlug: "dev-fixture-valentines-day", position: 1 },
      ],
      options: [
        {
          name: "Size",
          position: 0,
          values: [
            { value: "20cm", position: 0 },
            { value: "60cm", position: 1 },
            { value: "80cm", position: 2 },
          ],
        },
      ],
      variants: [
        {
          sku: "DEVFIX-HUG-PLUSH-20CM",
          isActive: true,
          optionValues: { Size: "20cm" },
          prices: [price("PHP", 89900), price("USD", 2499)],
        },
        {
          sku: "DEVFIX-HUG-PLUSH-60CM",
          isActive: true,
          optionValues: { Size: "60cm" },
          prices: [price("PHP", 249900), price("USD", 5999)],
        },
        {
          sku: "DEVFIX-HUG-PLUSH-80CM",
          isActive: true,
          optionValues: { Size: "80cm" },
          prices: [price("PHP", 399900), price("USD", 8999)],
        },
      ],
    },
    {
      slug: "dev-fixture-cozy-hoodie",
      title: "Cozy Hoodie",
      description: "DEV fixture apparel with Size and Color options.",
      status: "published",
      position: 20,
      categories: [{ categorySlug: "dev-fixture-apparel", position: 0, isPrimary: true }],
      collections: [{ collectionSlug: "dev-fixture-christmas", position: 1 }],
      options: [
        {
          name: "Size",
          position: 0,
          values: [
            { value: "S", position: 0 },
            { value: "M", position: 1 },
            { value: "L", position: 2 },
          ],
        },
        {
          name: "Color",
          position: 1,
          values: [
            { value: "Black", position: 0 },
            { value: "White", position: 1 },
          ],
        },
      ],
      variants: [
        {
          sku: "DEVFIX-COZY-HOODIE-S-BLACK",
          isActive: true,
          optionValues: { Size: "S", Color: "Black" },
          prices: [priceWithCompare("PHP", 179900, 229900), priceWithCompare("USD", 4499, 5499)],
        },
        {
          sku: "DEVFIX-COZY-HOODIE-M-BLACK",
          isActive: true,
          optionValues: { Size: "M", Color: "Black" },
          prices: [price("PHP", 189900), price("USD", 4799)],
        },
        {
          sku: "DEVFIX-COZY-HOODIE-L-WHITE",
          isActive: true,
          optionValues: { Size: "L", Color: "White" },
          prices: [price("PHP", 199900), price("USD", 4999)],
        },
        {
          sku: "DEVFIX-COZY-HOODIE-M-WHITE",
          isActive: false,
          optionValues: { Size: "M", Color: "White" },
          prices: [price("PHP", 189900), price("USD", 4799)],
        },
      ],
    },
    {
      slug: "dev-fixture-moonlight-tumbler",
      title: "Moonlight Tumbler",
      description: "DEV fixture drinkware with a single default variant.",
      status: "published",
      position: 30,
      categories: [{ categorySlug: "dev-fixture-drinkware", position: 0, isPrimary: true }],
      collections: [{ collectionSlug: "dev-fixture-valentines-day", position: 0 }],
      options: [],
      variants: [
        {
          sku: "DEVFIX-MOONLIGHT-TUMBLER",
          isActive: true,
          optionValues: {},
          prices: [price("PHP", 69900), price("USD", 1999)],
        },
      ],
    },
    {
      slug: "dev-fixture-heart-keychain",
      title: "Heart Keychain",
      description: "DEV fixture draft accessory.",
      status: "draft",
      position: 40,
      categories: [{ categorySlug: "dev-fixture-accessories", position: 0, isPrimary: true }],
      collections: [{ collectionSlug: "dev-fixture-valentines-day", position: 2 }],
      options: [],
      variants: [
        {
          sku: "DEVFIX-HEART-KEYCHAIN",
          isActive: true,
          optionValues: {},
          prices: [price("PHP", 29900), price("USD", 999)],
        },
      ],
    },
    {
      slug: "dev-fixture-everyday-tote",
      title: "Everyday Tote",
      description: "DEV fixture archived tote bag.",
      status: "archived",
      position: 50,
      categories: [{ categorySlug: "dev-fixture-tote-bags", position: 0, isPrimary: true }],
      collections: [],
      options: [],
      variants: [
        {
          sku: "DEVFIX-EVERYDAY-TOTE",
          isActive: true,
          optionValues: {},
          prices: [price("PHP", 99900), price("USD", 2799)],
        },
      ],
    },
    {
      slug: "dev-fixture-cozy-cushion",
      title: "Cozy Cushion",
      description: "DEV fixture home decor cushion.",
      status: "published",
      position: 60,
      categories: [{ categorySlug: "dev-fixture-home-decor", position: 0, isPrimary: true }],
      collections: [
        { collectionSlug: "dev-fixture-christmas", position: 2 },
        { collectionSlug: "dev-fixture-valentines-day", position: 3 },
      ],
      options: [],
      variants: [
        {
          sku: "DEVFIX-COZY-CUSHION",
          isActive: true,
          optionValues: {},
          prices: [price("PHP", 129900), price("USD", 3299)],
        },
      ],
    },
  ],
};

export function assertFixtureOwnershipKeys(
  manifest: DevCatalogFixtureManifest = DEV_CATALOG_FIXTURE_MANIFEST,
): void {
  for (const category of manifest.categories) {
    if (!category.slug.startsWith(DEV_FIXTURE_SLUG_PREFIX)) {
      throw new Error(
        `Fixture category slug must start with ${DEV_FIXTURE_SLUG_PREFIX}: ${category.slug}`,
      );
    }
  }
  for (const collection of manifest.collections) {
    if (!collection.slug.startsWith(DEV_FIXTURE_SLUG_PREFIX)) {
      throw new Error(
        `Fixture collection slug must start with ${DEV_FIXTURE_SLUG_PREFIX}: ${collection.slug}`,
      );
    }
  }
  for (const product of manifest.products) {
    if (!product.slug.startsWith(DEV_FIXTURE_SLUG_PREFIX)) {
      throw new Error(
        `Fixture product slug must start with ${DEV_FIXTURE_SLUG_PREFIX}: ${product.slug}`,
      );
    }
    for (const variant of product.variants) {
      if (!variant.sku.startsWith(DEV_FIXTURE_SKU_PREFIX)) {
        throw new Error(`Fixture SKU must start with ${DEV_FIXTURE_SKU_PREFIX}: ${variant.sku}`);
      }
    }
  }
}

assertFixtureOwnershipKeys();
