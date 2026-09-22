import { eq, and, isNull, sql } from "drizzle-orm";
import { carts, cartItems } from "@/db/schema";
import { CartDb, CartExecutor } from "./db";
import { createCatalogId } from "@/catalog/ids";

export class DrizzleCartRepository {
  constructor(private readonly db: CartDb) {}

  async transaction<T>(callback: (tx: CartExecutor) => Promise<T>): Promise<T> {
    return this.db.transaction(callback);
  }

  async getCartById(tx: CartExecutor, cartId: string) {
    const [cart] = await tx.select().from(carts).where(eq(carts.id, cartId));
    return cart ?? null;
  }

  async getCartByCustomer(tx: CartExecutor, customerId: string) {
    const [cart] = await tx.select().from(carts).where(eq(carts.customerId, customerId));
    return cart ?? null;
  }

  async getCartBySession(tx: CartExecutor, sessionId: string) {
    const [cart] = await tx
      .select()
      .from(carts)
      .where(and(eq(carts.sessionId, sessionId), isNull(carts.customerId)));
    return cart ?? null;
  }

  async createCart(
    tx: CartExecutor,
    params: { customerId?: string; sessionId?: string; currency: string },
  ) {
    const id = createCatalogId("crt");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 day expiration

    const [cart] = await tx
      .insert(carts)
      .values({
        id,
        customerId: params.customerId ?? null,
        sessionId: params.sessionId ?? null,
        currency: params.currency,
        expiresAt,
      })
      .returning();
    return cart;
  }

  async getCartItems(tx: CartExecutor, cartId: string) {
    return tx.select().from(cartItems).where(eq(cartItems.cartId, cartId));
  }

  async incrementCartItemQuantity(
    tx: CartExecutor,
    cartId: string,
    variantId: string,
    quantity: number,
  ) {
    const [item] = await tx
      .insert(cartItems)
      .values({
        id: createCatalogId("crt_itm"),
        cartId,
        variantId,
        quantity,
      })
      .onConflictDoUpdate({
        target: [cartItems.cartId, cartItems.variantId],
        set: { quantity: sql`${cartItems.quantity} + EXCLUDED.quantity` },
      })
      .returning();
    return item;
  }

  async setCartItemQuantity(tx: CartExecutor, cartId: string, variantId: string, quantity: number) {
    const [item] = await tx
      .insert(cartItems)
      .values({
        id: createCatalogId("crt_itm"),
        cartId,
        variantId,
        quantity,
      })
      .onConflictDoUpdate({
        target: [cartItems.cartId, cartItems.variantId],
        set: { quantity },
      })
      .returning();
    return item;
  }

  async deleteCartItem(tx: CartExecutor, itemId: string) {
    await tx.delete(cartItems).where(eq(cartItems.id, itemId));
  }

  async deleteCartItems(tx: CartExecutor, cartId: string) {
    await tx.delete(cartItems).where(eq(cartItems.cartId, cartId));
  }

  async deleteCart(tx: CartExecutor, cartId: string) {
    await tx.delete(carts).where(eq(carts.id, cartId));
  }
}
