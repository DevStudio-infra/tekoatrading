import { useState, useEffect } from "react";
import { DashboardData } from "../types";

export function useDashboardData() {
  const [data, setData] = useState<DashboardData>({
    stats: {
      totalPnL: 0,
      totalTrades: 0,
      winRate: 0,
      activeStrategies: 0,
      activeBots: 0,
      recentEvaluations: 0,
    },
    performance: {
      value: 0,
      change: 0,
      changePercent: 0,
      isPositive: true,
      period: "30d",
    },
    recentActivity: [],
    tradingMetrics: {
      totalVolume: 0,
      avgTradeSize: 0,
      bestPerformer: "N/A",
      worstPerformer: "N/A",
      sharpeRatio: 0,
      maxDrawdown: 0,
    },
    isLoading: true,
    lastUpdated: new Date(),
  });

  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);

      console.log("[Dashboard Hook] Fetching real dashboard data...");

      const response = await fetch("/api/dashboard", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch dashboard data");
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Failed to fetch dashboard data");
      }

      console.log("[Dashboard Hook] Real dashboard data received:", result.data);

      setData({
        ...result.data,
        isLoading: false,
        lastUpdated: new Date(result.data.lastUpdated),
        // Ensure recentActivity timestamps are properly handled (keep as strings for now)
        recentActivity: result.data.recentActivity || [],
      });
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);

      // Set error state but keep some basic structure
      setData((prev) => ({
        ...prev,
        isLoading: false,
        lastUpdated: new Date(),
      }));
    } finally {
      setRefreshing(false);
    }
  };

  const refreshData = () => {
    fetchDashboardData();
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return {
    data,
    refreshing,
    refreshData,
  };
}
