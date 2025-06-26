"use client";

import { useTranslations } from "next-intl";

export default function AnalyticsPage() {
  const t = useTranslations("analytics");

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground mt-2">Track your trading performance and metrics</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Performance Overview</h2>
          <p className="text-muted-foreground">
            Your trading performance metrics will appear here.
          </p>
        </div>

        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Profit & Loss</h2>
          <p className="text-muted-foreground">P&L analysis and trends.</p>
        </div>

        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Risk Metrics</h2>
          <p className="text-muted-foreground">Risk assessment and analysis.</p>
        </div>
      </div>
    </div>
  );
}
