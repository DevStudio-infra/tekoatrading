import { ActivePosition } from "../types/position-chart.types";

export function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

export function calculatePnL(position: ActivePosition, currentPrice: number): { pnl: number; pnlPercent: number } {
  if (!currentPrice || !position.entryPrice) {
    return { pnl: 0, pnlPercent: 0 };
  }

  const priceChange = currentPrice - position.entryPrice;
  const direction = position.direction === "BUY" ? 1 : -1;
  const pnl = priceChange * direction * position.quantity;
  const pnlPercent = (priceChange / position.entryPrice) * direction * 100;

  return { pnl, pnlPercent };
}

export function calculateRiskRewardRatio(position: ActivePosition): number {
  // Handle undefined/optional stopLoss and takeProfit
  if (!position.takeProfit || !position.stopLoss) {
    return 0;
  }

  const potentialProfit = Math.abs(position.takeProfit - position.entryPrice);
  const potentialLoss = Math.abs(position.entryPrice - position.stopLoss);

  if (potentialLoss === 0) return 0;
  return potentialProfit / potentialLoss;
}

export function formatPrice(price: number | undefined, symbol: string): string {
  // Handle undefined/null prices
  if (price === undefined || price === null || isNaN(price)) {
    return "N/A";
  }

  // Determine decimal places based on symbol
  let decimals = 5; // Default for forex

  if (symbol.includes("JPY")) {
    decimals = 3;
  } else if (symbol.includes("BTC") || symbol.includes("ETH")) {
    decimals = 2;
  } else if (symbol.includes("SPX") || symbol.includes("US500")) {
    decimals = 1;
  }

  return price.toFixed(decimals);
}

export function getDistanceToLevel(currentPrice: number, targetPrice: number | undefined): number {
  if (targetPrice === undefined || targetPrice === null || isNaN(targetPrice)) {
    return 0;
  }
  return Math.abs(currentPrice - targetPrice);
}

export function isNearLevel(currentPrice: number, targetPrice: number, thresholdPercent: number = 1): boolean {
  const distance = getDistanceToLevel(currentPrice, targetPrice);
  const threshold = (targetPrice * thresholdPercent) / 100;
  return distance <= threshold;
}

export function generateTimeSeriesData(startTime: string | number, endTime: number, value: number): Array<{ time: number; value: number }> {
  const start = typeof startTime === "string" ? new Date(startTime).getTime() / 1000 : startTime;
  const end = endTime / 1000;

  return [
    { time: start, value },
    { time: end, value },
  ];
}
