import { eq } from "drizzle-orm";
import { cartItems } from "@/db/schema";
import { DrizzleCheckoutRepository } from "./repository";
import { CartService } from "@/cart/service";
import { CatalogService } from "@/catalog/service";
import { createCatalogId } from "@/catalog/ids";

export class CheckoutService {
  constructor(
    private readonly repo: DrizzleCheckoutRepository,
    private readonly cart: CartService,
    private readonly catalog: CatalogService,
  ) {}

  async createOrderFromCart(
    cartParams: { customerId?: string; sessionId?: string; currency: string },
    email: string,
    idempotencyKey: string,
  ) {
    // Pre-flight: Resolve authoritative cart outside the transaction to reduce lock duration
    const cart = await this.cart.getCart(cartParams);

    if (cart.items.length === 0) {
      throw new Error("Cart is empty");
    }

    const invalidItems = cart.items.filter((i) => !i.isActive || i.available < i.quantity);
    if (invalidItems.length > 0) {
      throw new Error("Some items in the cart are unavailable or inactive");
    }

    return this.repo.transaction(async (tx) => {
      // 1. Idempotency Check (Very first step inside tx)
      const existingOrder = await this.repo.getOrderByIdempotencyKey(tx, idempotencyKey);
      if (existingOrder) {
        return existingOrder;
      }

      const orderId = `ord_${createCatalogId("chk")}`;

      // 3. Atomically Reserve Inventory
      // Because CheckoutExecutor and CatalogExecutor are structurally identical (both use same PG driver and schema),
      // we can safely cast the transaction to pass it to CatalogService.
      const catalogTx = tx as any;

      const reservationItems = cart.items.map((i) => ({
        variantId: i.variantId,
        quantity: i.quantity,
      }));

      await this.catalog.reserveInventoryForCheckout(
        reservationItems,
        `order_${orderId}`,
        catalogTx,
      );

      // 4. Create Order and Snapshots
      const orderData = {
        id: orderId,
        customerId: cart.customerId ?? null,
        email,
        currency: cart.currency,
        orderStatus: "pending" as const,
        paymentStatus: "unpaid" as const,
        fulfillmentStatus: "unfulfilled" as const,
        totalAmount: cart.totalAmount,
        idempotencyKey,
      };

      const itemsData = cart.items.map((item) => ({
        id: `oi_${createCatalogId("chk")}`,
        orderId,
        variantId: item.variantId,
        productId: item.productId,
        sku: item.sku,
        title: item.title,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
      }));

      const order = await this.repo.createOrder(tx, orderData, itemsData);

      // 5. Empty Cart
      await (tx as any).delete(cartItems).where(eq(cartItems.cartId, cart.id));

      return order;
    });
  }
  async processPaymentWebhook(orderId: string, isSuccess: boolean, transactionId: string) {
    return this.repo.transaction(async (tx) => {
      // 1. Lock and load the order securely to prevent TOCTOU race conditions
      const order = await this.repo.getOrderByIdForUpdate(tx, orderId);
      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }

      // Idempotency / State machine check
      if (order.paymentStatus !== "unpaid" && order.paymentStatus !== "pending") {
        return order; // Already processed
      }

      // 2. Fetch order items (the snapshot)
      const items = await this.repo.getOrderItems(tx, orderId);
      const inventoryItems = items
        .filter((i) => i.variantId !== null)
        .map((i) => ({ variantId: i.variantId!, quantity: i.quantity }));

      // 3. Finalize Inventory (commit sale or release reservation)
      await this.catalog.finalizeCheckoutInventory(
        inventoryItems,
        isSuccess,
        `payment_${transactionId}`,
        tx as any,
      );

      // 4. Update Order Status
      const updatedOrder = await this.repo.updateOrderStatus(tx, orderId, {
        paymentStatus: isSuccess ? "paid" : "failed",
        orderStatus: isSuccess ? "confirmed" : "cancelled",
      });

      return updatedOrder;
    });
  }
}
