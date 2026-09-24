import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";

import { isCartError } from "@/cart/errors";
import { CartService, type ResolvedCart } from "@/cart/service";
import type { CatalogExecutor } from "@/catalog/db";
import { createCatalogId } from "@/catalog/ids";
import type { CatalogCurrency } from "@/catalog/money";
import { CatalogService } from "@/catalog/service";
import { cartItems } from "@/db/schema";
import { createOrderAccessToken, digestOrderAccessToken } from "./access";
import { checkoutConflict, checkoutNotFound, invalidCheckoutInput } from "./errors";
import { DrizzleCheckoutRepository } from "./repository";

type CartIdentity = {
  customerId?: string;
  sessionId?: string;
  currency: CatalogCurrency;
};

export class CheckoutService {
  constructor(
    private readonly repo: DrizzleCheckoutRepository,
    private readonly cart: CartService,
    private readonly catalog: CatalogService,
  ) {}

  async createOrderFromCart(cartParams: CartIdentity, email: string, idempotencyKey: string) {
    await this.expireReservations();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !idempotencyKey.trim()) {
      throw invalidCheckoutInput("Email and idempotency key are required");
    }
    const scope = this.getIdempotencyScope(cartParams);

    return this.repo.transaction(async (tx) => {
      await this.repo.lockIdempotencyKey(tx, scope, idempotencyKey);
      const existing = await this.repo.getOrderByIdempotencyKey(tx, scope, idempotencyKey);
      if (existing) {
        if (existing.email !== normalizedEmail || existing.currency !== cartParams.currency) {
          throw checkoutConflict("Idempotency key was already used for a different request");
        }

        let currentCart: ResolvedCart | null = null;
        try {
          currentCart = await this.cart.getCartForCheckout(
            cartParams,
            tx as unknown as CatalogExecutor,
          );
        } catch (error) {
          if (!isCartError(error) || error.code !== "NOT_FOUND") throw error;
        }
        if (
          currentCart &&
          currentCart.items.length > 0 &&
          this.fingerprint(normalizedEmail, currentCart) !== existing.requestFingerprint
        ) {
          throw checkoutConflict("Idempotency key was already used for a different cart");
        }

        if (existing.customerId) {
          return { order: existing, guestAccessToken: null, created: false };
        }
        const guestAccessToken = createOrderAccessToken();
        await this.repo.insertGuestAccessCapability(
          tx,
          existing.id,
          digestOrderAccessToken(guestAccessToken),
        );
        return { order: existing, guestAccessToken, created: false };
      }

      const resolvedCart = await this.cart.getCartForCheckout(
        cartParams,
        tx as unknown as CatalogExecutor,
      );
      if (resolvedCart.items.length === 0) throw checkoutConflict("Cart is empty");

      const orderId = createCatalogId("ord");
      const requestFingerprint = this.fingerprint(normalizedEmail, resolvedCart);
      const guestAccessToken = cartParams.customerId ? null : createOrderAccessToken();
      const reservationItems = resolvedCart.items.map((item) => ({
        variantId: item.variantId,
        quantity: item.quantity,
      }));

      await this.catalog.reserveInventoryForCheckout(
        reservationItems,
        `order:${orderId}`,
        tx as unknown as CatalogExecutor,
      );

      const order = await this.repo.createOrder(
        tx,
        {
          id: orderId,
          customerId: cartParams.customerId ?? null,
          email: normalizedEmail,
          currency: resolvedCart.currency,
          orderStatus: "pending",
          paymentStatus: "pending",
          fulfillmentStatus: "unfulfilled",
          subtotalAmount: resolvedCart.totalAmount,
          shippingAmount: 0,
          taxAmount: 0,
          totalAmount: resolvedCart.totalAmount,
          idempotencyScope: scope,
          idempotencyKey,
          requestFingerprint,
        },
        resolvedCart.items.map((item) => ({
          id: createCatalogId("oi"),
          orderId,
          variantId: item.variantId,
          productId: item.productId,
          sku: item.sku,
          title: item.title,
          selectedOptions: item.selectedOptions,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          lineTotal: item.unitPrice * item.quantity,
        })),
      );

      if (guestAccessToken) {
        await this.repo.insertGuestAccessCapability(
          tx,
          orderId,
          digestOrderAccessToken(guestAccessToken),
        );
      }

      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      await this.repo.createReservations(
        tx,
        reservationItems.map((item) => ({
          id: createCatalogId("res"),
          orderId,
          variantId: item.variantId,
          quantity: item.quantity,
          status: "active",
          expiresAt,
        })),
      );
      await tx.delete(cartItems).where(eq(cartItems.cartId, resolvedCart.id));

      return { order, guestAccessToken, created: true };
    });
  }

  async getOrderForViewer(
    orderId: string,
    viewer: { customerId?: string; guestAccessToken?: string },
  ) {
    return this.repo.transaction(async (tx) => {
      const order = await this.repo.getOrderById(tx, orderId);
      if (!order) throw checkoutNotFound();
      const customerOwnsOrder =
        Boolean(viewer.customerId) && order.customerId === viewer.customerId;
      const guestOwnsOrder =
        !order.customerId &&
        Boolean(viewer.guestAccessToken) &&
        (await this.repo.hasGuestAccessCapability(
          tx,
          orderId,
          digestOrderAccessToken(viewer.guestAccessToken!),
        ));
      if (!customerOwnsOrder && !guestOwnsOrder) throw checkoutNotFound();
      const items = await this.repo.getOrderItems(tx, orderId);
      return { ...order, items };
    });
  }

  async listCustomerOrders(customerId: string) {
    return this.repo.transaction((tx) => this.repo.listOrdersForCustomer(tx, customerId));
  }

  async processPaymentWebhook(orderId: string, isSuccess: boolean, transactionId: string) {
    return this.repo.transaction(async (tx) => {
      const order = await this.repo.getOrderByIdForUpdate(tx, orderId);
      if (!order) throw checkoutNotFound();
      const eventInserted = await this.repo.insertPaymentEvent(tx, {
        id: createCatalogId("pay_evt"),
        orderId,
        provider: "mock",
        providerEventId: transactionId,
        status: isSuccess ? "paid" : "failed",
      });
      if (!eventInserted || order.paymentStatus !== "pending") return order;

      const reservations = await this.repo.getReservationsForOrderForUpdate(tx, orderId);
      const activeReservations = reservations.filter(
        (reservation) => reservation.status === "active",
      );
      if (activeReservations.length === 0) {
        throw checkoutConflict("Order has no active inventory reservation");
      }
      await this.catalog.finalizeCheckoutInventory(
        activeReservations.map((reservation) => ({
          variantId: reservation.variantId,
          quantity: reservation.quantity,
        })),
        isSuccess,
        `payment:${transactionId}:order:${orderId}`,
        tx as unknown as CatalogExecutor,
      );
      await this.repo.updateReservationStatus(
        tx,
        activeReservations.map((reservation) => reservation.id),
        isSuccess ? "committed" : "released",
      );
      return this.repo.updateOrderStatus(tx, orderId, {
        paymentStatus: isSuccess ? "paid" : "failed",
        orderStatus: isSuccess ? "confirmed" : "cancelled",
        fulfillmentStatus: isSuccess ? "unfulfilled" : "cancelled",
      });
    });
  }

  async expireReservations(now: Date = new Date()): Promise<number> {
    const candidates = await this.repo.transaction((tx) =>
      this.repo.listExpiredReservationOrderIds(tx, now),
    );
    let expired = 0;
    for (const candidate of candidates) {
      const changed = await this.repo.transaction(async (tx) => {
        const order = await this.repo.getOrderByIdForUpdate(tx, candidate.orderId);
        if (!order || order.paymentStatus !== "pending") return false;
        const reservations = await this.repo.getReservationsForOrderForUpdate(tx, order.id);
        const active = reservations.filter(
          (reservation) => reservation.status === "active" && reservation.expiresAt < now,
        );
        if (active.length === 0) return false;
        await this.catalog.finalizeCheckoutInventory(
          active.map((reservation) => ({
            variantId: reservation.variantId,
            quantity: reservation.quantity,
          })),
          false,
          `expiration:order:${order.id}`,
          tx as unknown as CatalogExecutor,
        );
        await this.repo.updateReservationStatus(
          tx,
          active.map((reservation) => reservation.id),
          "expired",
        );
        await this.repo.updateOrderStatus(tx, order.id, {
          orderStatus: "cancelled",
          paymentStatus: "failed",
          fulfillmentStatus: "cancelled",
        });
        return true;
      });
      if (changed) expired += 1;
    }
    return expired;
  }

  private getIdempotencyScope(params: CartIdentity): string {
    if (Boolean(params.customerId) === Boolean(params.sessionId)) {
      throw invalidCheckoutInput("Exactly one checkout owner is required");
    }
    return params.customerId ? `customer:${params.customerId}` : `session:${params.sessionId}`;
  }

  private fingerprint(email: string, cart: ResolvedCart): string {
    const lines = cart.items
      .map((item) => `${item.variantId}:${item.quantity}`)
      .sort((a, b) => a.localeCompare(b));
    return createHash("sha256")
      .update(JSON.stringify({ email, currency: cart.currency, lines }))
      .digest("hex");
  }
}
