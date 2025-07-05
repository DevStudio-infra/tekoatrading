import { Metadata } from "next";
import PricingPage from "@/features/pricing/components/PricingPage";

export const metadata: Metadata = {
  title: "Pricing - Tekoa Trading",
  description:
    "Choose the perfect plan for your trading needs. Start free or upgrade to Pro for advanced features.",
};

export default function Pricing() {
  return <PricingPage />;
}
