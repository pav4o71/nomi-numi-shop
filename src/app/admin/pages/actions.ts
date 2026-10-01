"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { pages } from "@/db/schema/cms";

export async function createPage(formData: FormData) {
  const slug = formData.get("slug") as string;
  const title = formData.get("title") as string;
  const content = formData.get("content") as string;
  const metaTitle = formData.get("metaTitle") as string;
  const metaDescription = formData.get("metaDescription") as string;
  const isPublished = formData.get("isPublished") === "on";

  await db.insert(pages).values({
    slug,
    title,
    content,
    metaTitle,
    metaDescription,
    isPublished,
    publishedAt: isPublished ? new Date() : null,
  });

  revalidatePath("/admin/pages");
  revalidatePath("/");
}

export async function deletePage(id: string) {
  await db.delete(pages).where(eq(pages.id, id));
  revalidatePath("/admin/pages");
  revalidatePath("/");
}
