import * as path from "path";
import { promises as fs } from "fs";
import { HistoricalDataPoint } from "../interfaces/chart-options.interface";
import { loggerService } from "../../../services/logger.service";

/**
 * Utility functions for chart-engine service
 */

/**
 * Ensure the output directory exists
 * @param outputDir Directory path to check/create
 */
export async function ensureOutputDirectory(outputDir: string): Promise<void> {
  try {
    await fs.access(outputDir);
  } catch (error) {
    loggerService.info(`Creating chart output directory: ${outputDir}`);
    await fs.mkdir(outputDir, { recursive: true });
  }
}

/**
 * Generate a unique filename for a chart
 * @param symbol Trading symbol
 * @param timeframe Timeframe used
 * @returns Unique filename with timestamp
 */
export function generateChartFilename(symbol: string, timeframe: string): string {
  const timestamp = new Date().getTime();
  const safeSymbol = symbol.replace(/[\/\\:*?"<>|]/g, "_");
  return `chart_${safeSymbol}_${timeframe}_${timestamp}.png`;
}

/**
 * Parse timeframe string into milliseconds
 * @param timeframe Timeframe (e.g., '1m', '1h', '1d' OR 'M1', 'H1', 'D1')
 * @returns Milliseconds
 */
export function parseTimeframe(timeframe: string): number {
  // Handle Capital.com style timeframes (M1, M5, H1, H4, D1, etc.)
  const upperTimeframe = timeframe.toUpperCase();

  // New format: M1, M5, M15, M30, H1, H4, D1, W1
  switch (upperTimeframe) {
    case "M1":
    case "MINUTE":
      return 60 * 1000;
    case "M5":
    case "MINUTE_5":
      return 5 * 60 * 1000;
    case "M15":
    case "MINUTE_15":
      return 15 * 60 * 1000;
    case "M30":
    case "MINUTE_30":
      return 30 * 60 * 1000;
    case "H1":
    case "HOUR":
      return 60 * 60 * 1000;
    case "H4":
    case "HOUR_4":
      return 4 * 60 * 60 * 1000;
    case "D1":
    case "DAY":
      return 24 * 60 * 60 * 1000;
    case "W1":
    case "WEEK":
      return 7 * 24 * 60 * 60 * 1000;
  }

  // Handle legacy format: 1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w
  const unit = timeframe.slice(-1);
  const value = parseInt(timeframe.slice(0, -1));

  if (!isNaN(value)) {
    switch (unit.toLowerCase()) {
      case "m":
        return value * 60 * 1000;
      case "h":
        return value * 60 * 60 * 1000;
      case "d":
        return value * 24 * 60 * 60 * 1000;
      case "w":
        return value * 7 * 24 * 60 * 60 * 1000;
    }
  }

  // Default fallback
  return 60 * 1000; // Default to 1 minute
}

/**
 * Calculate date range for historical data requests based on timeframe and candle count
 */
export function calculateDateRange(timeframe: string, candleCount: number = 100): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString().split(".")[0]; // Remove milliseconds for API compatibility

  // ULTRA-CONSERVATIVE: Use only the last 2-3 hours maximum for ALL timeframes
  // This prevents error.invalid.from completely
  const lookbackMs = calculateLookbackMilliseconds(timeframe, candleCount);

  const from = new Date(now.getTime() - lookbackMs).toISOString().split(".")[0];

  return { from, to };
}

/**
 * Calculate lookback milliseconds based on timeframe and required candle count
 */
function calculateLookbackMilliseconds(timeframe: string, candleCount: number): number {
  const upperTimeframe = timeframe.toUpperCase();

  // ULTRA-EMERGENCY FIX: Capital.com rejects even 2-hour requests
  // Use only 15 minutes maximum for ALL timeframes to prevent ANY API errors
  const maxLookbackMinutes = 15; // Only 15 minutes maximum for ANY timeframe
  const maxLookbackMs = maxLookbackMinutes * 60 * 1000; // 15 minutes in milliseconds

  // Base intervals in milliseconds
  const intervals = {
    M1: 60 * 1000, // 1 minute
    M5: 5 * 60 * 1000, // 5 minutes
    M15: 15 * 60 * 1000, // 15 minutes
    M30: 30 * 60 * 1000, // 30 minutes
    H1: 60 * 60 * 1000, // 1 hour
    H4: 4 * 60 * 60 * 1000, // 4 hours
    D1: 24 * 60 * 60 * 1000, // 1 day
  };

  // Get base interval for timeframe
  let baseInterval: number;
  switch (upperTimeframe) {
    case "M1":
    case "MINUTE":
      baseInterval = intervals.M1;
      break;
    case "M5":
    case "MINUTE_5":
      baseInterval = intervals.M5;
      break;
    case "M15":
    case "MINUTE_15":
      baseInterval = intervals.M15;
      break;
    case "M30":
    case "MINUTE_30":
      baseInterval = intervals.M30;
      break;
    case "H1":
    case "HOUR":
      baseInterval = intervals.H1;
      break;
    case "H4":
    case "HOUR_4":
      baseInterval = intervals.H4;
      break;
    case "D1":
    case "DAY":
    case "DAILY":
      baseInterval = intervals.D1;
      break;
    default:
      baseInterval = intervals.H1; // Default to hourly
  }

  // Calculate total lookback time needed
  const calculatedLookback = baseInterval * candleCount;

  // ULTRA-EMERGENCY: Always use the minimum of calculated or 15 minutes
  // This should eliminate ALL error.invalid.from issues completely
  return Math.min(calculatedLookback, maxLookbackMs);
}

/**
 * Get maximum lookback days based on timeframe to comply with Capital.com limits
 * ULTRA-EMERGENCY FIX: All timeframes max 15 minutes to prevent ANY API errors
 */
function getMaxLookbackDays(timeframe: string): number {
  // ULTRA-EMERGENCY: All timeframes get only 15 minutes maximum
  // This should completely eliminate error.invalid.from
  return 0.0104; // 15 minutes = 0.0104 days
}

/**
 * Format timestamp to human-readable date
 * @param timestamp Timestamp in seconds
 * @returns Formatted date string
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString();
}

/**
 * Generate a fallback ASCII chart for debugging
 * @param data Historical data points
 * @param width Chart width
 * @param height Chart height
 * @returns ASCII art chart
 */
export function generateAsciiChart(data: HistoricalDataPoint[], width: number = 80, height: number = 20): string {
  if (!data || data.length === 0) {
    return "No data to display";
  }

  // Find min and max values
  const values = data.flatMap((d) => [d.high, d.low]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  // Create empty chart grid
  const grid = Array(height)
    .fill(0)
    .map(() => Array(width).fill(" "));

  // Plot data points
  const step = data.length / width;

  for (let x = 0; x < width; x++) {
    const dataIndex = Math.floor(x * step);
    if (dataIndex < data.length) {
      const point = data[dataIndex];

      // Calculate y positions
      const closeY = Math.floor(height - ((point.close - min) / range) * height);
      const highY = Math.floor(height - ((point.high - min) / range) * height);
      const lowY = Math.floor(height - ((point.low - min) / range) * height);

      // Plot high-low line
      for (let y = highY; y <= lowY; y++) {
        if (y >= 0 && y < height) {
          grid[y][x] = "|";
        }
      }

      // Plot close
      if (closeY >= 0 && closeY < height) {
        grid[closeY][x] = point.close > point.open ? "+" : "-";
      }
    }
  }

  // Convert grid to string
  let chartText = `Range: ${min.toFixed(2)} - ${max.toFixed(2)}\n\n`;
  chartText += grid.map((row) => row.join("")).join("\n");

  return chartText;
}
