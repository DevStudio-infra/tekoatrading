"use client";

import { useTranslations } from "next-intl";
import { DashboardOverview } from "@/features/dashboard/components/dashboard-overview";

export default function DashboardPage() {
  const t = useTranslations("dashboard");

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground mt-2">{t("overview")}</p>
      </div>

      <DashboardOverview />
    </div>
  );
}
