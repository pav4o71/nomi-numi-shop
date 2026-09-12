"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import type { FormEvent } from "react";

import { authClient } from "@/auth/client";
import { AUTH_UI_ROUTES } from "@/auth/routes";
import { resolvePostLoginPath } from "@/auth/safe-navigation";
import { AUTH_UI_COPY, loginErrorMessage } from "@/auth/ui-messages";
import { AuthAlert, AuthFormField } from "@/components/auth/auth-form-field";
import { Button } from "@/components/ui/button";

interface LoginFormProps {
  verified?: boolean;
  resetComplete?: boolean;
  /** Server-sanitized safe next path, or null when absent/unsafe. */
  nextPath?: string | null;
}

/**
 * Customer login form. Does not authorize routes — only requests a session.
 * Unverified accounts are directed to check-email without treating them as signed in.
 * Post-login navigation uses only a server-sanitized relative path.
 */
export function LoginForm({
  verified = false,
  resetComplete = false,
  nextPath = null,
}: LoginFormProps) {
  const router = useRouter();
  const formId = useId();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const destination = resolvePostLoginPath(nextPath);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    startTransition(async () => {
      const { error: signInError } = await authClient.signIn.email({
        email,
        password,
      });

      if (signInError) {
        const code = signInError.code?.toUpperCase() ?? "";
        if (code === "EMAIL_NOT_VERIFIED") {
          const params = new URLSearchParams({ email });
          router.push(`${AUTH_UI_ROUTES.checkEmail}?${params.toString()}`);
          return;
        }
        setError(loginErrorMessage(signInError));
        return;
      }

      router.push(destination);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {verified ? (
        <AuthAlert tone="success">
          Email verified. You can sign in if you are not already.
        </AuthAlert>
      ) : null}
      {resetComplete ? <AuthAlert tone="success">{AUTH_UI_COPY.resetSuccess}</AuthAlert> : null}

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
        <AuthFormField
          id={`${formId}-password`}
          name="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          disabled={pending}
        />

        {error ? (
          <AuthAlert id={`${formId}-error`} tone="error">
            {error}
          </AuthAlert>
        ) : null}

        <Button type="submit" className="w-full" disabled={pending} aria-busy={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="space-y-2 text-sm text-muted-foreground">
        <p>
          <Link
            href={AUTH_UI_ROUTES.forgotPassword}
            className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Forgot password?
          </Link>
        </p>
        <p>
          Need an account?{" "}
          <Link
            href={AUTH_UI_ROUTES.signup}
            className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
