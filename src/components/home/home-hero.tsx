import Link from "next/link";

import { DecorativeMotif } from "@/components/brand/decorative-motif";
import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";

export function HomeHero() {
  return (
    <section className="hero-glow relative overflow-hidden" aria-labelledby="hero-heading">
      <div
        className="hero-orb -left-16 top-24 h-56 w-56 bg-blush/20 motion-safe:animate-[pulse_8s_ease-in-out_infinite] sm:h-72 sm:w-72"
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
        <div className="motion-safe:animate-[fade-up_700ms_ease-out_both]">
          <p className="flex items-center gap-2 font-display text-3xl font-semibold tracking-tight text-primary sm:text-4xl lg:text-5xl">
            Nomi Numi
            <DecorativeMotif variant="heart" className="h-7 w-7 text-blush/70 sm:h-8 sm:w-8" />
          </p>
          <h1
            id="hero-heading"
            className="mt-5 max-w-3xl font-display text-4xl leading-tight font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl"
          >
            Gifts that help hearts stay close
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
            A cozy home for long-distance gifting — soft, thoughtful presents that help someone far
            away feel remembered.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg">
              <Link href="/products">Browse products</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/#how-it-works">See how it works</Link>
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
