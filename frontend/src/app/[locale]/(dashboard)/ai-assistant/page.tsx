"use client";

import { useTranslations } from "next-intl";

export default function AIAssistantPage() {
  const t = useTranslations("ai");

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">AI Assistant</h1>
        <p className="text-muted-foreground mt-2">
          Get AI-powered trading insights and recommendations
        </p>
      </div>

      <div className="grid gap-6">
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Market Analysis</h2>
          <p className="text-muted-foreground">AI-powered market analysis and trends.</p>
        </div>

        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Trading Recommendations</h2>
          <p className="text-muted-foreground">Get AI-generated trading recommendations.</p>
        </div>

        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Risk Assessment</h2>
          <p className="text-muted-foreground">AI-driven risk analysis for your portfolio.</p>
        </div>
      </div>
    </div>
  );
}
