import type { Metadata } from "next";

import { Container } from "@/components/container";

export const metadata: Metadata = {
  title: "Gift Guide · Nomi Numi",
  description: "Find the perfect gift at Nomi Numi.",
};

export default function GiftsPage() {
  return (
    <main className="section-shell py-12 sm:py-16">
      <Container className="prose prose-slate max-w-3xl">
        <h1>Gift Guide</h1>

        <p className="lead">
          Finding the perfect gift is easy with Nomi Numi. From soft plushies to cozy apparel,
          we&apos;ve got something special for everyone.
        </p>

        <h2>Gift Ideas by Category</h2>

        <h3>Plush Toys</h3>
        <p>
          Our plush collection includes cuddly companions in various sizes, perfect for anyone who
          loves soft, huggable friends. Available in standard sizes plus special 60cm and 80cm large
          plushies for those who want something extra special.
        </p>

        <h3>Apparel</h3>
        <p>
          Cozy hoodies, comfortable pajamas, and festive seasonal clothing make thoughtful gifts
          that combine style with comfort.
        </p>

        <h3>Accessories</h3>
        <p>
          Practical and charming accessories including keychains, bags, tumblers, bottles, umbrellas,
          and ornaments that add personality to everyday items.
        </p>

        <h3>Home Décor</h3>
        <p>
          Cushions, lamps, posters, calendars, and magnetic toys that bring character and warmth to
          any living space.
        </p>

        <h2>Gift Ideas by Occasion</h2>

        <h3>Birthdays</h3>
        <p>
          Personalized plush toys and character-themed merchandise make memorable birthday gifts for
          all ages.
        </p>

        <h3>Holidays</h3>
        <p>
          Browse our seasonal collections for Christmas, Halloween, and Valentine&apos;s Day to find
          festive gifts that celebrate the season.
        </p>

        <h3>Just Because</h3>
        <p>
          Sometimes the best gifts are unexpected. Our catalog offers plenty of options for
          spontaneous gift-giving moments.
        </p>

        <h2>Gift Services</h2>
        <p>
          Gift wrapping and special packaging options are being planned. Please check back for
          updates on available gift services.
        </p>

        <h2>Shopping for Gifts</h2>
        <p>Browse our collections to find the perfect gift:</p>
        <ul>
          <li>
            <a href="/products">All Products</a>
          </li>
          <li>
            <a href="/categories">Browse by Category</a>
          </li>
          <li>
            <a href="/collections">Seasonal Collections</a>
          </li>
        </ul>

        <h2>Need Help Choosing?</h2>
        <p>
          If you need assistance finding the perfect gift, check our <a href="/faq">FAQ page</a> or{" "}
          <a href="/contact">contact us</a> for personalized recommendations.
        </p>
      </Container>
    </main>
  );
}
