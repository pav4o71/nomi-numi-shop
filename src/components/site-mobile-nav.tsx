import Link from "next/link";

import { siteNavigation } from "@/lib/site-navigation";
import { cn } from "@/lib/utils";

const navLinkClassName =
  "rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function NavigationLinks({ className }: { className?: string }) {
  return (
    <>
      {siteNavigation.map((item) => {
        const isHashPath = item.href.includes("#");
        if (isHashPath) {
          return (
            <a key={item.href} href={item.href} className={cn(navLinkClassName, className)}>
              {item.label}
            </a>
          );
        }

        return (
          <Link key={item.href} href={item.href} className={cn(navLinkClassName, className)}>
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
 * Mobile primary nav via native details/summary (Server Component, no client JS).
 * Hidden from md up so Playwright desktop smoke still sees a single Primary nav.
 */
export function SiteMobileNav() {
  return (
    <details className="site-mobile-nav relative md:hidden">
      <summary
        className={cn(
          "inline-flex h-11 min-h-11 cursor-pointer items-center justify-center rounded-full border border-border/80 bg-surface px-4 text-sm font-medium text-foreground shadow-card",
          "transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        )}
      >
        Menu
      </summary>
      <div className="site-mobile-nav-panel absolute right-0 z-50 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-border/80 bg-surface p-3 shadow-soft">
        <nav aria-label="Primary" className="flex flex-col gap-1">
          <NavigationLinks className="w-full" />
        </nav>
      </div>
    </details>
  );
}
