"use client";

import { createChart, IChartApi, LineStyle, Time, CandlestickSeries, LineSeries } from "lightweight-charts";
import { useEffect, useRef, useState } from "react";
import { PositionChartProps, ActivePosition, ChartTheme } from "../types/position-chart.types";
import { getTheme } from "../lib/chart-themes";

export function PositionChart({ candleData, position, theme = "dark", height = 400, showControls = true }: PositionChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chart, setChart] = useState<IChartApi | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Chart initialization with v5.0.7 features
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chartTheme = getTheme(theme);

    // Ensure we have proper dimensions
    const container = chartContainerRef.current;
    const containerWidth = container.clientWidth || container.offsetWidth || 800;
    const containerHeight = height;

    console.log("[POSITION CHART] Initializing chart with dimensions:", containerWidth, "x", containerHeight);

    const chartInstance = createChart(container, {
      layout: {
        background: { color: chartTheme.background },
        textColor: chartTheme.textColor,
      },
      grid: {
        vertLines: { color: chartTheme.gridColor },
        horzLines: { color: chartTheme.gridColor },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          labelVisible: true,
          labelBackgroundColor: chartTheme.crosshairColor,
        },
        horzLine: {
          labelVisible: true,
          labelBackgroundColor: chartTheme.crosshairColor,
        },
      },
      rightPriceScale: {
        borderColor: chartTheme.crosshairColor,
      },
      timeScale: {
        borderColor: chartTheme.crosshairColor,
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
      kineticScroll: {
        touch: true,
        mouse: false,
      },
      width: containerWidth,
      height: containerHeight,
      // Add autofitting options
      autoSize: false, // We'll handle sizing manually for better control
    });

    try {
      // Add candlestick series with v5.0.7 API - use correct import and method
      const candlestickSeries = chartInstance.addSeries(CandlestickSeries, {
        upColor: chartTheme.upColor,
        downColor: chartTheme.downColor,
        borderDownColor: chartTheme.downColor,
        borderUpColor: chartTheme.upColor,
        wickDownColor: chartTheme.downColor,
        wickUpColor: chartTheme.upColor,
      });

      // Convert and set candle data if available
      console.log("[POSITION CHART] Raw candle data received:", candleData);

      if (candleData && candleData.length > 0) {
        console.log("[POSITION CHART] Processing", candleData.length, "candles");

        const formattedData = candleData
          .map((candle, index) => {
            let timeValue: number;

            console.log(`[POSITION CHART] Processing candle ${index}:`, candle);

            // Handle different time formats and validate
            if (typeof candle.time === "string") {
              const dateTime = new Date(candle.time).getTime();
              if (isNaN(dateTime)) {
                console.warn("[POSITION CHART] Invalid date string in candle data:", candle.time);
                return null;
              }
              timeValue = Math.floor(dateTime / 1000);
            } else if (typeof candle.time === "number") {
              if (isNaN(candle.time)) {
                console.warn("[POSITION CHART] NaN time value in candle data:", candle);
                return null;
              }
              // Check if it's already in seconds or milliseconds
              timeValue = candle.time > 1e10 ? Math.floor(candle.time / 1000) : candle.time;
            } else {
              console.warn("[POSITION CHART] Invalid time format in candle data:", candle.time, "type:", typeof candle.time);
              return null;
            }

            // Additional time validation
            if (isNaN(timeValue) || timeValue <= 0) {
              console.warn("[POSITION CHART] Invalid computed time value:", timeValue, "from:", candle.time);
              return null;
            }

            // Validate other required fields
            if (
              typeof candle.open !== "number" ||
              typeof candle.high !== "number" ||
              typeof candle.low !== "number" ||
              typeof candle.close !== "number" ||
              isNaN(candle.open) ||
              isNaN(candle.high) ||
              isNaN(candle.low) ||
              isNaN(candle.close)
            ) {
              console.warn("[POSITION CHART] Invalid price data in candle:", candle);
              return null;
            }

            const formattedCandle = {
              time: timeValue as Time,
              open: candle.open,
              high: candle.high,
              low: candle.low,
              close: candle.close,
            };

            console.log(`[POSITION CHART] Formatted candle ${index}:`, formattedCandle);
            return formattedCandle;
          })
          .filter((candle) => candle !== null) // Remove invalid entries
          .sort((a, b) => (a!.time as number) - (b!.time as number)); // Sort by time ascending

        console.log("[POSITION CHART] After filtering and sorting:", formattedData.length, "valid candles");

        if (formattedData.length > 0) {
          const validData = formattedData.filter((candle): candle is NonNullable<typeof candle> => candle !== null);
          console.log("[POSITION CHART] Final data to chart:", validData);
          candlestickSeries.setData(validData);

          // Auto-fit the data after setting it
          setTimeout(() => {
            chartInstance.timeScale().fitContent();
          }, 100);
        } else {
          console.warn("[POSITION CHART] No valid candle data available, creating mock data");
          // Create minimal mock data to prevent chart from failing
          const mockTime = Math.floor(Date.now() / 1000) as Time;
          const mockPrice = position.entryPrice || 100;
          const mockData = [
            {
              time: mockTime,
              open: mockPrice,
              high: mockPrice,
              low: mockPrice,
              close: mockPrice,
            },
          ];
          candlestickSeries.setData(mockData);
        }
      } else {
        console.warn("[POSITION CHART] No candle data provided, creating mock data for position");
        // Create minimal mock data based on position
        const mockTime = Math.floor(Date.now() / 1000) as Time;
        const mockPrice = position.entryPrice || 100;
        const mockData = [
          {
            time: mockTime,
            open: mockPrice,
            high: mockPrice,
            low: mockPrice,
            close: mockPrice,
          },
        ];
        candlestickSeries.setData(mockData);
      }

      // Add trade level visual markers
      addTradeLevelMarkers(chartInstance, position, chartTheme);

      setChart(chartInstance);

      // Set up ResizeObserver for better resize handling
      if (window.ResizeObserver) {
        resizeObserverRef.current = new ResizeObserver((entries) => {
          if (entries.length === 0) return;

          const entry = entries[0];
          const { width, height: observedHeight } = entry.contentRect;

          console.log("[POSITION CHART] Resize observed:", width, "x", observedHeight);

          if (width > 0) {
            chartInstance.applyOptions({
              width: Math.floor(width),
              height: containerHeight,
            });
          }
        });

        resizeObserverRef.current.observe(container);
      }
    } catch (error) {
      console.error("Error creating chart:", error);
    }

    // Cleanup
    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      chartInstance.remove();
    };
  }, [theme, candleData, position, height]);

  // Add trade level visual markers using v5 API
  const addTradeLevelMarkers = (chartInstance: IChartApi, position: ActivePosition, chartTheme: ChartTheme) => {
    try {
      const currentTime = Math.floor(Date.now() / 1000) as Time;

      // Validate position.entryTime
      const entryDate = new Date(position.entryTime);
      if (isNaN(entryDate.getTime())) {
        console.warn("Invalid entryTime in position data:", position.entryTime);
        return;
      }
      const entryTime = Math.floor(entryDate.getTime() / 1000) as Time;

      // Validate required position fields - but be more flexible with SL/TP
      if (typeof position.entryPrice !== "number" || isNaN(position.entryPrice) || position.entryPrice <= 0) {
        console.warn("Invalid entry price in position:", position);
        return;
      }

      // Helper function to round numbers properly
      const formatPrice = (price: number): number => {
        // For crypto (typically higher values), use 2 decimal places
        // For forex (typically lower values), use 5 decimal places
        const decimals = price > 1000 ? 2 : 5;
        return Math.round(price * Math.pow(10, decimals)) / Math.pow(10, decimals);
      };

      // Entry Price Line - always show this
      const entryPrice = formatPrice(position.entryPrice);
      const entryLine = chartInstance.addSeries(LineSeries, {
        color: chartTheme.entryLineColor,
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        title: `Entry: ${entryPrice}`,
        priceLineVisible: true,
        lastValueVisible: true,
      });

      entryLine.setData([
        { time: entryTime, value: entryPrice },
        { time: currentTime, value: entryPrice },
      ]);

      // Stop Loss Line - only if valid and not 0
      if (typeof position.stopLoss === "number" && !isNaN(position.stopLoss) && position.stopLoss > 0 && position.stopLoss !== position.entryPrice) {
        const stopLoss = formatPrice(position.stopLoss);
        const stopLossLine = chartInstance.addSeries(LineSeries, {
          color: chartTheme.stopLossColor,
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          title: `Stop Loss: ${stopLoss}`,
          priceLineVisible: true,
          lastValueVisible: true,
        });

        stopLossLine.setData([
          { time: entryTime, value: stopLoss },
          { time: currentTime, value: stopLoss },
        ]);
      }

      // Take Profit Line - only if valid and not 0
      if (typeof position.takeProfit === "number" && !isNaN(position.takeProfit) && position.takeProfit > 0 && position.takeProfit !== position.entryPrice) {
        const takeProfit = formatPrice(position.takeProfit);
        const takeProfitLine = chartInstance.addSeries(LineSeries, {
          color: chartTheme.takeProfitColor,
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          title: `Take Profit: ${takeProfit}`,
          priceLineVisible: true,
          lastValueVisible: true,
        });

        takeProfitLine.setData([
          { time: entryTime, value: takeProfit },
          { time: currentTime, value: takeProfit },
        ]);
      }

      // Current Price Line - only if different from entry and valid
      if (
        position.currentPrice &&
        typeof position.currentPrice === "number" &&
        !isNaN(position.currentPrice) &&
        position.currentPrice > 0 &&
        position.currentPrice !== position.entryPrice
      ) {
        const currentPrice = formatPrice(position.currentPrice);
        const currentPriceLine = chartInstance.addSeries(LineSeries, {
          color: chartTheme.currentPriceColor,
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          title: `Current: ${currentPrice}`,
          priceLineVisible: true,
          lastValueVisible: true,
        });

        currentPriceLine.setData([{ time: currentTime, value: currentPrice }]);
      }

      console.log("[POSITION CHART] Added trade level markers - Entry:", entryPrice, "SL:", position.stopLoss || "Not set", "TP:", position.takeProfit || "Not set");
    } catch (error) {
      console.error("Error adding trade level markers:", error);
    }
  };

  const handleTimeframeChange = (timeframe: string) => {
    console.log(`Changing timeframe to: ${timeframe}`);
  };

  // Add fit content function
  const fitContent = () => {
    if (chart) {
      chart.timeScale().fitContent();
    }
  };

  return (
    <div className="relative w-full">
      <div ref={chartContainerRef} style={{ height: `${height}px` }} className="w-full border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden" />

      {showControls && (
        <div className="absolute top-2 left-2 flex gap-2">
          <button className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs hover:bg-gray-200 dark:hover:bg-gray-700" onClick={() => handleTimeframeChange("1H")}>
            1H
          </button>
          <button className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs hover:bg-gray-200 dark:hover:bg-gray-700" onClick={() => handleTimeframeChange("4H")}>
            4H
          </button>
          <button className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs hover:bg-gray-200 dark:hover:bg-gray-700" onClick={() => handleTimeframeChange("1D")}>
            1D
          </button>
          <button
            className="px-2 py-1 bg-blue-100 dark:bg-blue-800 rounded text-xs hover:bg-blue-200 dark:hover:bg-blue-700 text-blue-700 dark:text-blue-300"
            onClick={fitContent}
            title="Fit content to screen">
            Fit
          </button>
        </div>
      )}

      {/* Loading state for when chart is initializing */}
      {!chart && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900 bg-opacity-50 rounded-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  );
}
