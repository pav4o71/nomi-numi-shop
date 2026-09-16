/**
 * Phase 4B path-locked TEST DB integration for admin catalog collections.
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

describe("admin catalog collections integration (local)", () => {
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

  it("lists all collections including drafts and archived", async () => {
    await service.createCollection({
      name: "Draft Collection",
      slug: "draft-col",
      position: 10,
      published: false,
    });

    await service.createCollection({
      name: "Published Collection",
      slug: "pub-col",
      position: 5,
      published: true,
    });

    const collections = await service.listAllCollections();
    expect(collections.length).toBe(2);
    // Ordered by position
    expect(collections[0].slug).toBe("pub-col");
    expect(collections[1].slug).toBe("draft-col");
  });

  it("enforces unique slugs on creation", async () => {
    await service.createCollection({
      name: "Original",
      slug: "pub-col",
    });

    await expect(
      service.createCollection({
        name: "Duplicate",
        slug: "pub-col", // Already exists
      }),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      message: expect.stringContaining("Collection slug already exists"),
    });
  });

  it("updates a collection successfully", async () => {
    const created = await service.createCollection({
      name: "To Update",
      slug: "to-update",
    });

    const updated = await service.updateCollection(created.id, {
      name: "Updated Name",
      published: true,
    });

    expect(updated.name).toBe("Updated Name");
    expect(updated.published).toBe(true);

    const fetched = await service.getCollectionById(created.id);
    expect(fetched.name).toBe("Updated Name");
  });

  it("allows setting publish window dates", async () => {
    const created = await service.createCollection({
      name: "Windowed",
      slug: "windowed",
    });

    const from = new Date("2026-01-01T00:00:00Z");
    const until = new Date("2026-12-31T23:59:59Z");
    const updated = await service.updateCollection(created.id, {
      publishedFrom: from,
      publishedUntil: until,
    });

    expect(updated.publishedFrom).toEqual(from);
    expect(updated.publishedUntil).toEqual(until);
  });

  it("enforces publish window check (until must be after from)", async () => {
    const created = await service.createCollection({
      name: "Bad Window",
      slug: "bad-window",
    });

    const from = new Date("2026-12-31T00:00:00Z");
    const until = new Date("2026-01-01T00:00:00Z"); // Until is before from

    await expect(
      service.updateCollection(created.id, {
        publishedFrom: from,
        publishedUntil: until,
      }),
    ).rejects.toMatchObject({
      code: "INVALID_INPUT",
      message: expect.stringContaining("publishedUntil must be after publishedFrom"),
    });
  });

  it("allows archiving a collection", async () => {
    const created = await service.createCollection({
      name: "To Archive",
      slug: "to-archive",
    });

    const now = new Date();
    const updated = await service.updateCollection(created.id, {
      archivedAt: now,
    });

    expect(updated.archivedAt).toEqual(now);
  });

  it("fails to get a non-existent collection", async () => {
    await expect(service.getCollectionById("col_not_exist")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
