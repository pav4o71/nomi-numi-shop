import type { Metadata } from "next";
import Link from "next/link";

import { AUTH_UI_ROUTES } from "@/auth/routes";
import { AUTH_UI_COPY, tokenQueryErrorMessage } from "@/auth/ui-messages";
import { AuthAlert } from "@/components/auth/auth-form-field";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Email verification · Nomi Numi",
  description: "Email verification result for your Nomi Numi account.",
};

type EmailVerifiedPageProps = {
  searchParams: Promise<{ error?: string }>;
};

/**
 * Landing page for Better Auth verification callbacks.
 * Does not authorize protected surfaces — session presence is UX only.
 */
export default async function EmailVerifiedPage({ searchParams }: EmailVerifiedPageProps) {
  const params = await searchParams;
  const tokenError = tokenQueryErrorMessage(params.error, "verification");

  if (tokenError) {
    return (
      <AuthShell
        title="Verification needed"
        description="We could not complete email verification."
      >
        <div className="space-y-5">
          <AuthAlert tone="error">{tokenError}</AuthAlert>
          <Button asChild className="w-full">
            <Link href={AUTH_UI_ROUTES.checkEmail}>Request a new verification email</Link>
          </Button>
          <p className="text-sm text-muted-foreground">
            <Link
              href={AUTH_UI_ROUTES.login}
              className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Back to sign in
            </Link>
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Email verified" description="Your email is verified.">
      <div className="space-y-5">
        <AuthAlert tone="success">{AUTH_UI_COPY.verificationSuccess}</AuthAlert>
        <Button asChild className="w-full">
          <Link href="/">Continue to Nomi Numi</Link>
        </Button>
        <p className="text-sm text-muted-foreground">
          <Link
            href={AUTH_UI_ROUTES.login}
            className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
