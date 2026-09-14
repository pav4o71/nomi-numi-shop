import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/container";

export const metadata: Metadata = {
  title: "Lookbook · Nomi Numi",
  description: "Explore Nomi Numi product styling and inspiration.",
};

export default function LookbookPage() {
  return (
    <main className="section-shell py-12 sm:py-16">
      <Container className="prose prose-slate max-w-3xl">
        <h1>Lookbook</h1>

        <p className="lead">
          Discover how to style and enjoy Nomi Numi products in your everyday life.
        </p>

        <h2>Cozy Moments</h2>
        <p>
          Our products are designed to bring comfort and joy to daily moments. Whether you&apos;re
          relaxing at home, enjoying a warm beverage, or creating a welcoming space, Nomi Numi has
          something to make those moments special.
        </p>

        <h2>Gift Inspiration</h2>
        <p>
          See how our products make thoughtful gifts for friends, family, and loved ones. From plush
          companions to practical accessories, every item is chosen for its ability to bring a
          smile.
        </p>

        <h2>Seasonal Styling</h2>
        <p>
          Explore our seasonal collections to see how products fit different occasions throughout
          the year, from festive holiday décor to springtime celebrations.
        </p>

        <h2>Product Collections</h2>
        <p>
          Browse our curated collections to see products styled by theme, occasion, and character:
        </p>
        <ul>
          <li>
            <Link href="/collections">View Collections</Link>
          </li>
          <li>
            <Link href="/categories">Browse by Category</Link>
          </li>
          <li>
            <Link href="/products">All Products</Link>
          </li>
        </ul>

        <h2>Creating Your Style</h2>
        <p>
          Mix and match products to create your own unique combinations. Pair plush toys with
          matching accessories, or coordinate home décor items to build a cohesive themed space.
        </p>

        <h2>Share Your Nomi Numi Moments</h2>
        <p>
          We love seeing how customers style and enjoy their Nomi Numi products. Customer photo
          sharing and community features are being planned for the future.
        </p>

        <p className="text-sm text-slate-600 border-t border-slate-200 pt-4 mt-8">
          Note: Product styling images and customer galleries are planned for future updates to this
          lookbook page.
        </p>
      </Container>
    </main>
  );
}
