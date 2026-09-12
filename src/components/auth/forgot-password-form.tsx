"use client";

import Link from "next/link";
import { useId, useState, useTransition } from "react";
import type { FormEvent } from "react";

import { authClient } from "@/auth/client";
import { AUTH_PASSWORD_RESET_REDIRECT_PATH, AUTH_UI_ROUTES } from "@/auth/routes";
import { AUTH_UI_COPY } from "@/auth/ui-messages";
import { AuthAlert, AuthFormField } from "@/components/auth/auth-form-field";
import { Button } from "@/components/ui/button";

/**
 * Forgot-password request form. Always presents the generic non-enumerating
 * success message after a successful API response.
 */
export function ForgotPasswordForm() {
  const formId = useId();
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();

    startTransition(async () => {
      const { error: resetError } = await authClient.requestPasswordReset({
        email,
        redirectTo: AUTH_PASSWORD_RESET_REDIRECT_PATH,
      });

      if (resetError) {
        setError(AUTH_UI_COPY.genericFailure);
        return;
      }

      setCompleted(true);
    });
  }

  if (completed) {
    return (
      <div className="space-y-5">
        <AuthAlert tone="success">{AUTH_UI_COPY.forgotPasswordGeneric}</AuthAlert>
        <p className="text-sm text-muted-foreground">
          <Link
            href={AUTH_UI_ROUTES.login}
            className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form
      className="space-y-5"
      onSubmit={onSubmit}
      noValidate
      aria-describedby={error ? `${formId}-error` : undefined}
    >
      <AuthFormField
        id={`${formId}-email`}
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        disabled={pending}
      />

      {error ? (
        <AuthAlert id={`${formId}-error`} tone="error">
          {error}
        </AuthAlert>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending} aria-busy={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </Button>

      <p className="text-sm text-muted-foreground">
        <Link
          href={AUTH_UI_ROUTES.login}
          className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
