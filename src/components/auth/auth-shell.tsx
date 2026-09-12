import type { ReactNode } from "react";

import { Container } from "@/components/container";

interface AuthShellProps {
  title: string;
  description?: string;
  children: ReactNode;
}

/**
 * Shared layout for public auth pages. Presentation only — not an auth gate.
 */
export function AuthShell({ title, description, children }: AuthShellProps) {
  return (
    <main className="section-shell py-12 sm:py-16">
      <Container className="max-w-md">
        <div className="space-y-2">
          <p className="font-display text-2xl font-semibold tracking-tight text-primary">
            Nomi Numi
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {description ? (
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              {description}
            </p>
          ) : null}
        </div>
        <div className="mt-8">{children}</div>
      </Container>
    </main>
  );
}
