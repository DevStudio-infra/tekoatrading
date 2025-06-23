"use client";

import { useState, useEffect } from "react";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartConfig } from "@/components/ui/chart";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { useTheme } from "next-themes";

interface BotComparisonData {
  botId: string;
  botName: string;
  isActive: boolean;
  strategyName: string;
  tradingPair: string;
  totalTrades: number;
  totalPnL: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  lastTradeDate: string | null;
}

interface BotComparisonResponse {
  success: boolean;
  data: {
    bots: BotComparisonData[];
    period: string;
    dateRange: {
      start: string;
      end: string;
    };
  };
}

// Helper function to get Win Rate color
const getWinRateColor = (winRate: number): string => {
  if (winRate >= 65) return "text-green-600"; // Excellent
  if (winRate >= 50) return "text-yellow-600"; // Good
  return "text-red-600"; // Needs improvement
};

export const BotComparisonChart = () => {
  const { theme } = useTheme();
  const [data, setData] = useState<BotComparisonResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState("30d");
  const [sortBy, setSortBy] = useState<keyof BotComparisonData>("totalPnL");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isUsingRealData, setIsUsingRealData] = useState(false);

  // Dynamic colors based on theme
  const chartColor = theme === "dark" ? "#3b82f6" : "#2563eb";

  // Chart configuration for bot comparison
  const botChartConfig: ChartConfig = {
    totalPnL: {
      label: "Total P&L",
      color: chartColor,
    },
    winRate: {
      label: "Win Rate %",
      color: chartColor,
    },
  };

  useEffect(() => {
    fetchBotComparison();
  }, [period]);

  const fetchBotComparison = async () => {
    try {
      setLoading(true);
      console.log(`[BOT COMPARISON] Fetching real data for period: ${period}`);

      const response = await fetch(`/api/analytics/bot-comparison?period=${period}`);

      if (!response.ok) {
        console.log(`[BOT COMPARISON] API response not OK: ${response.status}`);
        const result = await response.json();
        throw new Error(result.message || `HTTP ${response.status}: Failed to fetch bot comparison data`);
      }

      const result = await response.json();
      console.log(`[BOT COMPARISON] ✅ Successfully fetched REAL data:`, result);
      setData(result);
      setError(null);
      setIsUsingRealData(true);
    } catch (err: unknown) {
      console.error("[BOT COMPARISON] ❌ Error fetching real data, falling back to mock:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to connect to analytics service";

      // Fallback to mock data
      const mockData = {
        success: true,
        data: {
          bots: [
            {
              botId: "bot-1",
              botName: "Bitcoin Scalper",
              isActive: true,
              strategyName: "Scalping",
              tradingPair: "BTC/USD",
              totalTrades: 45,
              totalPnL: 127.85,
              winRate: 72.2,
              avgWin: 8.45,
              avgLoss: -4.23,
              profitFactor: 2.0,
              lastTradeDate: "2024-01-07T10:30:00Z",
            },
            {
              botId: "bot-2",
              botName: "ETH Swing Bot",
              isActive: true,
              strategyName: "Swing Trading",
              tradingPair: "ETH/USD",
              totalTrades: 23,
              totalPnL: 89.45,
              winRate: 65.2,
              avgWin: 12.35,
              avgLoss: -6.78,
              profitFactor: 1.82,
              lastTradeDate: "2024-01-06T15:45:00Z",
            },
            {
              botId: "bot-3",
              botName: "AAPL Day Trader",
              isActive: false,
              strategyName: "Day Trading",
              tradingPair: "AAPL",
              totalTrades: 67,
              totalPnL: -23.45,
              winRate: 45.8,
              avgWin: 5.67,
              avgLoss: -7.89,
              profitFactor: 0.72,
              lastTradeDate: "2024-01-05T09:15:00Z",
            },
            {
              botId: "bot-4",
              botName: "Gold Trend Bot",
              isActive: true,
              strategyName: "Trend Following",
              tradingPair: "XAU/USD",
              totalTrades: 12,
              totalPnL: 45.67,
              winRate: 83.3,
              avgWin: 15.23,
              avgLoss: -8.45,
              profitFactor: 1.8,
              lastTradeDate: "2024-01-07T08:20:00Z",
            },
          ],
          period: period,
          dateRange: {
            start: "2024-01-01T00:00:00Z",
            end: "2024-01-07T23:59:59Z",
          },
        },
      };

      console.warn("[BOT COMPARISON] 📝 Using mock bot comparison data due to API error:", errorMessage);
      setData(mockData);
      setError(null);
      setIsUsingRealData(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: keyof BotComparisonData) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const sortedBots =
    data?.data.bots.slice().sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortOrder === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      }

      if (typeof aVal === "boolean" && typeof bVal === "boolean") {
        return sortOrder === "asc" ? (aVal === bVal ? 0 : aVal ? 1 : -1) : aVal === bVal ? 0 : bVal ? 1 : -1;
      }

      return 0;
    }) || [];

  const formatPnL = (value: number) => {
    const color = value >= 0 ? "text-green-600" : "text-red-600";
    const sign = value >= 0 ? "+" : "";
    return (
      <span className={`font-medium ${color}`}>
        {sign}${value.toFixed(2)}
      </span>
    );
  };

  const formatLastTrade = (dateString: string | null) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (loading) {
    return (
      <div className="bg-card rounded-lg border border-border shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 bg-primary/20 rounded"></div>
          <h3 className="text-lg font-semibold text-card-foreground">Bot Performance Comparison</h3>
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
          <h3 className="text-lg font-semibold text-card-foreground">Bot Performance Comparison</h3>
        </div>
        <div className="h-64 flex items-center justify-center text-destructive">Error: {error}</div>
      </div>
    );
  }

  if (!data || !data.data.bots.length) {
    return (
      <div className="bg-card rounded-lg border border-border shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 bg-muted rounded"></div>
          <h3 className="text-lg font-semibold text-card-foreground">Bot Performance Comparison</h3>
        </div>
        <div className="h-64 flex items-center justify-center text-muted-foreground">No bot data available</div>
      </div>
    );
  }

  // Prepare chart data
  const chartData = sortedBots.slice(0, 10).map((bot) => ({
    name: bot.botName.length > 15 ? bot.botName.substring(0, 15) + "..." : bot.botName,
    totalPnL: bot.totalPnL,
    winRate: bot.winRate,
    trades: bot.totalTrades,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-card rounded-lg border border-border shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-primary/20 rounded flex items-center justify-center">
              <div className="w-3 h-3 bg-primary rounded-full"></div>
            </div>
            <h3 className="text-lg font-semibold text-card-foreground">Bot Performance Comparison</h3>
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
                  <p>
                    Compare the performance of all your trading bots across different metrics including P&L, win rates, and profit factors to identify your best performing
                    strategies.
                  </p>
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

        {/* Performance Chart */}
        <div className="h-[250px] w-full">
          <ChartContainer config={botChartConfig} className="h-full w-full">
            <BarChart accessibilityLayer data={chartData} margin={{ top: 20, right: 20, left: 20, bottom: 60 }}>
              <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={60} />
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
                            <span className="text-blue-600 font-medium">Total P&L:</span> ${data.totalPnL.toFixed(2)}
                          </p>
                          <p className="text-sm">
                            <span className="text-green-600 font-medium">Win Rate:</span> {data.winRate.toFixed(1)}%
                          </p>
                          <p className="text-sm">
                            <span className="text-purple-600 font-medium">Trades:</span> {data.trades}
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

      {/* Detailed Table */}
      <div className="bg-card rounded-lg border border-border shadow-sm p-6">
        <h4 className="text-lg font-semibold mb-4 text-card-foreground">Detailed Bot Performance</h4>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-2 font-medium cursor-pointer hover:bg-muted/50 text-card-foreground" onClick={() => handleSort("botName")}>
                  Bot Name {sortBy === "botName" && (sortOrder === "asc" ? "↑" : "↓")}
                </th>
                <th className="text-left py-3 px-2 font-medium cursor-pointer hover:bg-muted/50 text-card-foreground" onClick={() => handleSort("isActive")}>
                  Status {sortBy === "isActive" && (sortOrder === "asc" ? "↑" : "↓")}
                </th>
                <th className="text-left py-3 px-2 font-medium cursor-pointer hover:bg-muted/50 text-card-foreground" onClick={() => handleSort("strategyName")}>
                  Strategy {sortBy === "strategyName" && (sortOrder === "asc" ? "↑" : "↓")}
                </th>
                <th className="text-left py-3 px-2 font-medium cursor-pointer hover:bg-muted/50 text-card-foreground" onClick={() => handleSort("tradingPair")}>
                  Pair {sortBy === "tradingPair" && (sortOrder === "asc" ? "↑" : "↓")}
                </th>
                <th className="text-right py-3 px-2 font-medium cursor-pointer hover:bg-muted/50 text-card-foreground" onClick={() => handleSort("totalTrades")}>
                  Trades {sortBy === "totalTrades" && (sortOrder === "asc" ? "↑" : "↓")}
                </th>
                <th className="text-right py-3 px-2 font-medium cursor-pointer hover:bg-muted/50 text-card-foreground" onClick={() => handleSort("totalPnL")}>
                  Total P&L {sortBy === "totalPnL" && (sortOrder === "asc" ? "↑" : "↓")}
                </th>
                <th className="text-right py-3 px-2 font-medium cursor-pointer hover:bg-muted/50 text-card-foreground" onClick={() => handleSort("winRate")}>
                  Win Rate {sortBy === "winRate" && (sortOrder === "asc" ? "↑" : "↓")}
                </th>
                <th className="text-right py-3 px-2 font-medium cursor-pointer hover:bg-muted/50 text-card-foreground" onClick={() => handleSort("profitFactor")}>
                  Profit Factor {sortBy === "profitFactor" && (sortOrder === "asc" ? "↑" : "↓")}
                </th>
                <th className="text-left py-3 px-2 font-medium cursor-pointer hover:bg-muted/50 text-card-foreground" onClick={() => handleSort("lastTradeDate")}>
                  Last Trade {sortBy === "lastTradeDate" && (sortOrder === "asc" ? "↑" : "↓")}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedBots.map((bot) => (
                <tr key={bot.botId} className="border-b border-border hover:bg-muted/50">
                  <td className="py-3 px-2">
                    <div className="font-medium text-card-foreground">{bot.botName}</div>
                  </td>
                  <td className="py-3 px-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        bot.isActive ? "bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-300" : "bg-muted text-muted-foreground"
                      }`}>
                      {bot.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-muted-foreground">{bot.strategyName}</td>
                  <td className="py-3 px-2 font-mono text-sm text-card-foreground">{bot.tradingPair}</td>
                  <td className="py-3 px-2 text-right text-card-foreground">{bot.totalTrades}</td>
                  <td className="py-3 px-2 text-right">{formatPnL(bot.totalPnL)}</td>
                  <td className="py-3 px-2 text-right">
                    <span className={getWinRateColor(bot.winRate)}>{bot.winRate.toFixed(1)}%</span>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <span className={bot.profitFactor >= 1 ? "text-green-600" : "text-red-600"}>{bot.profitFactor.toFixed(2)}</span>
                  </td>
                  <td className="py-3 px-2 text-sm text-muted-foreground">{formatLastTrade(bot.lastTradeDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border">
          <div className="text-center">
            <div className="text-2xl font-bold text-card-foreground">{data.data.bots.length}</div>
            <div className="text-sm text-muted-foreground">Total Bots</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{data.data.bots.filter((bot) => bot.isActive).length}</div>
            <div className="text-sm text-muted-foreground">Active Bots</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{data.data.bots.reduce((sum, bot) => sum + bot.totalTrades, 0)}</div>
            <div className="text-sm text-muted-foreground">Total Trades</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${data.data.bots.reduce((sum, bot) => sum + bot.totalPnL, 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
              ${data.data.bots.reduce((sum, bot) => sum + bot.totalPnL, 0).toFixed(2)}
            </div>
            <div className="text-sm text-muted-foreground">Combined P&L</div>
          </div>
        </div>
      </div>
    </div>
  );
};
