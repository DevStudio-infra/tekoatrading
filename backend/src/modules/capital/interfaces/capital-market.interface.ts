/**
 * Real-time market data structure
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
 * Market information structure
 */
export interface Market {
  epic: string;
  instrumentName: string;
  instrumentType: string;
  marketStatus: string;
  bid: number;
  offer: number;
  high: number;
  low: number;
  percentageChange: number;
  netChange: number;
  updateTime: string;
  delayTime: number;
  streamingPricesAvailable: boolean;
  scalingFactor: number;
}

/**
 * Market search response
 */
export interface MarketSearchResponse {
  markets: Market[];
}

/**
 * Market details response
 */
export interface MarketDetailsResponse {
  market: Market;
  snapshot: {
    marketStatus: string;
    bid: number;
    offer: number;
    high: number;
    low: number;
    percentageChange: number;
    netChange: number;
    updateTime: string;
  };
}

/**
 * Historical price data
 */
export interface HistoricalPrice {
  snapshotTime: string;
  openPrice: {
    bid: number;
    ask: number;
    lastTraded?: number;
  };
  closePrice: {
    bid: number;
    ask: number;
    lastTraded?: number;
  };
  highPrice: {
    bid: number;
    ask: number;
    lastTraded?: number;
  };
  lowPrice: {
    bid: number;
    ask: number;
    lastTraded?: number;
  };
  lastTradedVolume: number;
}

/**
 * Price resolution for historical data
 */
export type PriceResolution =
  | "MINUTE"
  | "MINUTE_2"
  | "MINUTE_3"
  | "MINUTE_5"
  | "MINUTE_10"
  | "MINUTE_15"
  | "MINUTE_30"
  | "HOUR"
  | "HOUR_2"
  | "HOUR_3"
  | "HOUR_4"
  | "DAY"
  | "WEEK"
  | "MONTH";
