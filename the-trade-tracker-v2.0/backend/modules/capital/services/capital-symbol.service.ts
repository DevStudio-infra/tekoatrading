import { loggerService } from "../../../services/logger.service";
import { CapitalBaseService } from "./capital-base.service";
import { CapitalAuthConfig } from "../interfaces/capital-session.interface";

/**
 * SIMPLIFIED Symbol Service - Direct lookup table + API testing
 * No more complex normalization that causes mapping disasters
 */
export class CapitalSymbolService extends CapitalBaseService {
  // Simple mapping cache: symbol -> epic
  private symbolToEpicCache: Map<string, string> = new Map();

  // Known working mappings (manually curated with CORRECT Capital.com epic formats)
  private knownMappings: Map<string, string> = new Map([
    // Crypto pairs - CORRECT Capital.com epic formats
    ["BTC", "CS.D.BITCOIN.CFD.IP"],
    ["BTC/USD", "CS.D.BITCOIN.CFD.IP"],
    ["BITCOIN", "CS.D.BITCOIN.CFD.IP"],
    ["BTCUSD", "CS.D.BITCOIN.CFD.IP"],

    ["ETH", "CS.D.ETHEREUM.CFD.IP"],
    ["ETH/USD", "CS.D.ETHEREUM.CFD.IP"],
    ["ETHEREUM", "CS.D.ETHEREUM.CFD.IP"],
    ["ETHUSD", "CS.D.ETHEREUM.CFD.IP"],

    ["LTC", "CS.D.LITECOIN.CFD.IP"],
    ["LTC/USD", "CS.D.LITECOIN.CFD.IP"],
    ["LITECOIN", "CS.D.LITECOIN.CFD.IP"],
    ["LTCUSD", "CS.D.LITECOIN.CFD.IP"],

    // Index pairs - CORRECT Capital.com epic formats
    ["SPX500", "CS.D.SPXUSD.CFD.IP"],
    ["S&P500", "CS.D.SPXUSD.CFD.IP"],
    ["SP500", "CS.D.SPXUSD.CFD.IP"],
    ["US500", "CS.D.SPXUSD.CFD.IP"],

    ["NASDAQ", "CS.D.NQHUSD.CFD.IP"],
    ["NAS100", "CS.D.NQHUSD.CFD.IP"],
    ["NASDAQ100", "CS.D.NQHUSD.CFD.IP"],
    ["US100", "CS.D.NQHUSD.CFD.IP"],

    ["DOW", "CS.D.DJUSD.CFD.IP"],
    ["DOWJONES", "CS.D.DJUSD.CFD.IP"],
    ["US30", "CS.D.DJUSD.CFD.IP"],

    // Forex pairs - CORRECT Capital.com epic formats
    ["EUR/USD", "CS.D.EURUSD.MINI.IP"],
    ["EURUSD", "CS.D.EURUSD.MINI.IP"],

    ["GBP/USD", "CS.D.GBPUSD.MINI.IP"],
    ["GBPUSD", "CS.D.GBPUSD.MINI.IP"],

    ["USD/CAD", "CS.D.USDCAD.MINI.IP"],
    ["USDCAD", "CS.D.USDCAD.MINI.IP"],

    ["USD/JPY", "CS.D.USDJPY.MINI.IP"],
    ["USDJPY", "CS.D.USDJPY.MINI.IP"],

    ["AUD/USD", "CS.D.AUDUSD.MINI.IP"],
    ["AUDUSD", "CS.D.AUDUSD.MINI.IP"],

    // Commodities - CORRECT Capital.com epic formats
    ["GOLD", "CS.D.CFEGOLD.CFD.IP"],
    ["XAU/USD", "CS.D.CFEGOLD.CFD.IP"],
    ["XAUUSD", "CS.D.CFEGOLD.CFD.IP"],

    ["SILVER", "CS.D.CFESILVER.CFD.IP"],
    ["XAG/USD", "CS.D.CFESILVER.CFD.IP"],
    ["XAGUSD", "CS.D.CFESILVER.CFD.IP"],

    ["OIL", "CS.D.CFEOIL.CFD.IP"],
    ["CRUDE", "CS.D.CFEOIL.CFD.IP"],
    ["WTI", "CS.D.CFEOIL.CFD.IP"],

    // Stocks (these may be different, need to discover)
    ["AAPL", "AAPL"],
    ["GOOGL", "GOOGL"],
    ["MSFT", "MSFT"],
    ["TSLA", "TSLA"],
    ["AMZN", "AMZN"],
    ["NVDA", "NVDA"],
  ]);

  constructor(config: CapitalAuthConfig) {
    super(config);
  }

  /**
   * Get epic for symbol - SIMPLIFIED approach
   */
  async getEpicForSymbol(symbol: string): Promise<string | null> {
    if (!symbol?.trim()) {
      loggerService.warn("Empty symbol provided");
      return null;
    }

    const normalizedSymbol = symbol.trim().toUpperCase();
    loggerService.info(`[SIMPLE MAPPING] Looking for epic for: ${symbol} (normalized: ${normalizedSymbol})`);

    // 1. Check cache first
    if (this.symbolToEpicCache.has(normalizedSymbol)) {
      const cached = this.symbolToEpicCache.get(normalizedSymbol)!;
      loggerService.debug(`Found in cache: ${symbol} → ${cached}`);
      return cached;
    }

    // 2. Check known mappings
    if (this.knownMappings.has(normalizedSymbol)) {
      const mapped = this.knownMappings.get(normalizedSymbol)!;
      loggerService.info(`Found in known mappings: ${symbol} → ${mapped}`);

      // Test it works and cache it
      if (await this.testEpic(mapped)) {
        this.symbolToEpicCache.set(normalizedSymbol, mapped);
        return mapped;
      } else {
        loggerService.warn(`Known mapping ${symbol} → ${mapped} failed API test`);
      }
    }

    // 3. Try direct API test with variations
    const candidates = this.generateCandidates(symbol);
    loggerService.info(`Testing ${candidates.length} candidates for ${symbol}: ${candidates.join(", ")}`);

    for (const candidate of candidates) {
      if (await this.testEpic(candidate)) {
        loggerService.info(`✅ Found working epic: ${symbol} → ${candidate}`);
        this.symbolToEpicCache.set(normalizedSymbol, candidate);
        return candidate;
      }
    }

    loggerService.error(`❌ No working epic found for symbol: ${symbol}`);
    return null;
  }

