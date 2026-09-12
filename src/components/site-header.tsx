import Link from "next/link";

import { AuthHeaderActions } from "@/components/auth/auth-header-actions";
import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { siteNavigation } from "@/lib/site-navigation";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md">
      <Container className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:py-4">
        <Link
          href="/"
          className="font-display text-xl font-semibold tracking-tight text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Nomi Numi
        </Link>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
          <nav aria-label="Primary" className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {siteNavigation.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <Button asChild variant="secondary" className="w-fit">
              <a href="#gifts">Explore Gifts</a>
            </Button>
            <AuthHeaderActions />
          </div>
        </div>
      </Container>
    </header>
  );
}
