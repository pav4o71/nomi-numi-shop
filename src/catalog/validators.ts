/**
 * Phase 3B catalog Zod validators (Zod 4 APIs).
 *
 * Validation lives in the catalog domain — not a generic dumping ground.
 */

import { z } from "zod";

import { invalidInput, type CatalogErrorIssue } from "@/catalog/errors";
import { CATALOG_CURRENCIES, parseCatalogMoney } from "@/catalog/money";
import { normalizeCatalogSlug } from "@/catalog/slug";

export const productStatusSchema = z.enum(["draft", "published", "archived"]);
export type ProductStatus = z.infer<typeof productStatusSchema>;

const nonEmptyTrimmedString = z.string().trim().min(1);

const slugField = z.unknown().transform((value, ctx) => {
  try {
    return normalizeCatalogSlug(value);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid slug";
    ctx.addIssue({ code: "custom", message, input: value });
    return z.NEVER;
  }
});

export const createCategoryInputSchema = z.object({
  slug: slugField,
  name: nonEmptyTrimmedString,
  description: z.string().nullable().optional(),
  position: z.number().int().optional(),
  published: z.boolean().optional(),
});

export const updateCategoryInputSchema = z
  .object({
    slug: slugField.optional(),
    name: nonEmptyTrimmedString.optional(),
    description: z.string().nullable().optional(),
    position: z.number().int().optional(),
    published: z.boolean().optional(),
    archivedAt: z.date().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one category field must be provided",
  });

export const createCollectionInputSchema = z.object({
  slug: slugField,
  name: nonEmptyTrimmedString,
  description: z.string().nullable().optional(),
  position: z.number().int().optional(),
  published: z.boolean().optional(),
  publishedFrom: z.date().nullable().optional(),
  publishedUntil: z.date().nullable().optional(),
});

export const updateCollectionInputSchema = z
  .object({
    slug: slugField.optional(),
    name: nonEmptyTrimmedString.optional(),
    description: z.string().nullable().optional(),
    position: z.number().int().optional(),
    published: z.boolean().optional(),
    publishedFrom: z.date().nullable().optional(),
    publishedUntil: z.date().nullable().optional(),
    archivedAt: z.date().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one collection field must be provided",
  });

export const createProductInputSchema = z.object({
  slug: slugField,
  title: nonEmptyTrimmedString,
  description: z.string().nullable().optional(),
  status: productStatusSchema.optional(),
  position: z.number().int().optional(),
  seoTitle: z.string().nullable().optional(),
  seoDescription: z.string().nullable().optional(),
});

export const updateProductInputSchema = z
  .object({
    slug: slugField.optional(),
    title: nonEmptyTrimmedString.optional(),
    description: z.string().nullable().optional(),
    position: z.number().int().optional(),
    seoTitle: z.string().nullable().optional(),
    seoDescription: z.string().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one product field must be provided",
  });

export const changeProductStatusInputSchema = z.object({
  status: productStatusSchema,
});

export const productOptionDefinitionSchema = z.object({
  name: nonEmptyTrimmedString,
  position: z.number().int().optional(),
  values: z
    .array(
      z.object({
        value: nonEmptyTrimmedString,
        position: z.number().int().optional(),
      }),
    )
    .min(1),
});

export const defineProductOptionsInputSchema = z.object({
  options: z.array(productOptionDefinitionSchema),
});

export const variantOptionSelectionSchema = z.object({
  optionId: nonEmptyTrimmedString,
  optionValueId: nonEmptyTrimmedString,
});

export const catalogPriceInputSchema = z.unknown().transform((value, ctx) => {
  try {
    return parseCatalogMoney(value);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid price";
    ctx.addIssue({ code: "custom", message, input: value });
    return z.NEVER;
  }
});

