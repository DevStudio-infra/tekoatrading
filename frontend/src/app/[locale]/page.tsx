import { HomeHero } from "../../features/landing/components/home-hero";
import { HomeFeatures } from "../../features/landing/components/home-features";
import { HomeCTA } from "../../features/landing/components/home-cta";
import { Navigation } from "../../features/shared/components/navigation";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Navigation />
      <HomeHero />
      <HomeFeatures />
      <HomeCTA />
    </div>
  );
}
