import Link from "next/link";

import { Container } from "@/components/container";

const destinations = [
  {
    title: "Products",
    description: "Browse the growing catalog of thoughtful gift ideas.",
    href: "/products",
    cta: "Browse products",
  },
  {
    title: "Categories",
    description: "Browse the shop through stable product categories.",
    href: "/categories",
    cta: "Browse categories",
  },
  {
    title: "Collections",
    description: "Explore seasonal and themed collections.",
    href: "/collections",
    cta: "Explore collections",
  },
] as const;

export function HomeShopDestinations() {
  return (
    <section
      className="section-shell border-t border-border/70 py-16 sm:py-20"
      aria-labelledby="shop-heading"
    >
      <Container>
        <div className="max-w-2xl">
          <h2
            id="shop-heading"
            className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
          >
            Shop destinations
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg">
            Browse the catalog by product, category, or collection.
          </p>
        </div>

        <ul className="mt-10 grid gap-6 sm:grid-cols-3">
          {destinations.map((destination) => (
            <li key={destination.title}>
              <Link
                href={destination.href}
                className="surface-card focus-ring flex h-full flex-col p-6 transition-transform motion-safe:hover:-translate-y-0.5"
              >
                <h3 className="font-display text-xl font-semibold tracking-tight text-foreground">
                  {destination.title}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {destination.description}
                </p>
                <span className="mt-5 text-sm font-medium text-primary">{destination.cta}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
