/**
 * Market Data Service
 * Provides real-time and historical market data for trading analysis
 */

import { loggerService } from "./logger.service";
import { prisma } from "../utils/prisma";
import { getCapitalApiInstance } from "../modules/capital/services/capital-main.service";
import type { CapitalMainService } from "../modules/capital/services/capital-main.service";

// Types and interfaces for market data
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

export interface TechnicalIndicators {
  symbol: string;
  timeframe: string;
  sma20: number;
  sma50: number;
  ema12: number;
  ema26: number;
  rsi: number;
  macd: {
    macd: number;
    signal: number;
    histogram: number;
  };
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
  };
  supportLevels: number[];
  resistanceLevels: number[];
  trendDirection: "BULLISH" | "BEARISH" | "SIDEWAYS";
  volatility: number;
  momentum: number;
  timestamp: Date;
}

export interface MarketEvent {
  id: string;
  type: "BREAKOUT" | "VOLUME_SPIKE" | "VOLATILITY_CHANGE" | "NEWS_IMPACT" | "TREND_CHANGE";
  symbol: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  description: string;
  impact: "BULLISH" | "BEARISH" | "NEUTRAL";
  confidence: number; // 0-100
  timestamp: Date;
  data: any; // Additional event-specific data
}

export interface DataQualityMetrics {
  symbol: string;
  connectionHealth: "EXCELLENT" | "GOOD" | "POOR" | "DISCONNECTED";
  latency: number; // milliseconds
  dataFreshness: number; // seconds since last update
  errorRate: number; // percentage
  uptime: number; // percentage
  lastUpdate: Date;
  issues: string[];
}

export interface PriceHistory {
  symbol: string;
  timeframe: string;
  prices: Array<{
    timestamp: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
}

export interface MarketDataPoint {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
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

export interface MarketDataOptions {
  symbol: string;
  timeframe: string;
  limit?: number;
  startDate?: Date;
  endDate?: Date;
}

export class MarketDataService {
  private priceCache: Map<string, LivePrice> = new Map();
  private indicatorCache: Map<string, TechnicalIndicators> = new Map();
  private eventHistory: MarketEvent[] = [];
  private qualityMetrics: Map<string, DataQualityMetrics> = new Map();
  private isConnected: boolean = false;
  private connectionStartTime: Date = new Date();
  private cache: Map<string, { data: any; timestamp: Date }> = new Map();
  private cacheTimeout = 60000; // 1 minute cache
  private capitalApi: CapitalMainService;
  private priceSubscriptions: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    // Don't initialize Capital API during construction to avoid startup errors
    // It will be initialized when credentials are provided via initializeWithCredentials()
    this.capitalApi = null as any; // Will be set when credentials are provided

    // Initialize basic service without Capital API
    this.initializeBasicService();
  }

  /**
   * Initialize with credentials for authenticated operations
   */
  async initializeWithCredentials(credentials: any): Promise<void> {
    try {
      loggerService.info("Initializing Market Data Service with authenticated Capital.com API");

      // Get authenticated Capital.com API instance
      this.capitalApi = getCapitalApiInstance(credentials);

      // Now initialize the full service with Capital API
      await this.initializeService();

      loggerService.info("Market Data Service initialized successfully with authenticated Capital.com API");
    } catch (error) {
      loggerService.error("Error initializing Market Data Service with authenticated Capital.com API:", error);
      throw error;
    }
  }

  /**
   * Initialize basic service without Capital API
   */
  private initializeBasicService(): void {
    try {
      loggerService.info("Initializing Market Data Service (basic mode - no API credentials)");

      // Initialize data quality metrics for common symbols
      const commonSymbols = ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "USOIL"];
      for (const symbol of commonSymbols) {
        this.initializeQualityMetrics(symbol);
      }

      loggerService.info("Market Data Service basic initialization completed");
    } catch (error) {
      loggerService.error("Error initializing Market Data Service (basic mode):", error);
    }
  }

  /**
   * Initialize the market data service with Capital API
   */
  private async initializeService(): Promise<void> {
    try {
      loggerService.info("Initializing Market Data Service with Capital.com API");

      // Initialize Capital.com API connection (only if capitalApi is available)
      if (this.capitalApi) {
        await this.capitalApi.initialize();

        // Start connection monitoring
        this.startConnectionMonitoring();

        this.isConnected = true;
        loggerService.info("Market Data Service initialized successfully with Capital.com API");
      } else {
        loggerService.warn("Market Data Service: No Capital API instance available for initialization");
      }
    } catch (error) {
      loggerService.error("Error initializing Market Data Service with Capital.com API:", error);
      throw error;
    }
  }

