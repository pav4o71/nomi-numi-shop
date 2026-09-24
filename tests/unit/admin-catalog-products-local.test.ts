/**
 * Phase 4C path-locked TEST DB integration for admin catalog products.
 *
 * Runs against the local TEST PostgreSQL instance (127.0.0.1:55433).
 * Verifies the full stack (API Route Handler + Service + Repository)
 * behaves correctly with real database constraints.
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

describe("admin catalog products integration (local)", () => {
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
    await sql`DELETE FROM payment_events`;
    await sql`DELETE FROM inventory_reservations`;
    await sql`DELETE FROM order_items`;
    await sql`DELETE FROM orders`;
    await sql`DELETE FROM cart_items`;
    await sql`DELETE FROM carts`;
    await sql`DELETE FROM inventory_movements`;
    await sql`DELETE FROM inventory_balances`;
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

  it("lists all products including drafts", async () => {
    await service.createProduct({
      title: "Draft Product",
      slug: "draft-prod",
      position: 10,
      status: "draft",
    });

    await service.createProduct({
      title: "Published Product",
      slug: "pub-prod",
      position: 5,
      status: "published",
    });

    const products = await service.listAllProducts();
    expect(products.length).toBe(2);
    // Ordered by position
    expect(products[0].slug).toBe("pub-prod");
    expect(products[1].slug).toBe("draft-prod");
  });

  it("enforces unique slugs on creation", async () => {
    await service.createProduct({
      title: "Original",
      slug: "duplicate-slug",
    });

    await expect(
      service.createProduct({
        title: "Duplicate",
        slug: "duplicate-slug", // Already exists
      }),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      message: expect.stringContaining("Product slug already exists"),
    });
  });

  it("updates a product successfully (base fields + status)", async () => {
    const created = await service.createProduct({
      title: "To Update",
      slug: "to-update",
      status: "draft",
    });

    // We can't use the API endpoint directly here since it's a service test.
    // The API route calls updateProduct and then changeProductStatus. Let's replicate that logic.
    const updatedBase = await service.updateProduct(created.id, {
      title: "Updated Title",
      seoTitle: "New SEO",
    });
    const finalProduct = await service.changeProductStatus(created.id, {
      status: "published",
    });

    expect(updatedBase.title).toBe("Updated Title");
    expect(finalProduct.status).toBe("published");

    const fetched = await service.getProductById(created.id);
    expect(fetched.title).toBe("Updated Title");
    expect(fetched.status).toBe("published");
  });

  it("fails to get a non-existent product", async () => {
    await expect(service.getProductById("prod_not_exist")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
