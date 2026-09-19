import Link from "next/link";

import { MediaPlaceholder } from "@/components/catalog/media-placeholder";
import { cn } from "@/lib/utils";

type CatalogEntityCardProps = {
  href: string;
  name: string;
  description?: string | null;
  "data-testid": string;
  className?: string;
  showPlaceholder?: boolean;
  /** Heading element for the card title (default h2 for index pages). */
  titleAs?: "h2" | "h3";
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
  titleAs: TitleTag = "h2",
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
        />
      ) : null}
      <div className="flex flex-1 flex-col gap-2 px-5 py-4 sm:px-6 sm:py-5">
        <TitleTag className="font-display text-xl font-semibold tracking-tight text-foreground">
          {name}
        </TitleTag>
        {description ? (
          <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
