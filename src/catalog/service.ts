/**
 * Phase 3B catalog domain service.
 *
 * Orchestrates validation, lifecycle rules, option-combination uniqueness,
 * and transactional consistency. Independent of React / HTTP / Better Auth.
 */

import type { CatalogExecutor } from "@/catalog/db";
import { conflict, invalidInput, notFound } from "@/catalog/errors";
import type { CatalogMoney } from "@/catalog/money";
import { optionCombinationKey, type OptionSelection } from "@/catalog/option-combination";
import {
  DrizzleCatalogRepository,
  type CategoryRow,
  type CollectionProductRow,
  type CollectionRow,
  type ProductCategoryRow,
  type ProductOptionWithValues,
  type ProductRow,
  type VariantPriceRow,
  type VariantRow,
} from "@/catalog/repository";
import {
  changeProductStatusInputSchema,
  createCategoryInputSchema,
  createCollectionInputSchema,
  createProductInputSchema,
  createVariantInputSchema,
  defineProductOptionsInputSchema,
  parseCatalogInput,
  replaceProductCategoriesInputSchema,
  replaceProductCollectionsInputSchema,
  setPrimaryCategoryInputSchema,
  setVariantPricesInputSchema,
  updateCategoryInputSchema,
  updateCollectionInputSchema,
  updateProductInputSchema,
  updateVariantInputSchema,
  type ProductStatus,
} from "@/catalog/validators";

/**
 * Product status values remain draft | published | archived
 * (docs/STORE_CATALOG.md §4). Phase 2D does not lock a restrictive
 * transition matrix; changeProductStatus accepts any of the three values
 * and keeps published_at / archived_at consistent with the target status.
 * Storefront sellability eligibility is enforced by PublicCatalogReads (Phase 3D).
 */

export class CatalogService {
  constructor(private readonly repo: DrizzleCatalogRepository) {}

  async createCategory(input: unknown): Promise<CategoryRow> {
    const data = parseCatalogInput(createCategoryInputSchema, input, "createCategory");
    return this.repo.transaction(async (tx) => this.repo.insertCategory(tx, data));
  }

  async getCategoryById(id: string): Promise<CategoryRow> {
    const row = await this.repo.transaction(async (tx) => this.repo.getCategoryById(tx, id));
    if (!row) {
      throw notFound(`Category not found: ${id}`);
    }
    return row;
  }

  async getCategoryBySlug(slug: string): Promise<CategoryRow> {
    const row = await this.repo.transaction(async (tx) => this.repo.getCategoryBySlug(tx, slug));
    if (!row) {
      throw notFound(`Category not found for slug: ${slug}`);
    }
    return row;
  }

  async listAllCategories(): Promise<CategoryRow[]> {
    return this.repo.transaction(async (tx) => this.repo.listAllCategories(tx));
  }

  async updateCategory(id: string, input: unknown): Promise<CategoryRow> {
    const data = parseCatalogInput(updateCategoryInputSchema, input, "updateCategory");
    return this.repo.transaction(async (tx) => {
      const existing = await this.repo.getCategoryById(tx, id);
      if (!existing) {
        throw notFound(`Category not found: ${id}`);
      }
      const updated = await this.repo.updateCategory(tx, id, data);
      if (!updated) {
        throw notFound(`Category not found: ${id}`);
      }
      return updated;
    });
  }

  async createCollection(input: unknown): Promise<CollectionRow> {
    const data = parseCatalogInput(createCollectionInputSchema, input, "createCollection");
    if (
      data.publishedFrom != null &&
      data.publishedUntil != null &&
      data.publishedUntil <= data.publishedFrom
    ) {
      throw invalidInput("Collection publishedUntil must be after publishedFrom", [
        {
          path: ["publishedUntil"],
          message: "publishedUntil must be after publishedFrom",
          code: "invalid_publish_window",
        },
      ]);
    }
    return this.repo.transaction(async (tx) => this.repo.insertCollection(tx, data));
  }

  async getCollectionById(id: string): Promise<CollectionRow> {
    const row = await this.repo.transaction(async (tx) => this.repo.getCollectionById(tx, id));
    if (!row) {
      throw notFound(`Collection not found: ${id}`);
    }
    return row;
  }

  async getCollectionBySlug(slug: string): Promise<CollectionRow> {
    const row = await this.repo.transaction(async (tx) => this.repo.getCollectionBySlug(tx, slug));
    if (!row) {
      throw notFound(`Collection not found for slug: ${slug}`);
    }
    return row;
  }

