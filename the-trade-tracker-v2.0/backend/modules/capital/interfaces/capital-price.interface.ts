/**
 * Interfaces related to Capital.com price data
 */

/**
 * Response for historical price data
 */
export interface HistoricalPriceResponse {
  prices: HistoricalPrice[];
  allowance: {
    allowanceExpiry: number;
    remainingAllowance: number;
    totalAllowance: number;
  };
}

/**
 * Individual historical price candle
 */
export interface HistoricalPrice {
  snapshotTime: string;
  snapshotTimeUTC: string;
  openPrice: PriceLevel;
  highPrice: PriceLevel;
  lowPrice: PriceLevel;
  closePrice: PriceLevel;
  lastTradedVolume: number;
}

/**
 * Price level with bid/ask
 */
export interface PriceLevel {
  bid: number;
  ask: number;
}

/**
 * OHLC (Open, High, Low, Close) candle data
 */
export interface OHLCData {
  epic: string;
  type: string;
  resolution: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Supported timeframe resolutions for historical prices
 */
export enum PriceResolution {
  MINUTE = 'MINUTE',
  MINUTE_5 = 'MINUTE_5',
  MINUTE_15 = 'MINUTE_15',
  MINUTE_30 = 'MINUTE_30',
  HOUR = 'HOUR',
  HOUR_4 = 'HOUR_4',
  DAY = 'DAY',
  WEEK = 'WEEK'
}
