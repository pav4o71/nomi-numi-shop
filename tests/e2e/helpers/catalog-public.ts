/**
 * Playwright helpers for Phase 3D public catalog smoke against DEV Postgres.
 */
import { randomUUID } from "node:crypto";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { CatalogService, DrizzleCatalogRepository } from "@/catalog";
import * as schema from "@/db/schema";
import { loadValidatedCredentials } from "../../../scripts/drizzle-credentials.mjs";

export function shouldRunCatalogPublicE2E(): boolean {
  return !process.env.CI;
}

export type CatalogPublicSmokeIds = {
  productSlug: string;
  categorySlug: string;
  collectionSlug: string;
  draftSlug: string;
};

function openDevSql() {
  const credentials = loadValidatedCredentials("dev");
  if (credentials.database !== "nomi_numi_shop_dev" || credentials.port !== 55432) {
    throw new Error("Catalog public E2E refused non-DEV database target");
  }
  return postgres({
    host: credentials.host,
    port: credentials.port,
    database: credentials.database,
    username: credentials.user,
    password: credentials.password,
    max: 1,
    idle_timeout: 5,
    connect_timeout: 10,
    prepare: false,
  });
}

export async function seedCatalogPublicSmoke(): Promise<CatalogPublicSmokeIds> {
  const suffix = randomUUID().slice(0, 8);
  const productSlug = `e2e-pub-product-${suffix}`;
  const categorySlug = `e2e-pub-category-${suffix}`;
  const collectionSlug = `e2e-pub-collection-${suffix}`;
  const draftSlug = `e2e-pub-draft-${suffix}`;

  const sql = openDevSql();
  try {
    const db = drizzle(sql, { schema });
    const service = new CatalogService(new DrizzleCatalogRepository(db));

    const category = await service.createCategory({
      slug: categorySlug,
      name: `E2E Category ${suffix}`,
      published: true,
      position: 0,
    });
    const collection = await service.createCollection({
      slug: collectionSlug,
      name: `E2E Collection ${suffix}`,
      published: true,
      position: 0,
    });
    const product = await service.createProduct({
      slug: productSlug,
      title: `E2E Product ${suffix}`,
      description: "Phase 3D public catalog smoke product",
      status: "published",
      position: 0,
    });
    await service.createVariant(product.id, {
      sku: `E2E-SKU-${suffix}`,
      isActive: true,
      prices: [
        { currency: "USD", amountMinor: 2499 },
        { currency: "PHP", amountMinor: 99900 },
      ],
    });
    await service.replaceProductCategories(product.id, {
      categories: [{ categoryId: category.id, isPrimary: true, position: 0 }],
    });
    await service.replaceProductCollections(product.id, {
      collections: [{ collectionId: collection.id, position: 0 }],
    });

    await service.createProduct({
      slug: draftSlug,
      title: `E2E Draft ${suffix}`,
      status: "draft",
    });

    return { productSlug, categorySlug, collectionSlug, draftSlug };
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function cleanupCatalogPublicSmoke(ids: CatalogPublicSmokeIds): Promise<void> {
  const sql = openDevSql();
  try {
    const products = await sql<{ id: string }[]>`
      SELECT id FROM products WHERE slug IN (${ids.productSlug}, ${ids.draftSlug})
    `;
    const productIds = products.map((row) => row.id);
    if (productIds.length > 0) {
      await sql`DELETE FROM product_categories WHERE product_id IN ${sql(productIds)}`;
      await sql`DELETE FROM collection_products WHERE product_id IN ${sql(productIds)}`;
      await sql`DELETE FROM variant_prices WHERE variant_id IN (
        SELECT id FROM product_variants WHERE product_id IN ${sql(productIds)}
      )`;
      await sql`DELETE FROM product_variant_option_values WHERE product_id IN ${sql(productIds)}`;
      await sql`DELETE FROM product_option_values WHERE option_id IN (
        SELECT id FROM product_options WHERE product_id IN ${sql(productIds)}
      )`;
      await sql`DELETE FROM product_options WHERE product_id IN ${sql(productIds)}`;
      await sql`DELETE FROM product_variants WHERE product_id IN ${sql(productIds)}`;
      await sql`DELETE FROM products WHERE id IN ${sql(productIds)}`;
    }
    await sql`DELETE FROM categories WHERE slug = ${ids.categorySlug}`;
    await sql`DELETE FROM collections WHERE slug = ${ids.collectionSlug}`;
  } finally {
    await sql.end({ timeout: 5 });
  }
}
