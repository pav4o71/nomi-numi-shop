import { DecorativeMotif } from "@/components/brand/decorative-motif";
import { Container } from "@/components/container";
import { siteNavigation } from "@/lib/site-navigation";

const footerSections = [
  {
    title: "Shop",
    links: [
      { href: "/products", label: "Products" },
      { href: "/categories", label: "Categories" },
      { href: "/collections", label: "Collections" },
      { href: "/gifts", label: "Gifts" },
    ],
  },
  {
    title: "Help",
    links: [
      { href: "/faq", label: "FAQ" },
      { href: "/shipping", label: "Shipping" },
      { href: "/returns", label: "Returns" },
      { href: "/contact", label: "Contact" },
      { href: "/size-guide", label: "Size Guide" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/lookbook", label: "Lookbook" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/legal/privacy", label: "Privacy" },
      { href: "/legal/terms", label: "Terms" },
      { href: "/legal/imprint", label: "Imprint" },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-border/80 bg-surface">
      <Container className="py-12 sm:py-14">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2">
              <p className="font-display text-lg font-semibold tracking-tight text-foreground">
                Nomi Numi
              </p>
              <DecorativeMotif variant="heart" className="h-4 w-4" />
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Meaningful gifts for staying close, even from far away.
            </p>
          </div>

          {footerSections.map((section) => (
            <nav key={section.title} aria-label={section.title}>
              <h3 className="mb-3 text-sm font-semibold text-foreground">{section.title}</h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-10 border-t border-border/40 pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Nomi Numi. All rights reserved.</p>
        </div>
      </Container>
    </footer>
  );
}
