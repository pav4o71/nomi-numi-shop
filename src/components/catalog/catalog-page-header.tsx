import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type CatalogPageHeaderProps = {
  title: string;
  description?: string | null;
  eyebrow?: string;
  className?: string;
  children?: ReactNode;
};

/**
 * Shared presentational chrome for catalog listing/detail page headers.
 * Presentation-only — does not fetch or format catalog data.
 */
export function CatalogPageHeader({
  title,
  description,
  eyebrow = "Nomi Numi",
  className,
  children,
}: CatalogPageHeaderProps) {
  return (
    <header className={cn("space-y-3", className)}>
      {eyebrow ? (
        <p className="font-display text-2xl font-semibold tracking-tight text-primary">{eyebrow}</p>
      ) : null}
      <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        {title}
      </h1>
      {children}
      {description ? (
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          {description}
        </p>
      ) : null}
    </header>
  );
}
