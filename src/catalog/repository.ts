/**
 * Phase 3B Drizzle catalog repository — persistence and queries only.
 * Domain rules / validation / lifecycle live in CatalogService.
 */

import { and, asc, eq, inArray, ne } from "drizzle-orm";

import type { CatalogDb, CatalogExecutor, CatalogTx } from "@/catalog/db";
import { createCatalogId } from "@/catalog/ids";
import type { CatalogMoney } from "@/catalog/money";
import type { OptionSelection } from "@/catalog/option-combination";
import { withUniqueConflictMapping } from "@/catalog/pg-errors";
import type { ProductStatus } from "@/catalog/validators";
import {
  categories,
  collectionProducts,
  collections,
  productCategories,
  productOptionValues,
  productOptions,
  productVariantOptionValues,
  productVariants,
  products,
  variantPrices,
} from "@/db/schema";

export type ProductRow = typeof products.$inferSelect;
export type CategoryRow = typeof categories.$inferSelect;
export type CollectionRow = typeof collections.$inferSelect;
export type VariantRow = typeof productVariants.$inferSelect;
export type ProductOptionRow = typeof productOptions.$inferSelect;
export type ProductOptionValueRow = typeof productOptionValues.$inferSelect;
export type VariantPriceRow = typeof variantPrices.$inferSelect;
export type ProductCategoryRow = typeof productCategories.$inferSelect;
export type CollectionProductRow = typeof collectionProducts.$inferSelect;

export type ProductOptionWithValues = ProductOptionRow & {
  values: ProductOptionValueRow[];
};

export type ActiveVariantCombination = {
  variantId: string;
  selections: OptionSelection[];
};

export class DrizzleCatalogRepository {
  constructor(private readonly db: CatalogDb) {}

  async transaction<T>(fn: (tx: CatalogTx) => Promise<T>): Promise<T> {
    return withUniqueConflictMapping(() => this.db.transaction(fn));
  }

  async lockProduct(executor: CatalogExecutor, productId: string): Promise<ProductRow | null> {
    const rows = await executor
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .for("update");
    return rows[0] ?? null;
  }

  async insertCategory(
    executor: CatalogExecutor,
    values: {
      slug: string;
      name: string;
      description?: string | null;
      position?: number;
      published?: boolean;
    },
  ): Promise<CategoryRow> {
    return withUniqueConflictMapping(async () => {
      const id = createCatalogId("cat");
      const [row] = await executor
        .insert(categories)
        .values({
          id,
          slug: values.slug,
          name: values.name,
          description: values.description ?? null,
          position: values.position ?? 0,
          published: values.published ?? false,
        })
        .returning();
      return row;
    });
  }

  async getCategoryById(executor: CatalogExecutor, id: string): Promise<CategoryRow | null> {
    const rows = await executor.select().from(categories).where(eq(categories.id, id)).limit(1);
    return rows[0] ?? null;
  }

  async getCategoryBySlug(executor: CatalogExecutor, slug: string): Promise<CategoryRow | null> {
    const rows = await executor.select().from(categories).where(eq(categories.slug, slug)).limit(1);
    return rows[0] ?? null;
  }

  async updateCategory(
    executor: CatalogExecutor,
    id: string,
    values: Partial<{
      slug: string;
      name: string;
      description: string | null;
      position: number;
      published: boolean;
      archivedAt: Date | null;
    }>,
  ): Promise<CategoryRow | null> {
    return withUniqueConflictMapping(async () => {
      const [row] = await executor
        .update(categories)
        .set(values)
        .where(eq(categories.id, id))
        .returning();
      return row ?? null;
    });
  }

  async insertCollection(
    executor: CatalogExecutor,
    values: {
      slug: string;
      name: string;
      description?: string | null;
      position?: number;
      published?: boolean;
      publishedFrom?: Date | null;
      publishedUntil?: Date | null;
    },
  ): Promise<CollectionRow> {
    return withUniqueConflictMapping(async () => {
      const id = createCatalogId("col");
      const [row] = await executor
        .insert(collections)
        .values({
          id,
          slug: values.slug,
          name: values.name,
          description: values.description ?? null,
          position: values.position ?? 0,
          published: values.published ?? false,
          publishedFrom: values.publishedFrom ?? null,
          publishedUntil: values.publishedUntil ?? null,
        })
        .returning();
      return row;
    });
  }

