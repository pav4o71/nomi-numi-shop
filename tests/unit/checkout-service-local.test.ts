import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { loadValidatedCredentials } from "../../scripts/drizzle-credentials.mjs";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, inArray, sql } from "drizzle-orm";
import { CheckoutService } from "@/checkout/service";
import { DrizzleCheckoutRepository } from "@/checkout/repository";
import type { CheckoutDb } from "@/checkout/db";
import { CartService } from "@/cart/service";
import { DrizzleCartRepository } from "@/cart/repository";
import { CatalogService } from "@/catalog/service";
import { DrizzleCatalogRepository } from "@/catalog/repository";
import { digestOrderAccessToken } from "@/checkout/access";
import {
  cartItems,
  guestOrderAccessCapabilities,
  inventoryReservations,
  orders,
  orderItems,
  user,
} from "@/db/schema";

function createDeferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = () => resolvePromise();
  });
  return { promise, resolve };
}

describe("CheckoutService integration (local)", () => {
  let pgSql: ReturnType<typeof postgres>;
  let db: CheckoutDb;
  let service: CheckoutService;
  let catalogRepo: DrizzleCatalogRepository;
  let catalogService: CatalogService;
  let cartService: CartService;
  let credentialsLocal: ReturnType<typeof loadValidatedCredentials>;

  let productId: string;
  let variantId: string;

  beforeAll(async () => {
    credentialsLocal = loadValidatedCredentials("test");
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
      slug: "test-checkout-product",
      title: "Test Checkout Product",
      status: "published",
    });
    productId = p.id;
    const v = await catalogService.createVariant(p.id, {
      sku: "TEST-CHECKOUT-1",
      prices: [{ currency: "USD", amountMinor: 2000 }],
    });
    variantId = v.variant.id;
  });

  async function waitForBackendBlocked(blockedPid: number, blockerPid: number) {
    for (let attempt = 0; attempt < 500; attempt += 1) {
      const [row] = await pgSql`
        SELECT ${blockerPid} = ANY(pg_blocking_pids(${blockedPid})) AS blocked
      `;
      if (row.blocked === true) return;
      await new Promise<void>((resolve) => setImmediate(resolve));
    }
    throw new Error("Checkout did not block on the catalog mutation transaction");
  }

  async function runCatalogAuthorityRace(args: {
    sessionId: string;
    idempotencyKey: string;
    mutate: (service: CatalogService) => Promise<unknown>;
  }) {
    const mutationSql = postgres({
      host: credentialsLocal.host,
      port: credentialsLocal.port,
      database: credentialsLocal.database,
      username: credentialsLocal.user,
      password: credentialsLocal.password,
      max: 1,
      connection: { application_name: `${args.idempotencyKey}-mutation` },
      onnotice: () => {},
    });
    const checkoutSql = postgres({
      host: credentialsLocal.host,
      port: credentialsLocal.port,
      database: credentialsLocal.database,
      username: credentialsLocal.user,
      password: credentialsLocal.password,
      max: 1,
      connection: { application_name: `${args.idempotencyKey}-checkout` },
      onnotice: () => {},
    });
    const mutationDb: CheckoutDb = drizzle(mutationSql);
    const checkoutDb: CheckoutDb = drizzle(checkoutSql);
    const [mutationBackend] = await mutationSql`SELECT pg_backend_pid()::integer AS pid`;
    const [checkoutBackend] = await checkoutSql`SELECT pg_backend_pid()::integer AS pid`;
    const mutationPid = Number(mutationBackend.pid);
    const checkoutPid = Number(checkoutBackend.pid);

    const mutationLocked = createDeferred();
    const releaseMutation = createDeferred();
    const mutationRepo = new DrizzleCatalogRepository(mutationDb);
    const originalMutationLock = mutationRepo.lockProduct.bind(mutationRepo);
    mutationRepo.lockProduct = async (executor, lockedProductId) => {
      const product = await originalMutationLock(executor, lockedProductId);
      mutationLocked.resolve();
      await releaseMutation.promise;
      return product;
    };
    const mutationService = new CatalogService(mutationRepo);

    const checkoutCatalogRepo = new DrizzleCatalogRepository(checkoutDb);
    const checkoutCatalogService = new CatalogService(checkoutCatalogRepo);
    let authoritativeReadStarted = false;
    const originalCheckoutDetails =
      checkoutCatalogService.getCheckoutVariantDetails.bind(checkoutCatalogService);
    checkoutCatalogService.getCheckoutVariantDetails = async (...parameters) => {
      authoritativeReadStarted = true;
      return originalCheckoutDetails(...parameters);
    };

    const checkoutCartService = new CartService(
      new DrizzleCartRepository(checkoutDb),
      checkoutCatalogService,
    );
    const checkoutRepo = new DrizzleCheckoutRepository(checkoutDb);
    let orderInsertStarted = false;
    const originalCreateOrder = checkoutRepo.createOrder.bind(checkoutRepo);
    checkoutRepo.createOrder = async (...parameters) => {
      orderInsertStarted = true;
      return originalCreateOrder(...parameters);
    };
    let reservationInsertStarted = false;
    const originalCreateReservations = checkoutRepo.createReservations.bind(checkoutRepo);
    checkoutRepo.createReservations = async (...parameters) => {
      reservationInsertStarted = true;
      return originalCreateReservations(...parameters);
    };
    const checkoutService = new CheckoutService(
      checkoutRepo,
      checkoutCartService,
      checkoutCatalogService,
    );

    const mutationPromise = args.mutate(mutationService);
    await mutationLocked.promise;
    const checkoutPromise = checkoutService.createOrderFromCart(
      { sessionId: args.sessionId, currency: "USD" },
      "race@example.com",
      args.idempotencyKey,
    );

    let preReleaseError: unknown = null;
    try {
      await waitForBackendBlocked(checkoutPid, mutationPid);

      const [activity] = await pgSql`
        SELECT wait_event_type
        FROM pg_stat_activity
        WHERE pid = ${checkoutPid}
      `;
      expect(activity.wait_event_type).toBe("Lock");
      expect(authoritativeReadStarted).toBe(false);
      expect(orderInsertStarted).toBe(false);
      expect(reservationInsertStarted).toBe(false);

      const writeLocks = await pgSql`
        SELECT relation.relname, lock.mode
        FROM pg_locks AS lock
        JOIN pg_class AS relation ON relation.oid = lock.relation
        WHERE lock.pid = ${checkoutPid}
          AND lock.mode = 'RowExclusiveLock'
          AND relation.relname IN ('orders', 'order_items', 'inventory_reservations')
      `;
      expect(writeLocks).toHaveLength(0);

      const [orderCount] = await db
        .select({ count: sql`count(*)`.mapWith(Number) })
        .from(orders)
        .where(eq(orders.idempotencyKey, args.idempotencyKey));
      const [reservationCount] = await db
        .select({ count: sql`count(*)`.mapWith(Number) })
        .from(inventoryReservations);
      expect(orderCount.count).toBe(0);
      expect(reservationCount.count).toBe(0);
    } catch (error) {
      preReleaseError = error;
    } finally {
      releaseMutation.resolve();
    }

    const [mutationResult, checkoutResult] = await Promise.allSettled([
      mutationPromise,
      checkoutPromise,
    ]);
    await Promise.all([mutationSql.end(), checkoutSql.end()]);

    if (preReleaseError) throw preReleaseError;
    if (mutationResult.status === "rejected") throw mutationResult.reason;
    return checkoutResult;
  }

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
    const result = await service.createOrderFromCart(
      { sessionId, currency: "USD" },
      "customer@example.com",
      idempotencyKey,
    );
    const { order } = result;

    // Assert Order
    expect(order).toBeDefined();
    expect(order.orderStatus).toBe("pending");
    expect(order.paymentStatus).toBe("pending");
    expect(order.totalAmount).toBe(6000); // 3 * 2000
    expect(order.idempotencyKey).toBe(idempotencyKey);
    expect(result.guestAccessToken).toBeTruthy();

    const capabilities = await db
      .select()
      .from(guestOrderAccessCapabilities)
      .where(eq(guestOrderAccessCapabilities.orderId, order.id));
    expect(capabilities).toHaveLength(1);
    expect(capabilities[0].tokenDigest).toBe(digestOrderAccessToken(result.guestAccessToken!));
    expect(capabilities[0].tokenDigest).not.toBe(result.guestAccessToken);

    // Assert Order Items
    const [fetchedOrderItems] = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));
    expect(fetchedOrderItems.count).toBe(1);

    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    expect(items[0].quantity).toBe(3);
    expect(items[0].unitPrice).toBe(2000);
    expect(items[0].lineTotal).toBe(6000);
    expect(items[0].title).toBe("Test Checkout Product");
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
    // Add while available, then simulate a last-minute inventory change.
    await catalogService.adjustVariantInventory(variantId, {
      deltaOnHand: 5,
      deltaReserved: 0,
      reason: "restock",
    });

    // Create Cart with 5 items
    const sessionId = "sess-checkout-fail";
    const cart = await cartService.getCart({ sessionId, currency: "USD" });
    await cartService.addItem(cart.id, variantId, 5);
    await catalogService.adjustVariantInventory(variantId, {
      deltaOnHand: -4,
      deltaReserved: 0,
      reason: "manual_adjustment",
    });

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

  it("serializes checkout behind a concurrent reprice and snapshots the committed price", async () => {
    await catalogService.adjustVariantInventory(variantId, {
      deltaOnHand: 2,
      deltaReserved: 0,
      reason: "restock",
    });
    const sessionId = "sess-checkout-reprice-race";
    const cart = await cartService.getCart({ sessionId, currency: "USD" });
    await cartService.addItem(cart.id, variantId, 1);

    const checkoutResult = await runCatalogAuthorityRace({
      sessionId,
      idempotencyKey: "idem-reprice-race",
      mutate: (mutationService) =>
        mutationService.setVariantPrices(variantId, {
          prices: [{ currency: "USD", amountMinor: 2500 }],
        }),
    });

    expect(checkoutResult.status).toBe("fulfilled");
    if (checkoutResult.status !== "fulfilled") throw checkoutResult.reason;
    expect(checkoutResult.value.order.subtotalAmount).toBe(2500);
    expect(checkoutResult.value.order.totalAmount).toBe(2500);
    const [item] = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, checkoutResult.value.order.id));
    expect(item.unitPrice).toBe(2500);
    expect(item.lineTotal).toBe(2500);
  }, 15_000);

  it("rejects checkout after a concurrent variant deactivation commits", async () => {
    await catalogService.adjustVariantInventory(variantId, {
      deltaOnHand: 2,
      deltaReserved: 0,
      reason: "restock",
    });
    const sessionId = "sess-checkout-deactivation-race";
    const cart = await cartService.getCart({ sessionId, currency: "USD" });
    await cartService.addItem(cart.id, variantId, 1);

    const checkoutResult = await runCatalogAuthorityRace({
      sessionId,
      idempotencyKey: "idem-deactivation-race",
      mutate: (mutationService) => mutationService.updateVariant(variantId, { isActive: false }),
    });

    expect(checkoutResult.status).toBe("rejected");
    if (checkoutResult.status !== "rejected") {
      throw new Error("Checkout unexpectedly succeeded after variant deactivation");
    }
    expect(checkoutResult.reason).toMatchObject({ code: "CONFLICT" });
    const [orderCount] = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(orders)
      .where(eq(orders.idempotencyKey, "idem-deactivation-race"));
    const [reservationCount] = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(inventoryReservations);
    const [cartItemCount] = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(cartItems)
      .where(eq(cartItems.cartId, cart.id));
    expect(orderCount.count).toBe(0);
    expect(reservationCount.count).toBe(0);
    expect(cartItemCount.count).toBe(1);
  }, 15_000);

  it("rejects checkout after a concurrent product unpublication commits", async () => {
    await catalogService.adjustVariantInventory(variantId, {
      deltaOnHand: 2,
      deltaReserved: 0,
      reason: "restock",
    });
    const sessionId = "sess-checkout-unpublish-race";
    const cart = await cartService.getCart({ sessionId, currency: "USD" });
    await cartService.addItem(cart.id, variantId, 1);

    const checkoutResult = await runCatalogAuthorityRace({
      sessionId,
      idempotencyKey: "idem-unpublish-race",
      mutate: (mutationService) => mutationService.updateProduct(productId, { status: "archived" }),
    });

    expect(checkoutResult.status).toBe("rejected");
    if (checkoutResult.status !== "rejected") {
      throw new Error("Checkout unexpectedly succeeded after product unpublication");
    }
    expect(checkoutResult.reason).toMatchObject({ code: "CONFLICT" });
    const [orderCount] = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(orders)
      .where(eq(orders.idempotencyKey, "idem-unpublish-race"));
    const [reservationCount] = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(inventoryReservations);
    const [cartItemCount] = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(cartItems)
      .where(eq(cartItems.cartId, cart.id));
    expect(orderCount.count).toBe(0);
    expect(reservationCount.count).toBe(0);
    expect(cartItemCount.count).toBe(1);
  }, 15_000);

  it("allows only one complete checkout to reserve the final available unit", async () => {
    await catalogService.adjustVariantInventory(variantId, {
      deltaOnHand: 1,
      deltaReserved: 0,
      reason: "restock",
    });

    const attempts = [
      {
        sessionId: "sess-checkout-final-unit-a",
        idempotencyKey: "idem-checkout-final-unit-a",
      },
      {
        sessionId: "sess-checkout-final-unit-b",
        idempotencyKey: "idem-checkout-final-unit-b",
      },
    ] as const;
    const carts = [];
    for (const attempt of attempts) {
      const cart = await cartService.getCart({ sessionId: attempt.sessionId, currency: "USD" });
      await cartService.addItem(cart.id, variantId, 1);
      carts.push(cart);
    }

    const firstSql = postgres({
      host: credentialsLocal.host,
      port: credentialsLocal.port,
      database: credentialsLocal.database,
      username: credentialsLocal.user,
      password: credentialsLocal.password,
      max: 1,
      connection: { application_name: "checkout-final-unit-first" },
      onnotice: () => {},
    });
    const secondSql = postgres({
      host: credentialsLocal.host,
      port: credentialsLocal.port,
      database: credentialsLocal.database,
      username: credentialsLocal.user,
      password: credentialsLocal.password,
      max: 1,
      connection: { application_name: "checkout-final-unit-second" },
      onnotice: () => {},
    });
    const firstDb: CheckoutDb = drizzle(firstSql);
    const secondDb: CheckoutDb = drizzle(secondSql);
    const [firstBackend] = await firstSql`SELECT pg_backend_pid()::integer AS pid`;
    const [secondBackend] = await secondSql`SELECT pg_backend_pid()::integer AS pid`;
    const firstPid = Number(firstBackend.pid);
    const secondPid = Number(secondBackend.pid);
    expect(firstPid).not.toBe(secondPid);

    const firstCatalogRepo = new DrizzleCatalogRepository(firstDb);
    const firstProductLocked = createDeferred();
    const releaseFirst = createDeferred();
    const originalFirstProductLock = firstCatalogRepo.lockProduct.bind(firstCatalogRepo);
    firstCatalogRepo.lockProduct = async (...parameters) => {
      const product = await originalFirstProductLock(...parameters);
      firstProductLocked.resolve();
      await releaseFirst.promise;
      return product;
    };
    const firstCatalog = new CatalogService(firstCatalogRepo);
    const firstService = new CheckoutService(
      new DrizzleCheckoutRepository(firstDb),
      new CartService(new DrizzleCartRepository(firstDb), firstCatalog),
      firstCatalog,
    );

    const secondCatalog = new CatalogService(new DrizzleCatalogRepository(secondDb));
    const secondService = new CheckoutService(
      new DrizzleCheckoutRepository(secondDb),
      new CartService(new DrizzleCartRepository(secondDb), secondCatalog),
      secondCatalog,
    );

    const firstPromise = firstService.createOrderFromCart(
      { sessionId: attempts[0].sessionId, currency: "USD" },
      "final-unit-a@example.com",
      attempts[0].idempotencyKey,
    );
    await firstProductLocked.promise;
    const secondPromise = secondService.createOrderFromCart(
      { sessionId: attempts[1].sessionId, currency: "USD" },
      "final-unit-b@example.com",
      attempts[1].idempotencyKey,
    );

    let preReleaseError: unknown = null;
    try {
      await waitForBackendBlocked(secondPid, firstPid);
      const [activity] = await pgSql`
        SELECT wait_event_type
        FROM pg_stat_activity
        WHERE pid = ${secondPid}
      `;
      expect(activity.wait_event_type).toBe("Lock");

      const competingOrders = await db
        .select()
        .from(orders)
        .where(
          inArray(
            orders.idempotencyKey,
            attempts.map((attempt) => attempt.idempotencyKey),
          ),
        );
      const competingReservations = await db.select().from(inventoryReservations);
      expect(competingOrders).toHaveLength(0);
      expect(competingReservations).toHaveLength(0);
    } catch (error) {
      preReleaseError = error;
    } finally {
      releaseFirst.resolve();
    }

    const results = await Promise.allSettled([firstPromise, secondPromise]);
    await Promise.all([firstSql.end({ timeout: 5 }), secondSql.end({ timeout: 5 })]);
    if (preReleaseError) throw preReleaseError;

    const fulfilled = results.filter(
      (result): result is PromiseFulfilledResult<Awaited<typeof firstPromise>> =>
        result.status === "fulfilled",
    );
    const rejected = results.filter(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toMatchObject({ name: "CartError", code: "CONFLICT" });

    const winnerIndex = results.findIndex((result) => result.status === "fulfilled");
    const loserIndex = winnerIndex === 0 ? 1 : 0;
    const winner = fulfilled[0].value;
    const competingOrders = await db
      .select()
      .from(orders)
      .where(
        inArray(
          orders.idempotencyKey,
          attempts.map((attempt) => attempt.idempotencyKey),
        ),
      );
    expect(competingOrders).toHaveLength(1);
    expect(competingOrders[0]).toMatchObject({
      id: winner.order.id,
      idempotencyKey: attempts[winnerIndex].idempotencyKey,
    });
    expect(
      competingOrders.some((order) => order.idempotencyKey === attempts[loserIndex].idempotencyKey),
    ).toBe(false);

    const reservations = await db
      .select()
      .from(inventoryReservations)
      .where(eq(inventoryReservations.orderId, winner.order.id));
    expect(reservations).toHaveLength(1);
    expect(reservations[0]).toMatchObject({
      orderId: winner.order.id,
      variantId,
      quantity: 1,
      status: "active",
    });

    const balance = await catalogService.getVariantInventoryBalance(variantId);
    expect(balance).toMatchObject({ onHand: 1, reserved: 1 });
    expect(balance!.reserved).toBeLessThanOrEqual(balance!.onHand);

    const winnerItems = await db
      .select()
      .from(cartItems)
      .where(eq(cartItems.cartId, carts[winnerIndex].id));
    const loserItems = await db
      .select()
      .from(cartItems)
      .where(eq(cartItems.cartId, carts[loserIndex].id));
    expect(winnerItems).toHaveLength(0);
    expect(loserItems).toHaveLength(1);
    expect(loserItems[0]).toMatchObject({ variantId, quantity: 1 });
  }, 15_000);

  it("serializes concurrent idempotent retries and keeps both guest capabilities valid", async () => {
    await catalogService.adjustVariantInventory(variantId, {
      deltaOnHand: 10,
      deltaReserved: 0,
      reason: "restock",
    });
    const sessionId = "sess-checkout-idempotent";
    const cart = await cartService.getCart({ sessionId, currency: "USD" });
    await cartService.addItem(cart.id, variantId, 2);

    const firstSql = postgres({
      host: credentialsLocal.host,
      port: credentialsLocal.port,
      database: credentialsLocal.database,
      username: credentialsLocal.user,
      password: credentialsLocal.password,
      max: 1,
      connection: { application_name: "guest-capability-first" },
      onnotice: () => {},
    });
    const secondSql = postgres({
      host: credentialsLocal.host,
      port: credentialsLocal.port,
      database: credentialsLocal.database,
      username: credentialsLocal.user,
      password: credentialsLocal.password,
      max: 1,
      connection: { application_name: "guest-capability-second" },
      onnotice: () => {},
    });
    const firstDb: CheckoutDb = drizzle(firstSql);
    const secondDb: CheckoutDb = drizzle(secondSql);
    const [firstBackend] = await firstSql`SELECT pg_backend_pid()::integer AS pid`;
    const [secondBackend] = await secondSql`SELECT pg_backend_pid()::integer AS pid`;
    const firstPid = Number(firstBackend.pid);
    const secondPid = Number(secondBackend.pid);
    expect(firstPid).not.toBe(secondPid);

    const firstRepo = new DrizzleCheckoutRepository(firstDb);
    const firstLockAcquired = createDeferred();
    const releaseFirst = createDeferred();
    const originalFirstLock = firstRepo.lockIdempotencyKey.bind(firstRepo);
    firstRepo.lockIdempotencyKey = async (...parameters) => {
      await originalFirstLock(...parameters);
      firstLockAcquired.resolve();
      await releaseFirst.promise;
    };
    const firstCatalog = new CatalogService(new DrizzleCatalogRepository(firstDb));
    const firstService = new CheckoutService(
      firstRepo,
      new CartService(new DrizzleCartRepository(firstDb), firstCatalog),
      firstCatalog,
    );

    const secondRepo = new DrizzleCheckoutRepository(secondDb);
    const secondCatalog = new CatalogService(new DrizzleCatalogRepository(secondDb));
    const secondService = new CheckoutService(
      secondRepo,
      new CartService(new DrizzleCartRepository(secondDb), secondCatalog),
      secondCatalog,
    );

    const firstPromise = firstService.createOrderFromCart(
      { sessionId, currency: "USD" },
      "Customer@Example.com",
      "same-attempt",
    );
    await firstLockAcquired.promise;
    const secondPromise = secondService.createOrderFromCart(
      { sessionId, currency: "USD" },
      "customer@example.com",
      "same-attempt",
    );

    let results;
    try {
      await waitForBackendBlocked(secondPid, firstPid);
      const [activity] = await pgSql`
        SELECT wait_event_type
        FROM pg_stat_activity
        WHERE pid = ${secondPid}
      `;
      expect(activity.wait_event_type).toBe("Lock");
      releaseFirst.resolve();
      results = await Promise.all([firstPromise, secondPromise]);
    } finally {
      releaseFirst.resolve();
      await Promise.all([firstSql.end({ timeout: 5 }), secondSql.end({ timeout: 5 })]);
    }

    expect(results[0].order.id).toBe(results[1].order.id);
    expect(results.filter((result) => result.created)).toHaveLength(1);
    expect(results[0].guestAccessToken).toBeTruthy();
    expect(results[1].guestAccessToken).toBeTruthy();
    expect(results[0].guestAccessToken).not.toBe(results[1].guestAccessToken);
    const [orderCount] = await db.select({ count: sql`count(*)`.mapWith(Number) }).from(orders);
    const [reservationCount] = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(inventoryReservations);
    const capabilities = await db
      .select()
      .from(guestOrderAccessCapabilities)
      .where(eq(guestOrderAccessCapabilities.orderId, results[0].order.id));
    expect(orderCount.count).toBe(1);
    expect(reservationCount.count).toBe(1);
    expect(capabilities).toHaveLength(2);

    for (const result of results) {
      const readable = await service.getOrderForViewer(result.order.id, {
        guestAccessToken: result.guestAccessToken ?? undefined,
      });
      expect(readable.items).toHaveLength(1);
    }
  });

  it("adds a recovery capability without invalidating the original capability", async () => {
    await catalogService.adjustVariantInventory(variantId, {
      deltaOnHand: 2,
      deltaReserved: 0,
      reason: "restock",
    });
    const sessionId = "sess-checkout-recovery";
    const cart = await cartService.getCart({ sessionId, currency: "USD" });
    await cartService.addItem(cart.id, variantId, 1);

    const original = await service.createOrderFromCart(
      { sessionId, currency: "USD" },
      "recovery@example.com",
      "recovery-attempt",
    );
    const recovered = await service.createOrderFromCart(
      { sessionId, currency: "USD" },
      "recovery@example.com",
      "recovery-attempt",
    );

    expect(recovered.order.id).toBe(original.order.id);
    expect(original.created).toBe(true);
    expect(recovered.created).toBe(false);
    expect(original.guestAccessToken).toBeTruthy();
    expect(recovered.guestAccessToken).toBeTruthy();
    expect(recovered.guestAccessToken).not.toBe(original.guestAccessToken);

    const [orderCount] = await db.select({ count: sql`count(*)`.mapWith(Number) }).from(orders);
    const [reservationCount] = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(inventoryReservations);
    const capabilities = await db
      .select()
      .from(guestOrderAccessCapabilities)
      .where(eq(guestOrderAccessCapabilities.orderId, original.order.id));
    expect(orderCount.count).toBe(1);
    expect(reservationCount.count).toBe(1);
    expect(capabilities).toHaveLength(2);

    for (const token of [original.guestAccessToken, recovered.guestAccessToken]) {
      const readable = await service.getOrderForViewer(original.order.id, {
        guestAccessToken: token ?? undefined,
      });
      expect(readable.id).toBe(original.order.id);
    }
  });

  it("rejects missing, random, idempotency-key, and cross-order guest capabilities", async () => {
    await catalogService.adjustVariantInventory(variantId, {
      deltaOnHand: 4,
      deltaReserved: 0,
      reason: "restock",
    });

    const firstCart = await cartService.getCart({
      sessionId: "sess-guest-access-first",
      currency: "USD",
    });
    await cartService.addItem(firstCart.id, variantId, 1);
    const first = await service.createOrderFromCart(
      { sessionId: "sess-guest-access-first", currency: "USD" },
      "first-access@example.com",
      "first-access-key",
    );

    const secondCart = await cartService.getCart({
      sessionId: "sess-guest-access-second",
      currency: "USD",
    });
    await cartService.addItem(secondCart.id, variantId, 1);
    const second = await service.createOrderFromCart(
      { sessionId: "sess-guest-access-second", currency: "USD" },
      "second-access@example.com",
      "second-access-key",
    );

    await expect(service.getOrderForViewer(first.order.id, {})).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(
      service.getOrderForViewer(first.order.id, { guestAccessToken: "random-capability" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      service.getOrderForViewer(first.order.id, {
        guestAccessToken: first.order.idempotencyKey,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      service.getOrderForViewer(second.order.id, {
        guestAccessToken: first.guestAccessToken ?? undefined,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    const readable = await service.getOrderForViewer(first.order.id, {
      guestAccessToken: first.guestAccessToken ?? undefined,
    });
    expect(readable.id).toBe(first.order.id);
  });

  it("rejects reuse of an idempotency key for a changed request", async () => {
    await catalogService.adjustVariantInventory(variantId, {
      deltaOnHand: 10,
      deltaReserved: 0,
      reason: "restock",
    });
    const sessionId = "sess-checkout-conflict";
    const cart = await cartService.getCart({ sessionId, currency: "USD" });
    await cartService.addItem(cart.id, variantId, 1);
    await service.createOrderFromCart(
      { sessionId, currency: "USD" },
      "first@example.com",
      "reused-key",
    );

    await expect(
      service.createOrderFromCart(
        { sessionId, currency: "USD" },
        "different@example.com",
        "reused-key",
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("releases inventory and cancels an expired reservation", async () => {
    await catalogService.adjustVariantInventory(variantId, {
      deltaOnHand: 3,
      deltaReserved: 0,
      reason: "restock",
    });
    const sessionId = "sess-checkout-expiry";
    const cart = await cartService.getCart({ sessionId, currency: "USD" });
    await cartService.addItem(cart.id, variantId, 1);
    const created = await service.createOrderFromCart(
      { sessionId, currency: "USD" },
      "expiry@example.com",
      "expiry-key",
    );
    await db
      .update(inventoryReservations)
      .set({ expiresAt: new Date("2020-01-01T00:00:00Z") })
      .where(eq(inventoryReservations.orderId, created.order.id));

    expect(await service.expireReservations(new Date("2020-01-02T00:00:00Z"))).toBe(1);
    const [reservation] = await db
      .select()
      .from(inventoryReservations)
      .where(eq(inventoryReservations.orderId, created.order.id));
    const [order] = await db.select().from(orders).where(eq(orders.id, created.order.id));
    expect(reservation.status).toBe("expired");
    expect(order).toMatchObject({
      orderStatus: "cancelled",
      paymentStatus: "failed",
      fulfillmentStatus: "cancelled",
    });
    expect(await catalogService.getVariantInventoryBalance(variantId)).toMatchObject({
      onHand: 3,
      reserved: 0,
    });
  });

  it("allows only the exact customer owner to read a customer order", async () => {
    const customerId = "checkout-customer-owner";
    await db
      .insert(user)
      .values({
        id: customerId,
        name: "Checkout Customer",
        email: "checkout-owner@example.com",
        emailVerified: true,
        role: "customer",
      })
      .onConflictDoNothing();
    await catalogService.adjustVariantInventory(variantId, {
      deltaOnHand: 2,
      deltaReserved: 0,
      reason: "restock",
    });
    const cart = await cartService.getCart({ customerId, currency: "USD" });
    await cartService.addItem(cart.id, variantId, 1);
    const created = await service.createOrderFromCart(
      { customerId, currency: "USD" },
      "checkout-owner@example.com",
      "customer-order-key",
    );

    expect(created.guestAccessToken).toBeNull();
    const customerCapabilities = await db
      .select()
      .from(guestOrderAccessCapabilities)
      .where(eq(guestOrderAccessCapabilities.orderId, created.order.id));
    expect(customerCapabilities).toHaveLength(0);
    await expect(
      service.getOrderForViewer(created.order.id, { customerId: "another-customer" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    const readable = await service.getOrderForViewer(created.order.id, { customerId });
    expect(readable.customerId).toBe(customerId);
  });
});
