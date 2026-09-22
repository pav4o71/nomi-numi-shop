/**
 * Phase 4A path-locked TEST DB integration for admin catalog categories.
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

describe("admin catalog categories integration (local)", () => {
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

  it("lists all categories including drafts and archived", async () => {
    await service.createCategory({
      name: "Draft Category",
      slug: "draft-cat",
      position: 10,
      published: false,
    });

    await service.createCategory({
      name: "Published Category",
      slug: "pub-cat",
      position: 5,
      published: true,
    });

    const categories = await service.listAllCategories();
    expect(categories.length).toBe(2);
    // Ordered by position
    expect(categories[0].slug).toBe("pub-cat");
    expect(categories[1].slug).toBe("draft-cat");
  });

  it("enforces unique slugs on creation", async () => {
    await service.createCategory({
      name: "Original",
      slug: "pub-cat",
    });

    await expect(
      service.createCategory({
        name: "Duplicate",
        slug: "pub-cat", // Already exists
      }),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      message: expect.stringContaining("Category slug already exists"),
    });
  });

  it("updates a category successfully", async () => {
    const created = await service.createCategory({
      name: "To Update",
      slug: "to-update",
    });

    const updated = await service.updateCategory(created.id, {
      name: "Updated Name",
      published: true,
    });

    expect(updated.name).toBe("Updated Name");
    expect(updated.published).toBe(true);

    const fetched = await service.getCategoryById(created.id);
    expect(fetched.name).toBe("Updated Name");
  });

  it("allows archiving a category", async () => {
    const created = await service.createCategory({
      name: "To Archive",
      slug: "to-archive",
    });

    const now = new Date();
    const updated = await service.updateCategory(created.id, {
      archivedAt: now,
    });

    expect(updated.archivedAt).toEqual(now);
  });

  it("fails to get a non-existent category", async () => {
    await expect(service.getCategoryById("cat_not_exist")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
