import { and, eq } from "drizzle-orm";
import { customerAddresses, wishlists } from "@/db/schema";
import { CustomerDb, CustomerExecutor } from "./db";

export class DrizzleCustomerRepository {
  constructor(private readonly db: CustomerDb) {}

  async transaction<T>(callback: (tx: CustomerExecutor) => Promise<T>): Promise<T> {
    return this.db.transaction(callback);
  }

  // --- Addresses ---
  async getAddresses(tx: CustomerExecutor, customerId: string) {
    return tx.select().from(customerAddresses).where(eq(customerAddresses.customerId, customerId));
  }

  async getAddress(tx: CustomerExecutor, customerId: string, addressId: string) {
    const [addr] = await tx
      .select()
      .from(customerAddresses)
      .where(
        and(eq(customerAddresses.id, addressId), eq(customerAddresses.customerId, customerId)),
      );
    return addr ?? null;
  }

  async createAddress(tx: CustomerExecutor, data: typeof customerAddresses.$inferInsert) {
    const [addr] = await tx.insert(customerAddresses).values(data).returning();
    return addr;
  }

  async updateAddress(
    tx: CustomerExecutor,
    addressId: string,
    customerId: string,
    data: Partial<typeof customerAddresses.$inferInsert>,
  ) {
    const [addr] = await tx
      .update(customerAddresses)
      .set(data)
      .where(and(eq(customerAddresses.id, addressId), eq(customerAddresses.customerId, customerId)))
      .returning();
    return addr ?? null;
  }

  async deleteAddress(tx: CustomerExecutor, addressId: string, customerId: string) {
    await tx
      .delete(customerAddresses)
      .where(
        and(eq(customerAddresses.id, addressId), eq(customerAddresses.customerId, customerId)),
      );
  }

  async clearDefaultAddresses(
    tx: CustomerExecutor,
    customerId: string,
    type: "billing" | "shipping",
  ) {
    await tx
      .update(customerAddresses)
      .set({ isDefault: false })
      .where(and(eq(customerAddresses.customerId, customerId), eq(customerAddresses.type, type)));
  }

  // --- Wishlists ---
  async getWishlist(tx: CustomerExecutor, customerId: string) {
    return tx.select().from(wishlists).where(eq(wishlists.customerId, customerId));
  }

  async addToWishlist(tx: CustomerExecutor, id: string, customerId: string, variantId: string) {
    await tx.insert(wishlists).values({ id, customerId, variantId }).onConflictDoNothing();
  }

  async removeFromWishlist(tx: CustomerExecutor, customerId: string, variantId: string) {
    await tx
      .delete(wishlists)
      .where(and(eq(wishlists.customerId, customerId), eq(wishlists.variantId, variantId)));
  }
}
