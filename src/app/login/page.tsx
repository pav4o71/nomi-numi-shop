import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AUTH_UI_ROUTES } from "@/auth/routes";
import { sanitizeNextPath } from "@/auth/safe-navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in · Nomi Numi",
  description: "Sign in to your Nomi Numi account.",
};

type LoginPageProps = {
  searchParams: Promise<{ verified?: string; reset?: string; next?: string }>;
};

function buildCleanLoginHref(params: {
  verified?: string;
  reset?: string;
  next?: string | null;
}): string {
  const query = new URLSearchParams();
  if (params.verified === "1") {
    query.set("verified", "1");
  }
  if (params.reset === "1") {
    query.set("reset", "1");
  }
  if (params.next) {
    query.set("next", params.next);
  }
  const serialized = query.toString();
  return serialized.length > 0 ? `${AUTH_UI_ROUTES.login}?${serialized}` : AUTH_UI_ROUTES.login;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const rawNext = typeof params.next === "string" ? params.next : undefined;
  const nextPath = sanitizeNextPath(rawNext);

  // Reject open-redirect candidates by dropping them from the URL entirely.
  if (rawNext !== undefined && rawNext.length > 0 && nextPath === null) {
    redirect(buildCleanLoginHref({ verified: params.verified, reset: params.reset }));
  }

  return (
    <AuthShell title="Sign in" description="Use the email and password for your verified account.">
      <LoginForm
        verified={params.verified === "1"}
        resetComplete={params.reset === "1"}
        nextPath={nextPath}
      />
    </AuthShell>
  );
}
