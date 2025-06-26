"use client";

import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../shared/components/ui/card";
import { Button } from "../../shared/components/ui/button";
import { AuthWrapper } from "../../auth/components/auth-wrapper";
import { DashboardLayout } from "./dashboard-layout";
import { DashboardStats } from "./dashboard-stats";
import { ActiveBots } from "./active-bots";
import { RecentTrades } from "./recent-trades";

export function TradingDashboard() {
  const t = useTranslations("dashboard");

  return (
    <AuthWrapper>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t("title")}</h1>
            <p className="text-muted-foreground">
              {t("subtitle", { date: new Date().toLocaleDateString() })}
            </p>
          </div>

          <DashboardStats />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ActiveBots />
            <RecentTrades />
          </div>
        </div>
      </DashboardLayout>
    </AuthWrapper>
  );
}
