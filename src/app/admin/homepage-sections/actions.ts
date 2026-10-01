"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { homepageSections } from "@/db/schema/cms";

export async function createHomepageSection(formData: FormData) {
  const type = formData.get("type") as string;
  const order = parseInt(formData.get("order") as string, 10) || 0;
  const isVisible = formData.get("isVisible") === "on";
  const contentRaw = formData.get("content") as string;
  
  let content = {};
  try {
    content = JSON.parse(contentRaw);
  } catch (e) {
    content = {};
  }

  await db.insert(homepageSections).values({
    type,
    order,
    isVisible,
    content,
  });

  revalidatePath("/admin/homepage-sections");
  revalidatePath("/");
}

export async function deleteHomepageSection(id: string) {
  await db.delete(homepageSections).where(eq(homepageSections.id, id));
  revalidatePath("/admin/homepage-sections");
  revalidatePath("/");
}
