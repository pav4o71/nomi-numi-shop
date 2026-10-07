"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

import { siteNavigation } from "@/lib/site-navigation";
import { cn } from "@/lib/utils";

const navLinkClassName =
  "rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-semibold";

function NavigationLinks({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <>
      {siteNavigation.map((item) => {
        const isHashPath = item.href.includes("#");
        // exact match or startsWith for subpages
        const isActive = !isHashPath && pathname.startsWith(item.href);

        if (isHashPath) {
          return (
            <a key={item.href} href={item.href} className={cn(navLinkClassName, className)}>
              {item.label}
            </a>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(navLinkClassName, className)}
            data-active={isActive ? "true" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

/** Desktop primary nav — visible from md breakpoint up. */
export function SiteDesktopNav() {
  return (
    <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
      <NavigationLinks />
    </nav>
  );
}

/**
 * Mobile primary nav via native details/summary.
 * Hidden from md up so Playwright desktop smoke still sees a single Primary nav.
 */
export function SiteMobileNav() {
  return (
    <details className="group site-mobile-nav relative md:hidden">
      <summary
        className={cn(
          "inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-border/80 bg-surface text-foreground shadow-card",
          "transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          // hide the default disclosure triangle
          "list-none [&::-webkit-details-marker]:hidden"
        )}
        aria-label="Toggle navigation menu"
      >
        <Menu className="h-5 w-5 transition-transform group-open:hidden" aria-hidden="true" />
        <X className="hidden h-5 w-5 transition-transform group-open:block" aria-hidden="true" />
      </summary>
      <div className="site-mobile-nav-panel absolute right-0 z-50 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-border/80 bg-surface p-3 shadow-soft motion-safe:animate-[fade-up_200ms_ease-out_both]">
        <nav aria-label="Primary" className="flex flex-col gap-1">
          <NavigationLinks className="w-full" />
        </nav>
      </div>
    </details>
  );
}