  async getCollectionById(executor: CatalogExecutor, id: string): Promise<CollectionRow | null> {
    const rows = await executor.select().from(collections).where(eq(collections.id, id)).limit(1);
    return rows[0] ?? null;
  }

  async getCollectionBySlug(
    executor: CatalogExecutor,
    slug: string,
  ): Promise<CollectionRow | null> {
    const rows = await executor
      .select()
      .from(collections)
      .where(eq(collections.slug, slug))
      .limit(1);
    return rows[0] ?? null;
  }

  async updateCollection(
    executor: CatalogExecutor,
    id: string,
    values: Partial<{
      slug: string;
      name: string;
      description: string | null;
      position: number;
      published: boolean;
      publishedFrom: Date | null;
      publishedUntil: Date | null;
      archivedAt: Date | null;
    }>,
  ): Promise<CollectionRow | null> {
    return withUniqueConflictMapping(async () => {
      const [row] = await executor
        .update(collections)
        .set(values)
        .where(eq(collections.id, id))
        .returning();
      return row ?? null;
    });
  }

  async insertProduct(
    executor: CatalogExecutor,
    values: {
      slug: string;
      title: string;
      description?: string | null;
      status?: ProductStatus;
      position?: number;
      seoTitle?: string | null;
      seoDescription?: string | null;
      publishedAt?: Date | null;
      archivedAt?: Date | null;
    },
  ): Promise<ProductRow> {
    return withUniqueConflictMapping(async () => {
      const id = createCatalogId("prod");
      const status = values.status ?? "draft";
      const [row] = await executor
        .insert(products)
        .values({
          id,
          slug: values.slug,
          title: values.title,
          description: values.description ?? null,
          status,
          position: values.position ?? 0,
          seoTitle: values.seoTitle ?? null,
          seoDescription: values.seoDescription ?? null,
          publishedAt: values.publishedAt ?? (status === "published" ? new Date() : null),
          archivedAt: values.archivedAt ?? (status === "archived" ? new Date() : null),
        })
        .returning();
      return row;
    });
  }

  async getProductById(executor: CatalogExecutor, id: string): Promise<ProductRow | null> {
    const rows = await executor.select().from(products).where(eq(products.id, id)).limit(1);
    return rows[0] ?? null;
  }

  async getProductBySlug(executor: CatalogExecutor, slug: string): Promise<ProductRow | null> {
    const rows = await executor.select().from(products).where(eq(products.slug, slug)).limit(1);
    return rows[0] ?? null;
  }

  async updateProduct(
    executor: CatalogExecutor,
    id: string,
    values: Partial<{
      slug: string;
      title: string;
      description: string | null;
      status: ProductStatus;
      position: number;
      seoTitle: string | null;
      seoDescription: string | null;
      publishedAt: Date | null;
      archivedAt: Date | null;
    }>,
  ): Promise<ProductRow | null> {
    return withUniqueConflictMapping(async () => {
      const [row] = await executor
        .update(products)
        .set(values)
        .where(eq(products.id, id))
        .returning();
      return row ?? null;
    });
  }

  async listProductOptionsWithValues(
    executor: CatalogExecutor,
    productId: string,
  ): Promise<ProductOptionWithValues[]> {
    const optionRows = await executor
      .select()
      .from(productOptions)
      .where(eq(productOptions.productId, productId))
      .orderBy(asc(productOptions.position), asc(productOptions.name));

    if (optionRows.length === 0) {
      return [];
    }

    const optionIds = optionRows.map((row) => row.id);
    const valueRows = await executor
      .select()
      .from(productOptionValues)
      .where(inArray(productOptionValues.optionId, optionIds))
      .orderBy(asc(productOptionValues.position), asc(productOptionValues.value));

    return optionRows.map((option) => ({
      ...option,
      values: valueRows.filter((value) => value.optionId === option.id),
    }));
  }

