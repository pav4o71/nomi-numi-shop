"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

interface CollectionFormData {
  id?: string;
  name: string;
  slug: string;
  description: string | null;
  position: number;
  published: boolean;
  publishedFrom: Date | null;
  publishedUntil: Date | null;
}

interface CollectionFormProps {
  action: "create" | "update";
  collection?: CollectionFormData;
}

/**
 * Utility to convert a Date to a YYYY-MM-DDTHH:mm string for datetime-local input.
 */
function toDatetimeLocal(date: Date | null | undefined): string {
  if (!date) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  const d = new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Phase 4B client-side collection form.
 *
 * Submits to admin catalog API routes. Redirects to the collection list
 * on success. Displays server-side validation errors inline.
 */
export function CollectionForm({ action, collection }: CollectionFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = new FormData(event.currentTarget);

    const body = {
      name: form.get("name") as string,
      slug: form.get("slug") as string,
      description: (form.get("description") as string) || null,
      position: Number(form.get("position") || 0),
      published: form.get("published") === "on",
      publishedFrom: (form.get("publishedFrom") as string) || null,
      publishedUntil: (form.get("publishedUntil") as string) || null,
    };

    const url =
      action === "create"
        ? "/api/admin/catalog/collections"
        : `/api/admin/catalog/collections/${collection!.id}`;

    try {
      const resp = await fetch(url, {
        method: action === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (resp.ok) {
        router.push("/admin/collections");
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
    <form onSubmit={handleSubmit} className="mt-6 max-w-lg space-y-5" data-testid="collection-form">
      <div className="space-y-1.5">
        <label htmlFor="name" className="text-sm font-medium">
          Name <span className="text-destructive">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={collection?.name ?? ""}
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
          defaultValue={collection?.slug ?? ""}
          placeholder="e.g. spring-sale"
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <p className="text-xs text-muted-foreground">
          URL-safe identifier. Lowercase, hyphens only.
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="description" className="text-sm font-medium">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={collection?.description ?? ""}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="position" className="text-sm font-medium">
          Position
        </label>
        <input
          id="position"
          name="position"
          type="number"
          defaultValue={collection?.position ?? 0}
          className="w-28 rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <p className="text-xs text-muted-foreground">Display ordering (lower = first).</p>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="published"
          name="published"
          type="checkbox"
          defaultChecked={collection?.published ?? false}
          className="size-4 rounded border-input"
        />
        <label htmlFor="published" className="text-sm font-medium">
          Published
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="publishedFrom" className="text-sm font-medium">
            Publish From
          </label>
          <input
            id="publishedFrom"
            name="publishedFrom"
            type="datetime-local"
            defaultValue={toDatetimeLocal(collection?.publishedFrom)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="publishedUntil" className="text-sm font-medium">
            Publish Until
          </label>
          <input
            id="publishedUntil"
            name="publishedUntil"
            type="datetime-local"
            defaultValue={toDatetimeLocal(collection?.publishedUntil)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {error && (
        <div
          className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          data-testid="collection-form-error"
        >
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : action === "create" ? "Create Collection" : "Save Changes"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/admin/collections")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