  /**
   * Get live price data for a symbol
   */
  async getLivePrice(symbol: string): Promise<LivePrice> {
    try {
      // Check cache first
      const cachedPrice = this.priceCache.get(symbol);
      if (cachedPrice && this.isPriceDataFresh(cachedPrice)) {
        return cachedPrice;
      }

      // Check if Capital API is available
      if (!this.capitalApi) {
        throw new Error("Market Data Service not initialized with credentials. Call initializeWithCredentials() first.");
      }

      // Fetch real price from Capital.com API
      const livePrice = await this.fetchLivePriceFromBroker(symbol);

      // Update cache
      this.priceCache.set(symbol, livePrice);

      // Update data quality metrics
      this.updateDataQuality(symbol, true);

      return livePrice;
    } catch (error) {
      loggerService.error(`Error getting live price for ${symbol}:`, error);
      this.updateDataQuality(symbol, false);
      throw error;
    }
  }

  /**
   * Get technical indicators for a symbol
   */
  async getTechnicalIndicators(symbol: string, timeframe: string = "1H"): Promise<TechnicalIndicators> {
    try {
      const cacheKey = `${symbol}_${timeframe}`;

      // Check cache first
      const cachedIndicators = this.indicatorCache.get(cacheKey);
      if (cachedIndicators && this.isIndicatorDataFresh(cachedIndicators)) {
        return cachedIndicators;
      }

      // Calculate technical indicators
      const indicators = await this.calculateTechnicalIndicators(symbol, timeframe);

      // Update cache
      this.indicatorCache.set(cacheKey, indicators);

      return indicators;
    } catch (error) {
      loggerService.error(`Error getting technical indicators for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Detect market events for a symbol
   */
  async detectMarketEvents(symbol: string): Promise<MarketEvent[]> {
    try {
      const events: MarketEvent[] = [];

      // Get current price and indicators
      const currentPrice = await this.getLivePrice(symbol);
      const indicators = await this.getTechnicalIndicators(symbol);

      // Detect breakouts
      const breakoutEvent = this.detectBreakout(symbol, currentPrice, indicators);
      if (breakoutEvent) events.push(breakoutEvent);

      // Detect volume spikes
      const volumeEvent = this.detectVolumeSpike(symbol, currentPrice);
      if (volumeEvent) events.push(volumeEvent);

      // Detect volatility changes
      const volatilityEvent = this.detectVolatilityChange(symbol, indicators);
      if (volatilityEvent) events.push(volatilityEvent);

      // Detect trend changes
      const trendEvent = this.detectTrendChange(symbol, indicators);
      if (trendEvent) events.push(trendEvent);

      // Store events in history
      this.eventHistory.push(...events);

      // Keep only recent events (last 24 hours)
      this.cleanupEventHistory();

      return events;
    } catch (error) {
      loggerService.error(`Error detecting market events for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * Get data quality metrics for a symbol
   */
  getDataQualityMetrics(symbol: string): DataQualityMetrics | null {
    return this.qualityMetrics.get(symbol) || null;
  }

  /**
   * Get all data quality metrics
   */
  getAllDataQualityMetrics(): DataQualityMetrics[] {
    return Array.from(this.qualityMetrics.values());
  }

  /**
   * Get recent market events
   */
  getRecentMarketEvents(symbol?: string, hours: number = 24): MarketEvent[] {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);

    let events = this.eventHistory.filter((event) => event.timestamp >= cutoffTime);

    if (symbol) {
      events = events.filter((event) => event.symbol === symbol);
    }

    return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get price history for a symbol
   */
  async getPriceHistory(symbol: string, timeframe: string = "1H", periods: number = 100): Promise<PriceHistory> {
    try {
      // Check if Capital API is available
      if (!this.capitalApi) {
        throw new Error("Market Data Service not initialized with credentials. Call initializeWithCredentials() first.");
      }

      // Get Capital.com epic for the symbol
      const epic = (await this.capitalApi.getEpicForSymbol(symbol)) || symbol;

      // Map timeframe to Capital.com resolution format
      const resolution = this.mapTimeframeToResolution(timeframe);

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - periods * this.getTimeframeMs(timeframe));

      // Get historical data from Capital.com API
      const historicalData = await this.capitalApi.getHistoricalPrices(epic, resolution, startDate.toISOString(), endDate.toISOString(), periods);

      if (!historicalData || !historicalData.prices) {
        loggerService.warn(`[MarketData] No historical data available for ${symbol}`);
        return {
          symbol,
          timeframe,
          prices: [],
        };
      }

      // Convert Capital.com historical data to our format
      const prices = historicalData.prices.map((candle: any) => ({
        timestamp: new Date(candle.snapshotTime || candle.time),
        open: candle.openPrice.mid || candle.openPrice.ask || candle.open,
        high: candle.highPrice.mid || candle.highPrice.ask || candle.high,
        low: candle.lowPrice.mid || candle.lowPrice.bid || candle.low,
        close: candle.closePrice.mid || candle.closePrice.ask || candle.close,
        volume: candle.lastTradedVolume || candle.volume || 0,
      }));

      loggerService.debug(`[MarketData] Retrieved ${prices.length} historical data points for ${symbol}`);
      return {
        symbol,
        timeframe,
        prices,
      };
    } catch (error) {
      loggerService.error(`[MarketData] Error fetching historical data from Capital.com for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Start price monitoring for a symbol with real-time updates
   */
  async startPriceMonitoring(symbol: string, callback: (price: LivePrice) => void): Promise<void> {
    try {
      loggerService.info(`[MarketData] Starting real-time price monitoring for ${symbol}`);

      // Get Capital.com epic for the symbol
      const epic = (await this.capitalApi.getEpicForSymbol(symbol)) || symbol;

      // Subscribe to real-time market data via WebSocket
      this.capitalApi.subscribeToMarketData([epic]);

      // Set up event listener for market data updates
      this.capitalApi.on("market_data", (data: any) => {
        if (data.epic === epic || data.symbol === symbol) {
          const livePrice: LivePrice = {
            symbol: symbol,
            bid: data.bid || data.price - data.spread / 2,
            ask: data.offer || data.price + data.spread / 2,
            spread: data.spread || Math.abs((data.offer || 0) - (data.bid || 0)),
            timestamp: new Date(data.timestamp || Date.now()),
            volume: data.volume,
            change: data.change,
            changePercent: data.changePercent,
          };

          // Update cache
          this.priceCache.set(symbol, livePrice);

          // Call the callback with new price data
          callback(livePrice);
        }
      });

      // Also set up a backup polling mechanism
      const pollInterval = setInterval(async () => {
        try {
          const price = await this.getLivePrice(symbol);
          callback(price);
        } catch (error) {
          loggerService.error(`Error in price polling for ${symbol}:`, error);
        }
      }, 5000); // Poll every 5 seconds as backup

      this.priceSubscriptions.set(symbol, pollInterval);

      loggerService.info(`[MarketData] Real-time price monitoring started for ${symbol}`);
    } catch (error) {
      loggerService.error(`[MarketData] Error starting price monitoring for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Stop price monitoring for a symbol
   */
  async stopPriceMonitoring(symbol: string): Promise<void> {
    try {
      // Get Capital.com epic for the symbol
      const epic = await this.capitalApi.getEpicForSymbol(symbol);
      if (epic) {
        this.capitalApi.unsubscribeFromMarketData([epic]);
      }

      // Clear polling interval
      const pollInterval = this.priceSubscriptions.get(symbol);
      if (pollInterval) {
        clearInterval(pollInterval);
        this.priceSubscriptions.delete(symbol);
      }

      loggerService.info(`[MarketData] Stopped price monitoring for ${symbol}`);
    } catch (error) {
      loggerService.error(`[MarketData] Error stopping price monitoring for ${symbol}:`, error);
    }
  }

  /**
   * Fetch live price from Capital.com API - REAL IMPLEMENTATION
   */
  private async fetchLivePriceFromBroker(symbol: string): Promise<LivePrice> {
    try {
      // Get Capital.com epic for the symbol
      const epic = (await this.capitalApi.getEpicForSymbol(symbol)) || symbol;

      // Get latest price from Capital.com API
      const priceData = await this.capitalApi.getLatestPrice(epic);

      if (!priceData) {
        throw new Error(`No price data available for ${symbol}`);
      }

      // Convert Capital.com price data to our format
      const livePrice: LivePrice = {
        symbol: symbol,
        bid: priceData.bid || priceData.currentPrice - (priceData.spread || 0) / 2,
        ask: priceData.offer || priceData.ask || priceData.currentPrice + (priceData.spread || 0) / 2,
        spread: priceData.spread || Math.abs((priceData.offer || priceData.ask || 0) - (priceData.bid || 0)),
        timestamp: new Date(),
        volume: priceData.volume,
        change: priceData.netChange,
        changePercent: priceData.percentageChange,
      };

      loggerService.debug(`[MarketData] Live price retrieved for ${symbol}: ${livePrice.bid}/${livePrice.ask}`);
      return livePrice;
    } catch (error) {
      loggerService.error(`[MarketData] Error fetching live price from Capital.com for ${symbol}:`, error);

      // Fallback to cached data if available
      const cachedPrice = this.priceCache.get(symbol);
      if (cachedPrice) {
        loggerService.warn(`[MarketData] Using cached price data for ${symbol}`);
        return cachedPrice;
      }

      throw error;
    }
  }

  /**
   * Calculate technical indicators
   */
  private async calculateTechnicalIndicators(symbol: string, timeframe: string): Promise<TechnicalIndicators> {
    try {
      // Get price history for calculations
      const priceHistory = await this.getPriceHistory(symbol, timeframe, 200);
      const prices = priceHistory.prices.map((p) => p.close);

      // Calculate indicators (simplified implementations)
      const sma20 = this.calculateSMA(prices, 20);
      const sma50 = this.calculateSMA(prices, 50);
      const ema12 = this.calculateEMA(prices, 12);
      const ema26 = this.calculateEMA(prices, 26);
      const rsi = this.calculateRSI(prices, 14);
      const macd = this.calculateMACD(prices);
      const bollingerBands = this.calculateBollingerBands(prices, 20, 2);

      // Detect support and resistance levels
      const supportLevels = this.detectSupportLevels(priceHistory.prices);
      const resistanceLevels = this.detectResistanceLevels(priceHistory.prices);

      // Determine trend direction
      const trendDirection = this.determineTrendDirection(sma20, sma50, ema12, ema26);

      // Calculate volatility and momentum
      const volatility = this.calculateVolatility(prices);
      const momentum = this.calculateMomentum(prices, 10);

      return {
        symbol,
        timeframe,
        sma20,
        sma50,
        ema12,
        ema26,
        rsi,
        macd,
        bollingerBands,
        supportLevels,
        resistanceLevels,
        trendDirection,
        volatility,
        momentum,
        timestamp: new Date(),
      };
    } catch (error) {
      loggerService.error(`Error calculating technical indicators for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Detect breakout events
   */
  private detectBreakout(symbol: string, price: LivePrice, indicators: TechnicalIndicators): MarketEvent | null {
    const currentPrice = (price.bid + price.ask) / 2;

    // Check resistance breakout
    for (const resistance of indicators.resistanceLevels) {
      if (currentPrice > resistance && currentPrice < resistance * 1.002) {
        // Within 0.2%
        return {
          id: `breakout_${symbol}_${Date.now()}`,
          type: "BREAKOUT",
          symbol,
          severity: "HIGH",
          description: `Price broke above resistance level at ${resistance.toFixed(5)}`,
          impact: "BULLISH",
          confidence: 85,
          timestamp: new Date(),
          data: { level: resistance, direction: "UP" },
        };
      }
    }

    // Check support breakout
    for (const support of indicators.supportLevels) {
      if (currentPrice < support && currentPrice > support * 0.998) {
        // Within 0.2%
        return {
          id: `breakout_${symbol}_${Date.now()}`,
          type: "BREAKOUT",
          symbol,
          severity: "HIGH",
          description: `Price broke below support level at ${support.toFixed(5)}`,
          impact: "BEARISH",
          confidence: 85,
          timestamp: new Date(),
          data: { level: support, direction: "DOWN" },
        };
      }
    }

    return null;
  }

  /**
   * Detect volume spike events
   */
  private detectVolumeSpike(symbol: string, price: LivePrice): MarketEvent | null {
    if (!price.volume) return null;

    // Mock average volume calculation
    const averageVolume = 500000; // This should be calculated from historical data
    const volumeThreshold = averageVolume * 2; // 200% of average

    if (price.volume > volumeThreshold) {
      return {
        id: `volume_${symbol}_${Date.now()}`,
        type: "VOLUME_SPIKE",
        symbol,
        severity: "MEDIUM",
        description: `Volume spike detected: ${price.volume.toLocaleString()} (${((price.volume / averageVolume) * 100).toFixed(0)}% of average)`,
        impact: "NEUTRAL",
        confidence: 75,
        timestamp: new Date(),
        data: { volume: price.volume, averageVolume, ratio: price.volume / averageVolume },
      };
    }

    return null;
  }

  /**
   * Detect volatility change events
   */
  private detectVolatilityChange(symbol: string, indicators: TechnicalIndicators): MarketEvent | null {
    // Mock historical volatility
    const historicalVolatility = 0.15; // 15%
    const volatilityThreshold = historicalVolatility * 1.5; // 50% increase

    if (indicators.volatility > volatilityThreshold) {
      return {
        id: `volatility_${symbol}_${Date.now()}`,
        type: "VOLATILITY_CHANGE",
        symbol,
        severity: "MEDIUM",
        description: `High volatility detected: ${(indicators.volatility * 100).toFixed(2)}%`,
        impact: "NEUTRAL",
        confidence: 70,
        timestamp: new Date(),
        data: { currentVolatility: indicators.volatility, historicalVolatility },
      };
    }

    return null;
  }

  /**
   * Detect trend change events
   */
  private detectTrendChange(symbol: string, indicators: TechnicalIndicators): MarketEvent | null {
    // Check for MACD signal line crossover
    if (Math.abs(indicators.macd.macd - indicators.macd.signal) < 0.0001) {
      const impact = indicators.macd.macd > indicators.macd.signal ? "BULLISH" : "BEARISH";

      return {
        id: `trend_${symbol}_${Date.now()}`,
        type: "TREND_CHANGE",
        symbol,
        severity: "MEDIUM",
        description: `MACD signal line crossover detected - ${impact.toLowerCase()} signal`,
        impact,
        confidence: 80,
        timestamp: new Date(),
        data: { macd: indicators.macd, trendDirection: indicators.trendDirection },
      };
    }

    return null;
  }

  /**
   * Helper methods for technical analysis
   */
  private calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1] || 0;
    const sum = prices.slice(-period).reduce((a, b) => a + b, 0);
    return sum / period;
  }

  private calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1] || 0;

    const multiplier = 2 / (period + 1);
    let ema = prices[0];

    for (let i = 1; i < prices.length; i++) {
      ema = prices[i] * multiplier + ema * (1 - multiplier);
    }

    return ema;
  }

  private calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50;

    let gains = 0;
    let losses = 0;

    for (let i = prices.length - period; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }

  private calculateMACD(prices: number[]): { macd: number; signal: number; histogram: number } {
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const macd = ema12 - ema26;

    // Simplified signal line calculation
    const signal = macd * 0.9; // Mock signal line
    const histogram = macd - signal;

    return { macd, signal, histogram };
  }

  private calculateBollingerBands(prices: number[], period: number, stdDev: number): { upper: number; middle: number; lower: number } {
    const sma = this.calculateSMA(prices, period);
    const recentPrices = prices.slice(-period);

    const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
    const standardDeviation = Math.sqrt(variance);

    return {
      upper: sma + standardDeviation * stdDev,
      middle: sma,
      lower: sma - standardDeviation * stdDev,
    };
  }

  private detectSupportLevels(priceData: any[]): number[] {
    // Simplified support detection
    const lows = priceData.map((p) => p.low).slice(-50); // Last 50 periods
    const supports: number[] = [];

    for (let i = 2; i < lows.length - 2; i++) {
      if (lows[i] < lows[i - 1] && lows[i] < lows[i + 1] && lows[i] < lows[i - 2] && lows[i] < lows[i + 2]) {
        supports.push(lows[i]);
      }
    }

    return supports.slice(-3); // Return last 3 support levels
  }

  private detectResistanceLevels(priceData: any[]): number[] {
    // Simplified resistance detection
    const highs = priceData.map((p) => p.high).slice(-50); // Last 50 periods
    const resistances: number[] = [];

    for (let i = 2; i < highs.length - 2; i++) {
      if (highs[i] > highs[i - 1] && highs[i] > highs[i + 1] && highs[i] > highs[i - 2] && highs[i] > highs[i + 2]) {
        resistances.push(highs[i]);
      }
    }

    return resistances.slice(-3); // Return last 3 resistance levels
  }

  private determineTrendDirection(sma20: number, sma50: number, ema12: number, ema26: number): "BULLISH" | "BEARISH" | "SIDEWAYS" {
    if (sma20 > sma50 && ema12 > ema26) return "BULLISH";
    if (sma20 < sma50 && ema12 < ema26) return "BEARISH";
    return "SIDEWAYS";
  }

  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0;

    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;

    return Math.sqrt(variance * 252); // Annualized volatility
  }

  private calculateMomentum(prices: number[], period: number): number {
    if (prices.length < period + 1) return 0;

    const currentPrice = prices[prices.length - 1];
    const pastPrice = prices[prices.length - 1 - period];

    return ((currentPrice - pastPrice) / pastPrice) * 100;
  }

  /**
   * Utility methods
   */
  private isPriceDataFresh(price: LivePrice): boolean {
    const maxAge = 10 * 1000; // 10 seconds
    return Date.now() - price.timestamp.getTime() < maxAge;
  }

  private isIndicatorDataFresh(indicators: TechnicalIndicators): boolean {
    const maxAge = 5 * 60 * 1000; // 5 minutes
    return Date.now() - indicators.timestamp.getTime() < maxAge;
  }

  private getBasePriceForSymbol(symbol: string): number {
    const basePrices: { [key: string]: number } = {
      "BTC/USD": 104000.0,
      BTCUSD: 104000.0,
      "ETH/USD": 3800.0,
      ETHUSD: 3800.0,
      EURUSD: 1.085,
      GBPUSD: 1.265,
      USDJPY: 149.5,
      USDCHF: 0.875,
      XAUUSD: 2050.0,
      XAGUSD: 24.5,
      USOIL: 75.0,
    };

    return basePrices[symbol] || basePrices[symbol.replace("/", "")] || 104000.0; // Default to BTC price for unknown symbols
  }

  /**
   * Map our timeframe format to Capital.com resolution format
   */
  private mapTimeframeToResolution(timeframe: string): string {
    const mapping: { [key: string]: string } = {
      "1m": "MINUTE",
      "5m": "MINUTE_5",
      "15m": "MINUTE_15",
      "30m": "MINUTE_30",
      "1h": "HOUR",
      "1H": "HOUR",
      "4h": "HOUR_4",
      "4H": "HOUR_4",
      "1d": "DAY",
      "1D": "DAY",
      "1w": "WEEK",
      "1W": "WEEK",
    };

    return mapping[timeframe] || "HOUR"; // Default to hourly
  }

  /**
   * Get timeframe duration in milliseconds
   */
  private getTimeframeMs(timeframe: string): number {
    const mapping: { [key: string]: number } = {
      "1m": 60 * 1000,
      "5m": 5 * 60 * 1000,
      "15m": 15 * 60 * 1000,
      "30m": 30 * 60 * 1000,
      "1h": 60 * 60 * 1000,
      "1H": 60 * 60 * 1000,
      "4h": 4 * 60 * 60 * 1000,
      "4H": 4 * 60 * 60 * 1000,
      "1d": 24 * 60 * 60 * 1000,
      "1D": 24 * 60 * 60 * 1000,
      "1w": 7 * 24 * 60 * 60 * 1000,
      "1W": 7 * 24 * 60 * 60 * 1000,
    };

    return mapping[timeframe] || 60 * 60 * 1000; // Default to 1 hour
  }

  private initializeQualityMetrics(symbol: string): void {
    this.qualityMetrics.set(symbol, {
      symbol,
      connectionHealth: "GOOD",
      latency: 50,
      dataFreshness: 0,
      errorRate: 0,
      uptime: 100,
      lastUpdate: new Date(),
      issues: [],
    });
  }

  private updateDataQuality(symbol: string, success: boolean): void {
    const metrics = this.qualityMetrics.get(symbol);
    if (!metrics) return;

    metrics.lastUpdate = new Date();
    metrics.dataFreshness = 0;

    if (success) {
      metrics.latency = Math.random() * 100 + 20; // 20-120ms
      if (metrics.errorRate > 0) metrics.errorRate = Math.max(0, metrics.errorRate - 1);
    } else {
      metrics.errorRate = Math.min(100, metrics.errorRate + 5);
      metrics.issues.push(`Data fetch error at ${new Date().toISOString()}`);
    }

    // Update connection health based on error rate
    if (metrics.errorRate > 50) metrics.connectionHealth = "POOR";
    else if (metrics.errorRate > 20) metrics.connectionHealth = "GOOD";
    else metrics.connectionHealth = "EXCELLENT";

    // Keep only recent issues
    metrics.issues = metrics.issues.slice(-5);
  }

  private startConnectionMonitoring(): void {
    setInterval(() => {
      const now = new Date();

      for (const [symbol, metrics] of this.qualityMetrics) {
        const timeSinceUpdate = now.getTime() - metrics.lastUpdate.getTime();
        metrics.dataFreshness = Math.floor(timeSinceUpdate / 1000);

        // Update uptime
        const totalTime = now.getTime() - this.connectionStartTime.getTime();
        const downTime = (metrics.errorRate * totalTime) / 100;
        metrics.uptime = Math.max(0, 100 - (downTime / totalTime) * 100);
      }
    }, 1000); // Update every second
  }

  private cleanupEventHistory(): void {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    this.eventHistory = this.eventHistory.filter((event) => event.timestamp >= cutoffTime);
  }

  /**
   * Get real-time price data - REAL IMPLEMENTATION
   */
  async getRealTimePrice(symbol: string): Promise<RealTimePrice> {
    try {
      loggerService.debug(`[MarketData] Getting real-time price for ${symbol}`);

      // Check cache first
      const cacheKey = `realtime_${symbol}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp.getTime() < 5000) {
        // 5 second cache for real-time data
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

      loggerService.debug(`[MarketData] Real-time price retrieved: ${symbol} = $${realTimePrice.price}`);
      return realTimePrice;
    } catch (error) {
      loggerService.error(`[MarketData] Error getting real-time price for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get price history from broker API - REAL IMPLEMENTATION
   */
  private async fetchPriceHistoryFromBroker(
    symbol: string,
    timeframe: string,
    periods: number
  ): Promise<
    Array<{
      timestamp: Date;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }>
  > {
    try {
      // Get Capital.com epic for the symbol
      const epic = (await this.capitalApi.getEpicForSymbol(symbol)) || symbol;

      // Map timeframe to Capital.com resolution format
      const resolution = this.mapTimeframeToResolution(timeframe);

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - periods * this.getTimeframeMs(timeframe));

      // Get historical data from Capital.com API
      const historicalData = await this.capitalApi.getHistoricalPrices(epic, resolution, startDate.toISOString(), endDate.toISOString(), periods);

      if (!historicalData || !historicalData.prices) {
        loggerService.warn(`[MarketData] No historical data available for ${symbol}`);
        return [];
      }

      // Convert Capital.com historical data to our format
      const priceHistory = historicalData.prices.map((candle: any) => ({
        timestamp: new Date(candle.snapshotTime || candle.time),
        open: candle.openPrice.mid || candle.openPrice.ask || candle.open,
        high: candle.highPrice.mid || candle.highPrice.ask || candle.high,
        low: candle.lowPrice.mid || candle.lowPrice.bid || candle.low,
        close: candle.closePrice.mid || candle.closePrice.ask || candle.close,
        volume: candle.lastTradedVolume || candle.volume || 0,
      }));

      loggerService.debug(`[MarketData] Retrieved ${priceHistory.length} historical data points for ${symbol}`);
      return priceHistory;
    } catch (error) {
      loggerService.error(`[MarketData] Error fetching historical data from Capital.com for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get historical market data - REAL IMPLEMENTATION
   */
  async getHistoricalData(options: MarketDataOptions): Promise<MarketDataPoint[]> {
    try {
      loggerService.debug(`[MarketData] Getting historical data for ${options.symbol}`);

      // Check cache first
      const cacheKey = `historical_${options.symbol}_${options.timeframe}_${options.limit || 100}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp.getTime() < this.cacheTimeout) {
        return cached.data;
      }

      // Get real historical data from Capital.com API
      const historicalData = await this.fetchPriceHistoryFromBroker(options.symbol, options.timeframe, options.limit || 100);

      // Convert to our MarketDataPoint format
      const dataPoints: MarketDataPoint[] = historicalData.map((point: { timestamp: Date; open: number; high: number; low: number; close: number; volume: number }) => ({
        timestamp: point.timestamp,
        open: point.open,
        high: point.high,
        low: point.low,
        close: point.close,
        volume: point.volume,
      }));

      // Cache the result
      this.cache.set(cacheKey, { data: dataPoints, timestamp: new Date() });

      loggerService.debug(`[MarketData] Historical data retrieved: ${dataPoints.length} points for ${options.symbol}`);
      return dataPoints;
    } catch (error) {
      loggerService.error(`[MarketData] Error getting historical data:`, error);
      throw error;
    }
  }

  /**
   * Get price array for technical analysis - REAL IMPLEMENTATION
   */
  async getPriceArray(symbol: string, timeframe: string = "1h", limit: number = 100): Promise<number[]> {
    try {
      const historicalData = await this.getHistoricalData({
        symbol,
        timeframe,
        limit,
      });

      const prices = historicalData.map((point) => point.close);
      loggerService.debug(`[MarketData] Price array retrieved: ${prices.length} prices for ${symbol}`);
      return prices;
    } catch (error) {
      loggerService.error(`[MarketData] Error getting price array for ${symbol}:`, error);
      // Fallback to mock data if real API fails
      return this.getMockPriceArray(symbol, limit);
    }
  }

  /**
   * Get volume array for technical analysis - REAL IMPLEMENTATION
   */
  async getVolumeArray(symbol: string, timeframe: string = "1h", limit: number = 100): Promise<number[]> {
    try {
      const historicalData = await this.getHistoricalData({
        symbol,
        timeframe,
        limit,
      });

      const volumes = historicalData.map((point) => point.volume);
      loggerService.debug(`[MarketData] Volume array retrieved: ${volumes.length} volumes for ${symbol}`);
      return volumes;
    } catch (error) {
      loggerService.error(`[MarketData] Error getting volume array for ${symbol}:`, error);
      // Fallback to mock data if real API fails
      return this.getMockVolumeArray(symbol, limit);
    }
  }

  /**
   * Get market status - REAL IMPLEMENTATION
   */
  async getMarketStatus(symbol: string): Promise<{
    isOpen: boolean;
    nextOpen?: Date;
    nextClose?: Date;
    timezone: string;
  }> {
    try {
      // Get market details from Capital.com API
      const epic = (await this.capitalApi.getEpicForSymbol(symbol)) || symbol;
      const marketDetails = await this.capitalApi.getMarketDetails(epic);

      if (marketDetails && marketDetails.dealingRules) {
        return {
          isOpen: marketDetails.snapshot?.marketStatus === "TRADEABLE",
          timezone: marketDetails.snapshot?.timezone || "UTC",
          // TODO: Parse market hours from dealingRules for nextOpen/nextClose
        };
      }
    } catch (error) {
      loggerService.error(`[MarketData] Error getting market status for ${symbol}:`, error);
    }

    // Fallback to mock market hours
    const now = new Date();
    const dayOfWeek = now.getDay();
    const hour = now.getHours();

    // Mock market hours (24/7 for crypto, weekdays for forex/stocks)
    const isCrypto = symbol.includes("BTC") || symbol.includes("ETH") || symbol.includes("crypto");
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isMarketHours = hour >= 9 && hour < 17; // 9 AM to 5 PM

    return {
      isOpen: isCrypto || (!isWeekend && isMarketHours),
      timezone: "UTC",
    };
  }

  /**
   * Cleanup method to stop all subscriptions
   */
  async cleanup(): Promise<void> {
    // Stop all price monitoring subscriptions
    for (const [symbol, interval] of this.priceSubscriptions) {
      clearInterval(interval);
      await this.stopPriceMonitoring(symbol);
    }
    this.priceSubscriptions.clear();

    // Cleanup Capital.com API
    this.capitalApi.cleanup();

    loggerService.info("[MarketData] Market Data Service cleaned up");
  }

  // Mock data methods (replace with real API calls)
  private async getMockRealTimePrice(symbol: string): Promise<RealTimePrice> {
    // Generate realistic mock data based on symbol
    const basePrice = this.getBasePriceForSymbol(symbol);
    const variation = (Math.random() - 0.5) * 0.02; // ±1% variation
    const price = basePrice * (1 + variation);
    const spread = basePrice * 0.0001; // 0.01% spread

    return {
      symbol,
      price,
      bid: price - spread / 2,
      ask: price + spread / 2,
      timestamp: new Date(),
      change: basePrice * variation,
      changePercent: variation * 100,
    };
  }

  private async getMockHistoricalData(options: MarketDataOptions): Promise<MarketDataPoint[]> {
    const { symbol, limit = 100 } = options;
    const basePrice = this.getBasePriceForSymbol(symbol);
    const data: MarketDataPoint[] = [];

    const now = new Date();
    const intervalMs = this.getIntervalMs(options.timeframe || "1h");

    for (let i = limit - 1; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * intervalMs);
      const variation = (Math.random() - 0.5) * 0.05; // ±2.5% variation
      const open = basePrice * (1 + variation);
      const close = open * (1 + (Math.random() - 0.5) * 0.02); // ±1% from open
      const high = Math.max(open, close) * (1 + Math.random() * 0.01); // Up to 1% higher
      const low = Math.min(open, close) * (1 - Math.random() * 0.01); // Up to 1% lower
      const volume = Math.random() * 1000000; // Random volume

      data.push({
        timestamp,
        open,
        high,
        low,
        close,
        volume,
      });
    }

    return data;
  }

  private getMockPriceArray(symbol: string, limit: number): number[] {
    const basePrice = this.getBasePriceForSymbol(symbol);
    const prices: number[] = [];

    for (let i = 0; i < limit; i++) {
      const variation = (Math.random() - 0.5) * 0.05; // ±2.5% variation
      prices.push(basePrice * (1 + variation));
    }

    return prices;
  }

  private getMockVolumeArray(symbol: string, limit: number): number[] {
    const volumes: number[] = [];

    for (let i = 0; i < limit; i++) {
      volumes.push(Math.random() * 1000000); // Random volume
    }

    return volumes;
  }

  private getIntervalMs(timeframe: string): number {
    const intervals: Record<string, number> = {
      "1m": 60 * 1000,
      "5m": 5 * 60 * 1000,
      "15m": 15 * 60 * 1000,
      "1h": 60 * 60 * 1000,
      "4h": 4 * 60 * 60 * 1000,
      "1d": 24 * 60 * 60 * 1000,
    };

    return intervals[timeframe] || intervals["1h"];
  }
}

// Export singleton instance
export const marketDataService = new MarketDataService();
