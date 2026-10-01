import { eq } from "drizzle-orm";
import { getRuntimeDb } from "@/db/runtime";
import { promotions } from "@/db/schema";
import type { CreatePromotionInput } from "./schema";

export const promotionRepo = {
  async getPromotionByCode(code: string) {
    const db = getRuntimeDb();
    const [promo] = await db
      .select()
      .from(promotions)
      .where(eq(promotions.code, code))
      .limit(1);
    return promo || null;
  },

  async getAllPromotions() {
    const db = getRuntimeDb();
    return await db.select().from(promotions).orderBy(promotions.createdAt);
  },

  async createPromotion(data: CreatePromotionInput) {
    const db = getRuntimeDb();
    const [promo] = await db
      .insert(promotions)
      .values({
        id: crypto.randomUUID(),
        code: data.code,
        type: data.type,
        value: data.value,
        currency: data.currency || null,
        minSpend: data.minSpend || null,
        maxUses: data.maxUses || null,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        active: data.active,
      })
      .returning();
    return promo;
  },

  async incrementUsage(id: string) {
    const db = getRuntimeDb();
    const [promo] = await db
      .select({ currentUses: promotions.currentUses })
      .from(promotions)
      .where(eq(promotions.id, id))
      .limit(1);

    if (!promo) return;

    await db
      .update(promotions)
      .set({ currentUses: promo.currentUses + 1 })
      .where(eq(promotions.id, id));
  },
};
