import { ReviewService } from "@/reviews/service";
import { ReviewForm } from "./review-form";

export async function ProductReviews({ productId }: { productId: string }) {
  const reviews = await ReviewService.getProductReviews(productId, false);

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((acc, rev) => acc + rev.rating, 0) / reviews.length
      : 0;

  return (
    <section aria-labelledby="product-reviews-heading" className="space-y-6 mt-12 pt-8 border-t border-border">
      <div className="flex items-center justify-between">
        <h2 id="product-reviews-heading" className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Customer Reviews
        </h2>
        {reviews.length > 0 && (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <span className="font-semibold text-foreground">{averageRating.toFixed(1)}</span> out of 5 ({reviews.length} reviews)
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-[1fr_2fr] gap-10">
        <div>
          <h3 className="font-medium text-lg mb-2">Review this product</h3>
          <p className="text-sm text-muted-foreground mb-4">Share your thoughts with other customers.</p>
          <ReviewForm productId={productId} />
        </div>

        <div className="space-y-6">
          {reviews.length === 0 ? (
            <p className="text-muted-foreground">No reviews yet. Be the first to review this product!</p>
          ) : (
            <ul className="space-y-6">
              {reviews.map((review) => (
                <li key={review.id} className="surface-card p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{review.title}</span>
                    <span className="text-yellow-600">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{review.content}</p>
                  <p className="text-xs text-muted-foreground">
                    Posted on {new Date(review.createdAt).toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
