import { Metadata } from "next";
import SubscriptionManagement from "@/features/pricing/components/SubscriptionManagement";

export const metadata: Metadata = {
  title: "Subscription - Tekoa Trading",
  description: "Manage your subscription, billing, and Pro features.",
};

export default function Subscription() {
  return (
    <div className="container mx-auto py-8">
      <SubscriptionManagement />
    </div>
  );
}
