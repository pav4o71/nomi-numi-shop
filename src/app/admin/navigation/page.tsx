import { db } from "@/db";
import { navigation } from "@/db/schema/cms";
import { createNavigation, deleteNavigation } from "./actions";

export default async function NavigationAdmin() {
  const allNav = await db.select().from(navigation).orderBy(navigation.createdAt);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight text-primary">Navigation</h1>
        <p className="text-muted-foreground mt-2">Manage header, footer, and custom navigation menus.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Existing Menus</h2>
          {allNav.length === 0 ? (
            <p className="text-muted-foreground text-sm">No navigation menus created yet.</p>
          ) : (
            <div className="divide-y divide-border rounded-lg border border-border">
              {allNav.map((nav) => (
                <div key={nav.id} className="flex items-center justify-between p-4">
                  <div>
                    <h3 className="font-medium text-foreground">{nav.title}</h3>
                    <p className="text-sm text-muted-foreground">Handle: {nav.handle}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {Array.isArray(nav.items) ? nav.items.length : 0} items
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <form action={async () => {
                      "use server";
                      await deleteNavigation(nav.id);
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
          <h2 className="text-xl font-semibold mb-4">Create New Menu</h2>
          <form action={createNavigation} className="space-y-4">
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
              <label htmlFor="handle" className="text-sm font-medium">Handle (e.g. main-menu, footer)</label>
              <input
                type="text"
                id="handle"
                name="handle"
                required
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="items" className="text-sm font-medium">Items (JSON format)</label>
              <textarea
                id="items"
                name="items"
                required
                rows={8}
                defaultValue={'[\n  { "label": "Home", "href": "/" },\n  { "label": "Shop", "href": "/collections/all" }\n]'}
                className="w-full font-mono rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <button
              type="submit"
              className="inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              Create Menu
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
