"use client";

import { useDashboardData } from "@/features/dashboard/hooks/useDashboardData";
import { DashboardHeader } from "@/features/dashboard/components/overview/DashboardHeader";
import { DashboardNav } from "@/features/dashboard/components/navigation/DashboardNav";
import { StatsGrid } from "@/features/dashboard/components/stats/StatsGrid";
import { RecentActivity } from "@/features/dashboard/components/activity/RecentActivity";
import { PnLChart } from "@/features/dashboard/components/charts/PnLChart";

export default function Dashboard() {
  const { data, refreshing, refreshData } = useDashboardData();

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Dashboard Header */}
      <DashboardHeader lastUpdated={typeof data.lastUpdated === "string" ? new Date(data.lastUpdated) : data.lastUpdated} isRefreshing={refreshing} onRefresh={refreshData} />

      {/* Dashboard Navigation */}
      <DashboardNav />

      {/* Stats Grid - REAL DATA */}
      <StatsGrid stats={data.stats} isLoading={data.isLoading} />

      {/* P&L Performance Chart - REAL DATA */}
      <PnLChart />

      {/* Recent Activity - REAL DATA */}
      <RecentActivity activities={data.recentActivity} isLoading={data.isLoading} />
    </div>
  );
}
