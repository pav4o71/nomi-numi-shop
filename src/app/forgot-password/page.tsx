import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot password · Nomi Numi",
  description: "Request a password reset link for your Nomi Numi account.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Forgot password"
      description="Enter your email and we will send reset instructions when an account can receive them."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
