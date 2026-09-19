import { loadStorefrontMerchandising } from "@/catalog/public/storefront";

export const dynamic = "force-dynamic";
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

  return (
    <main>
      <HomeHero />
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
