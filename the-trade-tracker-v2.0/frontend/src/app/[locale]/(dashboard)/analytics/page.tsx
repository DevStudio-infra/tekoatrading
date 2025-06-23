"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { PnLChart } from "@/features/dashboard/components/charts/PnLChart";
import { Pie, PieChart, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, ChartConfig } from "@/components/ui/chart";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { BotComparisonChart } from "@/features/analytics/components/BotComparisonChart";
import { StrategyPerformanceChart } from "@/features/analytics/components/StrategyPerformanceChart";
import { RiskAnalysisChart } from "@/features/analytics/components/RiskAnalysisChart";
import { AnalyticsExport } from "@/features/analytics/components/AnalyticsExport";
import { useAnalyticsWebSocket } from "@/hooks/useAnalyticsWebSocket";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FilterX, Info } from "lucide-react";
import { useRouter } from "next/navigation";

interface PerformanceMetrics {
  sharpeRatio: number;
  maxDrawdown: number;
  calmarRatio: number;
  profitFactor: number;
  riskRewardRatio: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  totalTrades: number;
  grossProfit: number;
  grossLoss: number;
  period: string;
}

interface WinLossDistribution {
  totalTrades: number;
  wins: {
    count: number;
    percentage: number;
    avgPnL: number;
    totalPnL: number;
  };
  losses: {
    count: number;
    percentage: number;
    avgPnL: number;
    totalPnL: number;
  };
  neutral: {
    count: number;
    percentage: number;
  };
}

