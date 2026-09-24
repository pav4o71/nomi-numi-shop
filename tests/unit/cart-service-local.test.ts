import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { loadValidatedCredentials } from "../../scripts/drizzle-credentials.mjs";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { and, eq, gt, sql } from "drizzle-orm";
import type { CartDb } from "@/cart/db";
import { CartService } from "@/cart/service";
import { DrizzleCartRepository } from "@/cart/repository";
import { CatalogService } from "@/catalog/service";
import { DrizzleCatalogRepository } from "@/catalog/repository";
import { cartItems, carts, user } from "@/db/schema";

describe("CartService integration (local)", () => {
  let pgSql: ReturnType<typeof postgres>;
  let db: CartDb;
  let service: CartService;
  let catalogRepo: DrizzleCatalogRepository;
  let catalogService: CatalogService;
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
    service = new CartService(cartRepo, catalogService);
  });

  afterAll(async () => {
    await pgSql.end();
  });

  beforeEach(async () => {
    // Clean DB
    await db.execute(sql`DELETE FROM cart_items`);
    await db.execute(sql`DELETE FROM carts`);
    await db.execute(sql`DELETE FROM inventory_balances`);
    await db.execute(sql`DELETE FROM inventory_movements`);
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
      slug: "test-cart-product",
      title: "Test Cart Product",
      status: "published",
    });
    const v = await catalogService.createVariant(p.id, {
      sku: "TEST-CART-1",
      prices: [{ currency: "USD", amountMinor: 1000 }],
    });
    variantId = v.variant.id;
    await catalogService.adjustVariantInventory(variantId, {
      deltaOnHand: 100,
      deltaReserved: 0,
      reason: "restock",
    });
  });

  it("handles normal add and update operations", async () => {
    const cart = await service.getCart({ sessionId: "sess-cart-1", currency: "USD" });

    // Add 2 items
    await service.addItem(cart.id, variantId, 2);
    let updatedCart = await service.getCart({ sessionId: "sess-cart-1", currency: "USD" });
    expect(updatedCart.items).toHaveLength(1);
    expect(updatedCart.items[0].quantity).toBe(2);

    // Add 3 more items (increment)
    await service.addItem(cart.id, variantId, 3);
    updatedCart = await service.getCart({ sessionId: "sess-cart-1", currency: "USD" });
    expect(updatedCart.items[0].quantity).toBe(5);

    // Update item (absolute quantity)
    const itemId = updatedCart.items[0].id;
    await service.updateItem(cart.id, itemId, 10);
    updatedCart = await service.getCart({ sessionId: "sess-cart-1", currency: "USD" });
    expect(updatedCart.items[0].quantity).toBe(10);
  });

  it("exhibits lost-increment race condition in current implementation", async () => {
    const cart = await service.getCart({ sessionId: "sess-cart-race", currency: "USD" });

    // To deterministically reproduce the race, we force an artificial delay after read
    // so that both concurrent transactions read the same initial state before writing.
    const originalGetCartItems = service["repo"].getCartItems.bind(service["repo"]);
    let readCount = 0;
    service["repo"].getCartItems = async (
      tx: Parameters<typeof originalGetCartItems>[0],
      cid: string,
    ) => {
      const items = await originalGetCartItems(tx, cid);
      readCount++;
      if (readCount <= 2) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      return items;
    };

    try {
      // Concurrently add 1 item twice
      await Promise.all([
        service.addItem(cart.id, variantId, 1),
        service.addItem(cart.id, variantId, 1),
      ]);
    } finally {
      // Restore
      service["repo"].getCartItems = originalGetCartItems;
    }

    const updatedCart = await service.getCart({ sessionId: "sess-cart-race", currency: "USD" });
    expect(updatedCart.items).toHaveLength(1);

    // Now testing for the fixed behavior - atomic increment should result in 2
    expect(updatedCart.items[0].quantity).toBe(2);
  });

  it("creates only one cart for concurrent requests with the same owner", async () => {
    const [first, second] = await Promise.all([
      service.getCart({ sessionId: "sess-cart-create-race", currency: "USD" }),
      service.getCart({ sessionId: "sess-cart-create-race", currency: "USD" }),
    ]);

    expect(first.id).toBe(second.id);
  });

  it("merges overlapping guest and customer quantities additively", async () => {
    const customerId = "cart-merge-customer";
    const sessionId = "sess-cart-merge-overlap";

    await db.delete(user).where(eq(user.id, customerId));
    await db.insert(user).values({
      id: customerId,
      name: "Cart Merge Customer",
      email: "cart-merge-customer@example.com",
      emailVerified: true,
      role: "customer",
    });

    try {
      const customerCart = await service.getCart({ customerId, currency: "USD" });
      const guestCart = await service.getCart({ sessionId, currency: "USD" });
      await service.addItem(customerCart.id, variantId, 3);
      await service.addItem(guestCart.id, variantId, 2);

      await service.mergeCart(sessionId, customerId);

      const activeCustomerCarts = await db
        .select()
        .from(carts)
        .where(and(eq(carts.customerId, customerId), gt(carts.expiresAt, new Date())));
      expect(activeCustomerCarts).toHaveLength(1);
      expect(activeCustomerCarts[0]).toMatchObject({
        id: customerCart.id,
        customerId,
        sessionId: null,
      });

      const survivingItems = await db
        .select()
        .from(cartItems)
        .where(and(eq(cartItems.cartId, customerCart.id), eq(cartItems.variantId, variantId)));
      expect(survivingItems).toHaveLength(1);
      expect(survivingItems[0].quantity).toBe(5);

      const formerGuestCarts = await db.select().from(carts).where(eq(carts.id, guestCart.id));
      expect(formerGuestCarts).toHaveLength(0);
      const guestSessionCarts = await db.select().from(carts).where(eq(carts.sessionId, sessionId));
      expect(guestSessionCarts).toHaveLength(0);
      const formerGuestItems = await db
        .select()
        .from(cartItems)
        .where(eq(cartItems.cartId, guestCart.id));
      expect(formerGuestItems).toHaveLength(0);
    } finally {
      await db.delete(user).where(eq(user.id, customerId));
    }
  });

  it("does not mutate an item through another cart", async () => {
    const first = await service.getCart({ sessionId: "sess-cart-owner-1", currency: "USD" });
    const second = await service.getCart({ sessionId: "sess-cart-owner-2", currency: "USD" });
    await service.addItem(first.id, variantId, 1);
    const populated = await service.getCart({
      sessionId: "sess-cart-owner-1",
      currency: "USD",
    });

    await expect(service.updateItem(second.id, populated.items[0].id, 2)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("rejects an inactive variant and reports it inactive on later reads", async () => {
    const cart = await service.getCart({ sessionId: "sess-cart-inactive", currency: "USD" });
    await service.addItem(cart.id, variantId, 1);
    await catalogService.updateVariant(variantId, { isActive: false });

    const resolved = await service.getCart({ sessionId: "sess-cart-inactive", currency: "USD" });
    expect(resolved.items[0]).toMatchObject({ isActive: false, available: 0 });
    await expect(service.addItem(cart.id, variantId, 1)).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });
});
