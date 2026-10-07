import Link from "next/link";
import { ArrowRight, Heart } from "lucide-react";

import { DecorativeMotif } from "@/components/brand/decorative-motif";
import { Container } from "@/components/container";

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
            <div className="group flex w-fit items-center gap-2 cursor-default">
              <p className="font-display text-lg font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
                Nomi Numi
              </p>
              <DecorativeMotif variant="paw" className="h-5 w-5 text-primary transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Meaningful gifts for staying close, even from far away.
            </p>
          </div>

          {footerSections.map((section) => (
            <nav key={section.title} aria-label={section.title}>
              <h3 className="mb-4 text-sm font-semibold tracking-wide text-foreground uppercase">
                {section.title}
              </h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="group flex w-fit items-center text-sm text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      <ArrowRight className="mr-0 h-3 w-0 -translate-x-2 opacity-0 transition-all duration-200 ease-out group-hover:mr-1 group-hover:w-3 group-hover:translate-x-0 group-hover:opacity-100" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/40 pt-8 text-center text-sm text-muted-foreground sm:flex-row sm:text-left">
          <p>&copy; {new Date().getFullYear()} Nomi Numi. All rights reserved.</p>
          <p className="flex items-center gap-1.5">
            Made with <Heart className="h-4 w-4 fill-primary text-primary motion-safe:animate-[pulse_3s_ease-in-out_infinite]" /> for connection.
          </p>
        </div>
      </Container>
    </footer>
  );
}
