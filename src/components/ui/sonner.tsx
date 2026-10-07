"use client";

import { Toaster as SonnerToaster } from "sonner";

/**
 * Project-themed Sonner toaster.
 * Mount once in the root layout: <Toaster />
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            "font-sans text-sm rounded-xl border border-border bg-surface text-foreground shadow-card",
          error: "border-destructive/30 bg-destructive/10 text-destructive",
          success: "border-primary/30 text-foreground",
          description: "text-muted-foreground",
          actionButton: "bg-primary text-primary-foreground",
          cancelButton: "bg-muted text-muted-foreground",
        },
      }}
    />
  );
}
