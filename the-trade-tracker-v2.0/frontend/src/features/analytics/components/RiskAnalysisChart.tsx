"use client";

import { useState, useEffect } from "react";
import { Pie, PieChart, Bar, BarChart, XAxis, YAxis, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from "@/components/ui/chart";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { useTheme } from "next-themes";

interface RealRiskAnalysisData {
  exposureBySymbol: Array<{
    symbol: string;
    trades: number;
    exposure: number;
    exposurePercentage: number;
    pnl: number;
  }>;
  riskMetrics: {
    totalExposure: number;
    concentrationRisk: number;
    volatility: number;
    valueAtRisk: number; // This is just a number, not an object
  };
  period: string;
  dateRange: {
    start: string;
    end: string;
  };
}

interface MockRiskAnalysisData {
  exposureBySymbol: Array<{
    symbol: string;
    exposure: number;
    percentage: number;
  }>;
  concentrationRisk: {
    herfindahlIndex: number;
    riskLevel: "Low" | "Medium" | "High";
    topSymbolConcentration: number;
  };
  volatilityMetrics: Array<{
    symbol: string;
    volatility: number;
    dayRangePercent: number;
  }>;
  valueAtRisk: {
    var95: number;
    var99: number;
    expectedShortfall: number;
    confidence: number;
  };
  period: string;
  dateRange: {
    start: string;
    end: string;
  };
}

interface RiskAnalysisResponse {
  success: boolean;
  data: RealRiskAnalysisData | MockRiskAnalysisData;
}

export const RiskAnalysisChart = () => {
  const { theme } = useTheme();
  const [data, setData] = useState<RiskAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState("30d");

  // Dynamic colors based on theme
  const getChartColors = () => {
    if (theme === "dark") {
      return {
        primary: "#3b82f6",
        secondary: "#10b981",
        tertiary: "#f59e0b",
        quaternary: "#8b5cf6",
        colors: ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#06b6d4", "#84cc16", "#f97316", "#ef4444", "#ec4899"],
      };
    } else {
      return {
        primary: "#2563eb",
        secondary: "#059669",
        tertiary: "#d97706",
        quaternary: "#7c3aed",
        colors: ["#2563eb", "#059669", "#d97706", "#7c3aed", "#0891b2", "#65a30d", "#ea580c", "#dc2626", "#db2777"],
      };
    }
  };

  const chartColors = getChartColors();

  // Chart configuration for risk analysis
  const riskChartConfig: ChartConfig = {
    exposure: {
      label: "Exposure",
      color: chartColors.primary,
    },
    volatility: {
      label: "Volatility",
      color: chartColors.primary,
    },
  };

  useEffect(() => {
    fetchRiskAnalysis();
  }, [period]);

  const fetchRiskAnalysis = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics/risk-analysis?period=${period}`);

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || `HTTP ${response.status}: Failed to fetch risk analysis data`);
      }

      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err: unknown) {
      console.error("Error fetching risk analysis data:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to connect to analytics service";

      // Fallback to mock data
      const mockData = {
        success: true,
        data: {
          exposureBySymbol: [
            { symbol: "BTC/USD", exposure: 15000, percentage: 42.5 },
            { symbol: "ETH/USD", exposure: 8500, percentage: 24.1 },
            { symbol: "AAPL", exposure: 6000, percentage: 17.0 },
            { symbol: "XAU/USD", exposure: 4200, percentage: 11.9 },
            { symbol: "TSLA", exposure: 1600, percentage: 4.5 },
          ],
          concentrationRisk: {
            herfindahlIndex: 0.28,
            riskLevel: "Medium" as const,
            topSymbolConcentration: 42.5,
          },
          volatilityMetrics: [
            { symbol: "BTC/USD", volatility: 4.2, dayRangePercent: 3.8 },
            { symbol: "ETH/USD", volatility: 5.1, dayRangePercent: 4.5 },
            { symbol: "AAPL", volatility: 2.3, dayRangePercent: 1.9 },
            { symbol: "XAU/USD", volatility: 1.8, dayRangePercent: 1.2 },
            { symbol: "TSLA", volatility: 6.7, dayRangePercent: 5.8 },
          ],
          valueAtRisk: {
            var95: -1250.45,
            var99: -2180.67,
            expectedShortfall: -2850.33,
            confidence: 95,
          },
          period: period,
          dateRange: {
            start: "2024-01-01T00:00:00Z",
            end: "2024-01-07T23:59:59Z",
          },
        },
      };

      console.warn("Using mock risk analysis data due to API error:", errorMessage);
      setData(mockData);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case "Low":
        return "text-green-600 bg-green-100 dark:bg-green-950/30 dark:text-green-300";
      case "Medium":
        return "text-yellow-600 bg-yellow-100 dark:bg-yellow-950/30 dark:text-yellow-300";
      case "High":
        return "text-red-600 bg-red-100 dark:bg-red-950/30 dark:text-red-300";
      default:
        return "text-muted-foreground bg-muted";
    }
  };

  if (loading) {
    return (
      <div className="bg-card rounded-lg border border-border shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 bg-destructive/20 rounded"></div>
          <h3 className="text-lg font-semibold text-card-foreground">Risk Analysis</h3>
        </div>
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-destructive"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card rounded-lg border border-border shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 bg-destructive/20 rounded"></div>
          <h3 className="text-lg font-semibold text-card-foreground">Risk Analysis</h3>
        </div>
        <div className="h-64 flex items-center justify-center text-destructive">Error: {error}</div>
      </div>
    );
  }

  if (!data || !data.data) {
    return (
      <div className="bg-card rounded-lg border border-border shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 bg-muted rounded"></div>
          <h3 className="text-lg font-semibold text-card-foreground">Risk Analysis</h3>
        </div>
        <div className="h-64 flex items-center justify-center text-muted-foreground">No risk analysis data available</div>
      </div>
    );
  }

  const riskData = data.data;

  // Helper function to determine if we have real API data or mock data
  const isRealData = (data: RealRiskAnalysisData | MockRiskAnalysisData): data is RealRiskAnalysisData => {
    return "riskMetrics" in data && typeof (data as RealRiskAnalysisData).riskMetrics.valueAtRisk === "number";
  };

  // Transform real API data to match the component's expected structure
  const transformedData = isRealData(riskData)
    ? {
        exposureBySymbol: riskData.exposureBySymbol.map((item) => ({
          symbol: item.symbol,
          exposure: item.exposure,
          percentage: item.exposurePercentage,
        })),
        concentrationRisk: {
          herfindahlIndex: riskData.riskMetrics.concentrationRisk / 100, // Convert to decimal
          riskLevel: (riskData.riskMetrics.concentrationRisk > 60 ? "High" : riskData.riskMetrics.concentrationRisk > 30 ? "Medium" : "Low") as "Low" | "Medium" | "High",
          topSymbolConcentration: Math.max(...riskData.exposureBySymbol.map((item) => item.exposurePercentage)),
        },
        volatilityMetrics: riskData.exposureBySymbol.map((item) => ({
          symbol: item.symbol,
          volatility: Math.abs(item.pnl / item.exposure) * 100, // Calculate volatility as percentage
          dayRangePercent: Math.abs(item.pnl / item.exposure) * 100,
        })),
        valueAtRisk: {
          var95: riskData.riskMetrics.valueAtRisk,
          var99: riskData.riskMetrics.valueAtRisk * 1.5, // Estimate var99
          expectedShortfall: riskData.riskMetrics.valueAtRisk * 1.8, // Estimate expected shortfall
          confidence: 95,
        },
        period: riskData.period,
        dateRange: riskData.dateRange,
      }
    : riskData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-card rounded-lg border border-border shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-destructive/20 rounded flex items-center justify-center">
              <div className="w-3 h-3 bg-destructive rounded-full"></div>
            </div>
            <h3 className="text-lg font-semibold text-card-foreground">Risk Analysis</h3>
            {isRealData(riskData) && <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-300 rounded-full">Real Data</span>}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs bg-popover text-popover-foreground p-3 text-sm border border-border">
                  <p>
                    Comprehensive risk analysis including Value at Risk (VaR), portfolio concentration, and exposure distribution to help you understand and manage your trading
                    risk.
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
                  period === p ? "bg-destructive text-destructive-foreground font-medium" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Key Risk Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-center p-4 bg-muted/50 rounded-lg cursor-help">
                  <div className="text-2xl font-bold text-red-600">{formatCurrency(Math.abs(transformedData.valueAtRisk.var95))}</div>
                  <div className="text-sm text-muted-foreground">VaR 95%</div>
                  <div className="text-xs text-muted-foreground mt-1">Max daily loss</div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs bg-popover text-popover-foreground p-3 text-sm border border-border">
                <p>Value at Risk (95%): The maximum potential loss over a day with 95% confidence. There&apos;s a 5% chance daily losses could exceed this amount.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-center p-4 bg-muted/50 rounded-lg cursor-help">
                  <div className="text-2xl font-bold text-red-700">{formatCurrency(Math.abs(transformedData.valueAtRisk.var99))}</div>
                  <div className="text-sm text-muted-foreground">VaR 99%</div>
                  <div className="text-xs text-muted-foreground mt-1">Extreme loss</div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs bg-popover text-popover-foreground p-3 text-sm border border-border">
                <p>Value at Risk (99%): The maximum potential loss over a day with 99% confidence. There&apos;s only a 1% chance daily losses could exceed this amount.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-center p-4 bg-muted/50 rounded-lg cursor-help">
                  <div className="text-2xl font-bold text-card-foreground">{transformedData.concentrationRisk.herfindahlIndex.toFixed(3)}</div>
                  <div className="text-sm text-muted-foreground">Herfindahl Index</div>
                  <div className="text-xs text-muted-foreground mt-1">Concentration</div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs bg-popover text-popover-foreground p-3 text-sm border border-border">
                <p>Herfindahl Index: Measures portfolio concentration. Lower values (&lt;0.15) indicate good diversification, while higher values suggest concentration risk.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-center p-4 bg-muted/50 rounded-lg cursor-help">
                  <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${getRiskLevelColor(transformedData.concentrationRisk.riskLevel)}`}>
                    {transformedData.concentrationRisk.riskLevel} Risk
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">Risk Level</div>
                  <div className="text-xs text-muted-foreground mt-1">{transformedData.concentrationRisk.topSymbolConcentration.toFixed(1)}% top exposure</div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs bg-popover text-popover-foreground p-3 text-sm border border-border">
                <p>Overall risk assessment based on portfolio concentration. Shows if your portfolio is well-diversified (Low) or heavily concentrated in few assets (High).</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Exposure Distribution */}
        <div className="bg-card rounded-lg border border-border shadow-sm p-6">
          <h4 className="text-lg font-semibold mb-4 text-card-foreground">Exposure Distribution</h4>

          <div className="h-[300px] w-full">
            <PieChart width={400} height={300} className="mx-auto">
              <Pie
                data={transformedData.exposureBySymbol}
                cx={200}
                cy={150}
                outerRadius={100}
                fill={chartColors.primary}
                dataKey="percentage"
                label={({ symbol, percentage }) => `${symbol}: ${percentage.toFixed(1)}%`}
                labelLine={false}>
                {transformedData.exposureBySymbol.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={chartColors.colors[index % chartColors.colors.length]} />
                ))}
              </Pie>
              <ChartTooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-popover text-popover-foreground p-3 text-sm border border-border rounded-lg shadow-lg">
                        <p className="font-semibold">{data.symbol}</p>
                        <p>Exposure: {formatCurrency(data.exposure)}</p>
                        <p>Percentage: {data.percentage.toFixed(1)}%</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </div>

          {/* Exposure Table */}
          <div className="mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 font-medium text-card-foreground">Symbol</th>
                  <th className="text-right py-2 font-medium text-card-foreground">Exposure</th>
                  <th className="text-right py-2 font-medium text-card-foreground">%</th>
                </tr>
              </thead>
              <tbody>
                {transformedData.exposureBySymbol.map((item, index) => (
                  <tr key={item.symbol} className="border-b border-border">
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chartColors.colors[index % chartColors.colors.length] }}></div>
                        <span className="font-mono text-card-foreground">{item.symbol}</span>
                      </div>
                    </td>
                    <td className="py-2 text-right font-medium text-card-foreground">{formatCurrency(item.exposure)}</td>
                    <td className="py-2 text-right text-card-foreground">{item.percentage.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Volatility Analysis */}
        <div className="bg-card rounded-lg border border-border shadow-sm p-6">
          <h4 className="text-lg font-semibold mb-4 text-card-foreground">Volatility by Symbol</h4>

          <div className="h-[300px] w-full">
            <ChartContainer config={riskChartConfig}>
              <BarChart data={transformedData.volatilityMetrics} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <XAxis dataKey="symbol" tickLine={false} axisLine={false} tickMargin={8} angle={-45} textAnchor="end" height={80} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => `${value}%`} />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent hideLabel={false} labelFormatter={(label) => `Symbol: ${label}`} formatter={(value) => [`${Number(value).toFixed(1)}%`, "Volatility"]} />
                  }
                />
                <Bar dataKey="volatility" fill={chartColors.primary} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </div>

          {/* Volatility Table */}
          <div className="mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 font-medium text-card-foreground">Symbol</th>
                  <th className="text-right py-2 font-medium text-card-foreground">Volatility</th>
                  <th className="text-right py-2 font-medium text-card-foreground">Day Range</th>
                </tr>
              </thead>
              <tbody>
                {transformedData.volatilityMetrics.map((item) => (
                  <tr key={item.symbol} className="border-b border-border">
                    <td className="py-2 font-mono text-card-foreground">{item.symbol}</td>
                    <td className="py-2 text-right">
                      <span className={`font-medium ${item.volatility > 5 ? "text-red-600" : item.volatility > 3 ? "text-yellow-600" : "text-green-600"}`}>
                        {item.volatility.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2 text-right text-muted-foreground">{item.dayRangePercent.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Value at Risk Details */}
      <div className="bg-card rounded-lg border border-border shadow-sm p-6">
        <h4 className="text-lg font-semibold mb-4 text-card-foreground">Value at Risk (VaR) Analysis</h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600 mb-2">{formatCurrency(Math.abs(transformedData.valueAtRisk.var95))}</div>
              <div className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">VaR 95%</div>
              <div className="text-sm text-red-700 dark:text-red-400">There is a 5% chance that daily losses will exceed this amount</div>
            </div>
          </div>

          <div className="bg-red-100 dark:bg-red-950/30 rounded-lg p-4 border border-red-300 dark:border-red-700">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-700 mb-2">{formatCurrency(Math.abs(transformedData.valueAtRisk.var99))}</div>
              <div className="text-lg font-semibold text-red-900 dark:text-red-200 mb-2">VaR 99%</div>
              <div className="text-sm text-red-800 dark:text-red-300">There is a 1% chance that daily losses will exceed this amount</div>
            </div>
          </div>

          <div className="bg-red-200 dark:bg-red-950/40 rounded-lg p-4 border border-red-400 dark:border-red-600">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-800 dark:text-red-100 mb-2">{formatCurrency(Math.abs(transformedData.valueAtRisk.expectedShortfall))}</div>
              <div className="text-lg font-semibold text-red-900 dark:text-red-200 mb-2">Expected Shortfall</div>
              <div className="text-sm text-red-800 dark:text-red-300">Average loss when VaR threshold is exceeded</div>
            </div>
          </div>
        </div>

        {/* Risk Interpretation */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h5 className="font-semibold mb-2 text-card-foreground">Risk Interpretation</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div>
              <strong className="text-card-foreground">Concentration Risk:</strong>
              <span
                className={`ml-2 ${
                  transformedData.concentrationRisk.riskLevel === "Low"
                    ? "text-green-600"
                    : transformedData.concentrationRisk.riskLevel === "Medium"
                    ? "text-yellow-600"
                    : "text-red-600"
                }`}>
                {transformedData.concentrationRisk.riskLevel}
              </span>
              <div className="text-xs mt-1">
                Herfindahl Index: {transformedData.concentrationRisk.herfindahlIndex.toFixed(3)}
                {transformedData.concentrationRisk.herfindahlIndex < 0.15
                  ? " (Well diversified)"
                  : transformedData.concentrationRisk.herfindahlIndex < 0.25
                  ? " (Moderately concentrated)"
                  : " (Highly concentrated)"}
              </div>
            </div>
            <div>
              <strong className="text-card-foreground">Top Symbol Exposure:</strong>
              <span className="ml-2 text-card-foreground">{transformedData.concentrationRisk.topSymbolConcentration.toFixed(1)}%</span>
              <div className="text-xs mt-1">
                {transformedData.concentrationRisk.topSymbolConcentration > 40
                  ? "High concentration in single asset"
                  : transformedData.concentrationRisk.topSymbolConcentration > 25
                  ? "Moderate concentration risk"
                  : "Good diversification"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