  async updateCollection(id: string, input: unknown): Promise<CollectionRow> {
    const data = parseCatalogInput(updateCollectionInputSchema, input, "updateCollection");
    return this.repo.transaction(async (tx) => {
      const existing = await this.repo.getCollectionById(tx, id);
      if (!existing) {
        throw notFound(`Collection not found: ${id}`);
      }
      const nextFrom =
        data.publishedFrom !== undefined ? data.publishedFrom : existing.publishedFrom;
      const nextUntil =
        data.publishedUntil !== undefined ? data.publishedUntil : existing.publishedUntil;
      if (nextFrom != null && nextUntil != null && nextUntil <= nextFrom) {
        throw invalidInput("Collection publishedUntil must be after publishedFrom", [
          {
            path: ["publishedUntil"],
            message: "publishedUntil must be after publishedFrom",
            code: "invalid_publish_window",
          },
        ]);
      }
      const updated = await this.repo.updateCollection(tx, id, data);
      if (!updated) {
        throw notFound(`Collection not found: ${id}`);
      }
      return updated;
    });
  }

  async createProduct(input: unknown): Promise<ProductRow> {
    const data = parseCatalogInput(createProductInputSchema, input, "createProduct");
    const status = data.status ?? "draft";
    return this.repo.transaction(async (tx) =>
      this.repo.insertProduct(tx, {
        ...data,
        status,
        publishedAt: status === "published" ? new Date() : null,
        archivedAt: status === "archived" ? new Date() : null,
      }),
    );
  }

  async listAllProducts(): Promise<ProductRow[]> {
    return this.repo.transaction(async (tx) => this.repo.listAllProducts(tx));
  }

  async getProductById(id: string): Promise<ProductRow> {
    const row = await this.repo.transaction(async (tx) => this.repo.getProductById(tx, id));
    if (!row) {
      throw notFound(`Product not found: ${id}`);
    }
    return row;
  }

  async getProductBySlug(slug: string): Promise<ProductRow> {
    const row = await this.repo.transaction(async (tx) => this.repo.getProductBySlug(tx, slug));
    if (!row) {
      throw notFound(`Product not found for slug: ${slug}`);
    }
    return row;
  }

  async updateProduct(id: string, input: unknown): Promise<ProductRow> {
    const data = parseCatalogInput(updateProductInputSchema, input, "updateProduct");
    return this.repo.transaction(async (tx) => {
      const existing = await this.repo.getProductById(tx, id);
      if (!existing) {
        throw notFound(`Product not found: ${id}`);
      }
      const updated = await this.repo.updateProduct(tx, id, data);
      if (!updated) {
        throw notFound(`Product not found: ${id}`);
      }
      return updated;
    });
  }

  async changeProductStatus(id: string, input: unknown): Promise<ProductRow> {
    const data = parseCatalogInput(changeProductStatusInputSchema, input, "changeProductStatus");
    return this.repo.transaction(async (tx) => {
      const existing = await this.repo.lockProduct(tx, id);
      if (!existing) {
        throw notFound(`Product not found: ${id}`);
      }

      const next = data.status;
      if (existing.status === next) {
        return existing;
      }

      const patch: {
        status: ProductStatus;
        publishedAt?: Date | null;
        archivedAt?: Date | null;
      } = { status: next };

      if (next === "published") {
        patch.archivedAt = null;
        patch.publishedAt = existing.publishedAt ?? new Date();
      } else if (next === "archived") {
        patch.archivedAt = existing.archivedAt ?? new Date();
      } else {
        // draft — clear archival marker; preserve historical publishedAt
        patch.archivedAt = null;
      }

      const updated = await this.repo.updateProduct(tx, id, patch);
      if (!updated) {
        throw notFound(`Product not found: ${id}`);
      }
      return updated;
    });
  }

