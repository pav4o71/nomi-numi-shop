import type { Metadata } from "next";

import { Container } from "@/components/container";

export const metadata: Metadata = {
  title: "Returns & Exchanges · Nomi Numi",
  description: "Return and exchange policies for Nomi Numi orders.",
};

export default function ReturnsPage() {
  return (
    <main className="section-shell py-12 sm:py-16">
      <Container className="prose prose-slate max-w-3xl">
        <h1>Returns & Exchanges</h1>

        <p className="lead">
          We want you to be satisfied with your purchase. Our return and exchange policies are
          designed to be fair and clear.
        </p>

        <h2>Return Eligibility</h2>
        <p>
          Detailed return eligibility criteria will be finalized as our order fulfillment system
          goes live. General guidelines include:
        </p>
        <ul>
          <li>Items must be in original condition</li>
          <li>Original packaging should be intact</li>
          <li>Proof of purchase required</li>
        </ul>

        <h2>Non-Returnable Items</h2>
        <p>Certain items may not be eligible for return, including:</p>
        <ul>
          <li>Personalized or custom-made items</li>
          <li>Items marked as final sale</li>
          <li>Gift cards (when available)</li>
        </ul>

        <h2>How to Initiate a Return</h2>
        <p>
          Once our order system is fully operational, detailed return procedures will be provided.
          In the meantime, for any concerns about a purchase, please{" "}
          <a href="/contact">contact us</a>.
        </p>

        <h2>Exchanges</h2>
        <p>
          Exchange policies for size, color, or product variants will be documented here once our
          fulfillment workflow is complete.
        </p>

        <h2>Refunds</h2>
        <p>
          Refund processing times and methods will be detailed in our finalized return policy. We
          aim to process refunds promptly once returned items are received and inspected.
        </p>

        <h2>Return Shipping</h2>
        <p>
          Details about return shipping costs and procedures will be provided as part of our
          complete return policy documentation.
        </p>

        <h2>Damaged or Defective Items</h2>
        <p>
          If you receive a damaged or defective item, please <a href="/contact">contact us</a>{" "}
          immediately with photos and order details so we can assist you.
        </p>

        <h2>Questions?</h2>
        <p>
          For questions about returns or exchanges, visit our <a href="/faq">FAQ page</a> or{" "}
          <a href="/contact">contact us</a> directly.
        </p>
      </Container>
    </main>
  );
}
