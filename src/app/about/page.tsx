import type { Metadata } from "next";

import { Container } from "@/components/container";

export const metadata: Metadata = {
  title: "About Us · Nomi Numi",
  description: "Learn about Nomi Numi and our commitment to quality gifts and merchandise.",
};

export default function AboutPage() {
  return (
    <main className="section-shell py-12 sm:py-16">
      <Container className="prose prose-slate max-w-3xl">
        <h1>About Nomi Numi</h1>

        <p className="lead">
          Nomi Numi brings you carefully curated gifts and merchandise featuring beloved characters
          and designs that bring joy to everyday moments.
        </p>

        <h2>Our Story</h2>
        <p>
          We specialize in quality plush toys, apparel, accessories, and home décor that make
          perfect gifts for yourself or your loved ones. Each product in our catalog is selected
          with care to ensure it meets our standards for quality and charm.
        </p>

        <h2>What We Offer</h2>
        <ul>
          <li>
            <strong>Plush Toys:</strong> Soft, huggable companions in various sizes including
            special 60cm and 80cm large plushies
          </li>
          <li>
            <strong>Apparel:</strong> Comfortable hoodies, pajamas, and seasonal clothing
          </li>
          <li>
            <strong>Accessories:</strong> Keychains, bags, tumblers, bottles, umbrellas, and
            ornaments
          </li>
          <li>
            <strong>Home Décor:</strong> Cushions, lamps, posters, calendars, and magnetic toys
          </li>
          <li>
            <strong>Seasonal Collections:</strong> Special items for Christmas, Halloween,
            Valentine&apos;s Day, and other occasions
          </li>
        </ul>

        <h2>Our Commitment</h2>
        <p>
          We are committed to providing quality products and reliable service. All items in our
          catalog are carefully reviewed before being offered to our customers.
        </p>

        <h2>Markets We Serve</h2>
        <p>
          We currently serve customers in the Philippines and the United States, with prices
          available in PHP and USD.
        </p>

        <p>
          If you have questions about our products or services, please visit our{" "}
          <a href="/faq">FAQ page</a> or <a href="/contact">contact us</a>.
        </p>
      </Container>
    </main>
  );
}