  async defineProductOptions(
    productId: string,
    input: unknown,
  ): Promise<ProductOptionWithValues[]> {
    const data = parseCatalogInput(defineProductOptionsInputSchema, input, "defineProductOptions");
    return this.repo.transaction(async (tx) => {
      const product = await this.repo.lockProduct(tx, productId);
      if (!product) {
        throw notFound(`Product not found: ${productId}`);
      }

      // Structural option replacement would cascade-clear variant option
      // links and leave variants incomplete. Refuse when any variants exist.
      const variantCount = await this.repo.countVariantsForProduct(tx, productId);
      if (variantCount > 0) {
        throw conflict("Cannot redefine product options while variants exist for this product", [
          {
            path: ["options"],
            message: "defineProductOptions is only allowed when the product has no variants",
            code: "options_locked_by_variants",
          },
        ]);
      }

      const names = data.options.map((option) => option.name.toLowerCase());
      if (new Set(names).size !== names.length) {
        throw invalidInput("Duplicate option names on the same product are not allowed", [
          {
            path: ["options"],
            message: "Option names must be unique per product",
            code: "duplicate_option_name",
          },
        ]);
      }

      for (const [index, option] of data.options.entries()) {
        const values = option.values.map((value) => value.value.toLowerCase());
        if (new Set(values).size !== values.length) {
          throw invalidInput("Duplicate option values on the same option are not allowed", [
            {
              path: ["options", index, "values"],
              message: "Option values must be unique per option",
              code: "duplicate_option_value",
            },
          ]);
        }
      }

      return this.repo.replaceProductOptions(tx, productId, data.options);
    });
  }

  async createVariant(
    productId: string,
    input: unknown,
  ): Promise<{ variant: VariantRow; prices: VariantPriceRow[] }> {
    const data = parseCatalogInput(createVariantInputSchema, input, "createVariant");
    return this.repo.transaction(async (tx) => {
      const product = await this.repo.lockProduct(tx, productId);
      if (!product) {
        throw notFound(`Product not found: ${productId}`);
      }

      const options = await this.repo.listProductOptionsWithValues(tx, productId);
      const selections = data.optionSelections ?? [];
      this.assertValidOptionSelections(options, selections);

      const isActive = data.isActive ?? true;
      if (isActive) {
        await this.assertNoDuplicateActiveCombination(tx, productId, selections);
      }

      const variant = await this.repo.insertVariant(tx, {
        productId,
        sku: data.sku,
        isActive,
        weightGrams: data.weightGrams,
        lengthMm: data.lengthMm,
        widthMm: data.widthMm,
        heightMm: data.heightMm,
        fulfillmentHint: data.fulfillmentHint,
      });

      await this.repo.replaceVariantOptionSelections(tx, {
        productId,
        variantId: variant.id,
        selections,
      });

      const prices = data.prices
        ? await this.repo.replaceVariantPrices(tx, variant.id, this.dedupePrices(data.prices))
        : [];

      return { variant, prices };
    });
  }

  async updateVariant(variantId: string, input: unknown): Promise<VariantRow> {
    const data = parseCatalogInput(updateVariantInputSchema, input, "updateVariant");
    return this.repo.transaction(async (tx) => {
      const existing = await this.repo.getVariantById(tx, variantId);
      if (!existing) {
        throw notFound(`Variant not found: ${variantId}`);
      }

      const product = await this.repo.lockProduct(tx, existing.productId);
      if (!product) {
        throw notFound(`Product not found: ${existing.productId}`);
      }

      const options = await this.repo.listProductOptionsWithValues(tx, existing.productId);
      const nextSelections =
        data.optionSelections ?? (await this.repo.listVariantSelections(tx, variantId));
      this.assertValidOptionSelections(options, nextSelections);

      const nextActive = data.isActive ?? existing.isActive;
      if (nextActive) {
        await this.assertNoDuplicateActiveCombination(
          tx,
          existing.productId,
          nextSelections,
          variantId,
        );
      }

      const updated = await this.repo.updateVariant(tx, variantId, {
        sku: data.sku,
        isActive: data.isActive,
        weightGrams: data.weightGrams,
        lengthMm: data.lengthMm,
        widthMm: data.widthMm,
        heightMm: data.heightMm,
        fulfillmentHint: data.fulfillmentHint,
      });

      if (!updated) {
        throw notFound(`Variant not found: ${variantId}`);
      }

      if (data.optionSelections !== undefined) {
        await this.repo.replaceVariantOptionSelections(tx, {
          productId: existing.productId,
          variantId,
          selections: data.optionSelections,
        });
      }

      return updated;
    });
  }

