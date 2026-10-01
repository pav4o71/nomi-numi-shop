import { requireAdminPage } from "@/auth/guards";
import { headers } from "next/headers";
import { ReviewService } from "@/reviews/service";
import { ReviewModerationRow } from "./review-moderation-row";

export default async function AdminReviewsPage() {
  await requireAdminPage(await headers());
  const reviews = await ReviewService.getAllReviews();

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Review Moderation</h1>
      </header>

      {reviews.length === 0 ? (
        <p className="text-muted-foreground">No reviews have been submitted yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm text-left text-muted-foreground">
            <thead className="text-xs text-foreground uppercase bg-muted/50">
              <tr>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Product ID</th>
                <th className="px-6 py-3">Rating</th>
                <th className="px-6 py-3">Title & Content</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((review) => (
                <ReviewModerationRow key={review.id} review={review} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
