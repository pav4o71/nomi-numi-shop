import { DrizzleCartRepository } from "./repository";
import { CatalogService } from "@/catalog/service";

export type ResolvedCartItem = {
  id: string;
  variantId: string;
  productId: string;
  title: string;
  sku: string | null;
  unitPrice: number;
  quantity: number;
  available: number;
  isActive: boolean;
};

export type ResolvedCart = {
  id: string;
  customerId: string | null;
  sessionId: string | null;
  currency: string;
  items: ResolvedCartItem[];
  totalAmount: number;
};

export class CartService {
  constructor(
    private readonly repo: DrizzleCartRepository,
    private readonly catalog: CatalogService,
  ) {}

  async getCart(params: {
    customerId?: string;
    sessionId?: string;
    currency: string;
  }): Promise<ResolvedCart> {
    // Phase 1: Resolve or create the cart and fetch its items inside a fast transaction
    const { cart, items } = await this.repo.transaction(async (tx) => {
      let cart = null;

      if (params.customerId) {
        cart = await this.repo.getCartByCustomer(tx, params.customerId);
      } else if (params.sessionId) {
        cart = await this.repo.getCartBySession(tx, params.sessionId);
      }

      if (!cart) {
        cart = await this.repo.createCart(tx, params);
      }

      const items = await this.repo.getCartItems(tx, cart.id);
      return { cart, items };
    });

    // Phase 2: Resolve catalog details (pricing/inventory) OUTSIDE the cart transaction
    // This prevents connection pool deadlocks caused by opening nested transactions!
    const resolvedItems: ResolvedCartItem[] = [];
    let totalAmount = 0;

    for (const item of items) {
      try {
        const variant = await this.catalog.getVariantDetails(item.variantId);

        // Ensure price exists for cart currency
        const priceObj = variant.prices.find((p) => p.currency === cart.currency);
        const unitPrice = priceObj?.amountMinor ?? 0;
        const available =
          (variant.inventoryBalance?.onHand ?? 0) - (variant.inventoryBalance?.reserved ?? 0);

        resolvedItems.push({
          id: item.id,
          variantId: item.variantId,
          productId: variant.productId,
          title: variant.sku || variant.id,
          sku: variant.sku,
          unitPrice,
          quantity: item.quantity,
          available: Math.max(0, available),
          isActive: true && priceObj !== undefined,
        });

        if (priceObj) {
          totalAmount += unitPrice * item.quantity;
        }
      } catch (e) {
        // Variant deleted or not found
        resolvedItems.push({
          id: item.id,
          variantId: item.variantId,
          productId: "",
          title: "Unknown/Inactive Item",
          sku: null,
          unitPrice: 0,
          quantity: item.quantity,
          available: 0,
          isActive: false,
        });
      }
    }

    return {
      id: cart.id,
      customerId: cart.customerId,
      sessionId: cart.sessionId,
      currency: cart.currency,
      items: resolvedItems,
      totalAmount,
    };
  }

  async addItem(cartId: string, variantId: string, quantity: number) {
    return this.repo.transaction(async (tx) => {
      const cart = await this.repo.getCartById(tx, cartId);
      if (!cart) throw new Error("Cart not found");

      const items = await this.repo.getCartItems(tx, cart.id);
      const existing = items.find((i) => i.variantId === variantId);
      const newQuantity = (existing?.quantity ?? 0) + quantity;

      await this.repo.upsertCartItem(tx, cartId, variantId, newQuantity);
    });
  }

  async updateItem(cartId: string, itemId: string, quantity: number) {
    return this.repo.transaction(async (tx) => {
      if (quantity <= 0) {
        await this.repo.deleteCartItem(tx, itemId);
      } else {
        // Fetch item to get variantId, then upsert
        const items = await this.repo.getCartItems(tx, cartId);
        const item = items.find((i) => i.id === itemId);
        if (item) {
          await this.repo.upsertCartItem(tx, cartId, item.variantId, quantity);
        }
      }
    });
  }

  async mergeCart(sessionId: string, customerId: string) {
    return this.repo.transaction(async (tx) => {
      const anonCart = await this.repo.getCartBySession(tx, sessionId);
      if (!anonCart) return;

      const customerCart = await this.repo.getCartByCustomer(tx, customerId);

      if (!customerCart) {
        // Just link anon cart to customer
        await tx
          .update(require("@/db/schema").carts)
          .set({ customerId, sessionId: null })
          .where(require("drizzle-orm").eq(require("@/db/schema").carts.id, anonCart.id));
        return;
      }

      // Merge items
      const anonItems = await this.repo.getCartItems(tx, anonCart.id);
      for (const item of anonItems) {
        const existingItems = await this.repo.getCartItems(tx, customerCart.id);
        const existing = existingItems.find((i) => i.variantId === item.variantId);
        const newQuantity = (existing?.quantity ?? 0) + item.quantity;
        await this.repo.upsertCartItem(tx, customerCart.id, item.variantId, newQuantity);
      }

      await this.repo.deleteCart(tx, anonCart.id);
    });
  }

  async clearCart(cartId: string) {
    return this.repo.transaction(async (tx) => {
      await this.repo.deleteCartItems(tx, cartId);
    });
  }
}
