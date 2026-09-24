import { DrizzleCartRepository } from "./repository";
import { CatalogService } from "@/catalog/service";
import { carts } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { CatalogCurrency } from "@/catalog/money";
import type { CatalogExecutor } from "@/catalog/db";
import { isCatalogError } from "@/catalog/errors";
import { cartConflict, cartNotFound, invalidCartInput } from "./errors";

export type ResolvedCartItem = {
  id: string;
  variantId: string;
  productId: string;
  title: string;
  sku: string | null;
  selectedOptions: Array<{ name: string; value: string }>;
  unitPrice: number;
  quantity: number;
  available: number;
  isActive: boolean;
};

export type ResolvedCart = {
  id: string;
  customerId: string | null;
  sessionId: string | null;
  currency: CatalogCurrency;
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
    currency: CatalogCurrency;
  }): Promise<ResolvedCart> {
    const { cart, items } = await this.repo.transaction(async (tx) => {
      this.assertIdentity(params);
      await this.repo.lockCartIdentity(tx, params);
      await this.repo.deleteExpiredCartsForIdentity(tx, params);
      let cart = await this.repo.getCartByIdentityForUpdate(tx, params);

      if (!cart) {
        cart = await this.repo.createCart(tx, params);
        cart ??= await this.repo.getCartByIdentityForUpdate(tx, params);
      }

      if (!cart) throw cartConflict("Cart could not be created");

      const items = await this.repo.getCartItems(tx, cart.id);
      return { cart, items };
    });

    const resolvedItems: ResolvedCartItem[] = [];
    let totalAmount = 0;

    for (const item of items) {
      try {
        const variant = await this.catalog.getCheckoutVariantDetails(
          item.variantId,
          cart.currency as CatalogCurrency,
        );

        resolvedItems.push({
          id: item.id,
          variantId: item.variantId,
          productId: variant.productId,
          title: variant.title,
          sku: variant.sku,
          selectedOptions: variant.selectedOptions,
          unitPrice: variant.unitPrice,
          quantity: item.quantity,
          available: variant.available,
          isActive: true,
        });
        totalAmount += variant.unitPrice * item.quantity;
      } catch (error) {
        if (!isCatalogError(error)) throw error;
        resolvedItems.push({
          id: item.id,
          variantId: item.variantId,
          productId: "",
          title: "Unknown/Inactive Item",
          sku: null,
          selectedOptions: [],
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
      currency: cart.currency as CatalogCurrency,
      items: resolvedItems,
      totalAmount,
    };
  }

  async addItem(cartId: string, variantId: string, quantity: number) {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw invalidCartInput("Quantity must be a positive integer");
    }
    return this.repo.transaction(async (tx) => {
      const cart = await this.repo.getCartByIdForUpdate(tx, cartId);
      if (!cart) throw cartNotFound();
      const variant = await this.catalog.getCheckoutVariantDetails(
        variantId,
        cart.currency as CatalogCurrency,
        tx as CatalogExecutor,
      );
      const existing = (await this.repo.getCartItems(tx, cartId)).find(
        (item) => item.variantId === variantId,
      );
      const nextQuantity = (existing?.quantity ?? 0) + quantity;
      if (nextQuantity > variant.available) {
        throw cartConflict("Requested quantity exceeds available inventory");
      }
      await this.repo.setCartItemQuantity(tx, cartId, variantId, nextQuantity);
    });
  }

  async updateItem(cartId: string, itemId: string, quantity: number) {
    if (!Number.isInteger(quantity) || quantity < 0) {
      throw invalidCartInput("Quantity must be a non-negative integer");
    }
    return this.repo.transaction(async (tx) => {
      const cart = await this.repo.getCartByIdForUpdate(tx, cartId);
      if (!cart) throw cartNotFound();
      const item = await this.repo.getCartItem(tx, cartId, itemId);
      if (!item) throw cartNotFound("Cart item not found");
      if (quantity <= 0) {
        await this.repo.deleteCartItem(tx, cartId, itemId);
      } else {
        const variant = await this.catalog.getCheckoutVariantDetails(
          item.variantId,
          cart.currency as CatalogCurrency,
          tx as CatalogExecutor,
        );
        if (quantity > variant.available) {
          throw cartConflict("Requested quantity exceeds available inventory");
        }
        await this.repo.setCartItemQuantity(tx, cartId, item.variantId, quantity);
      }
    });
  }

  async getCartForCheckout(
    params: { customerId?: string; sessionId?: string; currency: CatalogCurrency },
    tx: CatalogExecutor,
  ): Promise<ResolvedCart> {
    this.assertIdentity(params);
    const cart = await this.repo.getCartByIdentityForUpdate(tx, params);
    if (!cart || cart.currency !== params.currency) throw cartNotFound();
    const items = await this.repo.getCartItems(tx, cart.id);
    await this.catalog.lockCheckoutCatalogAuthority(
      items.map((item) => item.variantId),
      tx,
    );
    const resolvedItems: ResolvedCartItem[] = [];
    let totalAmount = 0;
    for (const item of items) {
      const variant = await this.catalog.getCheckoutVariantDetails(
        item.variantId,
        params.currency,
        tx,
      );
      if (item.quantity > variant.available) {
        throw cartConflict("Some items exceed available inventory");
      }
      resolvedItems.push({
        id: item.id,
        variantId: item.variantId,
        productId: variant.productId,
        title: variant.title,
        sku: variant.sku,
        selectedOptions: variant.selectedOptions,
        unitPrice: variant.unitPrice,
        quantity: item.quantity,
        available: variant.available,
        isActive: true,
      });
      totalAmount += variant.unitPrice * item.quantity;
    }
    return {
      id: cart.id,
      customerId: cart.customerId,
      sessionId: cart.sessionId,
      currency: params.currency,
      items: resolvedItems,
      totalAmount,
    };
  }

  async mergeCart(sessionId: string, customerId: string) {
    return this.repo.transaction(async (tx) => {
      await this.repo.lockCartIdentity(tx, { customerId });
      await this.repo.lockCartIdentity(tx, { sessionId });
      await this.repo.deleteExpiredCartsForIdentity(tx, { customerId, sessionId });
      const anonCart = await this.repo.getCartBySession(tx, sessionId);
      if (!anonCart) return;

      const customerCart = await this.repo.getCartByCustomer(tx, customerId);

      if (!customerCart) {
        // Just link anon cart to customer
        await tx
          .update(carts)
          .set({ customerId, sessionId: null })
          .where(eq(carts.id, anonCart.id));
        return;
      }

      // Merge items
      const anonItems = await this.repo.getCartItems(tx, anonCart.id);
      for (const item of anonItems) {
        await this.repo.incrementCartItemQuantity(
          tx,
          customerCart.id,
          item.variantId,
          item.quantity,
        );
      }

      await this.repo.deleteCart(tx, anonCart.id);
    });
  }

  async clearCart(cartId: string) {
    return this.repo.transaction(async (tx) => {
      await this.repo.deleteCartItems(tx, cartId);
    });
  }

  private assertIdentity(params: { customerId?: string; sessionId?: string }) {
    if (Boolean(params.customerId) === Boolean(params.sessionId)) {
      throw invalidCartInput("Exactly one cart owner is required");
    }
  }
}
