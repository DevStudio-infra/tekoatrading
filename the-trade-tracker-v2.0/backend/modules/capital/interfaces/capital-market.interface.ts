/**
 * Interfaces related to Capital.com market data
 */

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
 * Market search results
 */
export interface MarketSearchResponse {
  markets: Market[];
}

/**
 * Individual market information
 */
export interface Market {
  epic: string;
  instrumentName: string;
  instrumentType: string;
  expiry: string;
  currency: string;
  scalingFactor: number;
  marketStatus: string;
  bid?: number;
  offer?: number;
  high?: number;
  low?: number;
  percentageChange?: number;
  netChange?: number;
  updateTime?: string;
}

/**
 * Market overview data
 */
export interface MarketDetailsResponse {
  dealingRules: {
    minDealSize: number;
    maxDealSize: number;
    minNormalStopDistance: number;
    minControlledRiskStopDistance: number;
    minTrailingStopDistance: number;
    maxTrailingStopDistance: number;
  };
  instrument: {
    name: string;
    epic: string;
    expiry: string;
    instrumentType: string;
    lotSize: number;
    high: number;
    low: number;
    percentageChange: number;
    netChange: number;
    bid: number;
    offer: number;
    streamingPricesAvailable: boolean;
    marketStatus: string;
    scalingFactor: number;
  };
  snapshot: {
    marketStatus: string;
    netChange: number;
    percentageChange: number;
    updateTime: string;
    delayTime: number;
    bid: number;
    offer: number;
    high: number;
    low: number;
    binaryOdds: number;
    decimalPlacesFactor: number;
    scalingFactor: number;
    controlledRiskExtraSpread: number;
  };
  dealId?: string;
}
