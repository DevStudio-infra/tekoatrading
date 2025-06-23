"use client";

import { useEffect, useState, useCallback } from "react";
import { PositionChart } from "./position-chart";
import { PositionInfoPanel } from "./position-info-panel";
import { ActivePosition, CandleData } from "../types/position-chart.types";
import { calculatePnL } from "../lib/chart-utils";

interface PositionChartContainerProps {
  position: ActivePosition;
}

export function PositionChartContainer({ position }: PositionChartContainerProps) {
  const [loading, setLoading] = useState(true);
  const [candleData, setCandleData] = useState<CandleData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const currentPrice = position.currentPrice || position.entryPrice;

  // Calculate real-time P&L
  const { pnl, pnlPercent } = calculatePnL(position, currentPrice);

  // Check if mobile
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const fetchCandleData = useCallback(async () => {
    if (!position?.symbol) {
      console.warn("[CHART CONTAINER] No symbol available for position");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log("[CHART CONTAINER] Fetching candle data for position:", position);

      // Try to fetch real market data
      const response = await fetch(`/api/market-data?symbol=${position.symbol}&interval=1h&count=100`);

      if (!response.ok) {
        throw new Error(`Market data API failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.message || "Market data not available");
      }

      if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error("No market data received");
      }

      // Transform API data to chart format
      const transformedData: CandleData[] = data.map((item: { time: number; open: number; high: number; low: number; close: number; volume?: number }) => ({
        time: item.time,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume || 0,
      }));

      console.log("[CHART CONTAINER] Successfully fetched", transformedData.length, "candles");
      setCandleData(transformedData);
    } catch (error) {
      console.error("[CHART CONTAINER] Error fetching candle data:", error);
      setError(error instanceof Error ? error.message : "Failed to load chart data");
      setCandleData([]); // Clear data on error instead of using fallback
    } finally {
      setLoading(false);
    }
  }, [position?.symbol]);

  useEffect(() => {
    fetchCandleData();
  }, [fetchCandleData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-sm text-muted-foreground">Loading chart data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <div className="text-red-500 mb-2">⚠️ Chart data unavailable</div>
        <div className="text-sm text-muted-foreground mb-4">{error}</div>
        <button onClick={fetchCandleData} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`${isMobile ? "flex flex-col" : "grid grid-cols-5 gap-4"} h-full min-h-[600px]`}>
      {/* Chart Area - Give it maximum space (4 out of 5 columns) */}
      <div className={isMobile ? "mb-4 flex-1 min-h-[500px]" : "col-span-4 min-h-0 h-full"}>
        <div className="w-full h-full">
          <PositionChart symbol={position.symbol} candleData={candleData} position={position} height={isMobile ? 500 : 600} showControls={true} />
        </div>
      </div>

      {/* Info Panel - Right sidebar */}
      <div className={isMobile ? "flex-shrink-0" : "col-span-1 min-h-0"}>
        <PositionInfoPanel position={position} currentPrice={currentPrice} realTimePnL={pnl} realTimePnLPercent={pnlPercent} />
      </div>
    </div>
  );
}
