import { DecorativeMotif } from "@/components/brand/decorative-motif";
import { Container } from "@/components/container";
import { siteNavigation } from "@/lib/site-navigation";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/80 bg-surface">
      <Container className="flex flex-col gap-10 py-12 sm:flex-row sm:items-start sm:justify-between sm:gap-12 sm:py-14">
        <div className="max-w-sm space-y-3">
          <div className="flex items-center gap-2">
            <p className="font-display text-lg font-semibold tracking-tight text-foreground">
              Nomi Numi
            </p>
            <DecorativeMotif variant="heart" className="h-4 w-4" />
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Meaningful gifts for staying close, even from far away.
          </p>
        </div>

        <nav aria-label="Footer" className="flex flex-wrap gap-x-2 gap-y-2">
          {siteNavigation.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {item.label}
            </a>
          ))}
        </nav>
      </Container>
    </footer>
  );
}
