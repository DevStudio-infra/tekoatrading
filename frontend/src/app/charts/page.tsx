"use client";

import { useState, useEffect } from "react";
import { trpc } from "../../lib/trpc";

interface ChartConfig {
  symbol: string;
  timeframe: "M1" | "M5" | "M15" | "M30" | "H1" | "H4" | "D1";
  period: string;
  indicators: string[];
  chartType: "candle" | "line" | "area";
}

interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high24h: number;
  low24h: number;
  lastUpdate: string;
}

export default function Charts() {
  const [chartConfig, setChartConfig] = useState<ChartConfig>({
    symbol: "EURUSD",
    timeframe: "M15",
    period: "1D",
    indicators: [],
    chartType: "candle",
  });

  const [selectedTab, setSelectedTab] = useState<"charts" | "analysis" | "saved">("charts");
  const [chartData, setChartData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [savedCharts, setSavedCharts] = useState<any[]>([]);

  // Mock user ID - in real app, get from auth
  const userId = "user-1";

  // Fetch chart images from backend
  const { data: chartImages } = trpc.charts?.list?.useQuery({ userId }) || { data: null };

  // Mock real-time market data
  useEffect(() => {
    const interval = setInterval(() => {
      setMarketData([
        {
          symbol: "EURUSD",
          price: 1.0845 + (Math.random() - 0.5) * 0.001,
          change: (Math.random() - 0.5) * 0.002,
          changePercent: (Math.random() - 0.5) * 0.2,
          volume: 1250000 + Math.random() * 100000,
          high24h: 1.0865,
          low24h: 1.0825,
          lastUpdate: new Date().toISOString(),
        },
        {
          symbol: "GBPUSD",
          price: 1.2654 + (Math.random() - 0.5) * 0.001,
          change: (Math.random() - 0.5) * 0.002,
          changePercent: (Math.random() - 0.5) * 0.2,
          volume: 950000 + Math.random() * 100000,
          high24h: 1.2675,
          low24h: 1.2635,
          lastUpdate: new Date().toISOString(),
        },
        {
          symbol: "USDJPY",
          price: 149.85 + (Math.random() - 0.5) * 0.1,
          change: (Math.random() - 0.5) * 0.2,
          changePercent: (Math.random() - 0.5) * 0.2,
          volume: 1100000 + Math.random() * 100000,
          high24h: 150.15,
          low24h: 149.65,
          lastUpdate: new Date().toISOString(),
        },
        {
          symbol: "XAUUSD",
          price: 2065.5 + (Math.random() - 0.5) * 5,
          change: (Math.random() - 0.5) * 10,
          changePercent: (Math.random() - 0.5) * 0.5,
          volume: 85000 + Math.random() * 10000,
          high24h: 2075.2,
          low24h: 2055.8,
          lastUpdate: new Date().toISOString(),
        },
      ]);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Mock saved charts
  useEffect(() => {
    setSavedCharts([
      {
        id: "chart-1",
        name: "EURUSD Scalping Setup",
        symbol: "EURUSD",
        timeframe: "M5",
        indicators: ["RSI", "MACD", "SMA"],
        createdAt: "2024-01-15T10:30:00Z",
        thumbnail: "/api/placeholder/300/200",
      },
      {
        id: "chart-2",
        name: "Gold Weekly Analysis",
        symbol: "XAUUSD",
        timeframe: "H4",
        indicators: ["Bollinger", "ADX"],
        createdAt: "2024-01-14T15:20:00Z",
        thumbnail: "/api/placeholder/300/200",
      },
    ]);
  }, []);

  const tradingPairs = [
    "EURUSD",
    "GBPUSD",
    "USDJPY",
    "USDCHF",
    "AUDUSD",
    "USDCAD",
    "NZDUSD",
    "EURGBP",
    "EURJPY",
    "GBPJPY",
    "XAUUSD",
    "XAGUSD",
    "BTCUSD",
    "ETHUSD",
  ];

  const timeframes = [
    { value: "M1", label: "1 Minute" },
    { value: "M5", label: "5 Minutes" },
    { value: "M15", label: "15 Minutes" },
    { value: "M30", label: "30 Minutes" },
    { value: "H1", label: "1 Hour" },
    { value: "H4", label: "4 Hours" },
    { value: "D1", label: "1 Day" },
  ];

  const periods = [
    { value: "1H", label: "1 Hour" },
    { value: "4H", label: "4 Hours" },
    { value: "1D", label: "1 Day" },
    { value: "1W", label: "1 Week" },
    { value: "1M", label: "1 Month" },
  ];

  const availableIndicators = [
    { value: "SMA", label: "Simple Moving Average" },
    { value: "EMA", label: "Exponential Moving Average" },
    { value: "RSI", label: "Relative Strength Index" },
    { value: "MACD", label: "MACD" },
    { value: "Bollinger", label: "Bollinger Bands" },
    { value: "Stochastic", label: "Stochastic" },
    { value: "ADX", label: "ADX" },
    { value: "Volume", label: "Volume" },
  ];

  const chartTypes = [
    { value: "candle", label: "Candlestick" },
    { value: "line", label: "Line" },
    { value: "area", label: "Area" },
  ];

  const generateChart = async () => {
    setLoading(true);
    try {
      // Mock chart generation - in real app, call backend service
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Simulate chart data response
      setChartData("mock-chart-data-base64");
    } catch (error) {
      console.error("Error generating chart:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveChart = async () => {
    const newChart = {
      id: `chart-${Date.now()}`,
      name: `${chartConfig.symbol} ${chartConfig.timeframe} Analysis`,
      symbol: chartConfig.symbol,
      timeframe: chartConfig.timeframe,
      indicators: chartConfig.indicators,
      createdAt: new Date().toISOString(),
      thumbnail: "/api/placeholder/300/200",
    };
    setSavedCharts((prev) => [newChart, ...prev]);
  };

  const toggleIndicator = (indicator: string) => {
    setChartConfig((prev) => ({
      ...prev,
      indicators: prev.indicators.includes(indicator)
        ? prev.indicators.filter((i) => i !== indicator)
        : [...prev.indicators, indicator],
    }));
  };

  const tabs = [
    { id: "charts", label: "Live Charts" },
    { id: "analysis", label: "Technical Analysis" },
    { id: "saved", label: "Saved Charts" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Trading Charts</h1>
            <p className="text-gray-600 mt-1">Advanced technical analysis and charting tools</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={saveChart}
              disabled={!chartData}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              Save Chart
            </button>
            <button
              onClick={generateChart}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Generating..." : "Generate Chart"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Market Data */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">Market Overview</h3>
              <div className="space-y-3">
                {marketData.map((market) => (
                  <div
                    key={market.symbol}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      chartConfig.symbol === market.symbol
                        ? "bg-blue-50 border-blue-200"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => setChartConfig((prev) => ({ ...prev, symbol: market.symbol }))}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-sm">{market.symbol}</span>
                      <span
                        className={`text-sm ${market.change >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {market.change >= 0 ? "+" : ""}
                        {market.changePercent.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-lg font-bold">{market.price.toFixed(4)}</span>
                      <span className="text-xs text-gray-500">
                        Vol: {(market.volume / 1000).toFixed(0)}K
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chart Controls */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Chart Settings</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Symbol</label>
                  <select
                    value={chartConfig.symbol}
                    onChange={(e) =>
                      setChartConfig((prev) => ({ ...prev, symbol: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {tradingPairs.map((pair) => (
                      <option key={pair} value={pair}>
                        {pair}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Timeframe</label>
                  <select
                    value={chartConfig.timeframe}
                    onChange={(e) =>
                      setChartConfig((prev) => ({ ...prev, timeframe: e.target.value as any }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {timeframes.map((tf) => (
                      <option key={tf.value} value={tf.value}>
                        {tf.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Period</label>
                  <select
                    value={chartConfig.period}
                    onChange={(e) =>
                      setChartConfig((prev) => ({ ...prev, period: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {periods.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Chart Type</label>
                  <select
                    value={chartConfig.chartType}
                    onChange={(e) =>
                      setChartConfig((prev) => ({ ...prev, chartType: e.target.value as any }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {chartTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Technical Indicators
                  </label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {availableIndicators.map((indicator) => (
                      <label key={indicator.value} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={chartConfig.indicators.includes(indicator.value)}
                          onChange={() => toggleIndicator(indicator.value)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">{indicator.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Tabs */}
            <div className="bg-white rounded-lg shadow mb-6">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setSelectedTab(tab.id as any)}
                      className={`py-4 px-1 border-b-2 font-medium text-sm ${
                        selectedTab === tab.id
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="p-6">
                {selectedTab === "charts" && (
                  <div>
                    {/* Chart Header */}
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-semibold">
                        {chartConfig.symbol} -{" "}
                        {timeframes.find((tf) => tf.value === chartConfig.timeframe)?.label}
                      </h3>
                      <div className="flex items-center space-x-2">
                        {chartConfig.indicators.map((indicator) => (
                          <span
                            key={indicator}
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                          >
                            {indicator}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Chart Display */}
                    <div className="bg-gray-50 rounded-lg p-4 min-h-[500px] flex items-center justify-center">
                      {loading ? (
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                          <p className="text-gray-600">Generating chart...</p>
                        </div>
                      ) : chartData ? (
                        <div className="w-full">
                          {/* Mock chart display */}
                          <div className="bg-white rounded-lg p-4 border-2 border-dashed border-gray-300">
                            <div className="text-center text-gray-500">
                              <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                                📊
                              </div>
                              <p className="text-lg font-semibold mb-2">Chart Generated</p>
                              <p className="text-sm">
                                {chartConfig.symbol} {chartConfig.timeframe} chart with{" "}
                                {chartConfig.indicators.length} indicators
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center text-gray-500">
                          <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                            📈
                          </div>
                          <p className="text-lg font-semibold mb-2">No Chart Generated</p>
                          <p className="text-sm">
                            Click "Generate Chart" to create a technical analysis chart
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedTab === "analysis" && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold">
                      Technical Analysis for {chartConfig.symbol}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-900 mb-3">Key Levels</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Resistance:</span>
                            <span className="font-semibold text-red-600">1.0875</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Support:</span>
                            <span className="font-semibold text-green-600">1.0815</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Pivot:</span>
                            <span className="font-semibold">1.0845</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-900 mb-3">Trend Analysis</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Short Term:</span>
                            <span className="font-semibold text-green-600">Bullish</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Medium Term:</span>
                            <span className="font-semibold text-yellow-600">Neutral</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Long Term:</span>
                            <span className="font-semibold text-red-600">Bearish</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-blue-900 mb-2">AI Analysis Summary</h4>
                      <p className="text-blue-800 text-sm">
                        Current market conditions show mixed signals. The RSI indicates oversold
                        conditions while MACD shows bullish momentum. Consider waiting for
                        confirmation before entering positions.
                      </p>
                    </div>
                  </div>
                )}

                {selectedTab === "saved" && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Saved Charts</h3>
                    {savedCharts.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {savedCharts.map((chart) => (
                          <div
                            key={chart.id}
                            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                          >
                            <div className="bg-gray-100 h-32 rounded-md mb-3 flex items-center justify-center">
                              <span className="text-gray-500">📊</span>
                            </div>
                            <h4 className="font-semibold text-sm mb-1">{chart.name}</h4>
                            <p className="text-xs text-gray-600 mb-2">
                              {chart.symbol} • {chart.timeframe} • {chart.indicators.length}{" "}
                              indicators
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(chart.createdAt).toLocaleDateString()}
                            </p>
                            <div className="flex space-x-2 mt-3">
                              <button className="flex-1 py-1 px-2 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200">
                                Load
                              </button>
                              <button className="flex-1 py-1 px-2 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200">
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                          💾
                        </div>
                        <p className="text-gray-500 mb-2">No saved charts</p>
                        <p className="text-sm text-gray-400">
                          Generate and save charts to access them here
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
