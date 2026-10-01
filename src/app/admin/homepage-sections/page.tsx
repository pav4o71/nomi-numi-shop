import { db } from "@/db";
import { homepageSections } from "@/db/schema/cms";
import { createHomepageSection, deleteHomepageSection } from "./actions";

export default async function HomepageSectionsAdmin() {
  const allSections = await db.select().from(homepageSections).orderBy(homepageSections.order);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight text-primary">Homepage Sections</h1>
        <p className="text-muted-foreground mt-2">Manage the layout and content of the storefront homepage.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Active Sections</h2>
          {allSections.length === 0 ? (
            <p className="text-muted-foreground text-sm">No sections created yet.</p>
          ) : (
            <div className="divide-y divide-border rounded-lg border border-border">
              {allSections.map((section) => (
                <div key={section.id} className="flex items-center justify-between p-4">
                  <div>
                    <h3 className="font-medium text-foreground">{section.type}</h3>
                    <p className="text-sm text-muted-foreground">Order: {section.order}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-muted-foreground">
                      {section.isVisible ? "Visible" : "Hidden"}
                    </span>
                    <form action={async () => {
                      "use server";
                      await deleteHomepageSection(section.id);
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
          <h2 className="text-xl font-semibold mb-4">Add New Section</h2>
          <form action={createHomepageSection} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="type" className="text-sm font-medium">Type (hero, featured_products, etc.)</label>
              <input
                type="text"
                id="type"
                name="type"
                required
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="order" className="text-sm font-medium">Display Order</label>
              <input
                type="number"
                id="order"
                name="order"
                defaultValue={0}
                required
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="content" className="text-sm font-medium">Content Data (JSON format)</label>
              <textarea
                id="content"
                name="content"
                required
                rows={8}
                defaultValue={'{\n  "title": "Welcome",\n  "subtitle": "Discover our collection",\n  "ctaText": "Shop Now",\n  "ctaLink": "/collections/all"\n}'}
                className="w-full font-mono rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isVisible"
                name="isVisible"
                className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                defaultChecked
              />
              <label htmlFor="isVisible" className="text-sm font-medium">Visible</label>
            </div>

            <button
              type="submit"
              className="inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              Add Section
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
