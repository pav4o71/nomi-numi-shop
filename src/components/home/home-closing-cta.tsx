import Link from "next/link";

import { DecorativeMotif } from "@/components/brand/decorative-motif";
import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";

export function HomeClosingCta() {
  return (
    <section className="py-16 sm:py-20" aria-labelledby="closing-heading">
      <Container>
        <div className="relative overflow-hidden rounded-2xl bg-primary px-6 py-12 text-primary-foreground shadow-soft sm:px-10 sm:py-14">
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary-foreground/10 motion-safe:animate-[pulse_10s_ease-in-out_infinite]"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-16 left-10 h-48 w-48 rounded-full bg-primary-foreground/10"
            aria-hidden="true"
          />
          <DecorativeMotif
            variant="paw"
            className="pointer-events-none absolute right-8 top-8 h-10 w-10 text-primary-foreground/25 sm:right-12 sm:top-12"
          />

          <div className="relative max-w-2xl">
            <h2
              id="closing-heading"
              className="font-display text-3xl font-semibold tracking-tight sm:text-4xl"
            >
              Because distance should not quiet love
            </h2>
            <p className="mt-4 text-base leading-relaxed text-primary-foreground/90 sm:text-lg">
              When you want someone far away to feel held and remembered, start with a gentle look
              through the Nomi Numi catalog.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              >
                <Link href="/products">Browse products</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                <Link href="/collections">Explore collections</Link>
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
