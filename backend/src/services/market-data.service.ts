import { EventEmitter } from "events";
import { CapitalMainService } from "../modules/capital/services/capital-main.service";
import { logger } from "../logger";

export interface LivePrice {
  symbol: string;
  bid: number;
  ask: number;
  spread: number;
  timestamp: Date;
  volume?: number;
  change?: number;
  changePercent?: number;
}

export interface RealTimePrice {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  timestamp: Date;
  change: number;
  changePercent: number;
}

export interface MarketDataSubscription {
  symbol: string;
  callback: (price: LivePrice) => void;
  interval?: NodeJS.Timeout;
}

/**
 * Advanced market data service with real-time capabilities
 */
export class MarketDataService extends EventEmitter {
  private capitalApi: CapitalMainService | null = null;
  private priceCache = new Map<string, LivePrice>();
  private cache = new Map<string, { data: any; timestamp: Date }>();
  private subscriptions = new Map<string, MarketDataSubscription>();
  private priceSubscriptions = new Map<string, NodeJS.Timeout>();
  private readonly cacheTimeout = 5000; // 5 seconds

  constructor() {
    super();
  }

  /**
   * Initialize with Capital.com API credentials
   */
  async initializeWithCredentials(credentials: {
    apiKey: string;
    identifier: string;
    password: string;
    isDemo?: boolean;
  }): Promise<void> {
    try {
      this.capitalApi = new CapitalMainService({
        apiKey: credentials.apiKey,
        identifier: credentials.identifier,
        password: credentials.password,
        isDemo: credentials.isDemo,
        instanceId: `market-data-${Date.now()}`,
      });

      await this.capitalApi.authenticate();
      logger.info("[MarketData] Successfully initialized with Capital.com API");
    } catch (error) {
      logger.error("[MarketData] Failed to initialize with Capital.com API:", error);
      throw error;
    }
  }

  /**
   * Get live price for a symbol
   */
  async getLivePrice(symbol: string): Promise<LivePrice> {
    try {
      // Check cache first
      const cached = this.priceCache.get(symbol);
      if (cached && Date.now() - cached.timestamp.getTime() < this.cacheTimeout) {
        return cached;
      }

      if (!this.capitalApi) {
        throw new Error("Market data service not initialized with credentials");
      }

      // Get epic for symbol
      const epic = (await this.capitalApi.getEpicForSymbol(symbol)) || symbol;

      // Get latest price from Capital.com
      const priceData = await this.capitalApi.getLatestPrice(epic);

      const livePrice: LivePrice = {
        symbol,
        bid: priceData.bid,
        ask: priceData.ask || priceData.ofr || priceData.bid + 0.01,
        spread: Math.abs((priceData.ask || priceData.ofr || priceData.bid + 0.01) - priceData.bid),
        timestamp: new Date(),
      };

      // Update cache
      this.priceCache.set(symbol, livePrice);

      return livePrice;
    } catch (error) {
      logger.error(`[MarketData] Error getting live price for ${symbol}:`, error);

      // Return cached data if available, otherwise throw
      const cached = this.priceCache.get(symbol);
      if (cached) {
        logger.warn(`[MarketData] Returning cached price for ${symbol}`);
        return cached;
      }

      throw error;
    }
  }

