import Link from "next/link";

import { AuthHeaderActions } from "@/components/auth/auth-header-actions";
import { Container } from "@/components/container";
import { SiteDesktopNav, SiteMobileNav } from "@/components/site-mobile-nav";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 shadow-soft backdrop-blur-md">
      <Container className="flex items-center justify-between gap-4 py-3 sm:py-4">
        <Link
          href="/"
          className="font-display text-xl font-semibold tracking-tight text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Nomi Numi
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <SiteDesktopNav />

          <Button asChild variant="secondary" className="hidden w-fit sm:inline-flex">
            <Link href="/products">Explore Gifts</Link>
          </Button>

          <AuthHeaderActions />
          <SiteMobileNav />
        </div>
      </Container>

      <Container className="flex pb-3 sm:hidden">
        <Button asChild variant="secondary" className="w-full">
          <Link href="/products">Explore Gifts</Link>
        </Button>
      </Container>
    </header>
  );
}
