import Link from "next/link";

import { DecorativeMotif } from "@/components/brand/decorative-motif";
import { MediaPlaceholder } from "@/components/catalog/media-placeholder";
import { cn } from "@/lib/utils";

type CatalogEntityCardProps = {
  href: string;
  name: string;
  description?: string | null;
  "data-testid": string;
  className?: string;
  showPlaceholder?: boolean;
};

/**
 * Presentational index card for published categories or collections.
 * Does not fetch data — callers supply href/name/description/testids.
 */
export function CatalogEntityCard({
  href,
  name,
  description,
  "data-testid": testId,
  className,
  showPlaceholder = true,
}: CatalogEntityCardProps) {
  return (
    <Link
      href={href}
      data-testid={testId}
      className={cn(
        "surface-card focus-ring flex h-full flex-col overflow-hidden transition-transform motion-safe:hover:-translate-y-0.5",
        className,
      )}
    >
      {showPlaceholder ? (
        <MediaPlaceholder
          className="rounded-none rounded-t-[inherit] shadow-none"
          label="Image coming soon"
        >
          <DecorativeMotif variant="heart" className="relative h-8 w-8 text-blush/50" />
        </MediaPlaceholder>
      ) : null}
      <div className="flex flex-1 flex-col gap-2 px-5 py-4 sm:px-6 sm:py-5">
        <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
          {name}
        </h2>
        {description ? (
          <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
