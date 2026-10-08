import { randomUUID } from "node:crypto";

import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { CatalogService } from "@/catalog/service";
import { DrizzleCatalogRepository } from "@/catalog/repository";
import type { CustomerDb } from "@/customer/db";
import { DrizzleCustomerRepository } from "@/customer/repository";
import { CustomerService } from "@/customer/service";
import { customerAddresses, products, user, wishlists } from "@/db/schema";
import * as schema from "@/db/schema";
import { loadValidatedCredentials } from "../../scripts/drizzle-credentials.mjs";

describe("customer service ownership (local)", () => {
  const credentials = loadValidatedCredentials("test");
  const customerA = `customer-a-${randomUUID()}`;
  const customerB = `customer-b-${randomUUID()}`;
  let pgSql: ReturnType<typeof postgres>;
  let db: CustomerDb;
  let service: CustomerService;
  let productId: string;
  let variantId: string;

  beforeAll(async () => {
    expect(credentials).toMatchObject({
      host: "127.0.0.1",
      port: 55433,
      database: "nomi_numi_shop_test",
    });
    pgSql = postgres({
      host: credentials.host,
      port: credentials.port,
      database: credentials.database,
      username: credentials.user,
      password: credentials.password,
      max: 2,
      prepare: false,
      onnotice: () => {},
    });
    const [identity] = await pgSql`SELECT current_database() AS database_name`;
    expect(identity?.database_name).toBe("nomi_numi_shop_test");

    db = drizzle(pgSql, { schema });
    service = new CustomerService(new DrizzleCustomerRepository(db));
    await db.insert(user).values([
      {
        id: customerA,
        name: "Customer A",
        email: `${customerA}@example.com`,
        emailVerified: true,
        role: "customer",
      },
      {
        id: customerB,
        name: "Customer B",
        email: `${customerB}@example.com`,
        emailVerified: true,
        role: "customer",
      },
    ]);

    const catalog = new CatalogService(new DrizzleCatalogRepository(db));
    const product = await catalog.createProduct({
      slug: `customer-test-${randomUUID()}`,
      title: "Customer ownership fixture",
      status: "published",
    });
    productId = product.id;
    const variant = await catalog.createVariant(product.id, {
      sku: `CUSTOMER-${randomUUID()}`,
      prices: [{ currency: "USD", amountMinor: 1000 }],
    });
    variantId = variant.variant.id;
  });

  afterAll(async () => {
    if (db && productId) await db.delete(products).where(eq(products.id, productId));
    if (db) await db.delete(user).where(eq(user.id, customerA));
    if (db) await db.delete(user).where(eq(user.id, customerB));
    if (pgSql) await pgSql.end({ timeout: 5 });
  });

  beforeEach(async () => {
    await db
      .delete(customerAddresses)
      .where(inArray(customerAddresses.customerId, [customerA, customerB]));
    await db.delete(wishlists).where(inArray(wishlists.customerId, [customerA, customerB]));
  });

  const address = (name: string, type: "billing" | "shipping", isDefault: boolean) => ({
    type,
    name,
    street: "1 Scoped Street",
    city: "Brussels",
    postalCode: "1000",
    country: "BE",
    isDefault,
  });

  it("refuses cross-customer address updates and deletes without mutation", async () => {
    const owned = await service.addAddress(customerB, address("Owned by B", "shipping", true));

    await expect(
      service.updateAddress(customerA, owned.id, { name: "Taken over" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(service.deleteAddress(customerA, owned.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });

    const [persisted] = await db
      .select()
      .from(customerAddresses)
      .where(eq(customerAddresses.id, owned.id));
    expect(persisted).toMatchObject({
      customerId: customerB,
      name: "Owned by B",
      isDefault: true,
    });
  });

  it("scopes default addresses by customer and address type", async () => {
    await service.addAddress(customerB, address("B shipping", "shipping", true));
    const firstShipping = await service.addAddress(
      customerA,
      address("A shipping one", "shipping", true),
    );
    const billing = await service.addAddress(customerA, address("A billing", "billing", true));
    const secondShipping = await service.addAddress(
      customerA,
      address("A shipping two", "shipping", true),
    );

    const addressesA = await service.listAddresses(customerA);
    expect(addressesA.find((item) => item.id === firstShipping.id)?.isDefault).toBe(false);
    expect(addressesA.find((item) => item.id === secondShipping.id)?.isDefault).toBe(true);
    expect(addressesA.find((item) => item.id === billing.id)?.isDefault).toBe(true);

    const addressesB = await service.listAddresses(customerB);
    expect(addressesB).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "B shipping", type: "shipping", isDefault: true }),
      ]),
    );
  });

  it("keeps wishlist add and remove idempotent and customer-scoped", async () => {
    await service.toggleWishlist(customerA, variantId, true);
    await service.toggleWishlist(customerA, variantId, true);
    await service.toggleWishlist(customerB, variantId, true);

    expect(await service.getWishlist(customerA)).toHaveLength(1);
    expect(await service.getWishlist(customerB)).toHaveLength(1);

    await service.toggleWishlist(customerA, variantId, false);
    await service.toggleWishlist(customerA, variantId, false);

    expect(await service.getWishlist(customerA)).toHaveLength(0);
    expect(await service.getWishlist(customerB)).toEqual([
      expect.objectContaining({ customerId: customerB, variantId }),
    ]);
  });
});
