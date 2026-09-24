import { DrizzleCustomerRepository } from "./repository";
import { createCatalogId } from "@/catalog/ids";
import { customerAddresses } from "@/db/schema";
import { CustomerError } from "./errors";

type AddressInput = Omit<
  typeof customerAddresses.$inferInsert,
  "id" | "customerId" | "createdAt" | "updatedAt"
>;

export class CustomerService {
  constructor(private readonly repo: DrizzleCustomerRepository) {}

  async listAddresses(customerId: string) {
    return this.repo.transaction(async (tx) => {
      return this.repo.getAddresses(tx, customerId);
    });
  }

  async addAddress(customerId: string, input: AddressInput) {
    return this.repo.transaction(async (tx) => {
      if (input.isDefault) {
        await this.repo.clearDefaultAddresses(tx, customerId, input.type);
      }

      const id = `addr_${createCatalogId("cus")}`;
      return this.repo.createAddress(tx, {
        ...input,
        id,
        customerId,
      });
    });
  }

  async updateAddress(customerId: string, addressId: string, input: Partial<AddressInput>) {
    return this.repo.transaction(async (tx) => {
      const addr = await this.repo.getAddress(tx, customerId, addressId);
      if (!addr) throw new CustomerError("NOT_FOUND", "Address not found");

      const nextType = input.type ?? addr.type;
      const nextDefault = input.isDefault ?? addr.isDefault;
      if (nextDefault) {
        await this.repo.clearDefaultAddresses(tx, customerId, nextType);
      }

      return this.repo.updateAddress(tx, addressId, customerId, {
        ...input,
        isDefault: nextDefault,
      });
    });
  }

  async deleteAddress(customerId: string, addressId: string) {
    return this.repo.transaction(async (tx) => {
      const deleted = await this.repo.deleteAddress(tx, addressId, customerId);
      if (!deleted) throw new CustomerError("NOT_FOUND", "Address not found");
    });
  }

  async getWishlist(customerId: string) {
    return this.repo.transaction(async (tx) => {
      return this.repo.getWishlist(tx, customerId);
    });
  }

  async toggleWishlist(customerId: string, variantId: string, isAdded: boolean) {
    return this.repo.transaction(async (tx) => {
      if (isAdded) {
        const id = `wish_${createCatalogId("cus")}`;
        await this.repo.addToWishlist(tx, id, customerId, variantId);
      } else {
        await this.repo.removeFromWishlist(tx, customerId, variantId);
      }
    });
  }
}
