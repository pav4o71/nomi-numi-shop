import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { LogoutForm } from "@/components/auth/logout-form";

export const metadata: Metadata = {
  title: "Sign out · Nomi Numi",
  description: "Sign out of your Nomi Numi session.",
};

export default function LogoutPage() {
  return (
    <AuthShell title="Sign out" description="End your current Nomi Numi session on this device.">
      <LogoutForm />
    </AuthShell>
  );
}
