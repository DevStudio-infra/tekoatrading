/**
 * Capital.com market data interfaces
 */

/**
 * Market data structure for real-time updates
 */
export interface MarketData {
  epic: string;
  product: string;
  bid: number;
  bidQty: number;
  ofr: number;
  ofrQty: number;
  timestamp: number;
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
 * Historical price data response
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
 * Market search results
 */
export interface MarketSearchResponse {
  markets: Market[];
}

/**
 * Individual market data
 */
export interface Market {
  epic: string;
  instrumentName: string;
  instrumentType: string;
  expiry: string;
  currency: string;
  scalingFactor: number;
  marketStatus: string;
}
