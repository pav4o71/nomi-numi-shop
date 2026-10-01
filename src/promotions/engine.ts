type PromotionRecord = {
  id: string;
  code: string;
  type: string; // "percentage" | "fixed_amount"
  value: number;
  currency: string | null;
  minSpend: number | null;
  maxUses: number | null;
  currentUses: number;
  startsAt: Date | null;
  expiresAt: Date | null;
  active: boolean;
};

type ValidationResult = {
  isValid: boolean;
  error?: string;
};

export const PromotionEngine = {
  validate(promo: PromotionRecord, subtotal: number, currency: string): ValidationResult {
    if (!promo.active) {
      return { isValid: false, error: "Promotion is inactive" };
    }

    const now = new Date();
    if (promo.startsAt && now < promo.startsAt) {
      return { isValid: false, error: "Promotion has not started yet" };
    }
    if (promo.expiresAt && now > promo.expiresAt) {
      return { isValid: false, error: "Promotion has expired" };
    }

    if (promo.maxUses !== null && promo.currentUses >= promo.maxUses) {
      return { isValid: false, error: "Promotion usage limit reached" };
    }

    if (promo.type === "fixed_amount" && promo.currency !== currency) {
      return { isValid: false, error: "Promotion currency does not match cart currency" };
    }

    if (promo.minSpend !== null) {
      // Assuming minSpend is also in the currency of the promo/cart
      if (subtotal < promo.minSpend) {
        return { isValid: false, error: `Minimum spend of ${promo.minSpend} not met` };
      }
    }

    return { isValid: true };
  },

  calculateDiscount(promo: PromotionRecord, subtotal: number): number {
    if (promo.type === "percentage") {
      const discount = Math.floor(subtotal * (promo.value / 100));
      return Math.min(discount, subtotal);
    } else if (promo.type === "fixed_amount") {
      return Math.min(promo.value, subtotal);
    }
    return 0;
  },
};
