"use client";

import { useEffect, useRef } from "react";
import { Time } from "lightweight-charts";
import { PositionChartProps } from "../types/position-chart.types";

export function PositionChart({ position, theme = "dark", height = 400, showControls = true }: Omit<PositionChartProps, "candleData" | "symbol">) {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Import TradingView dynamically to avoid SSR issues
    const initChart = async () => {
      try {
        // Import v5 API correctly
        const { createChart, LineSeries } = await import("lightweight-charts");

        const chart = createChart(chartContainerRef.current!, {
          layout: {
            background: { color: theme === "dark" ? "#1a1a1a" : "#ffffff" },
            textColor: theme === "dark" ? "#d1d5db" : "#374151",
          },
          grid: {
            vertLines: { color: theme === "dark" ? "#2d3748" : "#e5e7eb" },
            horzLines: { color: theme === "dark" ? "#2d3748" : "#e5e7eb" },
          },
          width: chartContainerRef.current!.clientWidth,
          height: height,
        });

        // Create line series using correct v5.0.7 API
        const entryLine = chart.addSeries(LineSeries, {
          color: "#3b82f6",
          lineWidth: 2,
          title: `Entry: ${position.entryPrice}`,
        });

        const stopLossLine = chart.addSeries(LineSeries, {
          color: "#ef4444",
          lineWidth: 2,
          title: `Stop Loss: ${position.stopLoss}`,
        });

        const takeProfitLine = chart.addSeries(LineSeries, {
          color: "#10b981",
          lineWidth: 2,
          title: `Take Profit: ${position.takeProfit}`,
        });

        // Simple data points with proper Time typing
        const now = Math.floor(Date.now() / 1000) as Time;
        const entryTime = Math.floor(new Date(position.entryTime).getTime() / 1000) as Time;

        entryLine.setData([
          { time: entryTime, value: position.entryPrice },
          { time: now, value: position.entryPrice },
        ]);

        stopLossLine.setData([
          { time: entryTime, value: position.stopLoss },
          { time: now, value: position.stopLoss },
        ]);

        takeProfitLine.setData([
          { time: entryTime, value: position.takeProfit },
          { time: now, value: position.takeProfit },
        ]);

        return chart;
      } catch (error) {
        console.error("Error creating chart:", error);
        return null;
      }
    };

    let chartInstance: Awaited<ReturnType<typeof initChart>> = null;
    initChart().then((chart) => {
      chartInstance = chart;
    });

    return () => {
      if (chartInstance) {
        chartInstance.remove();
      }
    };
  }, [position, theme, height]);

  return (
    <div className="relative w-full">
      <div ref={chartContainerRef} style={{ height: `${height}px` }} className="w-full border border-gray-200 dark:border-gray-700 rounded-lg" />

      {showControls && (
        <div className="absolute top-2 left-2 flex gap-2">
          <button className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">1H</button>
          <button className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">4H</button>
          <button className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">1D</button>
        </div>
      )}

      <div className="absolute bottom-2 left-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">TradingView Chart - Phase 1 Demo</div>
    </div>
  );
}
