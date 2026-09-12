import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Reset password · Nomi Numi",
  description: "Choose a new password for your Nomi Numi account.",
};

type ResetPasswordPageProps = {
  searchParams: Promise<{ token?: string; error?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams;

  return (
    <AuthShell
      title="Reset password"
      description="Choose a new password. After saving, sign in again with the new password."
    >
      <ResetPasswordForm token={params.token ?? null} errorParam={params.error ?? null} />
    </AuthShell>
  );
}
