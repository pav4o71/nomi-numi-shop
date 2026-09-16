/**
 * Phase 3D public catalog read/query layer.
 *
 * Server-only. Currency is an explicit CatalogCurrency argument — pages
 * temporarily pass USD; a later resolver may pass PHP or USD.
 */

import type { CatalogExecutor } from "@/catalog/db";
import type { CatalogCurrency } from "@/catalog/money";
import type { OptionSelection } from "@/catalog/option-combination";
import {
  buildListingPrice,
  collectEligibleVariants,
  isCategoryPublic,
  isCollectionPublic,
  isProductPublished,
  selectInitialEligibleVariant,
} from "@/catalog/public/eligibility";
import type {
  PublicCategoryPage,
  PublicCategorySummary,
  PublicCollectionPage,
  PublicCollectionSummary,
  PublicProductDetail,
  PublicProductListingCard,
  PublicProductOption,
  PublicVariant,
} from "@/catalog/public/types";
import {
  DrizzleCatalogRepository,
  type ProductOptionWithValues,
  type ProductRow,
  type VariantPriceRow,
  type VariantRow,
} from "@/catalog/repository";
import { isCatalogError } from "@/catalog/errors";
import { normalizeCatalogSlug } from "@/catalog/slug";

export class PublicCatalogReads {
  constructor(private readonly repo: DrizzleCatalogRepository) {}

  async listPublishedCategories(): Promise<PublicCategorySummary[]> {
    return this.repo.transaction(async (tx) => {
      const rows = await this.repo.listPublishedCategories(tx);
      return rows.map(toCategorySummary);
    });
  }

  async listPublishedCollections(now: Date = new Date()): Promise<PublicCollectionSummary[]> {
    return this.repo.transaction(async (tx) => {
      const rows = await this.repo.listPublishedCollections(tx);
      return rows.filter((row) => isCollectionPublic(row, now)).map(toCollectionSummary);
    });
  }

  async listPublishedProducts(currency: CatalogCurrency): Promise<PublicProductListingCard[]> {
    return this.repo.transaction(async (tx) => {
      const products = await this.repo.listPublishedProducts(tx);
      return this.buildListingCards(tx, products, currency);
    });
  }

  async getPublishedCategoryBySlug(
    slug: string,
    currency: CatalogCurrency,
  ): Promise<PublicCategoryPage | null> {
    const normalized = tryNormalizeSlug(slug);
    if (!normalized) {
      return null;
    }
    return this.repo.transaction(async (tx) => {
      const category = await this.repo.getCategoryBySlug(tx, normalized);
      if (!category || !isCategoryPublic(category)) {
        return null;
      }
      const membership = await this.repo.listProductIdsForCategory(tx, category.id);
      const products = await this.loadPublishedProductsByIds(
        tx,
        membership.map((row) => row.productId),
      );
      const ordered = orderProductsByMembership(
        products,
        membership.map((row) => row.productId),
      );
      const cards = await this.buildListingCards(tx, ordered, currency);
      return { category: toCategorySummary(category), products: cards };
    });
  }

  async getPublishedCollectionBySlug(
    slug: string,
    currency: CatalogCurrency,
    now: Date = new Date(),
  ): Promise<PublicCollectionPage | null> {
    const normalized = tryNormalizeSlug(slug);
    if (!normalized) {
      return null;
    }
    return this.repo.transaction(async (tx) => {
      const collection = await this.repo.getCollectionBySlug(tx, normalized);
      if (!collection || !isCollectionPublic(collection, now)) {
        return null;
      }
      const membership = await this.repo.listProductIdsForCollection(tx, collection.id);
      const products = await this.loadPublishedProductsByIds(
        tx,
        membership.map((row) => row.productId),
      );
      const ordered = orderProductsByMembership(
        products,
        membership.map((row) => row.productId),
      );
      const cards = await this.buildListingCards(tx, ordered, currency);
      return { collection: toCollectionSummary(collection), products: cards };
    });
  }

  async getPublishedProductBySlug(
    slug: string,
    currency: CatalogCurrency,
    now: Date = new Date(),
  ): Promise<PublicProductDetail | null> {
    const normalized = tryNormalizeSlug(slug);
    if (!normalized) {
      return null;
    }
    return this.repo.transaction(async (tx) => {
      const product = await this.repo.getProductBySlug(tx, normalized);
      if (!product || !isProductPublished(product)) {
        return null;
      }

      const variants = await this.repo.listVariantsForProduct(tx, product.id);
      const options = await this.repo.listProductOptionsWithValues(tx, product.id);
      const context = await this.loadVariantContext(tx, variants);
      const eligible = collectEligibleVariants({
        variants,
        pricesByVariantId: context.pricesByVariantId,
        selectionsByVariantId: context.selectionsByVariantId,
        currency,
      });
      const initial = selectInitialEligibleVariant(eligible, options);
      if (!initial) {
        return null;
      }

      const publicVariants: PublicVariant[] = eligible.map((item) => ({
        id: item.variant.id,
        sku: item.variant.sku,
        selections: item.selections,
        price: {
          currency,
          amountMinor: item.price.amountMinor,
          compareAtAmountMinor: item.price.compareAtAmountMinor,
        },
      }));

      const categoryLinks = await this.repo.listProductCategories(tx, product.id);
      const categories = (
        await this.repo.listCategoriesByIds(
          tx,
          categoryLinks.map((link) => link.categoryId),
        )
      )
        .filter(isCategoryPublic)
        .map(toCategorySummary);

      const collectionLinks = await this.repo.listProductCollections(tx, product.id);
      const collections = (
        await this.repo.listCollectionsByIds(
          tx,
          collectionLinks.map((link) => link.collectionId),
        )
      )
        .filter((row) => isCollectionPublic(row, now))
        .map(toCollectionSummary);

      return {
        slug: product.slug,
        title: product.title,
        description: product.description,
        seoTitle: product.seoTitle,
        seoDescription: product.seoDescription,
        options: toPublicOptions(options),
        variants: publicVariants,
        initialVariantId: initial.variant.id,
        categories,
        collections,
      };
    });
  }

