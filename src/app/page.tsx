import Link from "next/link";

import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";

const giftDirections = [
  {
    title: "Huggable Gifts",
    description: "Soft, comforting presents meant to be held when you cannot be there in person.",
    tone: "bg-primary/10",
  },
  {
    title: "Little Keepsakes",
    description: "Small tokens that carry a daily reminder of care, affection, and connection.",
    tone: "bg-secondary/70",
  },
  {
    title: "Just-Because Surprises",
    description: "Thoughtful moments for ordinary days that still deserve a little warmth.",
    tone: "bg-accent",
  },
] as const;

const reasons = [
  {
    title: "Made for meaningful moments",
    description: "Every gift direction is chosen to help someone feel remembered and cherished.",
  },
  {
    title: "Easy to send from afar",
    description: "Built for people living overseas who want closeness to travel with the gift.",
  },
  {
    title: "Personal touches matter",
    description: "Space for heartfelt messages and thoughtful details that make a gift feel yours.",
  },
] as const;

const steps = [
  {
    step: "1",
    title: "Choose a meaningful gift",
    description: "Browse gift directions that match the feeling you want to share.",
  },
  {
    step: "2",
    title: "Add your personal message",
    description: "Say what matters in your own words so the gift arrives with your voice.",
  },
  {
    step: "3",
    title: "Send a little closeness",
    description: "Share something warm that helps the distance feel a little smaller.",
  },
] as const;

export default function HomePage() {
  return (
    <main>
      <section className="hero-glow relative overflow-hidden" aria-labelledby="hero-heading">
        <div
          className="hero-orb -left-16 top-24 h-56 w-56 bg-primary/15 sm:h-72 sm:w-72"
          aria-hidden="true"
        />
        <div
          className="hero-orb -right-10 top-10 h-44 w-44 bg-secondary/80 sm:h-60 sm:w-60"
          aria-hidden="true"
        />
        <div
          className="hero-orb bottom-8 left-1/3 h-36 w-36 bg-accent/90 sm:h-48 sm:w-48"
          aria-hidden="true"
        />

        <Container className="relative flex min-h-[min(88vh,52rem)] flex-col justify-center py-16 sm:py-20 lg:py-24">
          <p className="font-display text-3xl font-semibold tracking-tight text-primary sm:text-4xl">
            Nomi Numi
          </p>
          <h1
            id="hero-heading"
            className="mt-5 max-w-3xl font-display text-4xl leading-tight font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl"
          >
            Gifts that help hearts stay close
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
            Meaningful gifts that help people feel close, even when they are far apart.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg">
              <Link href="/#gifts">Explore Gifts</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/#how-it-works">See How It Works</Link>
            </Button>
          </div>
        </Container>
      </section>

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
              A first look at the kinds of thoughtful gifts Nomi Numi is being shaped around.
            </p>
          </div>

          <ul className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {giftDirections.map((gift) => (
              <li key={gift.title} className="space-y-4">
                <div className={`h-36 w-full rounded-xl ${gift.tone}`} aria-hidden="true" />
                <h3 className="font-display text-xl font-semibold tracking-tight text-foreground">
                  {gift.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {gift.description}
                </p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section
        id="why-nomi-numi"
        className="section-shell py-16 sm:py-20"
        aria-labelledby="why-heading"
      >
        <Container>
          <div className="max-w-2xl">
            <h2
              id="why-heading"
              className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
            >
              Why Nomi Numi
            </h2>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg">
              A warm gifting brand for connection, care, and long-distance affection.
            </p>
          </div>

          <ul className="mt-10 grid gap-8 sm:grid-cols-3">
            {reasons.map((reason) => (
              <li key={reason.title} className="space-y-3 border-t border-border pt-5">
                <h3 className="font-display text-xl font-semibold tracking-tight text-foreground">
                  {reason.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {reason.description}
                </p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section
        id="how-it-works"
        className="section-shell border-y border-border/70 bg-muted/40 py-16 sm:py-20"
        aria-labelledby="how-heading"
      >
        <Container>
          <div className="max-w-2xl">
            <h2
              id="how-heading"
              className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
            >
              How It Works
            </h2>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg">
              A simple path we are building for sending closeness across distance.
            </p>
          </div>

          <ol className="mt-10 grid gap-8 sm:grid-cols-3">
            {steps.map((item) => (
              <li key={item.step} className="space-y-3">
                <p className="text-sm font-semibold tracking-[0.18em] text-primary uppercase">
                  Step {item.step}
                </p>
                <h3 className="font-display text-xl font-semibold tracking-tight text-foreground">
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {item.description}
                </p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section className="py-16 sm:py-20" aria-labelledby="closing-heading">
        <Container>
          <div className="relative overflow-hidden rounded-2xl bg-primary px-6 py-12 text-primary-foreground sm:px-10 sm:py-14">
            <div
              className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary-foreground/10"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute -bottom-16 left-10 h-48 w-48 rounded-full bg-primary-foreground/10"
              aria-hidden="true"
            />
            <div className="relative max-w-2xl">
              <h2
                id="closing-heading"
                className="font-display text-3xl font-semibold tracking-tight sm:text-4xl"
              >
                Because distance should not quiet love
              </h2>
              <p className="mt-4 text-base leading-relaxed text-primary-foreground/90 sm:text-lg">
                Nomi Numi is for the moments when you want someone far away to feel held,
                remembered, and close to your heart.
              </p>
              <div className="mt-8">
                <Button
                  asChild
                  size="lg"
                  variant="secondary"
                  className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                >
                  <Link href="/#gifts">Explore Gifts</Link>
                </Button>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
}
