import type { Metadata } from "next";

import { Container } from "@/components/container";

export const metadata: Metadata = {
  title: "Size Guide · Nomi Numi",
  description: "Size information and measurements for Nomi Numi products.",
};

export default function SizeGuidePage() {
  return (
    <main className="section-shell py-12 sm:py-16">
      <Container className="prose prose-slate max-w-3xl">
        <h1>Size Guide</h1>

        <p className="lead">
          Find the right size for your Nomi Numi products with our measurement guides.
        </p>

        <h2>How to Measure</h2>
        <p>
          For the most accurate fit, please measure according to the guidelines below and compare to
          our size charts. If you&apos;re between sizes, we generally recommend sizing up for
          comfort.
        </p>

        <h2>Apparel Sizing</h2>

        <h3>Hoodies & Tops</h3>
        <p>Key measurements for apparel:</p>
        <ul>
          <li>
            <strong>Chest:</strong> Measure around the fullest part of your chest, keeping the tape
            measure horizontal
          </li>
          <li>
            <strong>Length:</strong> Measure from the highest point of the shoulder to the hem
          </li>
          <li>
            <strong>Sleeve:</strong> Measure from the center back neck to the cuff edge
          </li>
        </ul>

        <h3>Pajamas & Night Suits</h3>
        <p>
          Pajamas and night suits are designed for comfort with relaxed fits. Size charts on
          individual product pages provide specific measurements.
        </p>

        <h2>Plush Toy Sizes</h2>

        <h3>Standard Plush</h3>
        <p>
          Standard plush toys vary by design. Approximate heights are listed on each product page.
          Measurements are taken from the base to the top of the head when seated (if applicable) or
          standing.
        </p>

        <h3>Large Plush (60cm & 80cm)</h3>
        <p>
          Our large plush options are available in 60cm (approximately 24 inches) and 80cm
          (approximately 31 inches) heights. These are measured from base to top in the natural
          position.
        </p>

        <h2>Accessories</h2>

        <h3>Bags</h3>
        <p>
          Bag dimensions (width × height × depth) are provided on individual product pages. Strap
          drop measurements are included for bags with handles or shoulder straps.
        </p>

        <h3>Tumblers & Bottles</h3>
        <p>
          Capacity is listed in milliliters (ml) and fluid ounces (fl oz). Height and diameter
          measurements help ensure fit for cup holders and bags.
        </p>

        <h2>Home & Décor Items</h2>

        <h3>Cushions</h3>
        <p>
          Cushion dimensions are listed as width × height. Most cushions are square or rectangular.
          Filling material and care instructions are provided on product pages.
        </p>

        <h3>Posters & Calendars</h3>
        <p>Dimensions are provided in inches and centimeters for accurate display planning.</p>

        <h2>Product-Specific Measurements</h2>
        <p>
          Detailed measurements for specific products are available on individual product pages.
          Always check the product page for the most accurate size information.
        </p>

        <h2>International Size Conversions</h2>
        <p>
          When applicable, we provide size conversions between US and Philippine sizing standards.
          Product pages note which sizing standard is used.
        </p>

        <h2>Still Unsure?</h2>
        <p>
          If you need help choosing the right size, check our <a href="/faq">FAQ page</a> or{" "}
          <a href="/contact">contact us</a> for assistance.
        </p>

        <p className="text-sm text-slate-600 border-t border-slate-200 pt-4 mt-8">
          Note: Detailed size charts with specific measurements for each product type will be added
          as product catalog expands. Always refer to individual product pages for current size
          information.
        </p>
      </Container>
    </main>
  );
}
