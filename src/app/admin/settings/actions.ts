"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getRuntimeDb } from "@/db/runtime";
import { storeSettings } from "@/db/schema";
import { requireAdminAction } from "@/auth/guards";

export async function updateStoreSettings(formData: FormData) {
  await requireAdminAction();

  const storeName = formData.get("storeName") as string;
  const contactEmail = formData.get("contactEmail") as string;
  const seoTitle = formData.get("seoTitle") as string;
  const seoDescription = formData.get("seoDescription") as string;
  const phpEnabled = formData.get("phpEnabled") === "on";
  const usdEnabled = formData.get("usdEnabled") === "on";

  if (!storeName || (!phpEnabled && !usdEnabled)) {
    return { success: false, error: "Invalid configuration. At least one currency must be enabled." };
  }

  const db = getRuntimeDb();

  await db
    .insert(storeSettings)
    .values({
      id: 1,
      storeName,
      contactEmail: contactEmail || null,
      seoTitle: seoTitle || null,
      seoDescription: seoDescription || null,
      phpEnabled,
      usdEnabled,
    })
    .onConflictDoUpdate({
      target: storeSettings.id,
      set: {
        storeName,
        contactEmail: contactEmail || null,
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
        phpEnabled,
        usdEnabled,
        updatedAt: new Date(),
      },
    });

  revalidatePath("/admin/settings");
  revalidatePath("/");

  return { success: true };
}
