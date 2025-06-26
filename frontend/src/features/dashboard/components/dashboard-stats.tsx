"use client";

import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../shared/components/ui/card";
import { DollarSign, TrendingUp, Bot, BarChart3 } from "lucide-react";

export function DashboardStats() {
  const t = useTranslations("dashboard");

  const stats = [
    {
      title: t("totalBalance"),
      value: "$12,543.89",
      change: "+2.45%",
      icon: DollarSign,
      positive: true,
    },
    {
      title: t("totalPnL"),
      value: "+$1,234.56",
      change: "+5.67%",
      icon: TrendingUp,
      positive: true,
    },
    {
      title: t("activeBots"),
      value: "3",
      change: "Running",
      icon: Bot,
      positive: true,
    },
    {
      title: t("openPositions"),
      value: "7",
      change: "Active",
      icon: BarChart3,
      positive: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => {
        const IconComponent = stat.icon;
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <IconComponent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className={`text-xs ${stat.positive ? "text-green-600" : "text-red-600"}`}>
                {stat.change}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
