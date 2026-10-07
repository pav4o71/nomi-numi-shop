import { eq } from "drizzle-orm";
import { getRuntimeDb } from "@/db/runtime";
import { promotions } from "@/db/schema";
import { PromotionForm } from "./promotion-form";

export const dynamic = "force-dynamic";

export default async function AdminPromotionsPage() {
  const db = getRuntimeDb();
  const allPromotions = await db.select().from(promotions).orderBy(promotions.createdAt);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Promotions</h1>
        <p className="text-muted-foreground">Manage discount codes and promotions.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="md:col-span-1 lg:col-span-1 border rounded-lg p-6 bg-card">
          <h2 className="text-lg font-medium mb-4">Create Promotion</h2>
          <PromotionForm />
        </div>

        <div className="md:col-span-1 lg:col-span-2 border rounded-lg p-0 bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Value</th>
                  <th className="px-4 py-3 font-medium">Uses</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {allPromotions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No promotions found. Create one to get started.
                    </td>
                  </tr>
                ) : (
                  allPromotions.map((promo) => (
                    <tr key={promo.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 font-medium">{promo.code}</td>
                      <td className="px-4 py-3 capitalize">{promo.type.replace("_", " ")}</td>
                      <td className="px-4 py-3">
                        {promo.type === "percentage" ? `${promo.value}%` : `${promo.currency} ${promo.value / 100}`}
                      </td>
                      <td className="px-4 py-3">
                        {promo.currentUses} {promo.maxUses ? `/ ${promo.maxUses}` : ""}
                      </td>
                      <td className="px-4 py-3">
                        {promo.active ? (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                            Inactive
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
