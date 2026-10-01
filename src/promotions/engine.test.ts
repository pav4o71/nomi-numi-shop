import { describe, expect, test } from "vitest";
import { PromotionEngine } from "./engine";

describe("PromotionEngine", () => {
  const basePromo = {
    id: "promo-1",
    code: "SUMMER10",
    type: "percentage",
    value: 10,
    currency: null,
    minSpend: null,
    maxUses: null,
    currentUses: 0,
    startsAt: null,
    expiresAt: null,
    active: true,
  };

  describe("Validation", () => {
    test("rejects inactive promotion", () => {
      const promo = { ...basePromo, active: false };
      const result = PromotionEngine.validate(promo, 10000, "USD");
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/inactive/i);
    });

    test("accepts valid promotion", () => {
      const result = PromotionEngine.validate(basePromo, 10000, "USD");
      expect(result.isValid).toBe(true);
    });

    test("rejects expired promotion", () => {
      const promo = { ...basePromo, expiresAt: new Date(Date.now() - 10000) };
      const result = PromotionEngine.validate(promo, 10000, "USD");
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/expired/i);
    });

    test("rejects future promotion", () => {
      const promo = { ...basePromo, startsAt: new Date(Date.now() + 10000) };
      const result = PromotionEngine.validate(promo, 10000, "USD");
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/started/i);
    });

    test("rejects max uses reached", () => {
      const promo = { ...basePromo, maxUses: 10, currentUses: 10 };
      const result = PromotionEngine.validate(promo, 10000, "USD");
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/limit reached/i);
    });

    test("rejects currency mismatch for fixed amount", () => {
      const promo = { ...basePromo, type: "fixed_amount", value: 1000, currency: "EUR" };
      const result = PromotionEngine.validate(promo, 10000, "USD");
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/currency does not match/i);
    });

    test("rejects below minimum spend", () => {
      const promo = { ...basePromo, minSpend: 5000 };
      const result = PromotionEngine.validate(promo, 4000, "USD");
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/Minimum spend/i);
    });
  });

  describe("Calculation", () => {
    test("calculates percentage discount", () => {
      const promo = { ...basePromo, type: "percentage", value: 20 };
      const discount = PromotionEngine.calculateDiscount(promo, 10000);
      expect(discount).toBe(2000); // 20% of 10000
    });

    test("caps percentage discount at subtotal", () => {
      const promo = { ...basePromo, type: "percentage", value: 150 }; // Should not happen due to schema, but testing engine logic
      const discount = PromotionEngine.calculateDiscount(promo, 10000);
      expect(discount).toBe(10000);
    });

    test("calculates fixed amount discount", () => {
      const promo = { ...basePromo, type: "fixed_amount", value: 1500, currency: "USD" };
      const discount = PromotionEngine.calculateDiscount(promo, 10000);
      expect(discount).toBe(1500);
    });

    test("caps fixed amount discount at subtotal", () => {
      const promo = { ...basePromo, type: "fixed_amount", value: 20000, currency: "USD" };
      const discount = PromotionEngine.calculateDiscount(promo, 10000);
      expect(discount).toBe(10000);
    });
  });
});
