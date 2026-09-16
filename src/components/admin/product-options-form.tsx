"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface ProductOptionValue {
  value: string;
  position?: number;
}

interface ProductOptionDefinition {
  name: string;
  position?: number;
  values: ProductOptionValue[];
}

interface ProductOptionsFormProps {
  productId: string;
  initialOptions: ProductOptionDefinition[];
  hasVariants: boolean;
}

export function ProductOptionsForm({
  productId,
  initialOptions,
  hasVariants,
}: ProductOptionsFormProps) {
  const router = useRouter();
  const [options, setOptions] = useState<ProductOptionDefinition[]>(initialOptions);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const resp = await fetch(`/api/admin/catalog/products/${productId}/options`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ options }),
      });

      if (resp.ok) {
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

  function addOption() {
    setOptions([...options, { name: "", values: [{ value: "" }] }]);
  }

  function updateOptionName(index: number, name: string) {
    const newOptions = [...options];
    newOptions[index].name = name;
    setOptions(newOptions);
  }

  function removeOption(index: number) {
    setOptions(options.filter((_, i) => i !== index));
  }

  function addValue(optionIndex: number) {
    const newOptions = [...options];
    newOptions[optionIndex].values.push({ value: "" });
    setOptions(newOptions);
  }

  function updateValue(optionIndex: number, valueIndex: number, val: string) {
    const newOptions = [...options];
    newOptions[optionIndex].values[valueIndex].value = val;
    setOptions(newOptions);
  }

  function removeValue(optionIndex: number, valueIndex: number) {
    const newOptions = [...options];
    newOptions[optionIndex].values = newOptions[optionIndex].values.filter((_, i) => i !== valueIndex);
    setOptions(newOptions);
  }

  if (hasVariants) {
    return (
      <div className="mt-6">
        <p className="text-sm text-muted-foreground mb-4">
          This product has variants. You cannot modify its options until all variants are removed.
        </p>
        <div className="space-y-4">
          {initialOptions.map((opt) => (
            <div key={opt.name} className="p-4 border rounded-lg">
              <h3 className="font-semibold">{opt.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {opt.values.map(v => v.value).join(", ")}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 max-w-3xl space-y-6" data-testid="product-options-form">
      {options.length === 0 ? (
        <p className="text-sm text-muted-foreground">No options defined.</p>
      ) : (
        <div className="space-y-6">
          {options.map((option, optIdx) => (
            <div key={optIdx} className="rounded-xl border border-border/60 bg-muted/10 p-5">
              <div className="flex items-center justify-between mb-4">
                <input
                  type="text"
                  placeholder="Option name (e.g., Size, Color)"
                  value={option.name}
                  onChange={(e) => updateOptionName(optIdx, e.target.value)}
                  className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm font-medium w-64 shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => removeOption(optIdx)}
                >
                  Remove Option
                </Button>
              </div>

              <div className="space-y-2">
                {option.values.map((val, valIdx) => (
                  <div key={valIdx} className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Value (e.g., Small, Red)"
                      value={val.value}
                      onChange={(e) => updateValue(optIdx, valIdx, e.target.value)}
                      className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm w-48 shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      required
                    />
                    {option.values.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => removeValue(optIdx, valIdx)}
                      >
                        ×
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 text-xs"
                  onClick={() => addValue(optIdx)}
                >
                  + Add Value
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3 pt-4 border-t border-border/60">
        <Button type="button" variant="outline" onClick={addOption}>
          Add Option
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Save Options"}
        </Button>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
    </form>
  );
}
