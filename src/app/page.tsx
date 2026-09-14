import { HomeClosingCta } from "@/components/home/home-closing-cta";
import { HomeGiftDirections } from "@/components/home/home-gift-directions";
import { HomeHero } from "@/components/home/home-hero";
import { HomeHowItWorks } from "@/components/home/home-how-it-works";
import { HomeShopDestinations } from "@/components/home/home-shop-destinations";
import { HomeWhyNomiNumi } from "@/components/home/home-why-nomi-numi";

export default function HomePage() {
  return (
    <main>
      <HomeHero />
      <HomeGiftDirections />
      <HomeShopDestinations />
      <HomeWhyNomiNumi />
      <HomeHowItWorks />
      <HomeClosingCta />
    </main>
  );
}
