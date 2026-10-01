"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReviewForm({ productId }: { productId: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/account/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, rating, title, content }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to submit review");
      }

      setTitle("");
      setContent("");
      setRating(5);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 surface-card p-4">
      {error && <div className="text-sm font-medium text-destructive">{error}</div>}
      
      <div className="space-y-2">
        <label htmlFor="rating" className="text-sm font-medium">Rating (1-5)</label>
        <select
          id="rating"
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
          className="w-full h-10 px-3 border border-input bg-background rounded-md"
        >
          <option value={5}>5 Stars</option>
          <option value={4}>4 Stars</option>
          <option value={3}>3 Stars</option>
          <option value={2}>2 Stars</option>
          <option value={1}>1 Star</option>
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="title" className="text-sm font-medium">Review Title</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="Summarize your thoughts"
          className="w-full h-10 px-3 border border-input bg-background rounded-md"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="content" className="text-sm font-medium">Review Detail</label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          rows={4}
          placeholder="Tell us what you liked or disliked"
          className="w-full p-3 border border-input bg-background rounded-md"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="h-10 px-4 py-2 bg-primary text-primary-foreground font-medium rounded-md hover:bg-primary-hover disabled:opacity-50"
      >
        {isSubmitting ? "Submitting..." : "Submit Review"}
      </button>
    </form>
  );
}
