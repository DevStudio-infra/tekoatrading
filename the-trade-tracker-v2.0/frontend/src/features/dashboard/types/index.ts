import { LucideIcon } from "lucide-react";

export interface DashboardStats {
  totalPnL: number;
  totalTrades: number;
  winRate: number;
  activeStrategies: number;
  activeBots: number;
  recentEvaluations: number;
}

export interface PerformanceData {
  value: number;
  change: number;
  changePercent: number;
  isPositive: boolean;
  period: string;
}

export interface RecentActivity {
  id: string;
  type: "trade" | "evaluation" | "strategy" | "bot";
  title: string;
  description: string;
  timestamp: Date | string;
  status: "success" | "error" | "pending" | "warning";
  value?: number;
  symbol?: string;
}

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  color: "blue" | "green" | "purple" | "orange";
  badge?: string | number;
}

export interface TradingMetrics {
  totalVolume: number;
  avgTradeSize: number;
  bestPerformer: string;
  worstPerformer: string;
  sharpeRatio: number;
  maxDrawdown: number;
}

export interface DashboardData {
  stats: DashboardStats;
  performance: PerformanceData;
  recentActivity: RecentActivity[];
  tradingMetrics: TradingMetrics;
  isLoading: boolean;
  lastUpdated: Date | string;
}
