"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { ProductOptionWithValues } from "@/catalog/repository";

interface VariantFormData {
  id?: string;
  sku: string;
  isActive: boolean;
  weightGrams: number | null;
  lengthMm: number | null;
  widthMm: number | null;
  heightMm: number | null;
  fulfillmentHint: string | null;
  optionSelections: { optionId: string; optionValueId: string }[];
  prices: { currency: "PHP" | "USD"; amountMinor: number; compareAtAmountMinor: number | null }[];
}

interface VariantFormProps {
  productId: string;
  productOptions: ProductOptionWithValues[];
  action: "create" | "update";
  variant?: VariantFormData;
}

export function VariantForm({ productId, productOptions, action, variant }: VariantFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Initialize prices map (using amount directly instead of minor for UI)
  const initialPrices = variant?.prices || [];
  const [usdPrice, setUsdPrice] = useState(
    initialPrices.find((p) => p.currency === "USD")?.amountMinor
      ? initialPrices.find((p) => p.currency === "USD")!.amountMinor / 100
      : "",
  );
  const [phpPrice, setPhpPrice] = useState(
    initialPrices.find((p) => p.currency === "PHP")?.amountMinor
      ? initialPrices.find((p) => p.currency === "PHP")!.amountMinor / 100
      : "",
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = new FormData(event.currentTarget);

    // Collect option selections
    const optionSelections = productOptions
      .map((opt) => ({
        optionId: opt.id,
        optionValueId: form.get(`option-${opt.id}`) as string,
      }))
      .filter((o) => o.optionValueId);

    if (optionSelections.length !== productOptions.length) {
      setError("Please select a value for all options.");
      setSubmitting(false);
      return;
    }

    // Collect prices
    const prices = [];
    if (usdPrice) {
      prices.push({ currency: "USD", amountMinor: Math.round(Number(usdPrice) * 100) });
    }
    if (phpPrice) {
      prices.push({ currency: "PHP", amountMinor: Math.round(Number(phpPrice) * 100) });
    }

    const body = {
      sku: form.get("sku") as string,
      isActive: form.get("isActive") === "on",
      weightGrams: form.get("weightGrams") ? Number(form.get("weightGrams")) : null,
      lengthMm: form.get("lengthMm") ? Number(form.get("lengthMm")) : null,
      widthMm: form.get("widthMm") ? Number(form.get("widthMm")) : null,
      heightMm: form.get("heightMm") ? Number(form.get("heightMm")) : null,
      fulfillmentHint: (form.get("fulfillmentHint") as string) || null,
      optionSelections,
      prices,
    };

    const url =
      action === "create"
        ? `/api/admin/catalog/products/${productId}/variants`
        : `/api/admin/catalog/variants/${variant!.id}`;

    try {
      const resp = await fetch(url, {
        method: action === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (resp.ok) {
        router.push(`/admin/products/${productId}/variants`);
        router.refresh();
        return;
      }

      const data = await resp.json();
      setError(data.message ?? `Request failed (${resp.status})`);
    } catch {
      setError("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6" data-testid="variant-form">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="space-y-1.5 md:col-span-2">
          <label htmlFor="sku" className="text-sm font-medium">
            SKU <span className="text-destructive">*</span>
          </label>
          <input
            id="sku"
            name="sku"
            type="text"
            required
            defaultValue={variant?.sku ?? ""}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-1.5 md:col-span-2 flex items-center gap-2">
          <input
            id="isActive"
            name="isActive"
            type="checkbox"
            defaultChecked={variant?.isActive ?? true}
            className="h-4 w-4 rounded border-gray-300"
          />
          <label htmlFor="isActive" className="text-sm font-medium">
            Active (sellable)
          </label>
        </div>

        {/* Dynamic Options */}
        {productOptions.length > 0 && (
          <div className="md:col-span-2 space-y-3 pt-2">
            <h3 className="text-sm font-medium text-foreground">Options</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {productOptions.map((opt) => {
                const selectedVal = variant?.optionSelections.find(
                  (s) => s.optionId === opt.id,
                )?.optionValueId;
                return (
                  <div key={opt.id} className="space-y-1.5">
                    <label className="text-sm font-medium text-muted-foreground">{opt.name}</label>
                    <select
                      name={`option-${opt.id}`}
                      required
                      defaultValue={selectedVal ?? ""}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
                    >
                      <option value="" disabled>
                        Select {opt.name}
                      </option>
                      {opt.values.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.value}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Pricing */}
        <div className="md:col-span-2 space-y-3 pt-2">
          <h3 className="text-sm font-medium text-foreground">Pricing</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">USD</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={usdPrice}
                onChange={(e) => setUsdPrice(e.target.value)}
                className="w-full rounded-lg border border-input px-3 py-2 text-sm"
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">PHP</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={phpPrice}
                onChange={(e) => setPhpPrice(e.target.value)}
                className="w-full rounded-lg border border-input px-3 py-2 text-sm"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        {/* Dimensions */}
        <div className="md:col-span-2 space-y-3 pt-2 border-t border-border/60">
          <h3 className="text-sm font-medium text-foreground">Fulfillment & Dimensions</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">Weight (grams)</label>
              <input
                name="weightGrams"
                type="number"
                min="0"
                defaultValue={variant?.weightGrams ?? ""}
                className="w-full rounded-lg border border-input px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">Fulfillment Hint</label>
              <input
                name="fulfillmentHint"
                type="text"
                defaultValue={variant?.fulfillmentHint ?? ""}
                className="w-full rounded-lg border border-input px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">Length (mm)</label>
              <input
                name="lengthMm"
                type="number"
                min="0"
                defaultValue={variant?.lengthMm ?? ""}
                className="w-full rounded-lg border border-input px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">Width (mm)</label>
              <input
                name="widthMm"
                type="number"
                min="0"
                defaultValue={variant?.widthMm ?? ""}
                className="w-full rounded-lg border border-input px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">Height (mm)</label>
              <input
                name="heightMm"
                type="number"
                min="0"
                defaultValue={variant?.heightMm ?? ""}
                className="w-full rounded-lg border border-input px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-4 border-t border-border/60">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : action === "create" ? "Create Variant" : "Save Changes"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/admin/products/${productId}/variants`)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
