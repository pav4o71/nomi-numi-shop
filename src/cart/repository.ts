import { and, eq, gt, isNull, lte, or, sql } from "drizzle-orm";
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

  async getCartByIdForUpdate(tx: CartExecutor, cartId: string) {
    const [cart] = await tx
      .select()
      .from(carts)
      .where(and(eq(carts.id, cartId), gt(carts.expiresAt, new Date())))
      .for("update");
    return cart ?? null;
  }

  async lockCartIdentity(tx: CartExecutor, params: { customerId?: string; sessionId?: string }) {
    const identity = params.customerId
      ? `customer:${params.customerId}`
      : params.sessionId
        ? `session:${params.sessionId}`
        : null;
    if (!identity) return;
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${identity}, 0))`);
  }

  async getCartByCustomer(tx: CartExecutor, customerId: string, now: Date = new Date()) {
    const [cart] = await tx
      .select()
      .from(carts)
      .where(and(eq(carts.customerId, customerId), gt(carts.expiresAt, now)));
    return cart ?? null;
  }

  async getCartBySession(tx: CartExecutor, sessionId: string, now: Date = new Date()) {
    const [cart] = await tx
      .select()
      .from(carts)
      .where(
        and(eq(carts.sessionId, sessionId), isNull(carts.customerId), gt(carts.expiresAt, now)),
      );
    return cart ?? null;
  }

  async getCartByIdentityForUpdate(
    tx: CartExecutor,
    params: { customerId?: string; sessionId?: string },
    now: Date = new Date(),
  ) {
    const ownerCondition = params.customerId
      ? eq(carts.customerId, params.customerId)
      : params.sessionId
        ? and(eq(carts.sessionId, params.sessionId), isNull(carts.customerId))
        : undefined;
    if (!ownerCondition) return null;

    const [cart] = await tx
      .select()
      .from(carts)
      .where(and(ownerCondition, gt(carts.expiresAt, now)))
      .for("update");
    return cart ?? null;
  }

  async deleteExpiredCartsForIdentity(
    tx: CartExecutor,
    params: { customerId?: string; sessionId?: string },
    now: Date = new Date(),
  ) {
    const ownerConditions = [
      params.customerId ? eq(carts.customerId, params.customerId) : undefined,
      params.sessionId ? eq(carts.sessionId, params.sessionId) : undefined,
    ].filter((condition): condition is NonNullable<typeof condition> => condition !== undefined);
    if (ownerConditions.length === 0) return;

    await tx
      .delete(carts)
      .where(
        and(
          ownerConditions.length === 1 ? ownerConditions[0] : or(...ownerConditions),
          lte(carts.expiresAt, now),
        ),
      );
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
      .onConflictDoNothing()
      .returning();
    return cart ?? null;
  }

  async getCartItems(tx: CartExecutor, cartId: string) {
    return tx.select().from(cartItems).where(eq(cartItems.cartId, cartId));
  }

  async getCartItem(tx: CartExecutor, cartId: string, itemId: string) {
    const [item] = await tx
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)));
    return item ?? null;
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

  async deleteCartItem(tx: CartExecutor, cartId: string, itemId: string) {
    const [deleted] = await tx
      .delete(cartItems)
      .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)))
      .returning({ id: cartItems.id });
    return deleted ?? null;
  }

  async deleteCartItems(tx: CartExecutor, cartId: string) {
    await tx.delete(cartItems).where(eq(cartItems.cartId, cartId));
  }

  async deleteCart(tx: CartExecutor, cartId: string) {
    await tx.delete(carts).where(eq(carts.id, cartId));
  }
}
