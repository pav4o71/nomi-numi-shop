"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import type { FormEvent } from "react";

import { authClient } from "@/auth/client";
import { AUTH_EMAIL_VERIFICATION_CALLBACK_PATH, AUTH_UI_ROUTES } from "@/auth/routes";
import { AUTH_UI_COPY, shouldContinueToCheckEmailAfterSignup } from "@/auth/ui-messages";
import { AuthAlert, AuthFormField } from "@/components/auth/auth-form-field";
import { Button } from "@/components/ui/button";

/**
 * Customer signup form. Role is never collected or submitted — the server
 * always assigns `customer` via Better Auth `input: false`.
 */
export function SignupForm() {
  const router = useRouter();
  const formId = useId();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    if (password.length < 8) {
      setError(AUTH_UI_COPY.passwordTooShort);
      return;
    }

    startTransition(async () => {
      const { error: signupError } = await authClient.signUp.email({
        name,
        email,
        password,
        callbackURL: AUTH_EMAIL_VERIFICATION_CALLBACK_PATH,
      });

      // Duplicate / existing-email outcomes share the check-email path so the
      // UI does not reveal whether the account already existed. Infrastructure
      // failures keep a generic service-error state.
      if (!shouldContinueToCheckEmailAfterSignup(signupError)) {
        setError(AUTH_UI_COPY.genericFailure);
        return;
      }

      const params = new URLSearchParams({ email });
      router.push(`${AUTH_UI_ROUTES.checkEmail}?${params.toString()}`);
    });
  }

  return (
    <form
      className="space-y-5"
      onSubmit={onSubmit}
      noValidate
      aria-describedby={error ? `${formId}-error` : undefined}
    >
      <AuthFormField
        id={`${formId}-name`}
        name="name"
        label="Name"
        type="text"
        autoComplete="name"
        required
        disabled={pending}
      />
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
        autoComplete="new-password"
        required
        minLength={8}
        disabled={pending}
        hint="At least 8 characters."
      />

      {error ? (
        <AuthAlert id={`${formId}-error`} tone="error">
          {error}
        </AuthAlert>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending} aria-busy={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>

      <p className="text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href={AUTH_UI_ROUTES.login}
          className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
