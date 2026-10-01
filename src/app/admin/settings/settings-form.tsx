"use client";

import { useTransition, useState } from "react";
import { updateStoreSettings } from "./actions";

export function SettingsForm({ initialData }: { initialData: any }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ success: boolean; text: string } | null>(null);

  async function action(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const result = await updateStoreSettings(formData);
      if (result.success) {
        setMessage({ success: true, text: "Settings saved successfully." });
      } else {
        setMessage({ success: false, text: result.error || "Failed to save settings." });
      }
    });
  }

  return (
    <form action={action} className="space-y-6">
      {message && (
        <div className={`p-4 rounded-md text-sm ${message.success ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          {message.text}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="storeName" className="block text-sm font-medium text-foreground mb-1">Store Name</label>
          <input
            id="storeName"
            name="storeName"
            type="text"
            required
            defaultValue={initialData?.storeName || ""}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div>
          <label htmlFor="contactEmail" className="block text-sm font-medium text-foreground mb-1">Contact Email</label>
          <input
            id="contactEmail"
            name="contactEmail"
            type="email"
            defaultValue={initialData?.contactEmail || ""}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2 border rounded-md p-4">
            <input
              type="checkbox"
              id="phpEnabled"
              name="phpEnabled"
              defaultChecked={initialData?.phpEnabled !== false}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="phpEnabled" className="text-sm font-medium leading-none">Enable PHP (₱)</label>
          </div>
          
          <div className="flex items-center space-x-2 border rounded-md p-4">
            <input
              type="checkbox"
              id="usdEnabled"
              name="usdEnabled"
              defaultChecked={initialData?.usdEnabled !== false}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="usdEnabled" className="text-sm font-medium leading-none">Enable USD ($)</label>
          </div>
        </div>

        <div className="pt-4 border-t">
          <h3 className="text-lg font-medium mb-4">SEO Settings</h3>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="seoTitle" className="block text-sm font-medium text-foreground mb-1">Global SEO Title</label>
              <input
                id="seoTitle"
                name="seoTitle"
                type="text"
                defaultValue={initialData?.seoTitle || ""}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div>
              <label htmlFor="seoDescription" className="block text-sm font-medium text-foreground mb-1">Global SEO Description</label>
              <textarea
                id="seoDescription"
                name="seoDescription"
                rows={3}
                defaultValue={initialData?.seoDescription || ""}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4 flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </form>
  );
}
