import type { Metadata } from "next";

import { Container } from "@/components/container";

export const metadata: Metadata = {
  title: "FAQ · Nomi Numi",
  description: "Frequently asked questions about shopping at Nomi Numi.",
};

export default function FaqPage() {
  return (
    <main className="section-shell py-12 sm:py-16">
      <Container className="prose prose-slate max-w-3xl">
        <h1>Frequently Asked Questions</h1>

        <h2>Ordering</h2>

        <h3>How do I place an order?</h3>
        <p>
          Browse our catalog, select the products you want, and add them to your cart. Currently,
          our ordering system is being finalized. Please check back soon for full checkout
          functionality.
        </p>

        <h3>What currencies do you accept?</h3>
        <p>We accept payments in Philippine Peso (PHP) and US Dollar (USD).</p>

        <h3>Can I modify my order after placing it?</h3>
        <p>
          Order modification policies will be detailed here once our checkout system is live. For
          urgent concerns, please contact us.
        </p>

        <h2>Products</h2>

        <h3>Are the product photos accurate?</h3>
        <p>
          We strive to provide accurate product representations. Actual colors may vary slightly due
          to screen settings and lighting conditions.
        </p>

        <h3>What sizes are available?</h3>
        <p>
          Available sizes vary by product. Check individual product pages for size options and refer
          to our <a href="/size-guide">size guide</a> for detailed measurements.
        </p>

        <h3>Do you offer gift wrapping?</h3>
        <p>
          Gift options and wrapping services are being planned. Please check our{" "}
          <a href="/gifts">gifts page</a> for current offerings.
        </p>

        <h2>Shipping</h2>

        <h3>Where do you ship?</h3>
        <p>
          We currently ship to the Philippines and the United States. Shipping details and rates are
          available on our <a href="/shipping">shipping page</a>.
        </p>

        <h3>How long does shipping take?</h3>
        <p>
          Delivery times vary by location and shipping method. Estimated delivery information will
          be provided at checkout.
        </p>

        <h3>Do you ship internationally beyond the US and Philippines?</h3>
        <p>Currently, we only ship to the Philippines and United States.</p>

        <h2>Returns & Exchanges</h2>

        <h3>What is your return policy?</h3>
        <p>
          Please see our <a href="/returns">returns page</a> for detailed information about returns
          and exchanges.
        </p>

        <h3>How do I initiate a return?</h3>
        <p>
          Return procedures will be documented on our <a href="/returns">returns page</a>. For
          assistance, contact us through our <a href="/contact">contact page</a>.
        </p>

        <h2>Account & Privacy</h2>

        <h3>Do I need an account to shop?</h3>
        <p>
          Account requirements for checkout are being finalized. You can browse our catalog without
          an account.
        </p>

        <h3>How is my information protected?</h3>
        <p>
          We take privacy seriously. Please review our <a href="/legal/privacy">privacy policy</a>{" "}
          for details about how we handle your information.
        </p>

        <h2>Contact</h2>

        <h3>How can I reach customer service?</h3>
        <p>
          Visit our <a href="/contact">contact page</a> for ways to get in touch with our team.
        </p>

        <h3>What are your business hours?</h3>
        <p>Customer service hours and contact methods are listed on our contact page.</p>
      </Container>
    </main>
  );
}
