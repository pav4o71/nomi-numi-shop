"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ReviewStatus } from "@/reviews/schema";

type ReviewRowProps = {
  review: {
    id: string;
    productId: string;
    rating: number;
    title: string;
    content: string;
    status: ReviewStatus;
    createdAt: Date;
  };
};

export function ReviewModerationRow({ review }: ReviewRowProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);

  async function handleStatusChange(newStatus: ReviewStatus) {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/reviews/${review.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        throw new Error("Failed to update status");
      }
      
      router.refresh();
    } catch (e) {
      alert("Error updating review");
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <tr className="bg-background border-b border-border hover:bg-muted/50 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap">
        {new Date(review.createdAt).toLocaleDateString()}
      </td>
      <td className="px-6 py-4 font-mono text-xs">
        {review.productId.substring(0, 8)}...
      </td>
      <td className="px-6 py-4">
        {review.rating}/5
      </td>
      <td className="px-6 py-4 max-w-xs">
        <div className="font-medium text-foreground truncate">{review.title}</div>
        <div className="truncate text-xs">{review.content}</div>
      </td>
      <td className="px-6 py-4">
        <span className={`text-xs px-2 py-1 rounded-full ${
          review.status === "published" ? "bg-green-100 text-green-800" :
          review.status === "pending" ? "bg-yellow-100 text-yellow-800" :
          "bg-red-100 text-red-800"
        }`}>
          {review.status}
        </span>
      </td>
      <td className="px-6 py-4">
        <select
          disabled={isUpdating}
          value={review.status}
          onChange={(e) => handleStatusChange(e.target.value as ReviewStatus)}
          className="border border-input bg-background rounded text-xs px-2 py-1"
        >
          <option value="pending">Pending</option>
          <option value="published">Published</option>
          <option value="rejected">Rejected</option>
        </select>
      </td>
    </tr>
  );
}
