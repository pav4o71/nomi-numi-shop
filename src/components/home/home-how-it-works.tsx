import { Container } from "@/components/container";

const steps = [
  {
    step: "1",
    title: "Explore thoughtful gift ideas",
    description: "Browse products, categories, and collections to discover styles that feel right.",
  },
  {
    step: "2",
    title: "Find a style that feels right",
    description: "Look for the mood you want to share — huggable, keepsake-like, or just because.",
  },
  {
    step: "3",
    title: "Continue into the growing catalog",
    description:
      "Return anytime as Nomi Numi expands. Checkout and personal messages are not available yet.",
  },
] as const;

// Stagger delays matching the 3 steps.
const DELAYS = ["0ms", "120ms", "240ms"];

export function HomeHowItWorks() {
  return (
    <section
      id="how-it-works"
      className="section-shell border-y border-border/70 bg-surface py-16 sm:py-20"
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
            A simple browsing path for discovering closeness — honest about what is ready today.
          </p>
        </div>

        <ol className="mt-12 grid gap-8 sm:grid-cols-3">
          {steps.map((item, index) => (
            <li
              key={item.step}
              className="relative space-y-4 motion-safe:animate-[fade-up_500ms_ease-out_both]"
              style={{ animationDelay: DELAYS[index] }}
            >
              {/* Connector line between steps (desktop only) */}
              {index < steps.length - 1 && (
                <span className="step-connector hidden sm:block" aria-hidden="true" />
              )}

              {/* Step number badge */}
              <div
                aria-hidden="true"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground shadow-soft"
              >
                {item.step}
              </div>

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
  );
}
