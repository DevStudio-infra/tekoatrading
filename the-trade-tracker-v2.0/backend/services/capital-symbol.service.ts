import { loggerService } from "./logger.service";
import { getCapitalApiInstance } from "../modules/capital";

/**
 * Enhanced symbol service with better caching, fallback handling, and real-time market data
 * This service handles symbol-to-epic mappings for Capital.com trading
 */
export class CapitalSymbolService {
  private symbolCache: Map<string, string> = new Map();
  private reverseCache: Map<string, string> = new Map();
  private lastCacheUpdate: Date | null = null;
  private cacheUpdateInProgress = false;
  private readonly CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

  // Common symbol mappings - these are the most frequently used
  private readonly COMMON_MAPPINGS = new Map([
    // Major Forex Pairs
    ["EUR/USD", "CS.D.EURUSD.CFD.IP"],
    ["EURUSD", "CS.D.EURUSD.CFD.IP"],
    ["GBP/USD", "CS.D.GBPUSD.CFD.IP"],
    ["GBPUSD", "CS.D.GBPUSD.CFD.IP"],
    ["USD/JPY", "CS.D.USDJPY.CFD.IP"],
    ["USDJPY", "CS.D.USDJPY.CFD.IP"],
    ["USD/CHF", "CS.D.USDCHF.CFD.IP"],
    ["USDCHF", "CS.D.USDCHF.CFD.IP"],
    ["AUD/USD", "CS.D.AUDUSD.CFD.IP"],
    ["AUDUSD", "CS.D.AUDUSD.CFD.IP"],
    ["USD/CAD", "CS.D.USDCAD.CFD.IP"],
    ["USDCAD", "CS.D.USDCAD.CFD.IP"],
    ["NZD/USD", "CS.D.NZDUSD.CFD.IP"],
    ["NZDUSD", "CS.D.NZDUSD.CFD.IP"],

    // Crypto - Enhanced with multiple formats
    ["BTC/USD", "BTCUSD"], // Direct format that works
    ["BTCUSD", "BTCUSD"],
    ["BTC-USD", "BTCUSD"],
    ["BITCOIN", "BTCUSD"],
    ["ETH/USD", "ETHUSD"],
    ["ETHUSD", "ETHUSD"],
    ["ETH-USD", "ETHUSD"],
    ["ETHEREUM", "ETHUSD"],
    ["LTC/USD", "LTCUSD"],
    ["LTCUSD", "LTCUSD"],
    ["XRP/USD", "XRPUSD"],
    ["XRPUSD", "XRPUSD"],

    // Crypto alternative mappings (fallback)
    ["BTC/USD_ALT", "CS.D.BITCOIN.CFD.IP"],
    ["ETH/USD_ALT", "CS.D.ETHEREUM.CFD.IP"],

    // Indices
    ["US500", "CS.D.US500.CFD.IP"], // S&P 500
    ["SPX500", "CS.D.US500.CFD.IP"],
    ["US30", "CS.D.US30.CFD.IP"], // Dow Jones
    ["NAS100", "CS.D.NAS100.CFD.IP"], // NASDAQ 100
    ["UK100", "CS.D.UK100.CFD.IP"], // FTSE 100
    ["GER40", "CS.D.GER40.CFD.IP"], // DAX
    ["FRA40", "CS.D.FRA40.CFD.IP"], // CAC 40
    ["JPN225", "CS.D.JPN225.CFD.IP"], // Nikkei 225

    // Commodities
    ["GOLD", "CS.D.GOLD.CFD.IP"],
    ["XAUUSD", "CS.D.GOLD.CFD.IP"],
    ["SILVER", "CS.D.SILVER.CFD.IP"],
    ["XAGUSD", "CS.D.SILVER.CFD.IP"],
    ["OIL", "CS.D.OILCMTY.CFD.IP"],
    ["CRUDE", "CS.D.OILCMTY.CFD.IP"],
  ]);

  constructor() {
    // Initialize with common mappings
    this.COMMON_MAPPINGS.forEach((epic, symbol) => {
      this.symbolCache.set(symbol, epic);
      this.reverseCache.set(epic, symbol);
    });

    loggerService.info(`Capital Symbol Service initialized with ${this.COMMON_MAPPINGS.size} common mappings`);
  }

