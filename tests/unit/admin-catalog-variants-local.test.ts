/**
 * Phase 4D path-locked TEST DB integration for admin catalog variants.
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

describe("admin catalog variants integration (local)", () => {
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

  it("can define options, create a variant, and update it", async () => {
    const product = await service.createProduct({
      title: "Test Product",
      slug: "test-prod",
    });

    // 1. Define options
    const options = await service.defineProductOptions(product.id, {
      options: [{ name: "Size", values: [{ value: "Small" }, { value: "Large" }] }],
    });
    expect(options.length).toBe(1);
    expect(options[0].name).toBe("Size");
    const smallValueId = options[0].values.find((v) => v.value === "Small")!.id;

    // 2. Create variant
    const { variant, prices } = await service.createVariant(product.id, {
      sku: "TEST-S",
      isActive: true,
      optionSelections: [{ optionId: options[0].id, optionValueId: smallValueId }],
      prices: [{ currency: "USD", amountMinor: 1000 }],
    });

    expect(variant.sku).toBe("TEST-S");
    expect(prices.length).toBe(1);
    expect(prices[0].amountMinor).toBe(1000);

    // 3. Prevent defining options now that variant exists
    await expect(
      service.defineProductOptions(product.id, {
        options: [{ name: "Color", values: [{ value: "Red" }] }],
      }),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      message: expect.stringContaining("Cannot redefine product options"),
    });

    // 4. Update variant and prices
    const updated = await service.updateVariant(variant.id, {
      sku: "TEST-S-UPDATED",
    });
    expect(updated.sku).toBe("TEST-S-UPDATED");

    const newPrices = await service.setVariantPrices(variant.id, {
      prices: [{ currency: "USD", amountMinor: 1500 }],
    });
    expect(newPrices[0].amountMinor).toBe(1500);

    // 5. Read back via service convenience method
    const details = await service.getVariantDetails(variant.id);
    expect(details.sku).toBe("TEST-S-UPDATED");
    expect(details.prices[0].amountMinor).toBe(1500);
    expect(details.optionSelections[0].optionValueId).toBe(smallValueId);
  });
});
