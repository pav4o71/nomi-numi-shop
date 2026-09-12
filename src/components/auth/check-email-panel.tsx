"use client";

import Link from "next/link";
import { useId, useMemo, useState, useTransition } from "react";
import type { FormEvent } from "react";

import { authClient } from "@/auth/client";
import { AUTH_EMAIL_VERIFICATION_CALLBACK_PATH, AUTH_UI_ROUTES } from "@/auth/routes";
import { AUTH_UI_COPY, tokenQueryErrorMessage } from "@/auth/ui-messages";
import { AuthAlert, AuthFormField } from "@/components/auth/auth-form-field";
import { Button } from "@/components/ui/button";

interface CheckEmailPanelProps {
  email?: string;
  verificationError?: string | null;
}

/**
 * Email-verification UX: pending inbox check + safe resend.
 * Does not treat the user as authenticated.
 */
export function CheckEmailPanel({ email = "", verificationError = null }: CheckEmailPanelProps) {
  const formId = useId();
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [pending, startTransition] = useTransition();

  const tokenError = useMemo(
    () => tokenQueryErrorMessage(verificationError, "verification"),
    [verificationError],
  );

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("idle");

    const form = new FormData(event.currentTarget);
    const nextEmail = String(form.get("email") ?? "").trim();

    startTransition(async () => {
      const { error } = await authClient.sendVerificationEmail({
        email: nextEmail,
        callbackURL: AUTH_EMAIL_VERIFICATION_CALLBACK_PATH,
      });

      // Always show the same generic success path when the request completes;
      // Better Auth also returns status true for unknown/already-verified emails.
      if (error) {
        setStatus("error");
        return;
      }
      setStatus("sent");
    });
  }

  return (
    <div className="space-y-5">
      <AuthAlert tone="info">{AUTH_UI_COPY.checkEmailBody}</AuthAlert>

      {tokenError ? <AuthAlert tone="error">{tokenError}</AuthAlert> : null}

      {status === "sent" ? (
        <AuthAlert tone="success">{AUTH_UI_COPY.resendSuccess}</AuthAlert>
      ) : null}
      {status === "error" ? (
        <AuthAlert tone="error">{AUTH_UI_COPY.genericFailure}</AuthAlert>
      ) : null}

      <form className="space-y-5" onSubmit={onSubmit} noValidate>
        <AuthFormField
          id={`${formId}-email`}
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          defaultValue={email}
          disabled={pending}
        />
        <Button type="submit" className="w-full" disabled={pending} aria-busy={pending}>
          {pending ? "Sending…" : "Resend verification email"}
        </Button>
      </form>

      <p className="text-sm text-muted-foreground">
        Ready to sign in?{" "}
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
