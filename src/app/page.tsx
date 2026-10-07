import { eq } from "drizzle-orm";
import { db } from "@/db";
import { homepageSections } from "@/db/schema/cms";
import { loadStorefrontMerchandising } from "@/catalog/public/storefront";

/** Revalidate storefront merchandising every 5 minutes. */
export const revalidate = 300;
import { HomeClosingCta } from "@/components/home/home-closing-cta";
import { HomeFeaturedCategories } from "@/components/home/home-featured-categories";
import { HomeFeaturedCollections } from "@/components/home/home-featured-collections";
import { HomeFeaturedProducts } from "@/components/home/home-featured-products";
import { HomeGiftDirections } from "@/components/home/home-gift-directions";
import { HomeHero } from "@/components/home/home-hero";
import { HomeHowItWorks } from "@/components/home/home-how-it-works";
import { HomeSeasonalCollections } from "@/components/home/home-seasonal-collections";
import { HomeShopDestinations } from "@/components/home/home-shop-destinations";
import { HomeWhyNomiNumi } from "@/components/home/home-why-nomi-numi";

export default async function HomePage() {
  const merchandising = await loadStorefrontMerchandising();
  const dbSections = await db.select().from(homepageSections).where(eq(homepageSections.isVisible, true)).orderBy(homepageSections.order);

  // Example of finding a hero section from the CMS
  const heroSection = dbSections.find(s => s.type === "hero");
  // We can do the same for other sections when they are added to the CMS
  // For now we render the hero with CMS data, and the rest with static defaults

  return (
    <main>
      <HomeHero data={heroSection?.content as any} />
      <HomeFeaturedProducts products={merchandising.featuredProducts} />
      <HomeFeaturedCategories categories={merchandising.featuredCategories} />
      <HomeFeaturedCollections collections={merchandising.featuredCollections} />
      <HomeSeasonalCollections collections={merchandising.seasonalCollections} />
      <HomeGiftDirections />
      <HomeShopDestinations />
      <HomeWhyNomiNumi />
      <HomeHowItWorks />
      <HomeClosingCta />
    </main>
  );
}
