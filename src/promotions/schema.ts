import { z } from "zod";

export const promotionTypeSchema = z.enum(["percentage", "fixed_amount"]);

export const createPromotionSchema = z.object({
  code: z.string().min(3).max(50),
  type: promotionTypeSchema,
  value: z.number().int().positive(),
  currency: z.string().optional(),
  minSpend: z.number().int().nonnegative().optional().nullable(),
  maxUses: z.number().int().positive().optional().nullable(),
  startsAt: z.string().datetime().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  active: z.boolean().default(true),
}).superRefine((data, ctx) => {
  if (data.type === "fixed_amount" && !data.currency) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Currency is required for fixed_amount promotions",
      path: ["currency"],
    });
  }
  if (data.type === "percentage" && data.value > 100) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Percentage value cannot exceed 100",
      path: ["value"],
    });
  }
});

export type CreatePromotionInput = z.infer<typeof createPromotionSchema>;
