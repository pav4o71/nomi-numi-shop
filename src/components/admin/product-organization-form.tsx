"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface AssignedCategory {
  id: string;
  name: string;
  isPrimary: boolean;
  position: number;
}

interface AssignedCollection {
  id: string;
  name: string;
  position: number;
}

interface SearchResult {
  id: string;
  name: string;
}

export function ProductOrganizationForm({
  productId,
  initialCategories,
  initialCollections,
}: {
  productId: string;
  initialCategories: AssignedCategory[];
  initialCollections: AssignedCollection[];
}) {
  const router = useRouter();

  const [categories, setCategories] = useState<AssignedCategory[]>(initialCategories);
  const [collections, setCollections] = useState<AssignedCollection[]>(initialCollections);

  const [catSearch, setCatSearch] = useState("");
  const [catResults, setCatResults] = useState<SearchResult[]>([]);
  const [colSearch, setColSearch] = useState("");
  const [colResults, setColResults] = useState<SearchResult[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCatSearch(q: string) {
    setCatSearch(q);
    if (!q) {
      setCatResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/admin/catalog/categories/search?q=${encodeURIComponent(q)}`);
      if (res.ok) setCatResults(await res.json());
    } catch {
      /* ignore */
    }
  }

  async function handleColSearch(q: string) {
    setColSearch(q);
    if (!q) {
      setColResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/admin/catalog/collections/search?q=${encodeURIComponent(q)}`);
      if (res.ok) setColResults(await res.json());
    } catch {
      /* ignore */
    }
  }

  function addCategory(cat: SearchResult) {
    if (!categories.find((c) => c.id === cat.id)) {
      setCategories([
        ...categories,
        { ...cat, isPrimary: categories.length === 0, position: categories.length },
      ]);
    }
    setCatSearch("");
    setCatResults([]);
  }

  function removeCategory(id: string) {
    const next = categories.filter((c) => c.id !== id);
    if (next.length > 0 && !next.some((c) => c.isPrimary)) {
      next[0].isPrimary = true;
    }
    setCategories(next);
  }

  function setPrimaryCategory(id: string) {
    setCategories(categories.map((c) => ({ ...c, isPrimary: c.id === id })));
  }

  function addCollection(col: SearchResult) {
    if (!collections.find((c) => c.id === col.id)) {
      setCollections([...collections, { ...col, position: collections.length }]);
    }
    setColSearch("");
    setColResults([]);
  }

  function removeCollection(id: string) {
    setCollections(collections.filter((c) => c.id !== id));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const catPayload = categories.map((c, i) => ({
        categoryId: c.id,
        isPrimary: c.isPrimary,
        position: i,
      }));

      const colPayload = collections.map((c, i) => ({
        collectionId: c.id,
        position: i,
      }));

      const [resCat, resCol] = await Promise.all([
        fetch(`/api/admin/catalog/products/${productId}/categories`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ categories: catPayload }),
        }),
        fetch(`/api/admin/catalog/products/${productId}/collections`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ collections: colPayload }),
        }),
      ]);

      if (!resCat.ok) throw new Error("Failed to save categories");
      if (!resCol.ok) throw new Error("Failed to save collections");

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error saving organization");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-8" data-testid="organization-form">
      {/* Categories Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Categories</h3>
        <div className="relative">
          <input
            type="text"
            value={catSearch}
            onChange={(e) => handleCatSearch(e.target.value)}
            placeholder="Search categories to add..."
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
          />
          {catResults.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-auto">
              {catResults.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => addCategory(r)}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-muted"
                >
                  {r.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {categories.length > 0 && (
          <div className="border border-border/60 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Category Name</th>
                  <th className="px-4 py-2 text-center font-medium">Primary</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id} className="border-t border-border/30">
                    <td className="px-4 py-3">{c.name}</td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="radio"
                        name="primary_category"
                        checked={c.isPrimary}
                        onChange={() => setPrimaryCategory(c.id)}
                        className="h-4 w-4"
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCategory(c.id)}
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Collections Section */}
      <div className="space-y-4 pt-4 border-t border-border/60">
        <h3 className="text-lg font-medium">Collections</h3>
        <div className="relative">
          <input
            type="text"
            value={colSearch}
            onChange={(e) => handleColSearch(e.target.value)}
            placeholder="Search collections to add..."
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
          />
          {colResults.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-auto">
              {colResults.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => addCollection(r)}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-muted"
                >
                  {r.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {collections.length > 0 && (
          <div className="border border-border/60 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Collection Name</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {collections.map((c) => (
                  <tr key={c.id} className="border-t border-border/30">
                    <td className="px-4 py-3">{c.name}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCollection(c.id)}
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-4 border-t border-border/60">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Save Organization"}
        </Button>
      </div>
    </form>
  );
}
