"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import type { ProductStatus } from "@/catalog/validators";

interface ProductFormData {
  id?: string;
  title: string;
  slug: string;
  description: string | null;
  status: ProductStatus;
  position: number;
  seoTitle: string | null;
  seoDescription: string | null;
}

interface ProductFormProps {
  action: "create" | "update";
  product?: ProductFormData;
}

/**
 * Phase 4C client-side product form (Base entity only).
 *
 * Submits to admin catalog API routes. Redirects to the product list
 * on success. Displays server-side validation errors inline.
 */
export function ProductForm({ action, product }: ProductFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = new FormData(event.currentTarget);

    const body = {
      title: form.get("title") as string,
      slug: form.get("slug") as string,
      description: (form.get("description") as string) || null,
      status: form.get("status") as ProductStatus,
      position: Number(form.get("position") || 0),
      seoTitle: (form.get("seoTitle") as string) || null,
      seoDescription: (form.get("seoDescription") as string) || null,
    };

    const url =
      action === "create"
        ? "/api/admin/catalog/products"
        : `/api/admin/catalog/products/${product!.id}`;

    try {
      const resp = await fetch(url, {
        method: action === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (resp.ok) {
        router.push("/admin/products");
        router.refresh();
        return;
      }

      const data = (await resp.json()) as { message?: string; code?: string };
      setError(data.message ?? `Request failed (${resp.status})`);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 max-w-2xl space-y-5" data-testid="product-form">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="space-y-1.5 md:col-span-2">
          <label htmlFor="title" className="text-sm font-medium">
            Title <span className="text-destructive">*</span>
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            defaultValue={product?.title ?? ""}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="slug" className="text-sm font-medium">
            Slug <span className="text-destructive">*</span>
          </label>
          <input
            id="slug"
            name="slug"
            type="text"
            required
            defaultValue={product?.slug ?? ""}
            placeholder="e.g. classic-tee"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="text-xs text-muted-foreground">
            URL-safe identifier. Lowercase, hyphens only.
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="status" className="text-sm font-medium">
            Status <span className="text-destructive">*</span>
          </label>
          <select
            id="status"
            name="status"
            required
            defaultValue={product?.status ?? "draft"}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <label htmlFor="description" className="text-sm font-medium">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            defaultValue={product?.description ?? ""}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <label htmlFor="position" className="text-sm font-medium">
            Position
          </label>
          <input
            id="position"
            name="position"
            type="number"
            defaultValue={product?.position ?? 0}
            className="w-28 rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="text-xs text-muted-foreground">Display ordering (lower = first).</p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="seoTitle" className="text-sm font-medium">
            SEO Title
          </label>
          <input
            id="seoTitle"
            name="seoTitle"
            type="text"
            defaultValue={product?.seoTitle ?? ""}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <label htmlFor="seoDescription" className="text-sm font-medium">
            SEO Description
          </label>
          <textarea
            id="seoDescription"
            name="seoDescription"
            rows={2}
            defaultValue={product?.seoDescription ?? ""}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {error && (
        <div
          className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          data-testid="product-form-error"
        >
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-4 border-t border-border/60">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : action === "create" ? "Create Product" : "Save Changes"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/admin/products")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
