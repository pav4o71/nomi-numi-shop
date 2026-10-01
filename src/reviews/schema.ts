import { z } from "zod";

export const CreateReviewSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  variantId: z.string().optional(),
  rating: z.number().int().min(1, "Rating must be between 1 and 5").max(5, "Rating must be between 1 and 5"),
  title: z.string().min(1, "Title is required").max(100, "Title is too long"),
  content: z.string().min(1, "Content is required").max(1000, "Content is too long"),
});

export type CreateReviewInput = z.infer<typeof CreateReviewSchema>;

export type ReviewStatus = "pending" | "published" | "rejected";
