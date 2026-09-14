import type { Metadata } from "next";

import { Container } from "@/components/container";

export const metadata: Metadata = {
  title: "Shipping Information · Nomi Numi",
  description: "Shipping policies and information for Nomi Numi orders.",
};

export default function ShippingPage() {
  return (
    <main className="section-shell py-12 sm:py-16">
      <Container className="prose prose-slate max-w-3xl">
        <h1>Shipping Information</h1>

        <p className="lead">
          We ship quality gifts and merchandise to customers in the Philippines and the United
          States.
        </p>

        <h2>Shipping Regions</h2>
        <p>We currently offer shipping to:</p>
        <ul>
          <li>Philippines</li>
          <li>United States</li>
        </ul>
        <p>
          We do not currently ship to other international destinations. Please check back for
          updates on expanded shipping availability.
        </p>

        <h2>Processing Time</h2>
        <p>
          Order processing times vary depending on product availability and fulfillment method. Once
          your order ships, you will receive tracking information.
        </p>

        <h2>Shipping Methods & Rates</h2>
        <p>
          Shipping methods and rates are calculated based on destination, order weight, and selected
          shipping speed. Final shipping costs will be displayed at checkout.
        </p>

        <h2>Tracking Your Order</h2>
        <p>
          Once your order ships, tracking information will be provided via email. You will also be
          able to view tracking details in your account order history (when available).
        </p>

        <h2>Delivery</h2>
        <p>
          Delivery times depend on the shipping method selected and your location. Estimated
          delivery windows will be provided at checkout and in your shipping confirmation.
        </p>

        <h2>Shipping Restrictions</h2>
        <p>
          Some products may have shipping restrictions based on size, weight, or destination
          regulations. Any restrictions will be noted on the product page.
        </p>

        <h2>International Customs</h2>
        <p>
          For international shipments, customers are responsible for any customs duties, taxes, or
          fees imposed by the destination country. These charges are not included in our product or
          shipping prices.
        </p>

        <h2>Questions?</h2>
        <p>
          If you have questions about shipping, please visit our <a href="/faq">FAQ page</a> or{" "}
          <a href="/contact">contact us</a>.
        </p>
      </Container>
    </main>
  );
}
