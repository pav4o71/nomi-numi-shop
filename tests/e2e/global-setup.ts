import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { CatalogService, DrizzleCatalogRepository } from "../../src/catalog/index";
import { installDevCatalogFixtures } from "../../src/catalog/fixtures/index";
import * as schema from "../../src/db/schema/index";
import { loadValidatedCredentials } from "../../scripts/drizzle-credentials.mjs";

export default async function globalSetup() {
  const credentials = loadValidatedCredentials("test");
  const sql = postgres({
    host: credentials.host,
    port: credentials.port,
    database: credentials.database,
    username: credentials.user,
    password: credentials.password,
    max: 1,
    prepare: false,
    onnotice: () => {},
  });

  try {
    const [identity] = await sql`SELECT current_database() AS database_name`;
    if (identity?.database_name !== "nomi_numi_shop_test" || credentials.port !== 55433) {
      throw new Error("E2E fixture setup refused a non-TEST database");
    }

    await sql`DELETE FROM payment_events`;
    await sql`DELETE FROM inventory_reservations`;
    await sql`DELETE FROM order_items`;
    await sql`DELETE FROM orders`;
    await sql`DELETE FROM cart_items`;
    await sql`DELETE FROM carts`;
    await sql`DELETE FROM wishlists`;
    await sql`DELETE FROM product_media`;
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

    const db = drizzle(sql, { schema });
    const repo = new DrizzleCatalogRepository(db);
    const service = new CatalogService(repo);
    await installDevCatalogFixtures({ service, repo, db });
    const variants = await db
      .select({ id: schema.productVariants.id })
      .from(schema.productVariants);
    for (const variant of variants) {
      await service.adjustVariantInventory(variant.id, {
        deltaOnHand: 100,
        deltaReserved: 0,
        reason: "restock",
        note: "Playwright TEST fixture stock",
      });
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}
