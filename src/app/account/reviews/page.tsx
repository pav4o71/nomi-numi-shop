import { requireCustomerPage } from "@/auth/guards";
import { headers } from "next/headers";
import { ReviewService } from "@/reviews/service";

export default async function CustomerReviewsPage() {
  const principal = await requireCustomerPage(await headers());
  const reviews = await ReviewService.getCustomerReviews(principal.userId);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">My Reviews</h1>
      
      {reviews.length === 0 ? (
        <p className="text-muted-foreground">You haven&apos;t submitted any reviews yet.</p>
      ) : (
        <ul className="space-y-4">
          {reviews.map((review) => (
            <li key={review.id} className="surface-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-foreground">{review.title}</span>
                  <span className="ml-4 text-yellow-600">
                    {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                  </span>
                </div>
                <div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    review.status === "published" ? "bg-green-100 text-green-800" :
                    review.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                    "bg-red-100 text-red-800"
                  }`}>
                    {review.status}
                  </span>
                </div>
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
  );
}
