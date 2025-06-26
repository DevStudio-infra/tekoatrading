import { StrategyList } from "@/features/strategies";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trading Strategies | Tekoa Trading",
  description: "Manage your trading strategies and indicators",
};

export default function StrategiesPage() {
  return (
    <div className="container mx-auto py-8">
      <StrategyList />
    </div>
  );
}
