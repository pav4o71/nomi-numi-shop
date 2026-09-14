import Link from "next/link";

import { DecorativeMotif } from "@/components/brand/decorative-motif";
import { Container } from "@/components/container";

const giftDirections = [
  {
    title: "Huggable Gifts",
    description: "Soft, comforting presents meant to be held when you cannot be there in person.",
    tone: "bg-primary/10",
    motif: "heart" as const,
    href: "/products",
    cta: "Browse products",
  },
  {
    title: "Little Keepsakes",
    description: "Small tokens that carry a daily reminder of care, affection, and connection.",
    tone: "bg-secondary/70",
    motif: "paw" as const,
    href: "/collections",
    cta: "Explore collections",
  },
  {
    title: "Just-Because Surprises",
    description: "Thoughtful moments for ordinary days that still deserve a little warmth.",
    tone: "bg-accent",
    motif: "heart" as const,
    href: "/products",
    cta: "Browse products",
  },
] as const;

export function HomeGiftDirections() {
  return (
    <section
      id="gifts"
      className="section-shell border-t border-border/70 bg-surface py-16 sm:py-20"
      aria-labelledby="gifts-heading"
    >
      <Container>
        <div className="max-w-2xl">
          <h2
            id="gifts-heading"
            className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
          >
            Gift directions
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg">
            Conceptual starting points for the kinds of warmth Nomi Numi is shaping around — not
            live product listings.
          </p>
        </div>

        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {giftDirections.map((gift) => (
            <li
              key={gift.title}
              className="surface-card flex h-full flex-col overflow-hidden p-5 sm:p-6"
            >
              <div
                className={`relative flex h-36 w-full items-end justify-end rounded-xl ${gift.tone} p-4`}
                aria-hidden="true"
              >
                <DecorativeMotif variant={gift.motif} className="h-8 w-8 opacity-80" />
              </div>
              <h3 className="mt-5 font-display text-xl font-semibold tracking-tight text-foreground">
                {gift.title}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground sm:text-base">
                {gift.description}
              </p>
              <Link
                href={gift.href}
                className="mt-5 inline-flex w-fit text-sm font-medium text-primary underline-offset-4 transition-colors hover:text-primary-hover hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {gift.cta}
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
