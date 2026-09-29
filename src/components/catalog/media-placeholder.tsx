import { cn } from "@/lib/utils";
import { DecorativeMotif } from "@/components/brand/decorative-motif";

type MediaPlaceholderProps = {
  className?: string;
  label?: string;
  aspectRatio?: "4/3" | "1/1" | "3/4";
};

/**
 * Warm-toned gradient placeholder shown before real product images exist.
 * Always decorative — aria-hidden so screen readers skip it.
 */
export function MediaPlaceholder({
  className,
  label = "Image coming soon",
  aspectRatio = "4/3",
}: MediaPlaceholderProps) {
  const aspectClass =
    aspectRatio === "1/1"
      ? "aspect-square"
      : aspectRatio === "3/4"
        ? "aspect-[3/4]"
        : "aspect-[4/3]";

  return (
    <div
      role="img"
      aria-label={label}
      className={cn(
        "relative flex items-center justify-center overflow-hidden",
        "bg-gradient-to-br from-accent to-muted",
        aspectClass,
        className,
      )}
    >
      {/* Subtle inner radial glow */}
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_40%,rgb(196_120_138_/_0.12),transparent_70%)]"
        aria-hidden="true"
      />
      <DecorativeMotif
        variant="heart"
        className="relative h-10 w-10 text-blush/40"
        aria-hidden={true}
      />
    </div>
  );
}