  /**
   * Start price monitoring for a symbol with real-time updates
   */
  async startPriceMonitoring(symbol: string, callback: (price: LivePrice) => void): Promise<void> {
    try {
      logger.info(`[MarketData] Starting real-time price monitoring for ${symbol}`);

      // Stop existing monitoring if any
      this.stopPriceMonitoring(symbol);

      // Set up subscription
      const subscription: MarketDataSubscription = {
        symbol,
        callback,
      };

      this.subscriptions.set(symbol, subscription);

      // Set up polling mechanism
      const pollInterval = setInterval(async () => {
        try {
          const price = await this.getLivePrice(symbol);
          callback(price);
          this.emit("price_update", { symbol, price });
        } catch (error) {
          logger.error(`Error in price polling for ${symbol}:`, error);
        }
      }, 5000); // Poll every 5 seconds

      this.priceSubscriptions.set(symbol, pollInterval);

      // Get initial price
      try {
        const initialPrice = await this.getLivePrice(symbol);
        callback(initialPrice);
        this.emit("price_update", { symbol, price: initialPrice });
      } catch (error) {
        logger.error(`Error getting initial price for ${symbol}:`, error);
      }

      logger.info(`[MarketData] Real-time price monitoring started for ${symbol}`);
    } catch (error) {
      logger.error(`[MarketData] Error starting price monitoring for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Stop price monitoring for a symbol
   */
  stopPriceMonitoring(symbol: string): void {
    const interval = this.priceSubscriptions.get(symbol);
    if (interval) {
      clearInterval(interval);
      this.priceSubscriptions.delete(symbol);
      this.subscriptions.delete(symbol);
      logger.info(`[MarketData] Stopped price monitoring for ${symbol}`);
    }
  }

  /**
   * Stop all price monitoring
   */
  stopAllPriceMonitoring(): void {
    for (const [symbol] of this.priceSubscriptions) {
      this.stopPriceMonitoring(symbol);
    }
    logger.info("[MarketData] Stopped all price monitoring");
  }

  /**
   * Get real-time price data
   */
  async getRealTimePrice(symbol: string): Promise<RealTimePrice> {
    try {
      logger.debug(`[MarketData] Getting real-time price for ${symbol}`);

      // Check cache first
      const cacheKey = `realtime_${symbol}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp.getTime() < 5000) {
        return cached.data;
      }

      // Get real price from Capital.com API
      const livePrice = await this.getLivePrice(symbol);

      const realTimePrice: RealTimePrice = {
        symbol: symbol,
        price: (livePrice.bid + livePrice.ask) / 2, // Mid price
        bid: livePrice.bid,
        ask: livePrice.ask,
        timestamp: livePrice.timestamp,
        change: livePrice.change || 0,
        changePercent: livePrice.changePercent || 0,
      };

      // Cache the result
      this.cache.set(cacheKey, { data: realTimePrice, timestamp: new Date() });

      logger.debug(`[MarketData] Real-time price retrieved: ${symbol} = $${realTimePrice.price}`);
      return realTimePrice;
    } catch (error) {
      logger.error(`[MarketData] Error getting real-time price for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get historical price data
   */
  async getHistoricalData(symbol: string, timeframe: string, from: Date, to: Date): Promise<any[]> {
    try {
      if (!this.capitalApi) {
        throw new Error("Market data service not initialized");
      }

      // Map timeframe to Capital.com resolution
      const resolutionMap: Record<string, string> = {
        M1: "MINUTE",
        M5: "MINUTE_5",
        M15: "MINUTE_15",
        M30: "MINUTE_30",
        H1: "HOUR",
        H4: "HOUR_4",
        D1: "DAY",
      };

      const resolution = resolutionMap[timeframe] || "HOUR";

      // Capital.com API doesn't support date filtering, calculate approximate number of data points needed
      const diffHours = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60));
      let maxPoints = 100; // Default

      // Estimate data points based on resolution and time range
      switch (resolution) {
        case "MINUTE":
          maxPoints = Math.min(diffHours * 60, 500); // Max 500 minutes
          break;
        case "MINUTE_5":
          maxPoints = Math.min(diffHours * 12, 500); // Max 500 5-minute candles
          break;
        case "MINUTE_15":
          maxPoints = Math.min(diffHours * 4, 500); // Max 500 15-minute candles
          break;
        case "MINUTE_30":
          maxPoints = Math.min(diffHours * 2, 500); // Max 500 30-minute candles
          break;
        case "HOUR":
          maxPoints = Math.min(diffHours, 500); // Max 500 hourly candles
          break;
        case "HOUR_4":
          maxPoints = Math.min(Math.ceil(diffHours / 4), 500); // Max 500 4-hour candles
          break;
        case "DAY":
          maxPoints = Math.min(Math.ceil(diffHours / 24), 365); // Max 365 daily candles
          break;
      }

      const historicalData = await this.capitalApi.getHistoricalPrices(
        symbol,
        resolution as any,
        maxPoints,
      );

      // Convert to OHLCV format
      return historicalData.map((price) => ({
        timestamp: new Date(price.snapshotTime),
        open: price.openPrice.bid,
        high: price.highPrice.bid,
        low: price.lowPrice.bid,
        close: price.closePrice.bid,
        volume: price.lastTradedVolume,
      }));
    } catch (error) {
      logger.error(`[MarketData] Error getting historical data for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Search for trading symbols
   */
  async searchSymbols(query: string): Promise<
    Array<{
      symbol: string;
      name: string;
      type: string;
      epic?: string;
    }>
  > {
    try {
      if (!this.capitalApi) {
        throw new Error("Market data service not initialized");
      }

      const markets = await this.capitalApi.searchMarkets(query);

      return markets.map((market) => ({
        symbol: market.epic,
        name: market.instrumentName,
        type: market.instrumentType,
        epic: market.epic,
      }));
    } catch (error) {
      logger.error(`[MarketData] Error searching symbols for "${query}":`, error);
      return [];
    }
  }

  /**
   * Get market status for a symbol
   */
  async getMarketStatus(symbol: string): Promise<{
    isOpen: boolean;
    status: string;
    nextOpen?: Date;
    nextClose?: Date;
  }> {
    try {
      if (!this.capitalApi) {
        throw new Error("Market data service not initialized");
      }

      const epic = (await this.capitalApi.getEpicForSymbol(symbol)) || symbol;
      const marketData = await this.capitalApi.getMarketData(epic);

      return {
        isOpen: marketData.marketStatus === "TRADEABLE",
        status: marketData.marketStatus,
      };
    } catch (error) {
      logger.error(`[MarketData] Error getting market status for ${symbol}:`, error);
      return {
        isOpen: false,
        status: "UNKNOWN",
      };
    }
  }

  /**
   * Get subscription statistics
   */
  getSubscriptionStats(): {
    activeSubscriptions: number;
    monitoredSymbols: string[];
    cacheSize: number;
  } {
    return {
      activeSubscriptions: this.subscriptions.size,
      monitoredSymbols: Array.from(this.subscriptions.keys()),
      cacheSize: this.priceCache.size,
    };
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.priceCache.clear();
    this.cache.clear();
    logger.info("[MarketData] All caches cleared");
  }

  /**
   * Cleanup - stop all monitoring and clear resources
   */
  cleanup(): void {
    this.stopAllPriceMonitoring();
    this.clearCache();
    this.removeAllListeners();
    logger.info("[MarketData] Service cleanup completed");
  }
}

// Export singleton instance
export const marketDataService = new MarketDataService();
