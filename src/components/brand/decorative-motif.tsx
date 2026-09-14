import { cn } from "@/lib/utils";

type DecorativeMotifProps = {
  variant?: "heart" | "paw";
  className?: string;
};

/**
 * Sparse decorative SVG motif. Always aria-hidden — never conveys information.
 */
export function DecorativeMotif({ variant = "heart", className }: DecorativeMotifProps) {
  if (variant === "paw") {
    return (
      <svg
        className={cn("h-5 w-5 text-blush/55", className)}
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="7" cy="8" r="2.1" />
        <circle cx="12" cy="5.5" r="2.1" />
        <circle cx="17" cy="8" r="2.1" />
        <path d="M12 10.2c-3.2 0-5.6 2.4-5.6 5.1 0 1.7 1.5 2.9 3.2 2.9 1.1 0 1.8-.4 2.4-.4s1.3.4 2.4.4c1.7 0 3.2-1.2 3.2-2.9 0-2.7-2.4-5.1-5.6-5.1Z" />
      </svg>
    );
  }

  return (
    <svg
      className={cn("h-5 w-5 text-blush/60", className)}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 20.4S3.6 14.7 3.6 9.4C3.6 6.5 5.8 4.4 8.6 4.4c1.7 0 3.2.9 3.4 2.2.2-1.3 1.7-2.2 3.4-2.2 2.8 0 5 2.1 5 5 0 5.3-8.4 11-8.4 11Z" />
    </svg>
  );
}
