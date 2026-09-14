import type { Metadata } from "next";

import { Container } from "@/components/container";

export const metadata: Metadata = {
  title: "Contact Us · Nomi Numi",
  description: "Get in touch with Nomi Numi customer service.",
};

export default function ContactPage() {
  return (
    <main className="section-shell py-12 sm:py-16">
      <Container className="prose prose-slate max-w-3xl">
        <h1>Contact Us</h1>

        <p className="lead">
          We&apos;re here to help! Reach out with questions about products, orders, shipping, or
          anything else.
        </p>

        <h2>Customer Service</h2>
        <p>
          Our customer service team is ready to assist with your inquiries. Contact methods and
          response times will be detailed here as our support system is finalized.
        </p>

        <h2>Before You Contact Us</h2>
        <p>
          You might find the answer to your question on our <a href="/faq">FAQ page</a>. Common
          topics include:
        </p>
        <ul>
          <li>
            <a href="/shipping">Shipping information</a>
          </li>
          <li>
            <a href="/returns">Returns and exchanges</a>
          </li>
          <li>Product availability and sizing</li>
          <li>Order status and tracking</li>
        </ul>

        <h2>Business Hours</h2>
        <p>
          Customer service hours will be listed here once our support operations are fully
          established.
        </p>

        <h2>Order Inquiries</h2>
        <p>
          For questions about existing orders, please have your order number ready when contacting
          us. This helps us assist you more quickly.
        </p>

        <h2>Product Questions</h2>
        <p>
          If you have questions about a specific product, please reference the product name or SKU
          when contacting us.
        </p>

        <h2>Feedback</h2>
        <p>
          We value your feedback about our products and service. Your input helps us improve and
          serve you better.
        </p>

        <h2>Privacy</h2>
        <p>
          When you contact us, we handle your information according to our{" "}
          <a href="/legal/privacy">privacy policy</a>.
        </p>
      </Container>
    </main>
  );
}
