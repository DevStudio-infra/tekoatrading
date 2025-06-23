"use client";

import { useState, useEffect } from "react";

interface ChartImage {
  id: string;
  symbol: string;
  timeframe: string;
  imageUrl: string;
  createdAt: string;
}

interface TechnicalIndicator {
  name: string;
  value: number;
  signal: "BUY" | "SELL" | "NEUTRAL";
  description: string;
}

export default function ChartsPage() {
  // const userId = "demo-user"; // Commented out as it's not used yet

  // Mock chart data
  const [chartImages] = useState<ChartImage[]>([
    {
      id: "1",
      symbol: "EURUSD",
      timeframe: "H1",
      imageUrl: "/chart-placeholder.png",
      createdAt: new Date().toISOString(),
    },
    {
      id: "2",
      symbol: "GBPUSD",
      timeframe: "M15",
      imageUrl: "/chart-placeholder.png",
      createdAt: new Date().toISOString(),
    },
    {
      id: "3",
      symbol: "USDJPY",
      timeframe: "H4",
      imageUrl: "/chart-placeholder.png",
      createdAt: new Date().toISOString(),
    },
  ]);

  const [selectedSymbol, setSelectedSymbol] = useState("EURUSD");
  const [selectedTimeframe, setSelectedTimeframe] = useState("H1");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentPrice, setCurrentPrice] = useState(1.0875);
  const [priceChange, setPriceChange] = useState(0.0025);
  const [activeTab, setActiveTab] = useState<"live" | "analysis" | "saved">("live");

  const symbols = ["EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD"];
  const timeframes = ["M1", "M5", "M15", "M30", "H1", "H4", "D1"];

  // Mock technical indicators
  const [technicalIndicators] = useState<TechnicalIndicator[]>([
    { name: "RSI (14)", value: 65.2, signal: "NEUTRAL", description: "Relative Strength Index" },
    {
      name: "MACD",
      value: 0.0012,
      signal: "BUY",
      description: "Moving Average Convergence Divergence",
    },
    {
      name: "Bollinger Bands",
      value: 1.085,
      signal: "NEUTRAL",
      description: "Price near middle band",
    },
    { name: "Stochastic", value: 45.8, signal: "NEUTRAL", description: "Stochastic Oscillator" },
    { name: "Williams %R", value: -35.2, signal: "BUY", description: "Williams Percent Range" },
    { name: "ADX", value: 25.6, signal: "NEUTRAL", description: "Average Directional Index" },
  ]);

  // Simulate real-time price updates
  useEffect(() => {
    const interval = setInterval(() => {
      const change = (Math.random() - 0.5) * 0.001;
      setCurrentPrice((prev) => prev + change);
      setPriceChange(change);
    }, 2000);

    return () => clearInterval(interval);
  }, [selectedSymbol]);

  const handleGenerateChart = () => {
    setIsAnalyzing(true);
    // Mock chart generation
    setTimeout(() => {
      setIsAnalyzing(false);
      console.log(`Generated chart for ${selectedSymbol} ${selectedTimeframe}`);
    }, 2000);
  };

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case "BUY":
        return "text-green-600 bg-green-100";
      case "SELL":
        return "text-red-600 bg-red-100";
      case "NEUTRAL":
        return "text-gray-600 bg-gray-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Trading Charts</h1>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-lg mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: "live", label: "Live Chart" },
                { id: "analysis", label: "Technical Analysis" },
                { id: "saved", label: "Saved Charts" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as "live" | "analysis" | "saved")}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
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
            {/* Live Chart Tab */}
            {activeTab === "live" && (
              <div className="space-y-6">
                {/* Chart Controls */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Symbol</label>
                    <select
                      value={selectedSymbol}
                      onChange={(e) => setSelectedSymbol(e.target.value)}
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {symbols.map((symbol) => (
                        <option key={symbol} value={symbol}>
                          {symbol}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Timeframe</label>
                    <select
                      value={selectedTimeframe}
                      onChange={(e) => setSelectedTimeframe(e.target.value)}
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {timeframes.map((tf) => (
                        <option key={tf} value={tf}>
                          {tf}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Current Price</label>
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <div className="text-lg font-bold">{currentPrice.toFixed(5)}</div>
                      <div
                        className={`text-sm ${priceChange >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {priceChange >= 0 ? "+" : ""}
                        {priceChange.toFixed(4)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={handleGenerateChart}
                      disabled={isAnalyzing}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {isAnalyzing ? "Analyzing..." : "Generate Chart"}
                    </button>
                  </div>
                </div>

                {/* Live Chart Area */}
                <div className="bg-gray-100 rounded-lg p-8">
                  <div className="w-full h-96 bg-white rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                    <div className="text-gray-500 text-center">
                      <div className="text-4xl mb-2">📈</div>
                      <p className="text-lg font-medium">Live Chart: {selectedSymbol}</p>
                      <p className="text-sm">Timeframe: {selectedTimeframe}</p>
                      <p className="text-xs mt-2 text-gray-400">Chart integration coming soon</p>
                    </div>
                  </div>
                </div>

                {/* Quick Market Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-medium text-blue-900 mb-2">Trend Analysis</h3>
                    <p className="text-blue-700">Bullish trend detected</p>
                    <p className="text-sm text-blue-600 mt-1">Strong upward momentum</p>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-medium text-green-900 mb-2">Support & Resistance</h3>
                    <p className="text-green-700">Support: {(currentPrice - 0.005).toFixed(5)}</p>
                    <p className="text-green-700">
                      Resistance: {(currentPrice + 0.005).toFixed(5)}
                    </p>
                  </div>

                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="font-medium text-purple-900 mb-2">Volume</h3>
                    <p className="text-purple-700">High volume detected</p>
                    <p className="text-sm text-purple-600 mt-1">Above average activity</p>
                  </div>
                </div>
              </div>
            )}

            {/* Technical Analysis Tab */}
            {activeTab === "analysis" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Technical Indicators</h3>
                    <div className="space-y-3">
                      {technicalIndicators.map((indicator, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium">{indicator.name}</p>
                            <p className="text-sm text-gray-600">{indicator.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{indicator.value.toFixed(4)}</p>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${getSignalColor(indicator.signal)}`}
                            >
                              {indicator.signal}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4">Market Sentiment</h3>
                    <div className="space-y-4">
                      <div className="bg-green-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-green-900">Bullish Signals</span>
                          <span className="text-green-700 font-bold">65%</span>
                        </div>
                        <div className="w-full bg-green-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: "65%" }}
                          ></div>
                        </div>
                      </div>

                      <div className="bg-red-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-red-900">Bearish Signals</span>
                          <span className="text-red-700 font-bold">20%</span>
                        </div>
                        <div className="w-full bg-red-200 rounded-full h-2">
                          <div
                            className="bg-red-600 h-2 rounded-full"
                            style={{ width: "20%" }}
                          ></div>
                        </div>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900">Neutral Signals</span>
                          <span className="text-gray-700 font-bold">15%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gray-600 h-2 rounded-full"
                            style={{ width: "15%" }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">Overall Recommendation</h4>
                      <p className="text-blue-700 font-medium">MODERATE BUY</p>
                      <p className="text-sm text-blue-600 mt-1">
                        Based on technical indicators showing bullish momentum with manageable risk
                      </p>
                    </div>
                  </div>
                </div>

                {/* Pattern Recognition */}
                <div className="bg-white border rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Pattern Recognition</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Ascending Triangle</h4>
                      <p className="text-sm text-gray-600 mb-2">Bullish continuation pattern</p>
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                        Confirmed
                      </span>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Golden Cross</h4>
                      <p className="text-sm text-gray-600 mb-2">50 MA crosses above 200 MA</p>
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                        Pending
                      </span>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Support Level</h4>
                      <p className="text-sm text-gray-600 mb-2">Strong support at 1.0820</p>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                        Active
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Saved Charts Tab */}
            {activeTab === "saved" && (
              <div>
                {chartImages && chartImages.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {chartImages.map((chart) => (
                      <div
                        key={chart.id}
                        className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                      >
                        <div className="bg-gray-200 h-48 flex items-center justify-center">
                          <div className="text-gray-500 text-center">
                            <div className="text-3xl mb-2">📊</div>
                            <p className="font-medium">{chart.symbol}</p>
                            <p className="text-sm">{chart.timeframe}</p>
                          </div>
                        </div>
                        <div className="p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium">
                                {chart.symbol} - {chart.timeframe}
                              </p>
                              <p className="text-sm text-gray-600">
                                {new Date(chart.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button className="text-blue-600 hover:text-blue-800 text-sm">
                                View
                              </button>
                              <button className="text-red-600 hover:text-red-800 text-sm">
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-6xl mb-4">📊</div>
                    <p className="text-gray-500 mb-4">No saved charts yet.</p>
                    <button
                      onClick={() => setActiveTab("live")}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                    >
                      Generate Your First Chart
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
