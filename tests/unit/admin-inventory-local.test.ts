/**
 * Phase 5 Inventory validation tests.
 * Asserts the transactional integrity and constraints of the inventory ledger.
 */

import { describe, expect, it, beforeEach, beforeAll, afterAll } from "vitest";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql as drizzleSql } from "drizzle-orm";

import { CatalogService } from "@/catalog/service";
import { DrizzleCatalogRepository } from "@/catalog/repository";
import type { CatalogDb } from "@/catalog/db";
import { CatalogError } from "@/catalog/errors";
import { loadValidatedCredentials } from "../../scripts/drizzle-credentials.mjs";

const credentials = loadValidatedCredentials("test");

describe("admin inventory ledger logic (local)", () => {
  let pgSql: ReturnType<typeof postgres>;
  let db: CatalogDb;
  let repo: DrizzleCatalogRepository;
  let service: CatalogService;

  beforeAll(() => {
    pgSql = postgres({
      host: credentials.host,
      port: credentials.port,
      database: credentials.database,
      username: credentials.user,
      password: credentials.password,
      max: 1,
      onnotice: () => {},
    });
    db = drizzle(pgSql);
    repo = new DrizzleCatalogRepository(db);
    service = new CatalogService(repo);
  });

  afterAll(async () => {
    await pgSql.end();
  });

  let testVariantId: string;

  beforeEach(async () => {
    // Clear catalog data in reverse dependency order
    await db.execute(drizzleSql`DELETE FROM inventory_movements`);
    await db.execute(drizzleSql`DELETE FROM inventory_balances`);
    await db.execute(drizzleSql`DELETE FROM variant_prices`);
    await db.execute(drizzleSql`DELETE FROM product_variant_option_values`);
    await db.execute(drizzleSql`DELETE FROM product_option_values`);
    await db.execute(drizzleSql`DELETE FROM product_options`);
    await db.execute(drizzleSql`DELETE FROM product_variants`);
    await db.execute(drizzleSql`DELETE FROM products`);

    // Create a base product and variant for testing
    const p = await service.createProduct({
      slug: "test-inventory-product",
      title: "Test Inventory Product",
      status: "published",
    });

    const v = await service.createVariant(p.id, {
      sku: "TEST-INV-1",
      prices: [{ currency: "USD", amountMinor: 1000 }],
    });
    testVariantId = v.variant.id;
  });

  it("returns null or empty defaults when no inventory exists", async () => {
    const balance = await service.getVariantInventoryBalance(testVariantId);
    expect(balance).toBeNull();

    const movements = await service.getVariantInventoryMovements(testVariantId);
    expect(movements).toHaveLength(0);
  });

  it("creates initial balance row and movement on first adjustment", async () => {
    await service.adjustVariantInventory(testVariantId, {
      deltaOnHand: 10,
      deltaReserved: 0,
      reason: "manual_adjustment",
      note: "Initial stock",
    });

    const balance = await service.getVariantInventoryBalance(testVariantId);
    expect(balance).not.toBeNull();
    expect(balance?.onHand).toBe(10);
    expect(balance?.reserved).toBe(0);

    const movements = await service.getVariantInventoryMovements(testVariantId);
    expect(movements).toHaveLength(1);
    expect(movements[0].delta).toBe(10);
    expect(movements[0].reason).toBe("manual_adjustment");
    expect(movements[0].note).toBe("Initial stock");
  });

  it("accumulates on-hand adjustments correctly", async () => {
    await service.adjustVariantInventory(testVariantId, {
      deltaOnHand: 50,
      deltaReserved: 0,
      reason: "restock",
    });

    await service.adjustVariantInventory(testVariantId, {
      deltaOnHand: -15,
      deltaReserved: 0,
      reason: "manual_adjustment",
    });

    const balance = await service.getVariantInventoryBalance(testVariantId);
    expect(balance?.onHand).toBe(35);
    expect(balance?.reserved).toBe(0);

    const movements = await service.getVariantInventoryMovements(testVariantId);
    expect(movements).toHaveLength(2);
    // Ordered desc by date
    expect(movements[0].delta).toBe(-15);
    expect(movements[1].delta).toBe(50);
  });

  it("throws domain conflict when reducing on-hand below zero via service layer", async () => {
    await service.adjustVariantInventory(testVariantId, {
      deltaOnHand: 5,
      deltaReserved: 0,
      reason: "restock",
    });

    await expect(
      service.adjustVariantInventory(testVariantId, {
        deltaOnHand: -10,
        deltaReserved: 0,
        reason: "manual_adjustment",
      }),
    ).rejects.toThrowError(CatalogError);

    // Balance should remain unchanged
    const balance = await service.getVariantInventoryBalance(testVariantId);
    expect(balance?.onHand).toBe(5);
  });

  it("accumulates reservations correctly and prevents over-reserving", async () => {
    await service.adjustVariantInventory(testVariantId, {
      deltaOnHand: 10,
      deltaReserved: 0,
      reason: "restock",
    });

    // Reserve 4 units
    await service.adjustVariantInventory(testVariantId, {
      deltaOnHand: 0,
      deltaReserved: 4,
      reason: "reserve",
    });

    let balance = await service.getVariantInventoryBalance(testVariantId);
    expect(balance?.onHand).toBe(10);
    expect(balance?.reserved).toBe(4);

    // Try to reserve 7 more units (total 11 > 10). Should fail.
    await expect(
      service.adjustVariantInventory(testVariantId, {
        deltaOnHand: 0,
        deltaReserved: 7,
        reason: "reserve",
      }),
    ).rejects.toThrowError(CatalogError);

    // Balance should still be 4
    balance = await service.getVariantInventoryBalance(testVariantId);
    expect(balance?.reserved).toBe(4);
  });
});
