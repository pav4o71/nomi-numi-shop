export const siteNavigation = [
  { href: "/products", label: "Products" },
  { href: "/categories", label: "Categories" },
  { href: "/collections", label: "Collections" },
  { href: "/gifts", label: "Gifts" },
  { href: "/about", label: "About" },
] as const;

export type SiteNavigationItem = (typeof siteNavigation)[number];
