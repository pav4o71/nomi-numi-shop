import { relations, sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
};

export const pages = pgTable(
  "pages",
  {
    id: text("id").primaryKey(), // uuid
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    published: boolean("published").default(false).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("pages_slug_uidx").on(table.slug),
  ]
);

export const navigation = pgTable(
  "navigation",
  {
    id: text("id").primaryKey(), // uuid
    handle: text("handle").notNull(), // e.g. 'main-menu', 'footer'
    title: text("title").notNull(),
    items: jsonb("items").default(sql`'[]'::jsonb`).notNull(),
    // items could be an array of { label: string, url: string, target?: string }
    ...timestamps,
  },
  (table) => [
    uniqueIndex("navigation_handle_uidx").on(table.handle),
  ]
);

export const homepageSections = pgTable(
  "homepage_sections",
  {
    id: text("id").primaryKey(), // uuid
    type: text("type").notNull(), // e.g. 'hero', 'featured_products', 'banner'
    order: integer("order").notNull(), // sort order on the page
    title: text("title"),
    content: jsonb("content").default(sql`'{}'::jsonb`).notNull(),
    // content holds type-specific data (e.g. image URLs, target links, selected products)
    active: boolean("active").default(true).notNull(),
    ...timestamps,
  }
);
