import type { InputHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

interface AuthFormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: ReactNode;
  errorId?: string;
}

/**
 * Accessible labeled field for auth forms. Intentionally has no role selector.
 */
export function AuthFormField({
  id,
  label,
  hint,
  errorId,
  className,
  ...inputProps
}: AuthFormFieldProps) {
  const describedBy = [hint ? `${id}-hint` : null, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={id}
        className={cn(
          "flex h-11 w-full rounded-md border border-input bg-surface px-3 py-2 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        aria-describedby={describedBy}
        {...inputProps}
      />
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

interface AuthAlertProps {
  id?: string;
  tone?: "error" | "success" | "info";
  children: ReactNode;
}

export function AuthAlert({ id, tone = "info", children }: AuthAlertProps) {
  const toneClass =
    tone === "error"
      ? "border-destructive/40 bg-destructive/10 text-destructive"
      : tone === "success"
        ? "border-secondary bg-secondary/50 text-secondary-foreground"
        : "border-border bg-muted/50 text-foreground";

  return (
    <div
      id={id}
      role={tone === "error" ? "alert" : "status"}
      aria-live={tone === "error" ? "assertive" : "polite"}
      className={cn("rounded-md border px-3 py-2 text-sm leading-relaxed", toneClass)}
    >
      {children}
    </div>
  );
}
