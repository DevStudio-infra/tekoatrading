import { promises as fs } from "fs";
import * as path from "path";

/**
 * Ensure the output directory exists
 */
export async function ensureOutputDirectory(outputDir: string): Promise<void> {
  try {
    await fs.access(outputDir);
  } catch (error) {
    // Directory doesn't exist, create it
    await fs.mkdir(outputDir, { recursive: true });
  }
}

/**
 * Generate a filename for the chart
 */
export function generateChartFilename(symbol: string, timeframe: string): string {
  const timestamp = Date.now();
  const cleanSymbol = symbol.replace(/[^a-zA-Z0-9]/g, "");
  return `chart-${cleanSymbol}-${timeframe}-${timestamp}.png`;
}

/**
 * Calculate date range for historical data fetching
 */
export function calculateDateRange(
  timeframe: string,
  candleCount: number = 200,
): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString();

  // Calculate minutes per candle
  const minutesPerCandle = getTimeframeInMinutes(timeframe);
  const totalMinutes = minutesPerCandle * candleCount;

  const from = new Date(now.getTime() - totalMinutes * 60 * 1000).toISOString();

  return { from, to };
}

/**
 * Get minutes per timeframe
 */
function getTimeframeInMinutes(timeframe: string): number {
  const timeframeMap: { [key: string]: number } = {
    M1: 1,
    MINUTE: 1,
    M5: 5,
    MINUTE_5: 5,
    M15: 15,
    MINUTE_15: 15,
    M30: 30,
    MINUTE_30: 30,
    H1: 60,
    HOUR: 60,
    H4: 240,
    HOUR_4: 240,
    D1: 1440,
    DAY: 1440,
    W1: 10080,
    WEEK: 10080,
  };

  return timeframeMap[timeframe.toUpperCase()] || 60;
}

/**
 * Generate a simple ASCII chart for debugging/fallback
 */
export function generateAsciiChart(data: any[]): string {
  if (!data || data.length === 0) {
    return "No data available for ASCII chart";
  }

  const prices = data.map((d) => d.close || d.price || 0);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min;

  if (range === 0) {
    return "Price data is flat - no chart variation";
  }

  const height = 10;
  let chart = `Chart for ${data.length} data points (${min.toFixed(2)} - ${max.toFixed(2)}):\n`;

  for (let row = height; row >= 0; row--) {
    const threshold = min + (range * row) / height;
    let line = "";

    for (const price of prices) {
      if (price >= threshold) {
        line += "*";
      } else {
        line += " ";
      }
    }

    chart += `${threshold.toFixed(2).padStart(8)} |${line}\n`;
  }

  return chart;
}
