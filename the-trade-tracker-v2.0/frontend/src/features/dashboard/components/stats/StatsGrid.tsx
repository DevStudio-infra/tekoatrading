"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Activity, Target, Bot, BarChart3, Zap } from "lucide-react";
import { DashboardStats } from "../../types";
import { Skeleton } from "@/components/ui/skeleton";

interface StatsGridProps {
  stats: DashboardStats;
  isLoading: boolean;
}

export function StatsGrid({ stats, isLoading }: StatsGridProps) {
  const t = useTranslations("dashboard");

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const statsCards = [
    {
      title: "Total P&L",
      value: formatCurrency(stats.totalPnL),
      icon: DollarSign,
      trend: stats.totalPnL > 0 ? "up" : "down",
      trendValue: stats.totalPnL > 0 ? "+12.4%" : "-5.2%",
      color: stats.totalPnL > 0 ? "text-green-600" : "text-red-600",
      bgColor: stats.totalPnL > 0 ? "bg-green-50 dark:bg-green-950/20" : "bg-red-50 dark:bg-red-950/20",
    },
    {
      title: "Total Trades",
      value: stats.totalTrades.toString(),
      icon: Activity,
      trend: "up" as const,
      trendValue: "+8 today",
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950/20",
    },
    {
      title: "Win Rate",
      value: formatPercentage(stats.winRate),
      icon: Target,
      trend: stats.winRate > 60 ? "up" : "down",
      trendValue: stats.winRate > 60 ? "Above target" : "Below target",
      color: stats.winRate > 60 ? "text-green-600" : "text-orange-600",
      bgColor: stats.winRate > 60 ? "bg-green-50 dark:bg-green-950/20" : "bg-orange-50 dark:bg-orange-950/20",
    },
    {
      title: t("activeStrategies"),
      value: stats.activeStrategies.toString(),
      icon: BarChart3,
      trend: "up" as const,
      trendValue: "+1 this week",
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950/20",
    },
    {
      title: t("activeBots"),
      value: stats.activeBots.toString(),
      icon: Bot,
      trend: "up" as const,
      trendValue: "All running",
      color: "text-indigo-600",
      bgColor: "bg-indigo-50 dark:bg-indigo-950/20",
    },
    {
      title: t("recentEvaluations"),
      value: stats.recentEvaluations.toString(),
      icon: Zap,
      trend: "up" as const,
      trendValue: "+3 today",
      color: "text-amber-600",
      bgColor: "bg-amber-50 dark:bg-amber-950/20",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-4 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      {statsCards.map((card, index) => (
        <motion.div key={card.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
          <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold tracking-tight">{card.value}</span>
                <Badge
                  variant="outline"
                  className={`gap-1 ${
                    card.trend === "up"
                      ? "text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950/20 dark:border-green-800"
                      : "text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/20 dark:border-red-800"
                  }`}>
                  {card.trend === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {card.trendValue}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