  async setVariantPrices(variantId: string, input: unknown): Promise<VariantPriceRow[]> {
    const data = parseCatalogInput(setVariantPricesInputSchema, input, "setVariantPrices");
    return this.repo.transaction(async (tx) => {
      const variant = await this.repo.getVariantById(tx, variantId);
      if (!variant) {
        throw notFound(`Variant not found: ${variantId}`);
      }
      await this.repo.lockProduct(tx, variant.productId);
      return this.repo.replaceVariantPrices(tx, variantId, this.dedupePrices(data.prices));
    });
  }

  async getVariantBySku(sku: string): Promise<VariantRow> {
    const row = await this.repo.transaction(async (tx) => this.repo.getVariantBySku(tx, sku));
    if (!row) {
      throw notFound(`Variant not found for SKU: ${sku}`);
    }
    return row;
  }

  async getProductOptions(productId: string): Promise<ProductOptionWithValues[]> {
    return this.repo.transaction(async (tx) => {
      const product = await this.repo.getProductById(tx, productId);
      if (!product) throw notFound(`Product not found: ${productId}`);
      return this.repo.listProductOptionsWithValues(tx, productId);
    });
  }

  async listVariantsForProduct(productId: string): Promise<VariantRow[]> {
    return this.repo.transaction(async (tx) => {
      return this.repo.listVariantsForProduct(tx, productId);
    });
  }

  async listVariantDetailsForProduct(productId: string) {
    return this.repo.transaction(async (tx) => {
      const product = await this.repo.getProductById(tx, productId);
      if (!product) throw notFound(`Product not found: ${productId}`);
      const variants = await this.repo.listVariantsForProduct(tx, productId);
      return Promise.all(
        variants.map(async (v) => {
          const prices = await this.repo.listVariantPrices(tx, v.id);
          const optionSelections = await this.repo.listVariantSelections(tx, v.id);
          return { ...v, prices, optionSelections };
        }),
      );
    });
  }

  async getVariantDetails(variantId: string) {
    return this.repo.transaction(async (tx) => {
      const variant = await this.repo.getVariantById(tx, variantId);
      if (!variant) throw notFound(`Variant not found: ${variantId}`);
      const prices = await this.repo.listVariantPrices(tx, variantId);
      const optionSelections = await this.repo.listVariantSelections(tx, variantId);
      return { ...variant, prices, optionSelections };
    });
  }

  async listVariantPrices(variantId: string): Promise<VariantPriceRow[]> {
    return this.repo.transaction(async (tx) => {
      const variant = await this.repo.getVariantById(tx, variantId);
      if (!variant) {
        throw notFound(`Variant not found: ${variantId}`);
      }
      return this.repo.listVariantPrices(tx, variantId);
    });
  }

  async listAllCollections(): Promise<CollectionRow[]> {
    return this.repo.transaction(async (tx) => {
      return this.repo.listAllCollections(tx);
    });
  }

  async listProductCollections(productId: string): Promise<CollectionProductRow[]> {
    return this.repo.transaction(async (tx) => {
      const product = await this.repo.getProductById(tx, productId);
      if (!product) {
        throw notFound(`Product not found: ${productId}`);
      }
      return this.repo.listProductCollections(tx, productId);
    });
  }

  async replaceProductCategories(productId: string, input: unknown): Promise<ProductCategoryRow[]> {
    const data = parseCatalogInput(
      replaceProductCategoriesInputSchema,
      input,
      "replaceProductCategories",
    );
    return this.repo.transaction(async (tx) => {
      const product = await this.repo.lockProduct(tx, productId);
      if (!product) {
        throw notFound(`Product not found: ${productId}`);
      }

      for (const assignment of data.categories) {
        const category = await this.repo.getCategoryById(tx, assignment.categoryId);
        if (!category) {
          throw notFound(`Category not found: ${assignment.categoryId}`);
        }
      }

      return this.repo.replaceProductCategories(
        tx,
        productId,
        data.categories.map((assignment, index) => ({
          categoryId: assignment.categoryId,
          isPrimary: assignment.isPrimary === true,
          position: assignment.position ?? index,
        })),
      );
    });
  }

  async setPrimaryCategory(productId: string, input: unknown): Promise<ProductCategoryRow[]> {
    const data = parseCatalogInput(setPrimaryCategoryInputSchema, input, "setPrimaryCategory");
    return this.repo.transaction(async (tx) => {
      const product = await this.repo.lockProduct(tx, productId);
      if (!product) {
        throw notFound(`Product not found: ${productId}`);
      }

      const existing = await this.repo.listProductCategories(tx, productId);
      if (!existing.some((row) => row.categoryId === data.categoryId)) {
        throw invalidInput("Category is not assigned to this product", [
          {
            path: ["categoryId"],
            message: "Category must already be linked before it can be primary",
            code: "category_not_assigned",
          },
        ]);
      }

      return this.repo.setPrimaryCategory(tx, productId, data.categoryId);
    });
  }

