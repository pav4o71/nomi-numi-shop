/**
 * Portable Phase 3B catalog domain unit tests (no live database).
 */
import { describe, expect, it } from "vitest";

import {
  CatalogError,
  catalogConflictFromUniqueViolation,
  normalizeCatalogSlug,
  optionCombinationKey,
  parseCatalogMoney,
  PG_INTEGER_MAX,
  uniqueConstraintName,
} from "@/catalog";
import { parseCatalogInput, createProductInputSchema } from "@/catalog/validators";

describe("catalog slug normalization", () => {
  it("normalizes lowercase hyphenated URL-safe slugs deterministically", () => {
    expect(normalizeCatalogSlug("  Hello World  ")).toBe("hello-world");
    expect(normalizeCatalogSlug("Hello_World")).toBe("hello-world");
    expect(normalizeCatalogSlug("Hello---World")).toBe("hello-world");
    expect(normalizeCatalogSlug("Product 123")).toBe("product-123");
  });

  it("rejects empty slugs", () => {
    expect(() => normalizeCatalogSlug("")).toThrow(CatalogError);
    expect(() => normalizeCatalogSlug("   ")).toThrow(CatalogError);
    expect(() => normalizeCatalogSlug("---")).toThrow(CatalogError);
    try {
      normalizeCatalogSlug("");
    } catch (error) {
      expect(error).toBeInstanceOf(CatalogError);
      expect((error as CatalogError).code).toBe("INVALID_INPUT");
    }
  });

  it("rejects unsafe control characters and unsupported characters", () => {
    expect(() => normalizeCatalogSlug("bad\u0000slug")).toThrow(CatalogError);
    expect(() => normalizeCatalogSlug("café")).toThrow(CatalogError);
    expect(() => normalizeCatalogSlug("hello/world")).toThrow(CatalogError);
    expect(() => normalizeCatalogSlug("hello.world")).toThrow(CatalogError);
  });
});

describe("catalog money validation", () => {
  it("accepts PHP and USD integer minor units", () => {
    expect(parseCatalogMoney({ currency: "PHP", amountMinor: 179900 })).toEqual({
      currency: "PHP",
      amountMinor: 179900,
      compareAtAmountMinor: null,
    });
    expect(parseCatalogMoney({ currency: "USD", amountMinor: 3499 })).toEqual({
      currency: "USD",
      amountMinor: 3499,
      compareAtAmountMinor: null,
    });
  });

  it("rejects unsupported currency", () => {
    expect(() => parseCatalogMoney({ currency: "EUR", amountMinor: 100 })).toThrow(CatalogError);
    try {
      parseCatalogMoney({ currency: "EUR", amountMinor: 100 });
    } catch (error) {
      expect((error as CatalogError).code).toBe("INVALID_INPUT");
    }
  });

  it("rejects non-integer, zero, and negative amounts", () => {
    expect(() => parseCatalogMoney({ currency: "USD", amountMinor: 10.5 })).toThrow(CatalogError);
    expect(() => parseCatalogMoney({ currency: "USD", amountMinor: 0 })).toThrow(CatalogError);
    expect(() => parseCatalogMoney({ currency: "USD", amountMinor: -1 })).toThrow(CatalogError);
  });

  it("rejects compare-at <= amount and accepts compare-at > amount", () => {
    expect(() =>
      parseCatalogMoney({ currency: "USD", amountMinor: 1000, compareAtAmountMinor: 1000 }),
    ).toThrow(CatalogError);
    expect(() =>
      parseCatalogMoney({ currency: "USD", amountMinor: 1000, compareAtAmountMinor: 999 }),
    ).toThrow(CatalogError);
    expect(
      parseCatalogMoney({ currency: "USD", amountMinor: 1000, compareAtAmountMinor: 1500 }),
    ).toEqual({
      currency: "USD",
      amountMinor: 1000,
      compareAtAmountMinor: 1500,
    });
  });

  it("rejects amounts outside PostgreSQL integer range", () => {
    expect(() => parseCatalogMoney({ currency: "USD", amountMinor: PG_INTEGER_MAX + 1 })).toThrow(
      CatalogError,
    );
    expect(parseCatalogMoney({ currency: "USD", amountMinor: PG_INTEGER_MAX }).amountMinor).toBe(
      PG_INTEGER_MAX,
    );
  });
});

describe("option combination identity", () => {
  it("is order-independent and deterministic", () => {
    const a = optionCombinationKey([
      { optionId: "size", optionValueId: "m" },
      { optionId: "color", optionValueId: "red" },
    ]);
    const b = optionCombinationKey([
      { optionId: "color", optionValueId: "red" },
      { optionId: "size", optionValueId: "m" },
    ]);
    expect(a).toBe(b);
    expect(a).toBe("color=red|size=m");
  });

  it("treats empty selections as a single default key", () => {
    expect(optionCombinationKey([])).toBe("");
  });
});

describe("catalog input parsing and pg conflict mapping", () => {
  it("maps Zod failures to INVALID_INPUT without using deprecated flatten APIs", () => {
    expect(() =>
      parseCatalogInput(createProductInputSchema, { title: "X" }, "createProduct"),
    ).toThrow(CatalogError);
    try {
      parseCatalogInput(createProductInputSchema, { title: "X" }, "createProduct");
    } catch (error) {
      expect(error).toBeInstanceOf(CatalogError);
      expect((error as CatalogError).code).toBe("INVALID_INPUT");
      expect((error as CatalogError).issues.length).toBeGreaterThan(0);
    }
  });

  it("maps known unique violations to CONFLICT and leaves unrelated errors alone", () => {
    const mapped = catalogConflictFromUniqueViolation({
      code: "23505",
      constraint_name: "product_variants_sku_uidx",
    });
    expect(mapped).toBeInstanceOf(CatalogError);
    expect(mapped?.code).toBe("CONFLICT");
    expect(
      uniqueConstraintName({ code: "23505", constraint_name: "product_variants_sku_uidx" }),
    ).toBe("product_variants_sku_uidx");

    // Drizzle wraps Postgres errors under `.cause`.
    expect(
      uniqueConstraintName({
        message: "Failed query",
        cause: { code: "23505", constraint_name: "products_slug_uidx" },
      }),
    ).toBe("products_slug_uidx");

    const unrelated = { code: "57014", message: "canceling statement due to statement timeout" };
    expect(catalogConflictFromUniqueViolation(unrelated)).toBeNull();
    expect(uniqueConstraintName(unrelated)).toBeNull();
  });
});
