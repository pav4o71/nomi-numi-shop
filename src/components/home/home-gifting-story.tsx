import Link from "next/link";

import { Container } from "@/components/container";
import { HomeGiftingAnimation } from "./home-gifting-animation";

export function HomeGiftingStory() {
  return (
    <section
      className="border-t border-border/70 bg-surface py-16 sm:py-20"
      aria-labelledby="gifting-story-heading"
    >
      <Container className="grid items-center gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
        <div className="max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            Across every mile
          </p>
          <h2
            id="gifting-story-heading"
            className="mt-4 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
          >
            A little warmth can travel far.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
            A thoughtful gift can help someone feel close, even when you cannot be there in person.
          </p>
          <Link
            href="/gifts"
            className="focus-ring mt-7 inline-flex min-h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            Explore gift ideas
          </Link>
        </div>
        <div
          className="overflow-hidden rounded-[2rem] border border-border/70 bg-background shadow-soft"
          aria-hidden="true"
        >
          <HomeGiftingAnimation />
        </div>
      </Container>
    </section>
  );
}
