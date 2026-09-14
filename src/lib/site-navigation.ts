export const siteNavigation = [
  { href: "/products", label: "Products" },
  { href: "/categories", label: "Categories" },
  { href: "/collections", label: "Collections" },
  { href: "/#why-nomi-numi", label: "Why Nomi Numi" },
  { href: "/#how-it-works", label: "How It Works" },
] as const;

export type SiteNavigationItem = (typeof siteNavigation)[number];
