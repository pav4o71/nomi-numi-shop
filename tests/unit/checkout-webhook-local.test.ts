import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { loadValidatedCredentials } from "../../scripts/drizzle-credentials.mjs";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import { CheckoutService } from "@/checkout/service";
import { DrizzleCheckoutRepository } from "@/checkout/repository";
import type { CheckoutDb } from "@/checkout/db";
import { CartService } from "@/cart/service";
import { DrizzleCartRepository } from "@/cart/repository";
import { CatalogService } from "@/catalog/service";
import { DrizzleCatalogRepository } from "@/catalog/repository";

describe("checkout payment webhook concurrency (local)", () => {
  let pgSql: ReturnType<typeof postgres>;
  let db: CheckoutDb;
  let service: CheckoutService;
  let catalogRepo: DrizzleCatalogRepository;
  let catalogService: CatalogService;

  let variantId: string;
  let orderId: string;

  beforeAll(async () => {
    const credentialsLocal = loadValidatedCredentials("test");
    // Need enough connections for concurrent transactions
    pgSql = postgres({
      host: credentialsLocal.host,
      port: credentialsLocal.port,
      database: credentialsLocal.database,
      username: credentialsLocal.user,
      password: credentialsLocal.password,
      max: 4,
      onnotice: () => {},
    });
    db = drizzle(pgSql);

    catalogRepo = new DrizzleCatalogRepository(db);
    catalogService = new CatalogService(catalogRepo);

    const cartRepo = new DrizzleCartRepository(db);
    const cartService = new CartService(cartRepo, catalogService);

    const checkoutRepo = new DrizzleCheckoutRepository(db);
    service = new CheckoutService(checkoutRepo, cartService, catalogService);

    // Clean DB
    await db.execute(sql`DELETE FROM order_items`);
    await db.execute(sql`DELETE FROM orders`);
    await db.execute(sql`DELETE FROM cart_items`);
    await db.execute(sql`DELETE FROM carts`);
    await db.execute(sql`DELETE FROM inventory_movements`);
    await db.execute(sql`DELETE FROM inventory_balances`);
    await db.execute(sql`DELETE FROM variant_prices`);
    await db.execute(sql`DELETE FROM product_variant_option_values`);
    await db.execute(sql`DELETE FROM product_option_values`);
    await db.execute(sql`DELETE FROM product_options`);
    await db.execute(sql`DELETE FROM product_variants`);
    await db.execute(sql`DELETE FROM products`);
    await db.execute(sql`DELETE FROM categories`);
    await db.execute(sql`DELETE FROM collections`);

    // Setup Product & Variant
    const p = await catalogService.createProduct({
      slug: "test-webhook-concurrent",
      title: "Test Webhook Concurrent",
      status: "published",
    });
    const v = await catalogService.createVariant(p.id, {
      sku: "TEST-WEBHOOK-1",
      prices: [{ currency: "USD", amountMinor: 1000 }],
    });
    variantId = v.variant.id;

    // Add inventory (onHand: 10, reserved: 0)
    await catalogService.adjustVariantInventory(variantId, {
      deltaOnHand: 10,
      deltaReserved: 0,
      reason: "restock",
    });

    // Create a Cart
    const cart = await cartService.getCart({ sessionId: "sess-123", currency: "USD" });
    await cartService.addItem(cart.id, variantId, 2);

    // Create Order (deducts 2 from available, moves to reserved. onHand: 10, reserved: 2)
    const order = await service.createOrderFromCart(
      { sessionId: "sess-123", currency: "USD" },
      "test@example.com",
      "idem-1",
    );
    orderId = order.id;
  });

  afterAll(async () => {
    await pgSql.end();
  });

  it("processes concurrent identical webhooks idempotently without double-deduction", async () => {
    // Both webhooks arrive at the same time
    const attempts = Array.from({ length: 2 }, () =>
      service.processPaymentWebhook(orderId, true, "tx-999"),
    );

    const results = await Promise.all(attempts);

    // Both should return the final order object (one processes it, one skips it)
    expect(results[0].paymentStatus).toBe("paid");
    expect(results[1].paymentStatus).toBe("paid");

    // Verify Inventory:
    // Started at onHand 10, reserved 0.
    // Order reserved 2: onHand 10, reserved 2.
    // Webhook success deducts 2 from BOTH: onHand 8, reserved 0.
    const balance = await catalogService.getVariantInventoryBalance(variantId);
    expect(balance?.onHand).toBe(8);
    expect(balance?.reserved).toBe(0);

    // Verify only ONE sale movement was recorded
    const movements = await catalogService.getVariantInventoryMovements(variantId);
    const saleMovements = movements.filter((m) => m.reason === "sale");
    expect(saleMovements).toHaveLength(1);
  });
});
