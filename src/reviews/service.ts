import { randomUUID } from "node:crypto";
import * as reviewRepo from "./repository";
import { CreateReviewSchema, type CreateReviewInput, type ReviewStatus } from "./schema";

export class ReviewService {
  /**
   * Submit a new review for a product.
   * Enforces verified-buyer status and duplicate-review policy.
   */
  static async submitReview(customerId: string, input: CreateReviewInput) {
    // Validate input
    const parsed = CreateReviewSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(`Invalid review data: ${parsed.error.message}`);
    }
    const data = parsed.data;

    // 1. Enforce verified purchase policy
    const hasPurchased = await reviewRepo.hasVerifiedPurchase(customerId, data.productId);
    if (!hasPurchased) {
      throw new Error("You must have purchased this product to leave a review.");
    }

    // 2. Enforce duplicate-review policy (1 per product per customer)
    const existing = await reviewRepo.getReviewByCustomerAndProduct(customerId, data.productId);
    if (existing) {
      throw new Error("You have already reviewed this product.");
    }

    // 3. Create review (default pending moderation depending on commerce rules, or published if no pre-approval)
    // The PROJECT_PLAN says: "Reviews publish without mandatory owner pre-approval."
    const status: ReviewStatus = "published";

    const id = `rev_${randomUUID()}`;
    return await reviewRepo.createReview(id, customerId, data, status);
  }

  static async getProductReviews(productId: string, includePending = false) {
    if (includePending) {
      return await reviewRepo.getReviewsForProduct(productId);
    }
    return await reviewRepo.getReviewsForProduct(productId, "published");
  }

  static async getCustomerReviews(customerId: string) {
    return await reviewRepo.getReviewsByCustomer(customerId);
  }

  static async getAllReviews() {
    return await reviewRepo.getAllReviews();
  }

  static async moderateReview(reviewId: string, status: ReviewStatus) {
    return await reviewRepo.updateReviewStatus(reviewId, status);
  }
}
