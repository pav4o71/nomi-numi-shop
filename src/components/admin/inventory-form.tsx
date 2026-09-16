"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

type InventoryBalance = {
  variantId: string;
  onHand: number;
  reserved: number;
};

type InventoryMovement = {
  id: string;
  delta: number;
  reason: string;
  sourceReference: string | null;
  note: string | null;
  createdAt: string;
};

export function InventoryForm({
  variantId,
  balance,
  movements,
}: {
  variantId: string;
  balance: InventoryBalance;
  movements: InventoryMovement[];
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [deltaOnHand, setDeltaOnHand] = useState("0");
  const [reason, setReason] = useState("manual_adjustment");
  const [note, setNote] = useState("");

  const available = balance.onHand - balance.reserved;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const deltaOnHandInt = parseInt(deltaOnHand, 10);
    if (isNaN(deltaOnHandInt)) {
      setError("Adjustment must be a number");
      setIsSubmitting(false);
      return;
    }

    if (deltaOnHandInt === 0) {
      setError("Adjustment must not be zero");
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch(`/api/admin/catalog/variants/${variantId}/inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deltaOnHand: deltaOnHandInt,
          deltaReserved: 0,
          reason,
          note: note || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to adjust inventory");
      }

      setDeltaOnHand("0");
      setNote("");
      router.refresh();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-12 md:grid-cols-2">
      <div className="space-y-6">
        <div className="rounded-xl border p-6 bg-muted/10">
          <h3 className="mb-4 text-lg font-medium">Current Stock</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="rounded-lg bg-background p-4 shadow-sm border">
              <div className="text-2xl font-bold">{balance.onHand}</div>
              <div className="text-xs text-muted-foreground mt-1">On Hand</div>
            </div>
            <div className="rounded-lg bg-background p-4 shadow-sm border">
              <div className="text-2xl font-bold">{balance.reserved}</div>
              <div className="text-xs text-muted-foreground mt-1">Reserved</div>
            </div>
            <div className="rounded-lg bg-background p-4 shadow-sm border border-emerald-500/20">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {available}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Available</div>
            </div>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 rounded-xl border p-6">
          <h3 className="text-lg font-medium">Adjust Inventory</h3>
          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Adjustment Quantity (Delta)</label>
            <input
              type="number"
              value={deltaOnHand}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDeltaOnHand(e.target.value)}
              placeholder="e.g. 50 or -5"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <p className="text-xs text-muted-foreground">
              Use positive numbers to add stock, negative to remove.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Reason</label>
            <select
              value={reason}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setReason(e.target.value)}
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="restock">Restock</option>
              <option value="manual_adjustment">Manual Adjustment</option>
              <option value="return">Return</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Note (Optional)</label>
            <input
              value={note}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNote(e.target.value)}
              placeholder="e.g. Found in back warehouse"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Adjusting..." : "Apply Adjustment"}
          </Button>
        </form>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Movement Ledger</h3>
        {movements.length === 0 ? (
          <div className="text-sm text-muted-foreground italic border rounded-xl p-8 text-center border-dashed">
            No movements recorded yet.
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-left">
                  <th className="p-3 font-medium text-muted-foreground">Date</th>
                  <th className="p-3 font-medium text-muted-foreground">Delta</th>
                  <th className="p-3 font-medium text-muted-foreground">Reason</th>
                  <th className="p-3 font-medium text-muted-foreground">Note</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id} className="border-b last:border-0 border-border/30">
                    <td className="p-3 text-muted-foreground whitespace-nowrap">
                      {new Date(m.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3 font-medium">
                      <span
                        className={
                          m.delta > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : m.delta < 0
                              ? "text-red-600 dark:text-red-400"
                              : ""
                        }
                      >
                        {m.delta > 0 ? "+" : ""}
                        {m.delta}
                      </span>
                    </td>
                    <td className="p-3">
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{m.reason}</code>
                    </td>
                    <td
                      className="p-3 text-muted-foreground truncate max-w-[150px]"
                      title={m.note || ""}
                    >
                      {m.note || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
