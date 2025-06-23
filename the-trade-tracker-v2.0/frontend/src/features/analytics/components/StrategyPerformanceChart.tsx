"use client";

import { useState, useEffect } from "react";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartConfig } from "@/components/ui/chart";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { useTheme } from "next-themes";

interface StrategyPerformanceData {
  strategyId: string;
  strategyName: string;
  strategyType: string;
  activeBots: number;
  totalBots: number;
  totalTrades: number;
  totalPnL: number;
  winRate: number;
  profitFactor: number;
}

interface StrategyPerformanceResponse {
  success: boolean;
  data: {
    strategies: StrategyPerformanceData[];
    period: string;
    dateRange?: {
      start: string;
      end: string;
    };
  };
}

export const StrategyPerformanceChart = () => {
  const { theme } = useTheme();
  const [data, setData] = useState<StrategyPerformanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState("30d");
  const [isUsingRealData, setIsUsingRealData] = useState(false);

  // Dynamic colors based on theme
  const chartColor = theme === "dark" ? "#3b82f6" : "#2563eb";

  const chartConfig: ChartConfig = {
    totalPnL: {
      label: "Total P&L",
      color: chartColor,
    },
  };

  useEffect(() => {
    fetchStrategyData();
  }, [period]);

  const fetchStrategyData = async () => {
    try {
      setLoading(true);
      console.log(`[STRATEGY PERFORMANCE] Fetching real data for period: ${period}`);

      const response = await fetch(`/api/analytics/strategy-performance?period=${period}`);

      if (!response.ok) {
        console.log(`[STRATEGY PERFORMANCE] API response not OK: ${response.status}`);
        const result = await response.json();
        throw new Error(result.message || `HTTP ${response.status}: Failed to fetch strategy performance data`);
      }

      const result = await response.json();
      console.log(`[STRATEGY PERFORMANCE] ✅ Successfully fetched REAL data:`, result);
      setData(result);
      setError(null);
      setIsUsingRealData(true);
    } catch (err: unknown) {
      console.error("[STRATEGY PERFORMANCE] ❌ Error fetching real data, falling back to mock:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to connect to analytics service";

      // Fallback to mock data
      const mockData = {
        success: true,
        data: {
          strategies: [
            {
              strategyId: "user-strategy-1",
              strategyName: "Scalping",
              strategyType: "Scalping",
              activeBots: 3,
              totalBots: 4,
              totalTrades: 156,
              totalPnL: 245.67,
              winRate: 68.5,
              profitFactor: 1.85,
            },
            {
              strategyId: "user-strategy-2",
              strategyName: "Swing Trading",
              strategyType: "Swing",
              activeBots: 2,
              totalBots: 2,
              totalTrades: 34,
              totalPnL: 156.78,
              winRate: 73.5,
              profitFactor: 2.1,
            },
            {
              strategyId: "user-strategy-3",
              strategyName: "Trend Following",
              strategyType: "Trend",
              activeBots: 1,
              totalBots: 2,
              totalTrades: 18,
              totalPnL: 89.34,
              winRate: 77.8,
              profitFactor: 1.95,
            },
          ],
          period: period,
        },
      };

      console.warn("[STRATEGY PERFORMANCE] 📝 Using mock strategy data due to API error:", errorMessage);
      setData(mockData);
      setError(null);
      setIsUsingRealData(false);
    } finally {
      setLoading(false);
    }
  };

  const strategies = data ? data.data.strategies : [];

  const comparisonChartData = strategies.map((strategy) => ({
    name: strategy.strategyName,
    totalPnL: strategy.totalPnL,
    winRate: strategy.winRate,
    trades: strategy.totalTrades,
  }));

  if (loading) {
    return (
      <div className="bg-card rounded-lg border border-border shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 bg-primary/20 rounded"></div>
          <h3 className="text-lg font-semibold text-card-foreground">Strategy Performance Analysis</h3>
        </div>
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card rounded-lg border border-border shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 bg-destructive/20 rounded"></div>
          <h3 className="text-lg font-semibold text-card-foreground">Strategy Performance Analysis</h3>
        </div>
        <div className="h-64 flex items-center justify-center text-destructive">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg border border-border shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 bg-primary/20 rounded flex items-center justify-center">
              <div className="w-3 h-3 bg-primary rounded-full"></div>
            </div>
            <h3 className="text-lg font-semibold text-card-foreground">Strategy Performance Analysis</h3>
            {isUsingRealData ? (
              <span className="text-xs bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-300 px-2 py-1 rounded-full">Real Data</span>
            ) : (
              <span className="text-xs bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 px-2 py-1 rounded-full">Mock Data</span>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs bg-popover text-popover-foreground p-3 text-sm border border-border">
                  <p>Analyze the performance of your different trading strategies to identify which approaches work best for your portfolio and trading style.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex gap-2">
            {["7d", "30d", "90d"].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  period === p ? "bg-primary text-primary-foreground font-medium" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}>
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="h-[250px] w-full">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <BarChart accessibilityLayer data={comparisonChartData} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
              <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => `$${value}`} tick={{ fontSize: 11 }} width={50} />
              <ChartTooltip
                cursor={false}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length > 0) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
                        <p className="font-medium text-popover-foreground mb-2">{label}</p>
                        <div className="space-y-1">
                          <p className="text-sm">
                            <span className="text-purple-600 font-medium">Total P&L:</span> ${data.totalPnL.toFixed(2)}
                          </p>
                          <p className="text-sm">
                            <span className="text-blue-600 font-medium">Win Rate:</span> {data.winRate.toFixed(1)}%
                          </p>
                          <p className="text-sm">
                            <span className="text-green-600 font-medium">Trades:</span> {data.trades}
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="totalPnL" fill={chartColor} radius={[4, 4, 0, 0]} maxBarSize={80} />
            </BarChart>
          </ChartContainer>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <h4 className="text-lg font-semibold text-card-foreground">User Strategy Summary</h4>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs bg-popover text-popover-foreground p-3 text-sm border border-border">
                <p>Overview of all your trading strategies, including total strategy count, active bots, trade volume, and combined performance metrics.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-center cursor-help">
                  <div className="text-2xl font-bold text-card-foreground">{strategies.length}</div>
                  <div className="text-sm text-muted-foreground">User Strategies</div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs bg-popover text-popover-foreground p-3 text-sm border border-border">
                <p>Total number of unique trading strategies you have created. Each strategy represents a different approach to trading.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-center cursor-help">
                  <div className="text-2xl font-bold text-blue-600">{strategies.reduce((sum, strategy) => sum + strategy.activeBots, 0)}</div>
                  <div className="text-sm text-muted-foreground">Active Bots</div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs bg-popover text-popover-foreground p-3 text-sm border border-border">
                <p>Number of bots currently running and executing trades across all your strategies. Active bots are generating performance data.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-center cursor-help">
                  <div className="text-2xl font-bold text-card-foreground">{strategies.reduce((sum, strategy) => sum + strategy.totalTrades, 0)}</div>
                  <div className="text-sm text-muted-foreground">Total Trades</div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs bg-popover text-popover-foreground p-3 text-sm border border-border">
                <p>Combined total of all trades executed across all your strategies. Higher volume provides more statistical significance for performance analysis.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-center cursor-help">
                  <div className={`text-2xl font-bold ${strategies.reduce((sum, strategy) => sum + strategy.totalPnL, 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                    ${strategies.reduce((sum, strategy) => sum + strategy.totalPnL, 0).toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">Combined P&L</div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs bg-popover text-popover-foreground p-3 text-sm border border-border">
                <p>Total profit or loss across all your strategies combined. This represents your overall trading performance from all automated strategies.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
};
