/**
 * Persisted TEST catalog factories (Phase 3C).
 *
 * Uses CatalogService only. Never targets DEV. Never depends on DEV fixtures.
 */

import type { CatalogService } from "@/catalog/service";
import type {
  CategoryRow,
  CollectionRow,
  ProductOptionWithValues,
  ProductRow,
  VariantPriceRow,
  VariantRow,
} from "@/catalog/repository";
import {
  buildCategoryInput,
  buildCollectionInput,
  buildCompareAtPrices,
  buildDefaultVariantInput,
  buildInactiveVariantInput,
  buildPrice,
  buildProductInput,
  type BuilderCategoryInput,
  type BuilderCollectionInput,
  type BuilderPrice,
  type BuilderProductInput,
  type BuilderVariantInput,
} from "./catalog-builders";

export type CatalogFactoryContext = {
  service: CatalogService;
};

export async function createTestCategory(
  ctx: CatalogFactoryContext,
  overrides: Partial<BuilderCategoryInput> = {},
): Promise<CategoryRow> {
  return ctx.service.createCategory(buildCategoryInput(overrides));
}

export async function createTestCollection(
  ctx: CatalogFactoryContext,
  overrides: Partial<BuilderCollectionInput> = {},
): Promise<CollectionRow> {
  return ctx.service.createCollection(buildCollectionInput(overrides));
}

export async function createTestProduct(
  ctx: CatalogFactoryContext,
  overrides: Partial<BuilderProductInput> = {},
): Promise<ProductRow> {
  return ctx.service.createProduct(buildProductInput(overrides));
}

export async function createTestDefaultVariantProduct(
  ctx: CatalogFactoryContext,
  overrides: {
    product?: Partial<BuilderProductInput>;
    variant?: Partial<BuilderVariantInput>;
  } = {},
): Promise<{
  product: ProductRow;
  variant: VariantRow;
  prices: VariantPriceRow[];
}> {
  const product = await createTestProduct(ctx, overrides.product);
  const created = await ctx.service.createVariant(
    product.id,
    buildDefaultVariantInput(overrides.variant),
  );
  return { product, variant: created.variant, prices: created.prices };
}

export async function createTestOptionProduct(
  ctx: CatalogFactoryContext,
  overrides: {
    product?: Partial<BuilderProductInput>;
    options?: Array<{
      name: string;
      position?: number;
      values: Array<{ value: string; position?: number }>;
    }>;
  } = {},
): Promise<{ product: ProductRow; options: ProductOptionWithValues[] }> {
  const product = await createTestProduct(ctx, overrides.product);
  const options = await ctx.service.defineProductOptions(product.id, {
    options: overrides.options ?? [
      {
        name: "Size",
        position: 0,
        values: [
          { value: "S", position: 0 },
          { value: "M", position: 1 },
        ],
      },
    ],
  });
  return { product, options };
}

export async function createTestActiveVariant(
  ctx: CatalogFactoryContext,
  productId: string,
  overrides: Partial<BuilderVariantInput> = {},
): Promise<{ variant: VariantRow; prices: VariantPriceRow[] }> {
  return ctx.service.createVariant(productId, buildDefaultVariantInput(overrides));
}

export async function createTestInactiveVariant(
  ctx: CatalogFactoryContext,
  productId: string,
  overrides: Partial<BuilderVariantInput> = {},
): Promise<{ variant: VariantRow; prices: VariantPriceRow[] }> {
  return ctx.service.createVariant(productId, buildInactiveVariantInput(overrides));
}

export async function setTestVariantPrices(
  ctx: CatalogFactoryContext,
  variantId: string,
  prices: BuilderPrice[] = [buildPrice("PHP", 25000), buildPrice("USD", 2500)],
): Promise<VariantPriceRow[]> {
  return ctx.service.setVariantPrices(variantId, { prices });
}

export async function setTestCompareAtPrices(
  ctx: CatalogFactoryContext,
  variantId: string,
): Promise<VariantPriceRow[]> {
  return setTestVariantPrices(ctx, variantId, buildCompareAtPrices());
}

export async function assignTestPrimaryCategory(
  ctx: CatalogFactoryContext,
  productId: string,
  categoryId: string,
  extras: Array<{ categoryId: string; position?: number }> = [],
): Promise<void> {
  await ctx.service.replaceProductCategories(productId, {
    categories: [
      { categoryId, isPrimary: true, position: 0 },
      ...extras.map((item, index) => ({
        categoryId: item.categoryId,
        isPrimary: false,
        position: item.position ?? index + 1,
      })),
    ],
  });
}

export async function assignTestCollections(
  ctx: CatalogFactoryContext,
  productId: string,
  collectionIds: string[],
): Promise<void> {
  await ctx.service.replaceProductCollections(productId, {
    collections: collectionIds.map((collectionId, index) => ({
      collectionId,
      position: index,
    })),
  });
}
