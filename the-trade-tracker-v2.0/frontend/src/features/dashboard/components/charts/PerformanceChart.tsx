"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, BarChart3, Calendar, Filter } from "lucide-react";
import { PerformanceData } from "../../types";
import { Skeleton } from "@/components/ui/skeleton";

interface PerformanceChartProps {
  performance: PerformanceData;
  isLoading: boolean;
}

export function PerformanceChart({ performance, isLoading }: PerformanceChartProps) {
  const t = useTranslations("dashboard");

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
  };

  // Mock chart data points for visualization
  const chartPoints = [
    { x: 0, y: 50 },
    { x: 10, y: 45 },
    { x: 20, y: 55 },
    { x: 30, y: 48 },
    { x: 40, y: 62 },
    { x: 50, y: 58 },
    { x: 60, y: 70 },
    { x: 70, y: 65 },
    { x: 80, y: 75 },
    { x: 90, y: 72 },
    { x: 100, y: 80 },
  ];

  const pathData = chartPoints
    .map((point, index) => {
      const command = index === 0 ? "M" : "L";
      return `${command} ${point.x} ${point.y}`;
    })
    .join(" ");

  if (isLoading) {
    return (
      <Card className="col-span-1 lg:col-span-2">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-6 w-16" />
            </div>
            <Skeleton className="h-48 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {t("performance")} Overview
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Portfolio performance over the last {performance.period}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Calendar className="h-4 w-4" />
            {performance.period}
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-6">
          {/* Performance Summary */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{formatCurrency(performance.value)}</p>
              <p className="text-sm text-muted-foreground">Total Portfolio Value</p>
            </div>

            <div className="text-right">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={`gap-1 ${
                    performance.isPositive
                      ? "text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950/20 dark:border-green-800"
                      : "text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/20 dark:border-red-800"
                  }`}>
                  {performance.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {formatPercentage(performance.changePercent)}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{formatCurrency(performance.change)} this period</p>
            </div>
          </div>

          {/* Mock Chart */}
          <div className="relative h-48 w-full bg-gradient-to-b from-muted/20 to-transparent rounded-lg p-4">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              {/* Grid lines */}
              <defs>
                <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-muted-foreground/20" />
                </pattern>
              </defs>
              <rect width="100" height="100" fill="url(#grid)" />

              {/* Chart line */}
              <path d={pathData} fill="none" stroke={performance.isPositive ? "#10b981" : "#ef4444"} strokeWidth="2" className="drop-shadow-sm" />

              {/* Area under curve */}
              <path d={`${pathData} L 100 100 L 0 100 Z`} fill={performance.isPositive ? "#10b981" : "#ef4444"} fillOpacity="0.1" />

              {/* Data points */}
              {chartPoints.map((point, index) => (
                <circle key={index} cx={point.x} cy={point.y} r="2" fill={performance.isPositive ? "#10b981" : "#ef4444"} className="drop-shadow-sm" />
              ))}
            </svg>

            {/* Chart labels */}
            <div className="absolute bottom-2 left-4 text-xs text-muted-foreground">Start</div>
            <div className="absolute bottom-2 right-4 text-xs text-muted-foreground">Now</div>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-lg font-semibold text-green-600">68.5%</p>
              <p className="text-xs text-muted-foreground">Win Rate</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold">1.85</p>
              <p className="text-xs text-muted-foreground">Sharpe Ratio</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-red-600">-8.5%</p>
              <p className="text-xs text-muted-foreground">Max Drawdown</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold">156</p>
              <p className="text-xs text-muted-foreground">Total Trades</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
