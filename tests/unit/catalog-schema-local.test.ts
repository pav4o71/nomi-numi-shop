import { randomUUID } from "node:crypto";

import postgres from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  EXPECTED_ROOT,
  PROTECTED_HOST_PORT,
  loadValidatedCredentials,
} from "../../scripts/drizzle-credentials.mjs";

/**
 * Path-locked / DB-backed Phase 3A catalog constraint coverage.
 * Excluded from portable `pnpm test:ci` (see package.json).
 */

const credentials = loadValidatedCredentials("test");

function id(prefix: string) {
  return `${prefix}_${randomUUID()}`;
}

describe("Phase 3A catalog schema against TEST database", () => {
  let sql: ReturnType<typeof postgres>;
  const productIds: string[] = [];
  const categoryIds: string[] = [];
  const collectionIds: string[] = [];

  beforeAll(async () => {
    expect(EXPECTED_ROOT).toBe("/home/pav4o71/Projects/nomi-numi-shop");
    expect(credentials.database).toBe("nomi_numi_shop_test");
    expect(credentials.port).toBe(55433);
    expect(String(credentials.port)).not.toBe(PROTECTED_HOST_PORT);

    sql = postgres({
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

    const identity = await sql`
      SELECT current_database() AS database_name, current_user AS database_user
    `;
    expect(identity[0]?.database_name).toBe("nomi_numi_shop_test");
    expect(identity[0]?.database_user).toBe("nomi_numi_test");
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
    productIds.length = 0;
    categoryIds.length = 0;
    collectionIds.length = 0;
  });

  async function insertProduct(overrides: { slug?: string; title?: string } = {}) {
    const productId = id("prod");
    const slug = overrides.slug ?? `product-${productId}`;
    await sql`
      INSERT INTO products (id, slug, title, status)
      VALUES (${productId}, ${slug}, ${overrides.title ?? "Test Product"}, 'draft')
    `;
    productIds.push(productId);
    return productId;
  }

  async function insertCategory(slug?: string) {
    const categoryId = id("cat");
    await sql`
      INSERT INTO categories (id, slug, name, published)
      VALUES (${categoryId}, ${slug ?? `category-${categoryId}`}, ${"Category"}, false)
    `;
    categoryIds.push(categoryId);
    return categoryId;
  }

  async function insertCollection(slug?: string) {
    const collectionId = id("col");
    await sql`
      INSERT INTO collections (id, slug, name, published)
      VALUES (${collectionId}, ${slug ?? `collection-${collectionId}`}, ${"Collection"}, false)
    `;
    collectionIds.push(collectionId);
    return collectionId;
  }

  async function insertVariant(productId: string, sku?: string) {
    const variantId = id("var");
    await sql`
      INSERT INTO product_variants (id, product_id, sku, is_active)
      VALUES (${variantId}, ${productId}, ${sku ?? `SKU-${variantId}`}, true)
    `;
    return variantId;
  }

  it("enforces store_settings singleton and at-least-one currency", async () => {
    await sql`
      INSERT INTO store_settings (id, store_name)
      VALUES (1, 'Nomi Numi Shop')
    `;

    await expect(
      sql`INSERT INTO store_settings (id, store_name) VALUES (2, 'Other')`,
    ).rejects.toThrow(/store_settings_singleton_chk|check/i);

    await expect(
      sql`
        UPDATE store_settings
        SET php_enabled = false, usd_enabled = false
        WHERE id = 1
      `,
    ).rejects.toThrow(/store_settings_currency_enabled_chk|check/i);
  });

  it("enforces unique product, category, and collection slugs", async () => {
    await insertProduct({ slug: "shared-slug" });
    await expect(insertProduct({ slug: "shared-slug" })).rejects.toThrow(
      /products_slug_uidx|unique/i,
    );

    await insertCategory("cat-slug");
    await expect(insertCategory("cat-slug")).rejects.toThrow(/categories_slug_uidx|unique/i);

    await insertCollection("col-slug");
    await expect(insertCollection("col-slug")).rejects.toThrow(/collections_slug_uidx|unique/i);

    // Cross-type slug reuse is allowed in v1.
    await insertProduct({ slug: "same-across-types" });
    await insertCategory("same-across-types");
    await insertCollection("same-across-types");
  });

  it("enforces unique SKU and join uniqueness", async () => {
    const productA = await insertProduct();
    const productB = await insertProduct();
    await insertVariant(productA, "SKU-UNIQUE-1");
    await expect(insertVariant(productB, "SKU-UNIQUE-1")).rejects.toThrow(
      /product_variants_sku_uidx|unique/i,
    );

    const categoryId = await insertCategory();
    await sql`
      INSERT INTO product_categories (product_id, category_id)
      VALUES (${productA}, ${categoryId})
    `;
    await expect(
      sql`
        INSERT INTO product_categories (product_id, category_id)
        VALUES (${productA}, ${categoryId})
      `,
    ).rejects.toThrow(/product_categories_product_category_uidx|unique/i);

    const collectionId = await insertCollection();
    await sql`
      INSERT INTO collection_products (collection_id, product_id)
      VALUES (${collectionId}, ${productA})
    `;
    await expect(
      sql`
        INSERT INTO collection_products (collection_id, product_id)
        VALUES (${collectionId}, ${productA})
      `,
    ).rejects.toThrow(/collection_products_collection_product_uidx|unique/i);
  });

  it("enforces option/value ownership and one value per option per variant", async () => {
    const productA = await insertProduct();
    const productB = await insertProduct();

    const optionA = id("opt");
    const optionB = id("opt");
    await sql`
      INSERT INTO product_options (id, product_id, name)
      VALUES (${optionA}, ${productA}, 'Size'), (${optionB}, ${productB}, 'Size')
    `;

    await expect(
      sql`
        INSERT INTO product_options (id, product_id, name)
        VALUES (${id("opt")}, ${productA}, 'Size')
      `,
    ).rejects.toThrow(/product_options_product_name_uidx|unique/i);

    const valueA1 = id("val");
    const valueA2 = id("val");
    const valueB1 = id("val");
    await sql`
      INSERT INTO product_option_values (id, option_id, value)
      VALUES
        (${valueA1}, ${optionA}, 'S'),
        (${valueA2}, ${optionA}, 'M'),
        (${valueB1}, ${optionB}, 'S')
    `;
    await expect(
      sql`
        INSERT INTO product_option_values (id, option_id, value)
        VALUES (${id("val")}, ${optionA}, 'S')
      `,
    ).rejects.toThrow(/product_option_values_option_value_uidx|unique/i);

    const variantA = await insertVariant(productA);
    await sql`
      INSERT INTO product_variant_option_values
        (id, product_id, variant_id, option_id, option_value_id)
      VALUES (${id("vov")}, ${productA}, ${variantA}, ${optionA}, ${valueA1})
    `;

    // Same option twice on one variant.
    await expect(
      sql`
        INSERT INTO product_variant_option_values
          (id, product_id, variant_id, option_id, option_value_id)
        VALUES (${id("vov")}, ${productA}, ${variantA}, ${optionA}, ${valueA2})
      `,
    ).rejects.toThrow(/product_variant_option_values_variant_option_uidx|unique/i);

    const variantOwnership = await insertVariant(productA);

    // Option value must belong to the declared option.
    await expect(
      sql`
        INSERT INTO product_variant_option_values
          (id, product_id, variant_id, option_id, option_value_id)
        VALUES (${id("vov")}, ${productA}, ${variantOwnership}, ${optionA}, ${valueB1})
      `,
    ).rejects.toThrow(/product_variant_option_values_value_option_fk|foreign key/i);

    // Option and variant must share the same product.
    await expect(
      sql`
        INSERT INTO product_variant_option_values
          (id, product_id, variant_id, option_id, option_value_id)
        VALUES (${id("vov")}, ${productA}, ${variantOwnership}, ${optionB}, ${valueB1})
      `,
    ).rejects.toThrow(/product_variant_option_values_option_product_fk|foreign key/i);
  });

  it("enforces variant price currency, positivity, compare-at, and uniqueness", async () => {
    const productId = await insertProduct();
    const variantId = await insertVariant(productId);
    const priceId = id("price");

    await sql`
      INSERT INTO variant_prices (id, variant_id, currency, amount_minor)
      VALUES (${priceId}, ${variantId}, 'USD', 3499)
    `;

    await expect(
      sql`
        INSERT INTO variant_prices (id, variant_id, currency, amount_minor)
        VALUES (${id("price")}, ${variantId}, 'USD', 1999)
      `,
    ).rejects.toThrow(/variant_prices_variant_currency_uidx|unique/i);

    await expect(
      sql`
        INSERT INTO variant_prices (id, variant_id, currency, amount_minor)
        VALUES (${id("price")}, ${variantId}, 'EUR', 1999)
      `,
    ).rejects.toThrow(/variant_prices_currency_chk|check/i);

    await expect(
      sql`
        INSERT INTO variant_prices (id, variant_id, currency, amount_minor)
        VALUES (${id("price")}, ${variantId}, 'PHP', 0)
      `,
    ).rejects.toThrow(/variant_prices_amount_positive_chk|check/i);

    await expect(
      sql`
        INSERT INTO variant_prices
          (id, variant_id, currency, amount_minor, compare_at_amount_minor)
        VALUES (${id("price")}, ${variantId}, 'PHP', 1000, 1000)
      `,
    ).rejects.toThrow(/variant_prices_compare_at_chk|check/i);

    await sql`
      INSERT INTO variant_prices
        (id, variant_id, currency, amount_minor, compare_at_amount_minor)
      VALUES (${id("price")}, ${variantId}, 'PHP', 1000, 1500)
    `;
  });

  it("enforces product_media product/optional-variant integrity and FK delete behavior", async () => {
    const productA = await insertProduct();
    const productB = await insertProduct();
    const variantA = await insertVariant(productA);
    const variantB = await insertVariant(productB);
    const categoryId = await insertCategory();

    await sql`
      INSERT INTO product_media (id, product_id, storage_key, position)
      VALUES (${id("media")}, ${productA}, 'local/key-a', 0)
    `;

    // Variant must belong to the same product.
    await expect(
      sql`
        INSERT INTO product_media (id, product_id, variant_id, storage_key, position)
        VALUES (${id("media")}, ${productA}, ${variantB}, 'local/key-bad', 1)
      `,
    ).rejects.toThrow(/product_media_variant_product_fk|foreign key/i);

    const variantMediaId = id("media");
    await sql`
      INSERT INTO product_media (id, product_id, variant_id, storage_key, position)
      VALUES (${variantMediaId}, ${productA}, ${variantA}, 'local/key-variant', 1)
    `;

    await sql`
      INSERT INTO product_categories (product_id, category_id)
      VALUES (${productA}, ${categoryId})
    `;

    // Category with membership cannot be hard-deleted (RESTRICT).
    await expect(sql`DELETE FROM categories WHERE id = ${categoryId}`).rejects.toThrow(
      /product_categories_category_id|foreign key|restrict/i,
    );

    // Deleting product cascades membership and media.
    await sql`DELETE FROM products WHERE id = ${productA}`;
    const remainingMedia = await sql`SELECT id FROM product_media WHERE id = ${variantMediaId}`;
    expect(remainingMedia).toHaveLength(0);
    const remainingJoins = await sql`
      SELECT product_id FROM product_categories WHERE product_id = ${productA}
    `;
    expect(remainingJoins).toHaveLength(0);

    // Category can be deleted once membership is gone.
    await sql`DELETE FROM categories WHERE id = ${categoryId}`;
  });
});
