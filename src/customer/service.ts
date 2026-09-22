import { DrizzleCustomerRepository } from "./repository";
import { createCatalogId } from "@/catalog/ids";
import { customerAddresses } from "@/db/schema";

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
      if (!addr) throw new Error("Address not found");

      if (input.isDefault && input.type === addr.type) {
        await this.repo.clearDefaultAddresses(tx, customerId, addr.type);
      } else if (input.isDefault && input.type && input.type !== addr.type) {
        await this.repo.clearDefaultAddresses(tx, customerId, input.type);
      }

      return this.repo.updateAddress(tx, addressId, customerId, input);
    });
  }

  async deleteAddress(customerId: string, addressId: string) {
    return this.repo.transaction(async (tx) => {
      await this.repo.deleteAddress(tx, addressId, customerId);
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
