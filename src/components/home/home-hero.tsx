import Link from "next/link";
import { ChevronDown } from "lucide-react";

import { DecorativeMotif } from "@/components/brand/decorative-motif";
import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";

export interface HomeHeroData {
  title?: string;
  subtitle?: string;
  ctaText1?: string;
  ctaLink1?: string;
  ctaText2?: string;
  ctaLink2?: string;
}

export function HomeHero({ data }: { data?: HomeHeroData }) {
  const title = data?.title || "Gifts for soft hearts";
  const subtitle = data?.subtitle || "Plush toys, cozy apparel, and thoughtful accessories that bring comfort and joy. Perfect for staying close, even from far away.";
  const ctaText1 = data?.ctaText1 || "Shop Plush";
  const ctaLink1 = data?.ctaLink1 || "/collections";
  const ctaText2 = data?.ctaText2 || "Explore Gifts";
  const ctaLink2 = data?.ctaLink2 || "/gifts";

  return (
    <section className="hero-glow relative overflow-hidden" aria-labelledby="hero-heading">
      {/* Background orbs — now blurred at 40px via globals.css */}
      <div
        className="hero-orb -left-16 top-24 h-72 w-72 bg-blush/25 motion-safe:animate-[pulse_9s_ease-in-out_infinite] sm:h-96 sm:w-96"
        aria-hidden="true"
      />
      <div
        className="hero-orb -right-16 top-8 h-64 w-64 bg-secondary/90 sm:h-80 sm:w-80"
        aria-hidden="true"
      />
      <div
        className="hero-orb bottom-12 left-1/3 h-48 w-48 bg-accent sm:h-64 sm:w-64"
        aria-hidden="true"
      />

      <Container className="relative flex min-h-[min(88vh,52rem)] flex-col justify-center py-16 sm:py-20 lg:py-24">
        {/* Fade-up entrance */}
        <div className="motion-safe:animate-[fade-up_700ms_ease-out_both]">
          {/* Brand wordmark + motif */}
          <p className="flex items-center gap-2 font-display text-3xl font-semibold tracking-tight text-primary sm:text-4xl lg:text-5xl">
            Nomi Numi
            <DecorativeMotif variant="heart" className="h-7 w-7 text-blush/70 sm:h-8 sm:w-8" />
          </p>

          {/* Main headline */}
          <h1
            id="hero-heading"
            className="headline-shadow mt-5 max-w-3xl font-display text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl"
          >
            {title}
          </h1>

          {/* Sub-text */}
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
            {subtitle}
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="shadow-soft">
              <Link href={ctaLink1}>{ctaText1}</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-blush/40 hover:border-blush/70">
              <Link href={ctaLink2}>{ctaText2}</Link>
            </Button>
          </div>
        </div>

        {/* Scroll-down chevron */}
        <a
          href="#featured-products"
          aria-label="Scroll to featured products"
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-muted-foreground/50 transition-colors hover:text-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronDown
            className="h-6 w-6 motion-safe:animate-[bounce-y_2s_ease-in-out_infinite]"
            aria-hidden="true"
          />
        </a>
      </Container>
    </section>
  );
}
