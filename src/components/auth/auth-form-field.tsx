import type { InputHTMLAttributes, ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

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
      <Input id={id} className={className} aria-describedby={describedBy} {...inputProps} />
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
  const isError = tone === "error";
  const isSuccess = tone === "success";

  const toneClass = isError
    ? "border-destructive/20 bg-destructive/10 text-destructive"
    : isSuccess
      ? "border-secondary/40 bg-secondary/40 text-secondary-foreground"
      : "border-border bg-muted/50 text-foreground";

  const Icon = isError ? AlertCircle : isSuccess ? CheckCircle2 : Info;

  return (
    <div
      id={id}
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      className={cn("flex gap-3 rounded-md border px-4 py-3 text-sm leading-relaxed", toneClass)}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}
