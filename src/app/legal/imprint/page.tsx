import type { Metadata } from "next";

import { Container } from "@/components/container";

export const metadata: Metadata = {
  title: "Imprint · Nomi Numi",
  description: "Legal information and imprint for Nomi Numi.",
};

export default function ImprintPage() {
  return (
    <main className="section-shell py-12 sm:py-16">
      <Container className="prose prose-slate max-w-3xl">
        <h1>Imprint</h1>

        <p className="text-sm text-slate-600">Legal Information</p>

        <h2>Business Information</h2>
        <p>
          <strong>Business Name:</strong> Nomi Numi
          <br />
          <strong>Type:</strong> Online Retail
          <br />
          <strong>Markets Served:</strong> Philippines, United States
        </p>

        <h2>Contact</h2>
        <p>
          For customer service inquiries, please visit our <a href="/contact">contact page</a>.
        </p>

        <h2>Regulatory Information</h2>
        <p>
          Business registration details and tax information will be provided here as required by
          applicable Philippine and US regulations.
        </p>

        <h2>Dispute Resolution</h2>
        <p>
          For disputes or complaints, please first contact us through our{" "}
          <a href="/contact">contact page</a>. We aim to resolve all concerns amicably and promptly.
        </p>

        <h2>Legal Documents</h2>
        <p>Additional legal information:</p>
        <ul>
          <li>
            <a href="/legal/terms">Terms of Service</a>
          </li>
          <li>
            <a href="/legal/privacy">Privacy Policy</a>
          </li>
        </ul>

        <h2>Disclaimer</h2>
        <p>
          While we strive to provide accurate and up-to-date information on our website, we make no
          warranties about the completeness, reliability, or accuracy of this information.
        </p>

        <p className="text-sm text-slate-600 border-t border-slate-200 pt-4 mt-8">
          Note: This imprint is a template. Final business registration details, tax identification,
          and jurisdiction-specific legal requirements for Philippine and US operations are pending.
        </p>
      </Container>
    </main>
  );
}
