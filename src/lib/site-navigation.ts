export const siteNavigation = [
  { href: "#gifts", label: "Gifts" },
  { href: "#why-nomi-numi", label: "Why Nomi Numi" },
  { href: "#how-it-works", label: "How It Works" },
] as const;

export type SiteNavigationItem = (typeof siteNavigation)[number];