  async replaceProductOptions(
    executor: CatalogExecutor,
    productId: string,
    definitions: Array<{
      name: string;
      position?: number;
      values: Array<{ value: string; position?: number }>;
    }>,
  ): Promise<ProductOptionWithValues[]> {
    return withUniqueConflictMapping(async () => {
      await executor.delete(productOptions).where(eq(productOptions.productId, productId));

      const created: ProductOptionWithValues[] = [];
      for (const [optionIndex, definition] of definitions.entries()) {
        const optionId = createCatalogId("opt");
        const [option] = await executor
          .insert(productOptions)
          .values({
            id: optionId,
            productId,
            name: definition.name,
            position: definition.position ?? optionIndex,
          })
          .returning();

        const values: ProductOptionValueRow[] = [];
        for (const [valueIndex, valueDef] of definition.values.entries()) {
          const [valueRow] = await executor
            .insert(productOptionValues)
            .values({
              id: createCatalogId("oval"),
              optionId,
              value: valueDef.value,
              position: valueDef.position ?? valueIndex,
            })
            .returning();
          values.push(valueRow);
        }
        created.push({ ...option, values });
      }
      return created;
    });
  }

  async insertVariant(
    executor: CatalogExecutor,
    values: {
      productId: string;
      sku: string;
      isActive?: boolean;
      weightGrams?: number | null;
      lengthMm?: number | null;
      widthMm?: number | null;
      heightMm?: number | null;
      fulfillmentHint?: string | null;
    },
  ): Promise<VariantRow> {
    return withUniqueConflictMapping(async () => {
      const id = createCatalogId("var");
      const [row] = await executor
        .insert(productVariants)
        .values({
          id,
          productId: values.productId,
          sku: values.sku,
          isActive: values.isActive ?? true,
          weightGrams: values.weightGrams ?? null,
          lengthMm: values.lengthMm ?? null,
          widthMm: values.widthMm ?? null,
          heightMm: values.heightMm ?? null,
          fulfillmentHint: values.fulfillmentHint ?? null,
        })
        .returning();
      return row;
    });
  }

  async getVariantById(executor: CatalogExecutor, id: string): Promise<VariantRow | null> {
    const rows = await executor
      .select()
      .from(productVariants)
      .where(eq(productVariants.id, id))
      .limit(1);
    return rows[0] ?? null;
  }

  async getVariantBySku(executor: CatalogExecutor, sku: string): Promise<VariantRow | null> {
    const rows = await executor
      .select()
      .from(productVariants)
      .where(eq(productVariants.sku, sku))
      .limit(1);
    return rows[0] ?? null;
  }