  /**
   * Generate candidate epics to test
   */
  private generateCandidates(symbol: string): string[] {
    const normalized = symbol.trim().toUpperCase();
    const candidates: string[] = [];

    // Add the symbol as-is
    candidates.push(normalized);

    // Add common variations
    if (normalized.includes("/")) {
      // Remove slash: EUR/USD → EURUSD
      candidates.push(normalized.replace("/", ""));
    } else if (normalized.length === 6 && !normalized.includes("USD")) {
      // Add slash for 6-char symbols: EURUSD → EUR/USD
      candidates.push(normalized.slice(0, 3) + "/" + normalized.slice(3));
    }

    // Crypto-specific variations
    if (this.isCryptoSymbol(normalized)) {
      if (!normalized.includes("USD")) {
        candidates.push(normalized + "USD");
        candidates.push(normalized + "/USD");
      }
    }

    // Stock-specific variations (usually just the symbol)
    if (this.isStockSymbol(normalized)) {
      candidates.push(normalized);
    }

    // Remove duplicates
    return [...new Set(candidates)];
  }

  /**
   * Test if an epic works with the API
   */
  private async testEpic(epic: string): Promise<boolean> {
    try {
      await this.ensureAuthenticated();
      const response = await this.apiClient.get(`api/v1/markets/${encodeURIComponent(epic)}`);
      return response.status === 200 && response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        loggerService.debug(`Epic ${epic} not found (404)`);
        return false;
      }
      loggerService.debug(`Epic ${epic} test failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Simple crypto detection
   */
  private isCryptoSymbol(symbol: string): boolean {
    const cryptoSymbols = ["BTC", "ETH", "LTC", "XRP", "ADA", "SOL", "DOGE", "BITCOIN", "ETHEREUM", "LITECOIN"];
    return cryptoSymbols.some((crypto) => symbol.includes(crypto));
  }

  /**
   * Simple stock detection
   */
  private isStockSymbol(symbol: string): boolean {
    // Usually 1-5 characters, all letters
    return /^[A-Z]{1,5}$/.test(symbol);
  }

  /**
   * Get symbol for epic (reverse lookup)
   */
  async getSymbolForEpic(epic: string): Promise<string> {
    // Simple reverse lookup
    for (const [symbol, mappedEpic] of this.knownMappings) {
      if (mappedEpic === epic) {
        return symbol;
      }
    }

    // Check cache
    for (const [symbol, mappedEpic] of this.symbolToEpicCache) {
      if (mappedEpic === epic) {
        return symbol;
      }
    }

    // Return epic as-is if no mapping found
    return epic;
  }

  /**
   * Add a working mapping to cache
   */
  addMapping(symbol: string, epic: string): void {
    const normalized = symbol.trim().toUpperCase();
    this.symbolToEpicCache.set(normalized, epic);
    loggerService.info(`Added mapping to cache: ${symbol} → ${epic}`);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.symbolToEpicCache.clear();
    loggerService.info("Symbol cache cleared");
  }

  /**
   * Get cache stats
   */
  getCacheStats(): any {
    return {
      knownMappings: this.knownMappings.size,
      cachedMappings: this.symbolToEpicCache.size,
      totalMappings: this.knownMappings.size + this.symbolToEpicCache.size,
    };
  }

  /**
   * Initialize the service and optionally discover markets
   */
  async initializeAndDiscoverMarkets(): Promise<void> {
    try {
      await this.initialize();
      loggerService.info("✅ Symbol service initialized with correct Capital.com epic formats");
    } catch (error) {
      loggerService.error("Failed to initialize symbol service:", error);
    }
  }

  /**
   * No longer needed but keeping for compatibility
   */
  async fixCriticalSymbolMappings(): Promise<void> {
    this.clearCache();
    loggerService.info("Cache cleared - using simple direct mapping approach");
  }

  // Legacy methods for compatibility - simplified implementations
  async getMarketDetails(symbol: string): Promise<any> {
    const epic = await this.getEpicForSymbol(symbol);
    if (!epic) {
      throw new Error(`No epic found for symbol: ${symbol}`);
    }

    try {
      await this.ensureAuthenticated();
      const response = await this.apiClient.get(`api/v1/markets/${encodeURIComponent(epic)}`);
      return response.data;
    } catch (error) {
      loggerService.error(`Error getting market details for ${symbol}: ${error}`);
      throw error;
    }
  }

  async getSymbolsByType(instrumentType: string): Promise<string[]> {
    // Return known symbols of the requested type
    const symbols: string[] = [];

    for (const [symbol, epic] of this.knownMappings) {
      if (instrumentType === "CRYPTOCURRENCIES" && this.isCryptoSymbol(symbol)) {
        symbols.push(symbol);
      } else if (instrumentType === "CURRENCIES" && symbol.includes("/") && !this.isCryptoSymbol(symbol)) {
        symbols.push(symbol);
      } else if (instrumentType === "SHARES" && this.isStockSymbol(symbol)) {
        symbols.push(symbol);
      }
    }

    return symbols;
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
