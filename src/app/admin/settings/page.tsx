import { getRuntimeDb } from "@/db/runtime";
import { storeSettings } from "@/db/schema";
import { SettingsForm } from "./settings-form";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const db = getRuntimeDb();
  const settings = await db.query.storeSettings.findFirst();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Store Settings</h1>
        <p className="text-muted-foreground">Manage global configuration for your store.</p>
      </div>

      <div className="border rounded-lg bg-card p-6">
        <SettingsForm initialData={settings} />
      </div>
    </div>
  );
}
