import { promotionRepo } from "./repository";
import { PromotionEngine } from "./engine";
import type { CreatePromotionInput } from "./schema";

export class PromotionService {
  static async getPromotionByCode(code: string) {
    return await promotionRepo.getPromotionByCode(code);
  }

  static async getAllPromotions() {
    return await promotionRepo.getAllPromotions();
  }

  static async createPromotion(data: CreatePromotionInput) {
    return await promotionRepo.createPromotion(data);
  }

  static async evaluatePromotion(code: string, subtotal: number, currency: string) {
    const promo = await promotionRepo.getPromotionByCode(code);
    if (!promo) {
      return { isValid: false, error: "Invalid promo code" };
    }

    const validation = PromotionEngine.validate(promo, subtotal, currency);
    if (!validation.isValid) {
      return validation;
    }

    const discount = PromotionEngine.calculateDiscount(promo, subtotal);
    return { isValid: true, discount, promo };
  }

  static async recordUsage(code: string) {
    const promo = await promotionRepo.getPromotionByCode(code);
    if (promo) {
      await promotionRepo.incrementUsage(promo.id);
    }
  }
}
