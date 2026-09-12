"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState, useTransition } from "react";
import type { FormEvent } from "react";

import { authClient } from "@/auth/client";
import { AUTH_UI_ROUTES } from "@/auth/routes";
import {
  AUTH_UI_COPY,
  resetPasswordErrorMessage,
  tokenQueryErrorMessage,
} from "@/auth/ui-messages";
import { AuthAlert, AuthFormField } from "@/components/auth/auth-form-field";
import { Button } from "@/components/ui/button";

interface ResetPasswordFormProps {
  token?: string | null;
  errorParam?: string | null;
}

/**
 * Reset-password form. Successful reset requires a fresh login afterward
 * (sessions are revoked server-side).
 */
export function ResetPasswordForm({ token = null, errorParam = null }: ResetPasswordFormProps) {
  const router = useRouter();
  const formId = useId();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const queryError = useMemo(() => tokenQueryErrorMessage(errorParam, "reset"), [errorParam]);

  const usableToken = Boolean(token) && !queryError;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError(AUTH_UI_COPY.resetMissingToken);
      return;
    }

    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirmPassword") ?? "");

    if (password.length < 8) {
      setError(AUTH_UI_COPY.passwordTooShort);
      return;
    }
    if (password !== confirm) {
      setError(AUTH_UI_COPY.passwordMismatch);
      return;
    }

    startTransition(async () => {
      const { error: resetError } = await authClient.resetPassword({
        newPassword: password,
        token,
      });

      if (resetError) {
        setError(resetPasswordErrorMessage(resetError));
        return;
      }

      router.push(`${AUTH_UI_ROUTES.login}?reset=1`);
    });
  }

  if (!usableToken) {
    return (
      <div className="space-y-5">
        <AuthAlert tone="error">{queryError ?? AUTH_UI_COPY.resetMissingToken}</AuthAlert>
        <p className="text-sm text-muted-foreground">
          <Link
            href={AUTH_UI_ROUTES.forgotPassword}
            className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Request a new reset link
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
        id={`${formId}-password`}
        name="password"
        label="New password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        disabled={pending}
        hint="At least 8 characters. You will need to sign in again afterward."
      />
      <AuthFormField
        id={`${formId}-confirm`}
        name="confirmPassword"
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        disabled={pending}
      />

      {error ? (
        <AuthAlert id={`${formId}-error`} tone="error">
          {error}
        </AuthAlert>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending} aria-busy={pending}>
        {pending ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