export const createVariantInputSchema = z.object({
  sku: nonEmptyTrimmedString,
  isActive: z.boolean().optional(),
  optionSelections: z.array(variantOptionSelectionSchema).optional(),
  prices: z.array(catalogPriceInputSchema).optional(),
  weightGrams: z.number().int().nonnegative().nullable().optional(),
  lengthMm: z.number().int().nonnegative().nullable().optional(),
  widthMm: z.number().int().nonnegative().nullable().optional(),
  heightMm: z.number().int().nonnegative().nullable().optional(),
  fulfillmentHint: z.string().nullable().optional(),
});

export const updateVariantInputSchema = z
  .object({
    sku: nonEmptyTrimmedString.optional(),
    isActive: z.boolean().optional(),
    optionSelections: z.array(variantOptionSelectionSchema).optional(),
    weightGrams: z.number().int().nonnegative().nullable().optional(),
    lengthMm: z.number().int().nonnegative().nullable().optional(),
    widthMm: z.number().int().nonnegative().nullable().optional(),
    heightMm: z.number().int().nonnegative().nullable().optional(),
    fulfillmentHint: z.string().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one variant field must be provided",
  });

export const setVariantPricesInputSchema = z.object({
  prices: z.array(catalogPriceInputSchema).min(1),
});

export const categoryAssignmentSchema = z.object({
  categoryId: nonEmptyTrimmedString,
  isPrimary: z.boolean().optional(),
  position: z.number().int().optional(),
});

export const replaceProductCategoriesInputSchema = z
  .object({
    categories: z.array(categoryAssignmentSchema),
  })
  .superRefine((value, ctx) => {
    const primaryCount = value.categories.filter((item) => item.isPrimary === true).length;
    if (primaryCount > 1) {
      ctx.addIssue({
        code: "custom",
        message: "A product may have at most one primary category",
        path: ["categories"],
      });
    }
    const ids = value.categories.map((item) => item.categoryId);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: "custom",
        message: "Duplicate category assignments are not allowed",
        path: ["categories"],
      });
    }
  });

export const setPrimaryCategoryInputSchema = z.object({
  categoryId: nonEmptyTrimmedString,
});

export const replaceProductCollectionsInputSchema = z.object({
  collections: z.array(
    z.object({
      collectionId: nonEmptyTrimmedString,
      position: z.number().int().optional(),
    }),
  ),
});

export const adjustInventoryInputSchema = z.object({
  deltaOnHand: z.number().int(),
  deltaReserved: z.number().int(),
  reason: nonEmptyTrimmedString,
  note: z.string().optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategoryInputSchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategoryInputSchema>;
export type CreateCollectionInput = z.infer<typeof createCollectionInputSchema>;
export type UpdateCollectionInput = z.infer<typeof updateCollectionInputSchema>;
export type CreateProductInput = z.infer<typeof createProductInputSchema>;
export type UpdateProductInput = z.infer<typeof updateProductInputSchema>;
export type CreateVariantInput = z.infer<typeof createVariantInputSchema>;
export type UpdateVariantInput = z.infer<typeof updateVariantInputSchema>;
export type DefineProductOptionsInput = z.infer<typeof defineProductOptionsInputSchema>;
export type ReplaceProductCategoriesInput = z.infer<typeof replaceProductCategoriesInputSchema>;
export type ReplaceProductCollectionsInput = z.infer<typeof replaceProductCollectionsInputSchema>;
export type AdjustInventoryInput = z.infer<typeof adjustInventoryInputSchema>;

/**
 * Parse with Zod 4 and map failures to CatalogError INVALID_INPUT.
 * Uses structured Zod issues (not deprecated Zod 3 flatten helpers).
 */
export function parseCatalogInput<T>(schema: z.ZodType<T>, input: unknown, label: string): T {
  const result = schema.safeParse(input);
  if (result.success) {
    return result.data;
  }

  const issues: CatalogErrorIssue[] = result.error.issues.map((issue) => ({
    path: issue.path.filter(
      (segment): segment is string | number =>
        typeof segment === "string" || typeof segment === "number",
    ),
    message: issue.message,
    code: issue.code,
  }));

  throw invalidInput(`${label} validation failed`, issues);
}

export { CATALOG_CURRENCIES };
