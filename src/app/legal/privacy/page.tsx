import type { Metadata } from "next";

import { Container } from "@/components/container";

export const metadata: Metadata = {
  title: "Privacy Policy · Nomi Numi",
  description: "Privacy policy for Nomi Numi shop.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="section-shell py-12 sm:py-16">
      <Container className="prose prose-slate max-w-3xl">
        <h1>Privacy Policy</h1>

        <p className="text-sm text-slate-600">Last Updated: Pending final review</p>

        <h2>Introduction</h2>
        <p>
          This privacy policy describes how Nomi Numi collects, uses, and protects your personal
          information when you use our website and services.
        </p>

        <h2>Information We Collect</h2>

        <h3>Account Information</h3>
        <p>
          When you create an account, we collect information such as your name, email address, and
          password.
        </p>

        <h3>Order Information</h3>
        <p>
          When you place an order, we collect shipping address, billing information, and order
          details necessary to fulfill your purchase.
        </p>

        <h3>Browsing Information</h3>
        <p>
          We may collect information about how you use our website, including pages visited and
          products viewed, to improve our service.
        </p>

        <h2>How We Use Your Information</h2>
        <p>We use your information to:</p>
        <ul>
          <li>Process and fulfill your orders</li>
          <li>Communicate with you about your orders and account</li>
          <li>Improve our products and services</li>
          <li>Send you marketing communications (with your consent)</li>
          <li>Comply with legal obligations</li>
        </ul>

        <h2>Information Sharing</h2>
        <p>
          We do not sell your personal information. We may share information with service providers
          who help us operate our business, such as payment processors and shipping carriers, under
          strict confidentiality agreements.
        </p>

        <h2>Data Security</h2>
        <p>
          We implement appropriate technical and organizational measures to protect your personal
          information. However, no method of transmission over the internet is 100% secure.
        </p>

        <h2>Your Rights</h2>
        <p>Depending on your location, you may have rights including:</p>
        <ul>
          <li>Access to your personal information</li>
          <li>Correction of inaccurate information</li>
          <li>Deletion of your information</li>
          <li>Objection to certain processing</li>
          <li>Data portability</li>
        </ul>

        <h2>Cookies</h2>
        <p>
          We use cookies and similar technologies to improve your browsing experience and analyze
          site traffic. You can control cookie settings through your browser.
        </p>

        <h2>Third-Party Links</h2>
        <p>
          Our website may contain links to third-party sites. We are not responsible for the privacy
          practices of those sites.
        </p>

        <h2>Children&apos;s Privacy</h2>
        <p>
          Our service is not directed to children under 13. We do not knowingly collect personal
          information from children under 13.
        </p>

        <h2>Changes to This Policy</h2>
        <p>
          We may update this privacy policy from time to time. The &quot;Last Updated&quot; date
          will reflect the most recent changes.
        </p>

        <h2>Contact Us</h2>
        <p>
          If you have questions about this privacy policy or our data practices, please{" "}
          <a href="/contact">contact us</a>.
        </p>

        <p className="text-sm text-slate-600 border-t border-slate-200 pt-4 mt-8">
          Note: This is a template privacy policy. Final legal review and customization for
          Philippine and US requirements is pending.
        </p>
      </Container>
    </main>
  );
}
