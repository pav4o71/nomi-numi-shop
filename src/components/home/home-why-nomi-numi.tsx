import { Container } from "@/components/container";

const reasons = [
  {
    title: "Made for meaningful moments",
    description: "Gift ideas chosen to help someone feel remembered and cherished across distance.",
  },
  {
    title: "Built with long-distance love in mind",
    description:
      "A warm brand for people who want closeness to travel with a gift — even when they cannot be there.",
  },
  {
    title: "Soft, honest, and still growing",
    description:
      "Nomi Numi is being shaped carefully: cozy visuals today, a fuller gifting experience over time.",
  },
] as const;

export function HomeWhyNomiNumi() {
  return (
    <section
      id="why-nomi-numi"
      className="section-shell border-t border-border/70 bg-muted/35 py-16 sm:py-20"
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
            A soft kawaii home for long-distance affection — focused on care, warmth, and
            connection.
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
  );
}
