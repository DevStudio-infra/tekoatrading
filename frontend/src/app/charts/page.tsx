"use client";

import { useState } from "react";

export default function Charts() {
  const [symbol, setSymbol] = useState("AAPL");
  const [timeframe, setTimeframe] = useState("1d");
  const [period, setPeriod] = useState("30d");
  const [indicators, setIndicators] = useState<string[]>([]);
  const [chartData, setChartData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const availableIndicators = [
    { value: "sma20", label: "SMA 20" },
    { value: "sma50", label: "SMA 50" },
    { value: "rsi", label: "RSI" },
  ];

  const timeframes = [
    { value: "1m", label: "1 Minute" },
    { value: "5m", label: "5 Minutes" },
    { value: "1h", label: "1 Hour" },
    { value: "1d", label: "1 Day" },
  ];

  const periods = [
    { value: "7d", label: "7 Days" },
    { value: "30d", label: "30 Days" },
    { value: "90d", label: "90 Days" },
    { value: "1y", label: "1 Year" },
  ];

  const generateChart = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:8000/generate-chart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          symbol,
          timeframe,
          period,
          indicators,
          chart_type: "candle",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setChartData(data.chart);
      } else {
        console.error("Failed to generate chart");
      }
    } catch (error) {
      console.error("Error generating chart:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleIndicator = (indicator: string) => {
    setIndicators((prev) =>
      prev.includes(indicator) ? prev.filter((i) => i !== indicator) : [...prev, indicator],
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Charts</h1>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Symbol</label>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                className="w-full p-2 border rounded-md"
                placeholder="Enter symbol"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Timeframe</label>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                {timeframes.map((tf) => (
                  <option key={tf.value} value={tf.value}>
                    {tf.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Period</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                {periods.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={generateChart}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Generating..." : "Generate Chart"}
              </button>
            </div>
          </div>

          {/* Indicators */}
          <div>
            <label className="block text-sm font-medium mb-2">Technical Indicators</label>
            <div className="flex flex-wrap gap-2">
              {availableIndicators.map((indicator) => (
                <button
                  key={indicator.value}
                  onClick={() => toggleIndicator(indicator.value)}
                  className={`px-3 py-1 rounded-full text-sm ${
                    indicators.includes(indicator.value)
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {indicator.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chart Display */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">
            {symbol} - {timeframes.find((tf) => tf.value === timeframe)?.label} Chart
          </h2>

          {chartData ? (
            <div className="flex justify-center">
              <img
                src={`data:image/png;base64,${chartData}`}
                alt={`${symbol} chart`}
                className="max-w-full h-auto rounded-md"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-96 bg-gray-50 rounded-md">
              <p className="text-gray-500">
                {loading ? "Generating chart..." : "Click 'Generate Chart' to display chart"}
              </p>
            </div>
          )}
        </div>

        {/* Chart Engine Status */}
        <div className="mt-4 p-4 bg-blue-50 rounded-md">
          <p className="text-sm text-blue-800">
            💡 Charts are generated using our Python-based chart engine with real market data from
            Yahoo Finance. Technical indicators are calculated using TA-Lib.
          </p>
        </div>
      </div>
    </div>
  );
}
