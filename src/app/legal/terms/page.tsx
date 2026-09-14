import type { Metadata } from "next";

import { Container } from "@/components/container";

export const metadata: Metadata = {
  title: "Terms of Service · Nomi Numi",
  description: "Terms of service for using Nomi Numi shop.",
};

export default function TermsPage() {
  return (
    <main className="section-shell py-12 sm:py-16">
      <Container className="prose prose-slate max-w-3xl">
        <h1>Terms of Service</h1>

        <p className="text-sm text-slate-600">Last Updated: Pending final review</p>

        <h2>Agreement to Terms</h2>
        <p>
          By accessing or using Nomi Numi&apos;s website and services, you agree to be bound by
          these Terms of Service. If you do not agree, please do not use our services.
        </p>

        <h2>Use of Service</h2>

        <h3>Eligibility</h3>
        <p>
          You must be at least 18 years old to place orders. By using our service, you represent
          that you meet this requirement.
        </p>

        <h3>Account Responsibility</h3>
        <p>
          If you create an account, you are responsible for maintaining the confidentiality of your
          credentials and for all activities under your account.
        </p>

        <h3>Prohibited Uses</h3>
        <p>You agree not to:</p>
        <ul>
          <li>Use our service for any unlawful purpose</li>
          <li>Attempt to gain unauthorized access to our systems</li>
          <li>Interfere with the proper functioning of our service</li>
          <li>Impersonate any person or entity</li>
          <li>Collect information about other users without consent</li>
        </ul>

        <h2>Orders and Pricing</h2>

        <h3>Product Information</h3>
        <p>
          We strive to provide accurate product descriptions and pricing. However, we reserve the
          right to correct errors and update information.
        </p>

        <h3>Order Acceptance</h3>
        <p>
          We reserve the right to refuse or cancel any order for any reason, including product
          availability, errors in pricing or product information, or suspected fraud.
        </p>

        <h3>Pricing</h3>
        <p>
          Prices are listed in Philippine Peso (PHP) or US Dollar (USD) as applicable. Prices are
          subject to change without notice.
        </p>

        <h2>Payment</h2>
        <p>
          Payment terms and accepted methods will be detailed at checkout. You agree to provide
          valid payment information and authorize charges for your orders.
        </p>

        <h2>Shipping and Delivery</h2>
        <p>
          Shipping policies, delivery estimates, and risk of loss are detailed on our{" "}
          <a href="/shipping">shipping page</a>. We are not responsible for delays caused by
          carriers or customs.
        </p>

        <h2>Returns and Refunds</h2>
        <p>
          Our return and refund policies are detailed on our <a href="/returns">returns page</a>.
        </p>

        <h2>Intellectual Property</h2>
        <p>
          All content on our website, including text, graphics, logos, and images, is owned by or
          licensed to Nomi Numi and is protected by copyright and trademark laws.
        </p>

        <h2>User Content</h2>
        <p>
          If you submit reviews, comments, or other content, you grant us a non-exclusive,
          royalty-free license to use, reproduce, and display that content in connection with our
          service.
        </p>

        <h2>Disclaimers</h2>
        <p>
          Our service is provided &quot;as is&quot; without warranties of any kind. We do not
          guarantee uninterrupted or error-free service.
        </p>

        <h2>Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, Nomi Numi shall not be liable for indirect,
          incidental, special, or consequential damages arising from your use of our service.
        </p>

        <h2>Indemnification</h2>
        <p>
          You agree to indemnify and hold Nomi Numi harmless from any claims arising from your use
          of our service or violation of these terms.
        </p>

        <h2>Governing Law</h2>
        <p>
          These terms are governed by the laws applicable in our operating jurisdictions
          (Philippines and United States).
        </p>

        <h2>Changes to Terms</h2>
        <p>
          We may update these terms from time to time. Continued use of our service after changes
          constitutes acceptance of the updated terms.
        </p>

        <h2>Contact</h2>
        <p>
          For questions about these terms, please <a href="/contact">contact us</a>.
        </p>

        <p className="text-sm text-slate-600 border-t border-slate-200 pt-4 mt-8">
          Note: This is a template terms of service. Final legal review and jurisdiction-specific
          customization for Philippine and US requirements is pending.
        </p>
      </Container>
    </main>
  );
}
