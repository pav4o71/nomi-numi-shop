"use client";

import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";

/**
 * Global error boundary for Server Component errors.
 * Provides a friendly fallback instead of the Next.js default error page.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="py-12 sm:py-16">
      <Container className="flex flex-col items-center gap-6 text-center">
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Something went wrong
          </h1>
          <p className="max-w-md text-muted-foreground">
            An unexpected error occurred. Please try again, or come back later.
          </p>
          {process.env.NODE_ENV !== "production" && error.message && (
            <p className="mt-2 rounded-md bg-muted px-4 py-2 font-mono text-xs text-muted-foreground">
              {error.message}
            </p>
          )}
        </div>
        <Button onClick={reset}>Try again</Button>
      </Container>
    </main>
  );
}
