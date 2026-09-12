import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";

import { getAuth } from "@/auth/server";
import { AUTH_UI_ROUTES } from "@/auth/routes";
import { AUTH_UI_COPY, resolveVerificationLandingState } from "@/auth/ui-messages";
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
 *
 * UX only: a missing `?error=` query is not treated as success. Verified
 * messaging requires a server session with `emailVerified: true` (Better Auth
 * auto-sign-in after a successful verification click). This is not an
 * authorization gate for protected surfaces.
 */
export default async function EmailVerifiedPage({ searchParams }: EmailVerifiedPageProps) {
  const params = await searchParams;

  let sessionUser: { emailVerified?: boolean | null } | null = null;
  try {
    const session = await getAuth().api.getSession({
      headers: await headers(),
    });
    sessionUser = session?.user ?? null;
  } catch {
    // Missing local auth env / infrastructure must not claim verification.
    sessionUser = null;
  }

  const landing = resolveVerificationLandingState({
    errorParam: params.error,
    sessionUser,
  });

  if (landing.state === "error") {
    return (
      <AuthShell
        title="Verification needed"
        description="We could not complete email verification."
      >
        <div className="space-y-5">
          <AuthAlert tone="error">{landing.errorMessage}</AuthAlert>
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

  if (landing.state === "verified") {
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

  return (
    <AuthShell
      title="Email verification"
      description="Finish verification from the link in your email."
    >
      <div className="space-y-5">
        <AuthAlert tone="info">{AUTH_UI_COPY.verificationInconclusive}</AuthAlert>
        <Button asChild className="w-full">
          <Link href={AUTH_UI_ROUTES.checkEmail}>Request a verification email</Link>
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
