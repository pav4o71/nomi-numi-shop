import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type MediaPlaceholderProps = {
  className?: string;
  label?: string;
  children?: ReactNode;
};

/**
 * Neutral non-product media surface for when real catalog imagery is unavailable.
 * Decorative by default — never presents invented product photography.
 */
export function MediaPlaceholder({
  className,
  label = "Image coming soon",
  children,
}: MediaPlaceholderProps) {
  return (
    <div
      className={cn(
        "relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-2xl bg-accent/80 text-accent-foreground shadow-card",
        className,
      )}
      aria-hidden={children ? undefined : true}
      role={children ? "img" : undefined}
      aria-label={children ? label : undefined}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgb(196_120_138/0.18),transparent_55%),radial-gradient(ellipse_at_80%_80%,rgb(216_228_222/0.55),transparent_50%)]"
        aria-hidden="true"
      />
      {children ?? (
        <span className="relative px-3 text-center text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </span>
      )}
    </div>
  );
}