  async replaceProductCollections(productId: string, input: unknown): Promise<void> {
    const data = parseCatalogInput(
      replaceProductCollectionsInputSchema,
      input,
      "replaceProductCollections",
    );
    return this.repo.transaction(async (tx) => {
      const product = await this.repo.lockProduct(tx, productId);
      if (!product) {
        throw notFound(`Product not found: ${productId}`);
      }

      for (const assignment of data.collections) {
        const collection = await this.repo.getCollectionById(tx, assignment.collectionId);
        if (!collection) {
          throw notFound(`Collection not found: ${assignment.collectionId}`);
        }
      }

      const ids = data.collections.map((item) => item.collectionId);
      if (new Set(ids).size !== ids.length) {
        throw invalidInput("Duplicate collection assignments are not allowed", [
          {
            path: ["collections"],
            message: "Duplicate collection assignments are not allowed",
            code: "duplicate_collection",
          },
        ]);
      }

      await this.repo.replaceProductCollections(
        tx,
        productId,
        data.collections.map((assignment, index) => ({
          collectionId: assignment.collectionId,
          position: assignment.position ?? index,
        })),
      );
    });
  }

  private dedupePrices(prices: CatalogMoney[]): CatalogMoney[] {
    const seen = new Set<string>();
    for (const price of prices) {
      if (seen.has(price.currency)) {
        throw invalidInput("Duplicate currency in price list", [
          {
            path: ["prices"],
            message: `Currency ${price.currency} appears more than once`,
            code: "duplicate_currency",
          },
        ]);
      }
      seen.add(price.currency);
    }
    return prices;
  }

  private assertValidOptionSelections(
    options: ProductOptionWithValues[],
    selections: OptionSelection[],
  ): void {
    if (options.length === 0) {
      if (selections.length > 0) {
        throw invalidInput("Product has no options; variant must not select option values", [
          {
            path: ["optionSelections"],
            message: "Option selections are not allowed when the product defines no options",
            code: "unexpected_option_selection",
          },
        ]);
      }
      return;
    }

    if (selections.length !== options.length) {
      throw invalidInput("Variant option selection is incomplete", [
        {
          path: ["optionSelections"],
          message: "Exactly one value must be selected for every product option",
          code: "incomplete_option_selection",
        },
      ]);
    }

    const selectedOptionIds = selections.map((selection) => selection.optionId);
    if (new Set(selectedOptionIds).size !== selectedOptionIds.length) {
      throw invalidInput("An option may be selected at most once", [
        {
          path: ["optionSelections"],
          message: "Duplicate option selections are not allowed",
          code: "duplicate_option_selection",
        },
      ]);
    }

    const optionById = new Map(options.map((option) => [option.id, option]));
    for (const selection of selections) {
      const option = optionById.get(selection.optionId);
      if (!option) {
        throw invalidInput("Selected option does not belong to this product", [
          {
            path: ["optionSelections"],
            message: `Unknown optionId ${selection.optionId} for this product`,
            code: "option_not_on_product",
          },
        ]);
      }
      const value = option.values.find((item) => item.id === selection.optionValueId);
      if (!value) {
        throw invalidInput("Selected option value does not belong to the declared option", [
          {
            path: ["optionSelections"],
            message: `optionValueId ${selection.optionValueId} is not a value of option ${selection.optionId}`,
            code: "option_value_not_on_option",
          },
        ]);
      }
    }
  }

  private async assertNoDuplicateActiveCombination(
    executor: CatalogExecutor,
    productId: string,
    selections: OptionSelection[],
    excludeVariantId?: string,
  ): Promise<void> {
    const key = optionCombinationKey(selections);
    const active = await this.repo.listActiveVariantCombinations(
      executor,
      productId,
      excludeVariantId,
    );
    for (const candidate of active) {
      if (optionCombinationKey(candidate.selections) === key) {
        throw conflict("An active variant with this option combination already exists", [
          {
            path: ["optionSelections"],
            message: "Duplicate active option combination for this product",
            code: "duplicate_active_combination",
          },
        ]);
      }
    }
  }
}
