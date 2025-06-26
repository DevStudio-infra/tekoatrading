"use client";

import { useTranslations } from "next-intl";

export default function TradingPage() {
  const t = useTranslations("trading");

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Trading</h1>
        <p className="text-muted-foreground mt-2">Manage your trading positions and strategies</p>
      </div>

      <div className="grid gap-6">
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Active Positions</h2>
          <p className="text-muted-foreground">Your trading positions will appear here.</p>
        </div>

        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Trading Strategies</h2>
          <p className="text-muted-foreground">Configure and monitor your trading strategies.</p>
        </div>
      </div>
    </div>
  );
}
