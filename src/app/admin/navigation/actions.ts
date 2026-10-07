"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { navigation } from "@/db/schema/cms";

export async function createNavigation(formData: FormData) {
  const handle = formData.get("handle") as string;
  const title = formData.get("title") as string;
  const itemsRaw = formData.get("items") as string;
  
  let items = [];
  try {
    items = JSON.parse(itemsRaw);
  } catch (e) {
    items = [];
  }

  await db.insert(navigation).values({
    handle,
    title,
    items,
  });

  revalidatePath("/admin/navigation");
  revalidatePath("/");
}

export async function deleteNavigation(id: string) {
  await db.delete(navigation).where(eq(navigation.id, id));
  revalidatePath("/admin/navigation");
  revalidatePath("/");
}
