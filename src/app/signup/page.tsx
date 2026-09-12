import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "Sign up · Nomi Numi",
  description: "Create a Nomi Numi customer account.",
};

export default function SignupPage() {
  return (
    <AuthShell
      title="Create your account"
      description="Sign up with email and password. We will send a verification link before you can sign in."
    >
      <SignupForm />
    </AuthShell>
  );
}
