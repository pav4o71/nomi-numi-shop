/**
 * Phase 4E path-locked TEST DB integration for admin catalog organization.
 */

import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import postgres from "postgres";

import { DrizzleCatalogRepository } from "@/catalog/repository";
import * as schema from "@/db/schema";
import { CatalogDb } from "@/catalog/db";
import { drizzle } from "drizzle-orm/postgres-js";
import { CatalogService } from "@/catalog/service";
import {
  EXPECTED_ROOT,
  PROTECTED_HOST_PORT,
  loadValidatedCredentials,
} from "../../scripts/drizzle-credentials.mjs";

const credentials = loadValidatedCredentials("test");

describe("admin catalog organization integration (local)", () => {
  let sql: ReturnType<typeof postgres>;
  let db: CatalogDb;
  let repo: DrizzleCatalogRepository;
  let service: CatalogService;

  beforeAll(async () => {
    expect(EXPECTED_ROOT).toBe("/home/pav4o71/Projects/nomi-numi-shop");
    expect(credentials.database).toBe("nomi_numi_shop_test");
    expect(credentials.port).toBe(55433);
    expect(String(credentials.port)).not.toBe(PROTECTED_HOST_PORT);

    sql = postgres({
      host: credentials.host,
      port: credentials.port,
      user: credentials.user,
      password: credentials.password,
      database: credentials.database,
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
    });
    db = drizzle(sql, { schema });
    repo = new DrizzleCatalogRepository(db);
    service = new CatalogService(repo);
  });

  afterAll(async () => {
    await sql.end({ timeout: 5 });
  });

  beforeEach(async () => {
    await sql`DELETE FROM product_media`;
    await sql`DELETE FROM variant_prices`;
    await sql`DELETE FROM product_variant_option_values`;
    await sql`DELETE FROM product_option_values`;
    await sql`DELETE FROM product_options`;
    await sql`DELETE FROM product_variants`;
    await sql`DELETE FROM product_categories`;
    await sql`DELETE FROM collection_products`;
    await sql`DELETE FROM products`;
    await sql`DELETE FROM categories`;
    await sql`DELETE FROM collections`;
    await sql`DELETE FROM store_settings`;
  });

  it("can search and assign categories and collections to a product", async () => {
    const product = await service.createProduct({
      title: "Test Product",
      slug: "test-prod",
    });

    const cat1 = await service.createCategory({ name: "Category A", slug: "cat-a" });
    const cat2 = await service.createCategory({ name: "Category B", slug: "cat-b" });
    const col1 = await service.createCollection({ name: "Collection A", slug: "col-a" });

    // 1. Search tests (case insensitive ilike)
    const foundCats = await service.searchCategories("gory A");
    expect(foundCats.length).toBe(1);
    expect(foundCats[0].id).toBe(cat1.id);

    // 2. Assign categories (Cat 2 is primary)
    await service.replaceProductCategories(product.id, {
      categories: [
        { categoryId: cat1.id, isPrimary: false },
        { categoryId: cat2.id, isPrimary: true },
      ],
    });

    const assignedCats = await service.listProductCategories(product.id);
    expect(assignedCats.length).toBe(2);
    const primaryCat = assignedCats.find((c) => c.isPrimary);
    expect(primaryCat!.categoryId).toBe(cat2.id);

    // 3. Assign collections
    await service.replaceProductCollections(product.id, {
      collections: [{ collectionId: col1.id }],
    });

    const assignedCols = await service.listProductCollections(product.id);
    expect(assignedCols.length).toBe(1);
    expect(assignedCols[0].collectionId).toBe(col1.id);

    // 4. Duplicate collection check prevents bad inserts
    await expect(
      service.replaceProductCollections(product.id, {
        collections: [{ collectionId: col1.id }, { collectionId: col1.id }],
      }),
    ).rejects.toMatchObject({
      code: "INVALID_INPUT",
      message: "Duplicate collection assignments are not allowed",
    });
  });
});