  async listVariantsForProduct(
    executor: CatalogExecutor,
    productId: string,
  ): Promise<VariantRow[]> {
    return executor
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, productId))
      .orderBy(asc(productVariants.sku));
  }

  async countVariantsForProduct(executor: CatalogExecutor, productId: string): Promise<number> {
    const rows = await executor
      .select({ id: productVariants.id })
      .from(productVariants)
      .where(eq(productVariants.productId, productId));
    return rows.length;
  }

  async listVariantPrices(
    executor: CatalogExecutor,
    variantId: string,
  ): Promise<VariantPriceRow[]> {
    return executor
      .select()
      .from(variantPrices)
      .where(eq(variantPrices.variantId, variantId))
      .orderBy(asc(variantPrices.currency));
  }

  async updateVariant(
    executor: CatalogExecutor,
    id: string,
    values: Partial<{
      sku: string;
      isActive: boolean;
      weightGrams: number | null;
      lengthMm: number | null;
      widthMm: number | null;
      heightMm: number | null;
      fulfillmentHint: string | null;
    }>,
  ): Promise<VariantRow | null> {
    return withUniqueConflictMapping(async () => {
      const [row] = await executor
        .update(productVariants)
        .set(values)
        .where(eq(productVariants.id, id))
        .returning();
      return row ?? null;
    });
  }

  async replaceVariantOptionSelections(
    executor: CatalogExecutor,
    args: {
      productId: string;
      variantId: string;
      selections: OptionSelection[];
    },
  ): Promise<void> {
    await executor
      .delete(productVariantOptionValues)
      .where(eq(productVariantOptionValues.variantId, args.variantId));

    if (args.selections.length === 0) {
      return;
    }

    await executor.insert(productVariantOptionValues).values(
      args.selections.map((selection) => ({
        id: createCatalogId("vov"),
        productId: args.productId,
        variantId: args.variantId,
        optionId: selection.optionId,
        optionValueId: selection.optionValueId,
      })),
    );
  }

  async listVariantSelections(
    executor: CatalogExecutor,
    variantId: string,
  ): Promise<OptionSelection[]> {
    const links = await executor
      .select({
        optionId: productVariantOptionValues.optionId,
        optionValueId: productVariantOptionValues.optionValueId,
      })
      .from(productVariantOptionValues)
      .where(eq(productVariantOptionValues.variantId, variantId));

    return links.map((link) => ({
      optionId: link.optionId,
      optionValueId: link.optionValueId,
    }));
  }

  async listActiveVariantCombinations(
    executor: CatalogExecutor,
    productId: string,
    excludeVariantId?: string,
  ): Promise<ActiveVariantCombination[]> {
    const conditions = [
      eq(productVariants.productId, productId),
      eq(productVariants.isActive, true),
    ];
    if (excludeVariantId) {
      conditions.push(ne(productVariants.id, excludeVariantId));
    }

    const activeVariants = await executor
      .select({ id: productVariants.id })
      .from(productVariants)
      .where(and(...conditions));

    if (activeVariants.length === 0) {
      return [];
    }

    const links = await executor
      .select({
        variantId: productVariantOptionValues.variantId,
        optionId: productVariantOptionValues.optionId,
        optionValueId: productVariantOptionValues.optionValueId,
      })
      .from(productVariantOptionValues)
      .where(eq(productVariantOptionValues.productId, productId));

    return activeVariants.map((variant) => ({
      variantId: variant.id,
      selections: links
        .filter((link) => link.variantId === variant.id)
        .map((link) => ({
          optionId: link.optionId,
          optionValueId: link.optionValueId,
        })),
    }));
  }

  async replaceVariantPrices(
    executor: CatalogExecutor,
    variantId: string,
    prices: CatalogMoney[],
  ): Promise<VariantPriceRow[]> {
    return withUniqueConflictMapping(async () => {
      await executor.delete(variantPrices).where(eq(variantPrices.variantId, variantId));
      if (prices.length === 0) {
        return [];
      }
      return executor
        .insert(variantPrices)
        .values(
          prices.map((price) => ({
            id: createCatalogId("price"),
            variantId,
            currency: price.currency,
            amountMinor: price.amountMinor,
            compareAtAmountMinor: price.compareAtAmountMinor,
          })),
        )
        .returning();
    });
  }

  async listProductCategories(
    executor: CatalogExecutor,
    productId: string,
  ): Promise<ProductCategoryRow[]> {
    return executor
      .select()
      .from(productCategories)
      .where(eq(productCategories.productId, productId))
      .orderBy(asc(productCategories.position));
  }

  async replaceProductCategories(
    executor: CatalogExecutor,
    productId: string,
    assignments: Array<{ categoryId: string; isPrimary: boolean; position: number }>,
  ): Promise<ProductCategoryRow[]> {
    await executor.delete(productCategories).where(eq(productCategories.productId, productId));
    if (assignments.length === 0) {
      return [];
    }
    await executor.insert(productCategories).values(
      assignments.map((assignment) => ({
        productId,
        categoryId: assignment.categoryId,
        isPrimary: assignment.isPrimary,
        position: assignment.position,
      })),
    );
    return this.listProductCategories(executor, productId);
  }

  async setPrimaryCategory(
    executor: CatalogExecutor,
    productId: string,
    categoryId: string,
  ): Promise<ProductCategoryRow[]> {
    await executor
      .update(productCategories)
      .set({ isPrimary: false })
      .where(eq(productCategories.productId, productId));

    await executor
      .update(productCategories)
      .set({ isPrimary: true })
      .where(
        and(
          eq(productCategories.productId, productId),
          eq(productCategories.categoryId, categoryId),
        ),
      );

    return this.listProductCategories(executor, productId);
  }

  async listProductCollections(
    executor: CatalogExecutor,
    productId: string,
  ): Promise<CollectionProductRow[]> {
    return executor
      .select()
      .from(collectionProducts)
      .where(eq(collectionProducts.productId, productId))
      .orderBy(asc(collectionProducts.position));
  }

  async replaceProductCollections(
    executor: CatalogExecutor,
    productId: string,
    assignments: Array<{ collectionId: string; position: number }>,
  ): Promise<void> {
    await executor.delete(collectionProducts).where(eq(collectionProducts.productId, productId));
    if (assignments.length === 0) {
      return;
    }
    await executor.insert(collectionProducts).values(
      assignments.map((assignment) => ({
        productId,
        collectionId: assignment.collectionId,
        position: assignment.position,
      })),
    );
  }
}