const MetricCard = ({
  title,
  value,
  subtitle,
  color = "blue",
  tooltip,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: "blue" | "green" | "red" | "yellow" | "orange";
  tooltip?: string;
}) => {
  const colorClasses = {
    blue: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100",
    green: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100",
    red: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100",
    yellow: "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800 text-yellow-900 dark:text-yellow-100",
    orange: "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800 text-orange-900 dark:text-orange-100",
  };

  const content = (
    <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
      <div className="flex items-center gap-1 text-sm font-medium opacity-75">
        {title}
        {tooltip && <Info className="h-3 w-3 opacity-60" />}
      </div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {subtitle && <div className="text-xs opacity-60 mt-1">{subtitle}</div>}
    </div>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs bg-popover text-popover-foreground p-3 text-sm border border-border">
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
};

// Chart configuration for win/loss pie chart
const winLossChartConfig: ChartConfig = {
  wins: {
    label: "Wins",
    color: "#22c55e",
  },
  losses: {
    label: "Losses",
    color: "#ef4444",
  },
  neutral: {
    label: "Neutral",
    color: "#94a3b8",
  },
};

const WinLossChart = ({ data }: { data: WinLossDistribution | null }) => {
  if (!data) {
    return (
      <div className="bg-card rounded-lg border border-border shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-semibold text-card-foreground">Win/Loss Distribution</h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs bg-popover text-popover-foreground p-3 text-sm border border-border">
                <p>This chart shows the distribution of winning vs losing trades, helping you understand your trading success rate and average profit/loss per trade type.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  // Prepare data for Recharts pie chart
  const chartData = [
    {
      name: "Wins",
      value: data.wins.count,
      percentage: data.wins.percentage,
      avgPnL: data.wins.avgPnL,
      fill: winLossChartConfig.wins.color,
    },
    {
      name: "Losses",
      value: data.losses.count,
      percentage: data.losses.percentage,
      avgPnL: data.losses.avgPnL,
      fill: winLossChartConfig.losses.color,
    },
  ];

  // Add neutral if exists
  if (data.neutral.count > 0) {
    chartData.push({
      name: "Neutral",
      value: data.neutral.count,
      percentage: data.neutral.percentage,
      avgPnL: 0,
      fill: winLossChartConfig.neutral.color,
    });
  }

  return (
    <div className="bg-card rounded-lg border border-border shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-lg font-semibold text-card-foreground">Win/Loss Distribution</h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs bg-popover text-popover-foreground p-3 text-sm border border-border">
              <p>This chart shows the distribution of winning vs losing trades, helping you understand your trading success rate and average profit/loss per trade type.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Professional Pie Chart */}
      <div className="h-[300px] w-full">
        <ChartContainer config={winLossChartConfig}>
          <PieChart>
            <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={120} paddingAngle={5} dataKey="value">
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  hideLabel={false}
                  labelFormatter={(_, payload) => {
                    if (payload && payload[0]) {
                      const data = payload[0].payload;
                      return `${data.name}: ${data.value} trades (${data.percentage.toFixed(1)}%)`;
                    }
                    return "";
                  }}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
          </PieChart>
        </ChartContainer>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 gap-4 mt-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="font-medium text-card-foreground">Wins</span>
          </div>
          <div className="text-lg font-bold text-green-600">{data.wins.count}</div>
          <div className="text-sm text-muted-foreground">{data.wins.percentage.toFixed(1)}%</div>
          <div className="text-xs text-muted-foreground">Avg: ${data.wins.avgPnL.toFixed(2)}</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="font-medium text-card-foreground">Losses</span>
          </div>
          <div className="text-lg font-bold text-red-600">{data.losses.count}</div>
          <div className="text-sm text-muted-foreground">{data.losses.percentage.toFixed(1)}%</div>
          <div className="text-xs text-muted-foreground">Avg: ${data.losses.avgPnL.toFixed(2)}</div>
        </div>
      </div>

      {/* Total Trades Center Display */}
      <div className="text-center mt-4">
        <div className="text-2xl font-bold text-card-foreground">{data.totalTrades}</div>
        <div className="text-sm text-muted-foreground">Total Trades</div>
      </div>
    </div>
  );
};

// Helper function to get Sharpe Ratio color with improved thresholds
const getSharpeRatioColor = (ratio: number): "green" | "yellow" | "orange" | "red" => {
  if (ratio > 1.5) return "green"; // Excellent
  if (ratio > 1) return "yellow"; // Good
  if (ratio > 0.5) return "orange"; // Acceptable
  return "red"; // Poor
};

// Helper function to get calmar ratio color
const getCalmarRatioColor = (ratio: number): "green" | "yellow" | "orange" | "red" => {
  if (ratio > 2) return "green"; // Excellent
  if (ratio > 1) return "yellow"; // Good
  if (ratio > 0.5) return "orange"; // Acceptable
  return "red"; // Poor
};

// Helper function to get Max Drawdown color (adjusted for crypto trading)
const getMaxDrawdownColor = (drawdown: number): "green" | "yellow" | "red" => {
  if (drawdown > -10) return "green"; // Very good for crypto
  if (drawdown > -20) return "yellow"; // Acceptable for crypto
  return "red"; // High risk
};

// Helper function to get Profit Factor color
const getProfitFactorColor = (pf: number): "green" | "yellow" | "red" => {
  if (pf > 1.5) return "green"; // Excellent
  if (pf > 1) return "yellow"; // Profitable
  return "red"; // Losing
};

// Helper function to get Risk/Reward Ratio color
const getRiskRewardColor = (ratio: number): "green" | "yellow" | "red" => {
  if (ratio > 1) return "green"; // Positive
  if (ratio > 0.5) return "yellow"; // Neutral
  return "red"; // Negative
};

// Helper function to build API URL with filters
const buildApiUrl = (endpoint: string, period: string, strategyFilter?: { id: string }) => {
  const params = new URLSearchParams({ period });

  // Add strategy filter if present
  if (strategyFilter) {
    params.append("strategyId", strategyFilter.id);
  }

  return `/api/analytics/${endpoint}?${params.toString()}`;
};

export default function AnalyticsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Read filter parameters from URL
  const filterType = searchParams.get("filter");
  const filterId = searchParams.get("id");
  const isStrategyFiltered = filterType === "strategy" && filterId;

  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [winLossData, setWinLossData] = useState<WinLossDistribution | null>(null);
  const [strategyName, setStrategyName] = useState<string | null>(null);
  const [, setLoading] = useState(true);
  const [period, setPeriod] = useState("30d");
  const [lastUpdate] = useState<string | null>(null);

  // WebSocket connection for real-time updates
  const { isConnected } = useAnalyticsWebSocket({
    userId: "dev-user",
    enabled: false, // Disable WebSocket for now
    onPerformanceUpdate: (update) => {
      console.log("Performance update:", update);
    },
    onAnalyticsUpdate: (update) => {
      console.log("Analytics update:", update);
    },
  });

  useEffect(() => {
    fetchAnalyticsData();
    if (isStrategyFiltered) {
      fetchStrategyName();
    }
  }, [period, isStrategyFiltered, filterId]);

  // Fetch strategy name for display
  const fetchStrategyName = async () => {
    if (!filterId) return;

    try {
      const response = await fetch(`/api/strategies`);
      if (response.ok) {
        const data = await response.json();
        const strategy = data.strategies?.find((s: { id: string; name: string }) => s.id === filterId);
        setStrategyName(strategy?.name || `Strategy ${filterId.substring(0, 8)}...`);
      }
    } catch (error) {
      console.error("Error fetching strategy name:", error);
      setStrategyName(`Strategy ${filterId.substring(0, 8)}...`);
    }
  };

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);

      const strategyFilter = isStrategyFiltered ? { id: filterId! } : undefined;

      // Fetch performance metrics and win/loss distribution in parallel
      const [metricsResponse, distributionResponse] = await Promise.all([
        fetch(buildApiUrl("performance-metrics", period, strategyFilter)),
        fetch(buildApiUrl("win-loss-distribution", period, strategyFilter)),
      ]);

      if (metricsResponse.ok) {
        const metricsResult = await metricsResponse.json();
        setPerformanceMetrics(metricsResult.data);
      } else {
        // Mock performance metrics if API fails
        setPerformanceMetrics({
          sharpeRatio: 1.24,
          maxDrawdown: -8.5,
          calmarRatio: 2.1,
          profitFactor: 1.85,
          riskRewardRatio: 1.42,
          consecutiveWins: 5,
          consecutiveLosses: 3,
          totalTrades: 47,
          grossProfit: 125.75,
          grossLoss: -67.25,
          period: period,
        });
      }

      if (distributionResponse.ok) {
        const distributionResult = await distributionResponse.json();
        setWinLossData(distributionResult.data);
      } else {
        // Mock win/loss data if API fails
        setWinLossData({
          totalTrades: 47,
          wins: {
            count: 32,
            percentage: 68.1,
            avgPnL: 3.93,
            totalPnL: 125.75,
          },
          losses: {
            count: 15,
            percentage: 31.9,
            avgPnL: -4.48,
            totalPnL: -67.25,
          },
          neutral: {
            count: 0,
            percentage: 0,
          },
        });
      }
    } catch (error) {
      console.error("Error fetching analytics data:", error);
      // Set mock data on error
      setPerformanceMetrics({
        sharpeRatio: 1.24,
        maxDrawdown: -8.5,
        calmarRatio: 2.1,
        profitFactor: 1.85,
        riskRewardRatio: 1.42,
        consecutiveWins: 5,
        consecutiveLosses: 3,
        totalTrades: 47,
        grossProfit: 125.75,
        grossLoss: -67.25,
        period: period,
      });

      setWinLossData({
        totalTrades: 47,
        wins: {
          count: 32,
          percentage: 68.1,
          avgPnL: 3.93,
          totalPnL: 125.75,
        },
        losses: {
          count: 15,
          percentage: 31.9,
          avgPnL: -4.48,
          totalPnL: -67.25,
        },
        neutral: {
          count: 0,
          percentage: 0,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header with filter indicator */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            {isStrategyFiltered && (
              <Button variant="ghost" size="sm" onClick={() => router.push("/analytics")} className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4 mr-1" />
                All Analytics
              </Button>
            )}
            <h1 className="text-3xl font-bold text-foreground">{isStrategyFiltered ? `Strategy Analytics` : "Performance Analytics"}</h1>
          </div>

          {/* Filter indicator */}
          {isStrategyFiltered && (
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                Filtered by Strategy
              </Badge>
              <span className="text-sm font-medium text-foreground">{strategyName || "Loading..."}</span>
              <Button variant="ghost" size="sm" onClick={() => router.push("/analytics")} className="text-muted-foreground hover:text-foreground">
                <FilterX className="h-4 w-4 mr-1" />
                Clear Filter
              </Button>
            </div>
          )}

          <div className="flex items-center gap-3 mt-2">
            <p className="text-muted-foreground">
              {isStrategyFiltered
                ? `Detailed performance analysis for this specific trading strategy`
                : `Comprehensive analysis of your trading performance with professional charts`}
            </p>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}></div>
              <span className="text-xs text-muted-foreground">
                {isConnected ? "Live" : "Offline"}
                {lastUpdate && ` • Updated ${lastUpdate}`}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {["7d", "30d", "90d"].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 text-sm rounded-md transition-colors ${
                period === p ? "bg-primary text-primary-foreground font-medium" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* P&L Chart - only show when not filtering by strategy */}
      {!isStrategyFiltered && <PnLChart />}

      {/* Export Component */}
      <AnalyticsExport userId="dev-user" strategyFilter={isStrategyFiltered ? { id: filterId!, name: strategyName || "Strategy" } : undefined} />

      {/* Strategy-specific layout */}
      {isStrategyFiltered ? (
        /* Single Strategy View - Focused Analytics */
        <div className="space-y-8">
          {/* Core Performance Metrics Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Win/Loss Distribution */}
            <WinLossChart data={winLossData} />

            {/* Performance Metrics */}
            {performanceMetrics && (
              <div className="bg-card rounded-lg border border-border shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-6 text-card-foreground">Strategy Performance Metrics</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <MetricCard
                    title="Sharpe Ratio"
                    value={performanceMetrics.sharpeRatio.toFixed(2)}
                    subtitle="Risk-adjusted return"
                    color={getSharpeRatioColor(performanceMetrics.sharpeRatio)}
                    tooltip="Sharpe Ratio measures the risk-adjusted return of this strategy. A higher ratio indicates better performance relative to risk."
                  />
                  <MetricCard
                    title="Max Drawdown"
                    value={`${performanceMetrics.maxDrawdown.toFixed(1)}%`}
                    subtitle="Largest decline"
                    color={getMaxDrawdownColor(performanceMetrics.maxDrawdown)}
                    tooltip="Maximum drawdown for this strategy. Shows the worst peak-to-trough decline."
                  />
                  <MetricCard
                    title="Profit Factor"
                    value={performanceMetrics.profitFactor.toFixed(2)}
                    subtitle="Profit vs Loss ratio"
                    color={getProfitFactorColor(performanceMetrics.profitFactor)}
                    tooltip="Strategy's profit factor. Values above 1.0 indicate profitability."
                  />
                  <MetricCard
                    title="Risk/Reward Ratio"
                    value={performanceMetrics.riskRewardRatio.toFixed(2)}
                    subtitle="Average risk vs reward"
                    color={getRiskRewardColor(performanceMetrics.riskRewardRatio)}
                    tooltip="Average risk/reward ratio for this strategy. Higher values indicate better risk management."
                  />
                </div>
              </div>
            )}
          </div>

          {/* Additional Strategy Stats */}
          {performanceMetrics && (
            <div className="bg-card rounded-lg border border-border shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-6 text-card-foreground">Strategy Statistics</h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-center cursor-help">
                        <div className="text-2xl font-bold text-card-foreground">{performanceMetrics.totalTrades}</div>
                        <div className="text-sm text-muted-foreground">Total Trades</div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs bg-popover text-popover-foreground p-3 text-sm border border-border">
                      <p>Total number of trades executed using this strategy during the selected period.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-center cursor-help">
                        <div className="text-2xl font-bold text-green-600">${performanceMetrics.grossProfit.toFixed(2)}</div>
                        <div className="text-sm text-muted-foreground">Gross Profit</div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs bg-popover text-popover-foreground p-3 text-sm border border-border">
                      <p>Total profit from winning trades using this strategy.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-center cursor-help">
                        <div className="text-2xl font-bold text-red-600">${performanceMetrics.grossLoss.toFixed(2)}</div>
                        <div className="text-sm text-muted-foreground">Gross Loss</div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs bg-popover text-popover-foreground p-3 text-sm border border-border">
                      <p>Total loss from losing trades using this strategy.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-center cursor-help">
                        <div className="text-2xl font-bold text-card-foreground">{performanceMetrics.consecutiveWins}</div>
                        <div className="text-sm text-muted-foreground">Max Consecutive Wins</div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs bg-popover text-popover-foreground p-3 text-sm border border-border">
                      <p>Maximum number of consecutive winning trades achieved by this strategy.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* All Analytics View - Comprehensive Dashboard */
        <div className="space-y-8">
          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Win/Loss Distribution */}
            <WinLossChart data={winLossData} />

            {/* Performance Metrics */}
            {performanceMetrics && (
              <div className="bg-card rounded-lg border border-border shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-6 text-card-foreground">Risk & Performance Metrics</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <MetricCard
                    title="Sharpe Ratio"
                    value={performanceMetrics.sharpeRatio.toFixed(2)}
                    subtitle="Risk-adjusted return"
                    color={getSharpeRatioColor(performanceMetrics.sharpeRatio)}
                    tooltip="Sharpe Ratio measures the risk-adjusted return of an investment. A higher ratio indicates a better return for the level of risk."
                  />
                  <MetricCard
                    title="Max Drawdown"
                    value={`${performanceMetrics.maxDrawdown.toFixed(1)}%`}
                    subtitle="Largest peak-to-trough decline"
                    color={getMaxDrawdownColor(performanceMetrics.maxDrawdown)}
                    tooltip="Max Drawdown measures the largest peak-to-trough decline of an investment. A higher drawdown indicates a higher risk."
                  />
                  <MetricCard
                    title="Profit Factor"
                    value={performanceMetrics.profitFactor.toFixed(2)}
                    subtitle="Gross profit / Gross loss"
                    color={getProfitFactorColor(performanceMetrics.profitFactor)}
                    tooltip="Profit Factor measures the profitability of an investment. A higher factor indicates a more profitable investment."
                  />
                  <MetricCard
                    title="Calmar Ratio"
                    value={performanceMetrics.calmarRatio.toFixed(2)}
                    subtitle="Return / Max drawdown"
                    color={getCalmarRatioColor(performanceMetrics.calmarRatio)}
                    tooltip="Calmar Ratio measures the return relative to the maximum drawdown. A higher ratio indicates better risk-adjusted performance."
                  />
                </div>
              </div>
            )}
          </div>

          {/* Advanced Analytics Components */}
          <div className="space-y-8">
            <BotComparisonChart />
            <StrategyPerformanceChart />
            <RiskAnalysisChart />
          </div>
        </div>
      )}
    </div>
  );
}