  private async loadPublishedProductsByIds(
    tx: CatalogExecutor,
    productIds: string[],
  ): Promise<ProductRow[]> {
    const rows = await this.repo.listProductsByIds(tx, productIds);
    return rows.filter(isProductPublished);
  }

  private async buildListingCards(
    tx: CatalogExecutor,
    products: ProductRow[],
    currency: CatalogCurrency,
  ): Promise<PublicProductListingCard[]> {
    if (products.length === 0) {
      return [];
    }

    const variants = await this.repo.listVariantsForProducts(
      tx,
      products.map((product) => product.id),
    );
    const context = await this.loadVariantContext(tx, variants);
    const variantsByProduct = groupBy(variants, (variant) => variant.productId);

    const options = await this.repo.listProductOptionsWithValuesForProducts(
      tx,
      products.map((product) => product.id),
    );
    const optionsByProduct = groupBy(options, (option) => option.productId);

    const cards: PublicProductListingCard[] = [];
    for (const product of products) {
      const productVariants = variantsByProduct.get(product.id) ?? [];
      const options = optionsByProduct.get(product.id) ?? [];
      const eligible = collectEligibleVariants({
        variants: productVariants,
        pricesByVariantId: context.pricesByVariantId,
        selectionsByVariantId: context.selectionsByVariantId,
        currency,
      });
      const listing = buildListingPrice(eligible, currency, options);
      if (!listing) {
        continue;
      }
      cards.push({
        slug: product.slug,
        title: product.title,
        description: product.description,
        price: listing.price,
        priceDisplayMode: listing.priceDisplayMode,
      });
    }
    return cards;
  }

  private async loadVariantContext(
    tx: CatalogExecutor,
    variants: VariantRow[],
  ): Promise<{
    pricesByVariantId: Map<string, VariantPriceRow[]>;
    selectionsByVariantId: Map<string, OptionSelection[]>;
  }> {
    const variantIds = variants.map((variant) => variant.id);
    const prices = await this.repo.listPricesForVariants(tx, variantIds);
    const selections = await this.repo.listSelectionsForVariants(tx, variantIds);

    const pricesByVariantId = new Map<string, VariantPriceRow[]>();
    for (const price of prices) {
      const list = pricesByVariantId.get(price.variantId) ?? [];
      list.push(price);
      pricesByVariantId.set(price.variantId, list);
    }

    const selectionsByVariantId = new Map<string, OptionSelection[]>();
    for (const selection of selections) {
      const list = selectionsByVariantId.get(selection.variantId) ?? [];
      list.push({
        optionId: selection.optionId,
        optionValueId: selection.optionValueId,
      });
      selectionsByVariantId.set(selection.variantId, list);
    }

    return { pricesByVariantId, selectionsByVariantId };
  }
}

function tryNormalizeSlug(slug: string): string | null {
  try {
    return normalizeCatalogSlug(slug);
  } catch (error) {
    if (isCatalogError(error) && error.code === "INVALID_INPUT") {
      return null;
    }
    throw error;
  }
}

function toCategorySummary(row: {
  slug: string;
  name: string;
  description: string | null;
}): PublicCategorySummary {
  return { slug: row.slug, name: row.name, description: row.description };
}

function toCollectionSummary(row: {
  slug: string;
  name: string;
  description: string | null;
}): PublicCollectionSummary {
  return { slug: row.slug, name: row.name, description: row.description };
}

function toPublicOptions(options: ProductOptionWithValues[]): PublicProductOption[] {
  return [...options]
    .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id))
    .map((option) => ({
      id: option.id,
      name: option.name,
      position: option.position,
      values: [...option.values]
        .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id))
        .map((value) => ({
          id: value.id,
          value: value.value,
          position: value.position,
        })),
    }));
}

function orderProductsByMembership(products: ProductRow[], orderedIds: string[]): ProductRow[] {
  const byId = new Map(products.map((product) => [product.id, product]));
  return orderedIds
    .map((id) => byId.get(id))
    .filter((product): product is ProductRow => product != null);
}

function groupBy<T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return map;
}