  /**
   * Enhanced symbol to epic conversion with multiple fallback strategies
   */
  async getEpicForSymbol(symbol: string, capitalApi?: any): Promise<string> {
    try {
      // Step 1: Check common mappings first
      const directMapping = this.COMMON_MAPPINGS.get(symbol);
      if (directMapping) {
        loggerService.info(`✅ Found direct mapping: ${symbol} → ${directMapping}`);

        // Verify the mapping works if we have API access
        if (capitalApi) {
          try {
            await capitalApi.getMarketDetails(directMapping);
            loggerService.info(`✅ Verified mapping works: ${symbol} → ${directMapping}`);
            return directMapping;
          } catch (error) {
            loggerService.warn(`❌ Direct mapping failed API test: ${symbol} → ${directMapping}, trying alternatives`);
          }
        } else {
          return directMapping;
        }
      }

      // Step 2: Generate candidate epics for testing
      const candidates = this.generateEpicCandidates(symbol);
      loggerService.info(`Testing ${candidates.length} candidates for ${symbol}: ${candidates.join(", ")}`);

      // Step 3: Test each candidate if we have API access
      if (capitalApi) {
        for (const candidate of candidates) {
          try {
            await capitalApi.getMarketDetails(candidate);
            loggerService.info(`✅ Found working epic: ${symbol} → ${candidate}`);

            // Cache the successful mapping
            this.symbolCache.set(symbol, candidate);
            this.reverseCache.set(candidate, symbol);

            return candidate;
          } catch (error) {
            loggerService.debug(`❌ Candidate ${candidate} failed for ${symbol}`);
          }
        }
      }

      // Step 4: Fallback - return the most likely candidate
      const fallback = candidates[0] || symbol;
      loggerService.warn(`⚠️ No working epic found for ${symbol}, using fallback: ${fallback}`);
      return fallback;
    } catch (error) {
      loggerService.error(`Error getting epic for symbol ${symbol}:`, error);
      return symbol; // Return original symbol as last resort
    }
  }

  /**
   * Generate multiple epic candidates for a symbol
   */
  private generateEpicCandidates(symbol: string): string[] {
    const candidates: string[] = [];
    const cleanSymbol = symbol.replace(/[\/\-_]/g, "").toUpperCase();

    // For crypto symbols, try simple format first
    if (this.isCryptoSymbol(symbol)) {
      // Direct format (works for most crypto)
      candidates.push(cleanSymbol);

      // Alternative formats
      candidates.push(`${cleanSymbol}.CFD`);
      candidates.push(`CS.D.${cleanSymbol}.CFD.IP`);

      // Special Bitcoin formats
      if (cleanSymbol.includes("BTC")) {
        candidates.push("BTCUSD");
        candidates.push("CS.D.BITCOIN.CFD.IP");
      }

      // Special Ethereum formats
      if (cleanSymbol.includes("ETH")) {
        candidates.push("ETHUSD");
        candidates.push("CS.D.ETHEREUM.CFD.IP");
      }
    } else {
      // For traditional assets, use Capital.com format
      candidates.push(`CS.D.${cleanSymbol}.CFD.IP`);
      candidates.push(`CS.D.${cleanSymbol}.MINI.IP`);
      candidates.push(cleanSymbol);
    }

    // Remove duplicates while preserving order
    return [...new Set(candidates)];
  }

  /**
   * Check if a symbol is a cryptocurrency
   */
  private isCryptoSymbol(symbol: string): boolean {
    const cryptoKeywords = ["BTC", "ETH", "LTC", "XRP", "ADA", "DOT", "LINK", "BITCOIN", "ETHEREUM"];
    const upperSymbol = symbol.toUpperCase();
    return cryptoKeywords.some((keyword) => upperSymbol.includes(keyword));
  }

  /**
   * Get symbol for an epic
   */
  getSymbolForEpic(epic: string): string | null {
    const symbol = this.reverseCache.get(epic);
    if (symbol) {
      loggerService.debug(`Epic ${epic} mapped to symbol: ${symbol}`);
      return symbol;
    }

    loggerService.warn(`Epic ${epic} not found in reverse cache`);
    return null;
  }

  /**
   * Generate symbol variants for better matching
   */
  private generateSymbolVariants(symbol: string): string[] {
    const variants = [symbol];

    // Add uppercase version
    variants.push(symbol.toUpperCase());

    // Add lowercase version
    variants.push(symbol.toLowerCase());

    // If it contains a slash, also try without slash
    if (symbol.includes("/")) {
      variants.push(symbol.replace("/", ""));
      variants.push(symbol.replace("/", "").toUpperCase());
    }

    // If it doesn't contain a slash, try with slash (for forex pairs)
    if (!symbol.includes("/") && symbol.length === 6) {
      const withSlash = symbol.substring(0, 3) + "/" + symbol.substring(3);
      variants.push(withSlash);
      variants.push(withSlash.toUpperCase());
    }

    // Remove duplicates
    return [...new Set(variants)];
  }

  /**
   * Check if cache needs updating
   */
  private isCacheExpired(): boolean {
    if (!this.lastCacheUpdate) return true;
    return Date.now() - this.lastCacheUpdate.getTime() > this.CACHE_EXPIRY_MS;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    symbolMappings: number;
    lastUpdate: Date | null;
    expired: boolean;
  } {
    return {
      symbolMappings: this.symbolCache.size,
      lastUpdate: this.lastCacheUpdate,
      expired: this.isCacheExpired(),
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.symbolCache.clear();
    this.reverseCache.clear();

    // Re-add common mappings
    this.COMMON_MAPPINGS.forEach((epic, symbol) => {
      this.symbolCache.set(symbol, epic);
      this.reverseCache.set(epic, symbol);
    });

    this.lastCacheUpdate = null;
    loggerService.info("Symbol cache cleared and reset to common mappings");
  }
}

// Create a singleton instance
export const capitalSymbolService = new CapitalSymbolService();
