import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in · Nomi Numi",
  description: "Sign in to your Nomi Numi account.",
};

type LoginPageProps = {
  searchParams: Promise<{ verified?: string; reset?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <AuthShell title="Sign in" description="Use the email and password for your verified account.">
      <LoginForm verified={params.verified === "1"} resetComplete={params.reset === "1"} />
    </AuthShell>
  );
}
