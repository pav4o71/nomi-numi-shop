"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PromotionForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [type, setType] = useState("percentage");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const code = formData.get("code") as string;
    const value = parseFloat(formData.get("value") as string);
    const currency = formData.get("currency") as string;
    const minSpend = formData.get("minSpend") as string;
    const maxUses = formData.get("maxUses") as string;

    const payload: Record<string, unknown> = {
      code,
      type,
      value: type === "fixed_amount" ? value * 100 : value,
    };

    if (type === "fixed_amount") payload.currency = currency || "USD";
    if (minSpend) payload.minSpend = parseFloat(minSpend) * 100;
    if (maxUses) payload.maxUses = parseInt(maxUses, 10);

    try {
      const res = await fetch("/api/admin/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create promotion");
      }

      toast.success("Promotion created successfully");
      router.refresh();
      (e.target as HTMLFormElement).reset();
      setType("percentage");
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("An unknown error occurred");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="code" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Promo Code</label>
        <Input id="code" name="code" placeholder="e.g. SUMMER2024" required />
      </div>

      <div className="space-y-2">
        <label htmlFor="type" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Discount Type</label>
        <select
          id="type"
          name="type"
          className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="percentage">Percentage (%)</option>
          <option value="fixed_amount">Fixed Amount</option>
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="value" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Discount Value</label>
        <Input
          id="value"
          name="value"
          type="number"
          step={type === "percentage" ? "1" : "0.01"}
          placeholder={type === "percentage" ? "e.g. 20" : "e.g. 15.00"}
          required
        />
      </div>

      {type === "fixed_amount" && (
        <div className="space-y-2">
          <label htmlFor="currency" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Currency</label>
          <Input id="currency" name="currency" defaultValue="USD" required />
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="minSpend" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Minimum Spend (Optional)</label>
        <Input id="minSpend" name="minSpend" type="number" step="0.01" placeholder="e.g. 50.00" />
      </div>

      <div className="space-y-2">
        <label htmlFor="maxUses" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Max Uses (Optional)</label>
        <Input id="maxUses" name="maxUses" type="number" step="1" placeholder="e.g. 100" />
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Creating..." : "Create Promotion"}
      </Button>
    </form>
  );
}
