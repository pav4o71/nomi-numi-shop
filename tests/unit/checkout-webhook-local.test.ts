import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { loadValidatedCredentials } from "../../scripts/drizzle-credentials.mjs";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, sql } from "drizzle-orm";
import { CheckoutService } from "@/checkout/service";
import { DrizzleCheckoutRepository } from "@/checkout/repository";
import type { CheckoutDb } from "@/checkout/db";
import { CartService } from "@/cart/service";
import { DrizzleCartRepository } from "@/cart/repository";
import { CatalogService } from "@/catalog/service";
import { DrizzleCatalogRepository } from "@/catalog/repository";
import { inventoryReservations, orders, paymentEvents } from "@/db/schema";

describe("checkout payment webhook concurrency (local)", () => {
  let pgSql: ReturnType<typeof postgres>;
  let db: CheckoutDb;
  let service: CheckoutService;
  let catalogRepo: DrizzleCatalogRepository;
  let catalogService: CatalogService;
  let cartService: CartService;

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
    cartService = new CartService(cartRepo, catalogService);

    const checkoutRepo = new DrizzleCheckoutRepository(db);
    service = new CheckoutService(checkoutRepo, cartService, catalogService);
  });

  beforeEach(async () => {
    // Clean DB
    await db.execute(sql`DELETE FROM payment_events`);
    await db.execute(sql`DELETE FROM inventory_reservations`);
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
    const result = await service.createOrderFromCart(
      { sessionId: "sess-123", currency: "USD" },
      "test@example.com",
      "idem-1",
    );
    orderId = result.order.id;
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

    const reservations = await db
      .select()
      .from(inventoryReservations)
      .where(eq(inventoryReservations.orderId, orderId));
    expect(reservations).toHaveLength(1);
    expect(reservations[0].status).toBe("committed");
    const events = await db.select().from(paymentEvents).where(eq(paymentEvents.orderId, orderId));
    expect(events).toHaveLength(1);

    const terminal = await service.processPaymentWebhook(orderId, false, "tx-opposite");
    expect(terminal.paymentStatus).toBe("paid");
    const recordedEvents = await db
      .select()
      .from(paymentEvents)
      .where(eq(paymentEvents.orderId, orderId));
    expect(recordedEvents).toHaveLength(2);
  });

  it("releases a failed payment reservation exactly once and preserves the terminal state", async () => {
    const initialReservations = await db
      .select()
      .from(inventoryReservations)
      .where(eq(inventoryReservations.orderId, orderId));
    expect(initialReservations).toHaveLength(1);
    expect(initialReservations[0]).toMatchObject({
      orderId,
      variantId,
      quantity: 2,
      status: "active",
    });
    expect(await catalogService.getVariantInventoryBalance(variantId)).toMatchObject({
      onHand: 10,
      reserved: 2,
    });

    const failedEventId = "tx-failed";
    const failedSource = `payment:${failedEventId}:order:${orderId}`;
    const failed = await service.processPaymentWebhook(orderId, false, failedEventId);
    expect(failed).toMatchObject({
      id: orderId,
      orderStatus: "cancelled",
      paymentStatus: "failed",
      fulfillmentStatus: "cancelled",
    });

    const [releasedReservation] = await db
      .select()
      .from(inventoryReservations)
      .where(eq(inventoryReservations.orderId, orderId));
    expect(releasedReservation).toMatchObject({ status: "released", quantity: 2 });
    expect(await catalogService.getVariantInventoryBalance(variantId)).toMatchObject({
      onHand: 10,
      reserved: 0,
    });

    let movements = await catalogService.getVariantInventoryMovements(variantId);
    let failedReleaseMovements = movements.filter(
      (movement) => movement.sourceReference === failedSource,
    );
    expect(failedReleaseMovements).toHaveLength(1);
    expect(failedReleaseMovements[0]).toMatchObject({
      deltaOnHand: 0,
      deltaReserved: -2,
      reason: "adjustment",
      sourceReference: failedSource,
    });
    let failedEvents = (await db.select().from(paymentEvents)).filter(
      (event) => event.providerEventId === failedEventId,
    );
    expect(failedEvents).toHaveLength(1);
    expect(failedEvents[0]).toMatchObject({
      orderId,
      provider: "mock",
      status: "failed",
    });

    const replayed = await service.processPaymentWebhook(orderId, false, failedEventId);
    expect(replayed).toMatchObject({
      orderStatus: "cancelled",
      paymentStatus: "failed",
      fulfillmentStatus: "cancelled",
    });
    movements = await catalogService.getVariantInventoryMovements(variantId);
    failedReleaseMovements = movements.filter(
      (movement) => movement.sourceReference === failedSource,
    );
    expect(failedReleaseMovements).toHaveLength(1);
    failedEvents = (await db.select().from(paymentEvents)).filter(
      (event) => event.providerEventId === failedEventId,
    );
    expect(failedEvents).toHaveLength(1);
    expect(await catalogService.getVariantInventoryBalance(variantId)).toMatchObject({
      onHand: 10,
      reserved: 0,
    });

    const laterSuccessEventId = "tx-late-success";
    const laterSuccessSource = `payment:${laterSuccessEventId}:order:${orderId}`;
    const terminal = await service.processPaymentWebhook(orderId, true, laterSuccessEventId);
    expect(terminal).toMatchObject({
      orderStatus: "cancelled",
      paymentStatus: "failed",
      fulfillmentStatus: "cancelled",
    });

    const [persistedOrder] = await db.select().from(orders).where(eq(orders.id, orderId));
    const [persistedReservation] = await db
      .select()
      .from(inventoryReservations)
      .where(eq(inventoryReservations.orderId, orderId));
    expect(persistedOrder).toMatchObject({
      orderStatus: "cancelled",
      paymentStatus: "failed",
      fulfillmentStatus: "cancelled",
    });
    expect(persistedReservation.status).toBe("released");

    movements = await catalogService.getVariantInventoryMovements(variantId);
    expect(movements.filter((movement) => movement.sourceReference === failedSource)).toHaveLength(
      1,
    );
    expect(
      movements.filter((movement) => movement.sourceReference === laterSuccessSource),
    ).toHaveLength(0);
    expect(
      movements.filter(
        (movement) => movement.reason === "sale" && movement.sourceReference?.includes(orderId),
      ),
    ).toHaveLength(0);
    expect(await catalogService.getVariantInventoryBalance(variantId)).toMatchObject({
      onHand: 10,
      reserved: 0,
    });

    const recordedEvents = await db
      .select()
      .from(paymentEvents)
      .where(eq(paymentEvents.orderId, orderId));
    expect(recordedEvents).toHaveLength(2);
    expect(recordedEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ providerEventId: failedEventId, status: "failed" }),
        expect.objectContaining({ providerEventId: laterSuccessEventId, status: "paid" }),
      ]),
    );
  });
});
