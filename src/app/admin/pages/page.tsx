import { db } from "@/db";
import { pages } from "@/db/schema/cms";
import { createPage, deletePage } from "./actions";

export default async function PagesAdmin() {
  const allPages = await db.select().from(pages).orderBy(pages.createdAt);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight text-primary">Pages</h1>
        <p className="text-muted-foreground mt-2">Manage custom CMS pages (e.g., About Us, Privacy Policy).</p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Existing Pages</h2>
          {allPages.length === 0 ? (
            <p className="text-muted-foreground text-sm">No pages created yet.</p>
          ) : (
            <div className="divide-y divide-border rounded-lg border border-border">
              {allPages.map((page) => (
                <div key={page.id} className="flex items-center justify-between p-4">
                  <div>
                    <h3 className="font-medium text-foreground">{page.title}</h3>
                    <p className="text-sm text-muted-foreground">/{page.slug}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-muted-foreground">
                      {page.isPublished ? "Published" : "Draft"}
                    </span>
                    <form action={async () => {
                      "use server";
                      await deletePage(page.id);
                    }}>
                      <button
                        type="submit"
                        className="text-sm text-destructive hover:underline"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Create New Page</h2>
          <form action={createPage} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">Title</label>
              <input
                type="text"
                id="title"
                name="title"
                required
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="slug" className="text-sm font-medium">Slug (e.g. about-us)</label>
              <input
                type="text"
                id="slug"
                name="slug"
                required
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="content" className="text-sm font-medium">Content (Markdown/HTML)</label>
              <textarea
                id="content"
                name="content"
                required
                rows={5}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="metaTitle" className="text-sm font-medium">Meta Title (SEO)</label>
              <input
                type="text"
                id="metaTitle"
                name="metaTitle"
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="metaDescription" className="text-sm font-medium">Meta Description (SEO)</label>
              <textarea
                id="metaDescription"
                name="metaDescription"
                rows={2}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPublished"
                name="isPublished"
                className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                defaultChecked
              />
              <label htmlFor="isPublished" className="text-sm font-medium">Published</label>
            </div>

            <button
              type="submit"
              className="inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              Create Page
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
