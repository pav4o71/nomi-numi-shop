import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { CheckEmailPanel } from "@/components/auth/check-email-panel";

export const metadata: Metadata = {
  title: "Check your email · Nomi Numi",
  description: "Verify your email to continue with Nomi Numi.",
};

type CheckEmailPageProps = {
  searchParams: Promise<{ email?: string; error?: string }>;
};

export default async function CheckEmailPage({ searchParams }: CheckEmailPageProps) {
  const params = await searchParams;

  return (
    <AuthShell
      title="Check your email"
      description="Email verification is required before sign-in."
    >
      <CheckEmailPanel email={params.email ?? ""} verificationError={params.error ?? null} />
    </AuthShell>
  );
}
