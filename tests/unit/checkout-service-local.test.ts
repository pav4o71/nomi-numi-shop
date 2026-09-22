import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { loadValidatedCredentials } from "../../scripts/drizzle-credentials.mjs";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql, eq } from "drizzle-orm";
import { CheckoutService } from "@/checkout/service";
import { DrizzleCheckoutRepository } from "@/checkout/repository";
import type { CheckoutDb } from "@/checkout/db";
import { CartService } from "@/cart/service";
import { DrizzleCartRepository } from "@/cart/repository";
import { CatalogService } from "@/catalog/service";
import { DrizzleCatalogRepository } from "@/catalog/repository";
import { cartItems, orders, orderItems } from "@/db/schema";

describe("CheckoutService integration (local)", () => {
  let pgSql: ReturnType<typeof postgres>;
  let db: CheckoutDb;
  let service: CheckoutService;
  let catalogRepo: DrizzleCatalogRepository;
  let catalogService: CatalogService;
  let cartService: CartService;

  let variantId: string;

  beforeAll(async () => {
    const credentialsLocal = loadValidatedCredentials("test");
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

  afterAll(async () => {
    await pgSql.end();
  });

  beforeEach(async () => {
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
      slug: "test-checkout-product",
      title: "Test Checkout Product",
      status: "published",
    });
    const v = await catalogService.createVariant(p.id, {
      sku: "TEST-CHECKOUT-1",
      prices: [{ currency: "USD", amountMinor: 2000 }],
    });
    variantId = v.variant.id;
  });

  it("successfully creates an order from cart, reserves inventory, and clears cart", async () => {
    // Setup Inventory
    await catalogService.adjustVariantInventory(variantId, {
      deltaOnHand: 10,
      deltaReserved: 0,
      reason: "restock",
    });

    // Create Cart
    const sessionId = "sess-checkout-success";
    const cart = await cartService.getCart({ sessionId, currency: "USD" });
    await cartService.addItem(cart.id, variantId, 3);

    // Invoke Checkout
    const idempotencyKey = "idem-success-1";
    const order = await service.createOrderFromCart(
      { sessionId, currency: "USD" },
      "customer@example.com",
      idempotencyKey,
    );

    // Assert Order
    expect(order).toBeDefined();
    expect(order.orderStatus).toBe("pending");
    expect(order.paymentStatus).toBe("unpaid");
    expect(order.totalAmount).toBe(6000); // 3 * 2000
    expect(order.idempotencyKey).toBe(idempotencyKey);

    // Assert Order Items
    const [fetchedOrderItems] = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));
    expect(fetchedOrderItems.count).toBe(1);

    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    expect(items[0].quantity).toBe(3);
    expect(items[0].unitPrice).toBe(2000);
    expect(items[0].variantId).toBe(variantId);

    // Assert Inventory Reserved
    const balance = await catalogService.getVariantInventoryBalance(variantId);
    expect(balance?.onHand).toBe(10);
    expect(balance?.reserved).toBe(3);

    // Assert Cart Cleared
    const [cartItemCount] = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(cartItems)
      .where(eq(cartItems.cartId, cart.id));
    expect(cartItemCount.count).toBe(0);
  });

  it("rolls back order creation and leaves inventory untouched when inventory is insufficient", async () => {
    // Setup Inventory with insufficient amount (onHand 1)
    await catalogService.adjustVariantInventory(variantId, {
      deltaOnHand: 1,
      deltaReserved: 0,
      reason: "restock",
    });

    // Create Cart with 5 items
    const sessionId = "sess-checkout-fail";
    const cart = await cartService.getCart({ sessionId, currency: "USD" });
    await cartService.addItem(cart.id, variantId, 5);

    // Invoke Checkout and expect failure
    const idempotencyKey = "idem-fail-1";
    await expect(
      service.createOrderFromCart(
        { sessionId, currency: "USD" },
        "customer@example.com",
        idempotencyKey,
      ),
    ).rejects.toThrow(); // The service throws an error when available < quantity or when reservation fails

    // Assert No Order Created
    const [orderCount] = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(orders)
      .where(eq(orders.idempotencyKey, idempotencyKey));
    expect(orderCount.count).toBe(0);

    // Assert Inventory Untouched
    const balance = await catalogService.getVariantInventoryBalance(variantId);
    expect(balance?.onHand).toBe(1);
    expect(balance?.reserved).toBe(0);

    // Assert Cart Remains Intact
    const [cartItemCount] = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(cartItems)
      .where(eq(cartItems.cartId, cart.id));
    expect(cartItemCount.count).toBe(1);

    const items = await db.select().from(cartItems).where(eq(cartItems.cartId, cart.id));
    expect(items[0].quantity).toBe(5);
  });
});
