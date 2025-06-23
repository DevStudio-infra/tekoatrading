import { loggerService } from "../../logger.service";

export interface IBotMarketService {
  getMarketTradingInfo(symbol: string): { type: string; description: string; typical24_7: boolean };
  isBasicMarketTradingTime(symbol: string): { allowed: boolean; reason: string };
  isMarketTradeable(symbol: string, capitalApi: any): Promise<boolean>;
  checkMarketConditions(symbol: string): Promise<{ suitable: boolean; reason: string }>;
  formatTradingPairSymbol(symbol: string): string;
  getPipValue(symbol: string, price: number): number;
  getMinimumBrokerDistance(symbol: string, type: "stopLoss" | "takeProfit"): number;
}

export class BotMarketService implements IBotMarketService {
  private marketStatusCache: Map<string, { status: string; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 30000; // 30 seconds cache

  constructor() {}

  /**
   * Get market trading info for a symbol
   */
  getMarketTradingInfo(symbol: string): { type: string; description: string; typical24_7: boolean } {
    const symbolUpper = symbol.toUpperCase();

    // Crypto pairs (24/7 trading)
    if (
      symbolUpper.includes("BTC") ||
      symbolUpper.includes("ETH") ||
      symbolUpper.includes("XRP") ||
      symbolUpper.includes("LTC") ||
      symbolUpper.includes("ADA") ||
      symbolUpper.includes("DOT") ||
      symbolUpper.includes("LINK") ||
      symbolUpper.includes("SOL") ||
      symbolUpper.includes("AVAX") ||
      symbolUpper.includes("MATIC") ||
      symbolUpper.includes("DOGE") ||
      symbolUpper.includes("SHIB")
    ) {
      return {
        type: "cryptocurrency",
        description: "Cryptocurrency pair - trades 24/7",
        typical24_7: true,
      };
    }

    // Major Forex pairs
    if (
      symbolUpper.includes("EUR") ||
      symbolUpper.includes("GBP") ||
      symbolUpper.includes("JPY") ||
      symbolUpper.includes("CHF") ||
      symbolUpper.includes("CAD") ||
      symbolUpper.includes("AUD") ||
      symbolUpper.includes("NZD")
    ) {
      return {
        type: "forex",
        description: "Foreign exchange pair - trades nearly 24/5",
        typical24_7: false,
      };
    }

    // Indices
    if (this.isKnownIndexSymbol(symbolUpper)) {
      return {
        type: "index",
        description: "Stock market index - trades during market hours",
        typical24_7: false,
      };
    }

    // Commodities
    if (symbolUpper.includes("GOLD") || symbolUpper.includes("SILVER") || symbolUpper.includes("OIL") || symbolUpper.includes("GAS")) {
      return {
        type: "commodity",
        description: "Commodity - trades during specific hours",
        typical24_7: false,
      };
    }

    // Default to stock
    return {
      type: "stock",
      description: "Individual stock - trades during market hours",
      typical24_7: false,
    };
  }

  /**
   * Check if symbol is a known index
   */
  private isKnownIndexSymbol(symbolUpper: string): boolean {
    const indexSymbols = [
      "SPX500",
      "SPY",
      "ES",
      "SP500",
      "NAS100",
      "QQQ",
      "NQ",
      "NASDAQ",
      "DJI",
      "DOW",
      "YM",
      "DJI30",
      "RUSSELL2000",
      "IWM",
      "RTY",
      "FTSE100",
      "UKX",
      "DAX30",
      "DAX",
      "GER30",
      "CAC40",
      "FRA40",
      "NIKKEI225",
      "N225",
      "JPN225",
    ];

    return indexSymbols.some((index) => symbolUpper.includes(index));
  }

  /**
   * Check if market is currently within trading hours
   */
  isBasicMarketTradingTime(symbol: string): { allowed: boolean; reason: string } {
    const marketInfo = this.getMarketTradingInfo(symbol);

    // Crypto trades 24/7
    if (marketInfo.typical24_7) {
      return { allowed: true, reason: "Cryptocurrency trades 24/7" };
    }

    const now = new Date();
    const currentUTC = now.getUTCHours() * 60 + now.getUTCMinutes();
    const dayOfWeek = now.getUTCDay(); // 0 = Sunday, 6 = Saturday

    // Weekend check for traditional markets
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return {
        allowed: false,
        reason: `Weekend - ${marketInfo.type} markets closed`,
      };
    }

    // Forex trades nearly 24/5 (closes Friday evening to Sunday evening)
    if (marketInfo.type === "forex") {
      // Forex closes Friday 22:00 UTC to Sunday 22:00 UTC
      if (dayOfWeek === 5 && currentUTC >= 22 * 60) {
        return { allowed: false, reason: "Forex markets closed for weekend" };
      }
      if (dayOfWeek === 6) {
        return { allowed: false, reason: "Forex markets closed for weekend" };
      }
      if (dayOfWeek === 0 && currentUTC < 22 * 60) {
        return { allowed: false, reason: "Forex markets closed for weekend" };
      }
      return { allowed: true, reason: "Forex markets open" };
    }

    // For stocks, indices, and commodities - basic trading hours
    // Simplified: 8:00 UTC to 22:00 UTC on weekdays
    if (currentUTC >= 8 * 60 && currentUTC <= 22 * 60) {
      return { allowed: true, reason: `${marketInfo.type} markets open` };
    }

    const nextOpen = this.getNextTradingTime(marketInfo.type);
    return {
      allowed: false,
      reason: `${marketInfo.type} markets closed. Next open: ${nextOpen}`,
    };
  }

  /**
   * Get next trading time for market type
   */
  private getNextTradingTime(marketType: string): string {
    const now = new Date();
    const currentUTC = now.getUTCHours() * 60 + now.getUTCMinutes();
    const dayOfWeek = now.getUTCDay();

    if (marketType === "forex") {
      if (dayOfWeek === 5 && currentUTC >= 22 * 60) {
        return "Sunday 22:00 UTC";
      }
      if (dayOfWeek === 6 || (dayOfWeek === 0 && currentUTC < 22 * 60)) {
        return "Sunday 22:00 UTC";
      }
      return "Already open";
    }

    // For other markets
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return "Monday 08:00 UTC";
    }
    if (currentUTC < 8 * 60) {
      return "Today 08:00 UTC";
    }
    if (currentUTC > 22 * 60) {
      return dayOfWeek === 5 ? "Monday 08:00 UTC" : "Tomorrow 08:00 UTC";
    }
    return "Already open";
  }

  /**
   * Check if market is tradeable via broker API
   */
  async isMarketTradeable(symbol: string, capitalApi: any): Promise<boolean> {
    try {
      // Check cache first
      const cacheKey = `tradeable_${symbol}`;
      const cached = this.marketStatusCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return cached.status === "tradeable";
      }

      // Try to get market information from Capital.com
      const alternatives = this.getAlternativeEpicFormats(symbol);

      for (const epic of alternatives) {
        try {
          const marketInfo = await capitalApi.getMarketInfo(epic);
          if (marketInfo && marketInfo.dealingEnabled) {
            // Cache the result
            this.marketStatusCache.set(cacheKey, {
              status: "tradeable",
              timestamp: Date.now(),
            });
            return true;
          }
        } catch (error) {
          // Continue trying other formats
          continue;
        }
      }

      // Cache negative result
      this.marketStatusCache.set(cacheKey, {
        status: "not_tradeable",
        timestamp: Date.now(),
      });
      return false;
    } catch (error) {
      loggerService.error(`Error checking if market is tradeable: ${error}`);
      return false;
    }
  }

  /**
   * Get alternative epic formats for a symbol
   */
  private getAlternativeEpicFormats(symbol: string): string[] {
    const symbolUpper = symbol.toUpperCase();
    const alternatives: string[] = [symbol, symbolUpper];

    // Remove common separators and try variations
    const cleanSymbol = symbolUpper.replace(/[\/\-_\.]/g, "");
    alternatives.push(cleanSymbol);

    // For crypto pairs, try different formats
    if (symbolUpper.includes("BTC")) {
      alternatives.push("BITCOIN", "BTC", "BTCUSD", "BTC/USD");
    }
    if (symbolUpper.includes("ETH")) {
      alternatives.push("ETHEREUM", "ETH", "ETHUSD", "ETH/USD");
    }

    // For forex pairs, try different formats
    if (symbolUpper.length === 6) {
      const base = symbolUpper.substring(0, 3);
      const quote = symbolUpper.substring(3, 6);
      alternatives.push(`${base}/${quote}`, `${base}-${quote}`, `${base}.${quote}`);
    }

    // For indices, try different formats
    if (symbolUpper.includes("SPX") || symbolUpper.includes("SP500")) {
      alternatives.push("SPX500", "SP500", "US500", "SPY");
    }
    if (symbolUpper.includes("NAS") || symbolUpper.includes("NASDAQ")) {
      alternatives.push("NAS100", "NASDAQ100", "US100", "QQQ");
    }

    return [...new Set(alternatives)]; // Remove duplicates
  }

  /**
   * Check market conditions for trading
   */
  async checkMarketConditions(symbol: string): Promise<{ suitable: boolean; reason: string }> {
    try {
      const marketInfo = this.getMarketTradingInfo(symbol);

      // For crypto, always suitable (24/7 trading)
      if (marketInfo.typical24_7) {
        return { suitable: true, reason: "Cryptocurrency trades 24/7" };
      }

      // For traditional markets, check trading hours
      const marketHoursCheck = this.isBasicMarketTradingTime(symbol);
      if (!marketHoursCheck.allowed) {
        return {
          suitable: false,
          reason: `Market closed: ${marketHoursCheck.reason}`,
        };
      }

      return { suitable: true, reason: "Market conditions suitable" };
    } catch (error) {
      loggerService.error(`Error checking market conditions: ${error}`);
      return {
        suitable: false,
        reason: "Unable to verify market conditions",
      };
    }
  }

  /**
   * Format trading pair symbol
   */
  formatTradingPairSymbol(symbol: string): string {
    // Convert to uppercase and remove common separators
    let formatted = symbol.toUpperCase().replace(/[\/\-_\.]/g, "");

    // Common symbol mappings for Capital.com format
    const symbolMappings: { [key: string]: string } = {
      BTCUSD: "BITCOIN",
      ETHUSD: "ETHEREUM",
      XRPUSD: "RIPPLE",
      LTCUSD: "LITECOIN",
      ADAUSD: "CARDANO",
      DOTUSD: "POLKADOT",
      LINKUSD: "CHAINLINK",
      SOLUSD: "SOLANA",
      AVAXUSD: "AVALANCHE",
      MATICUSD: "POLYGON",
      DOGEUSD: "DOGECOIN",
      SHIBUSD: "SHIBA-INU",
    };

    return symbolMappings[formatted] || formatted;
  }

  /**
   * Get pip value for a symbol
   */
  getPipValue(symbol: string, price: number): number {
    const symbolUpper = symbol.toUpperCase();

    // Forex pairs
    if (symbolUpper.includes("JPY")) {
      return 0.01; // Japanese Yen pairs use 2 decimal places
    } else if (
      symbolUpper.includes("EUR") ||
      symbolUpper.includes("GBP") ||
      symbolUpper.includes("AUD") ||
      symbolUpper.includes("NZD") ||
      symbolUpper.includes("CAD") ||
      symbolUpper.includes("CHF")
    ) {
      return 0.0001; // Most forex pairs use 4 decimal places
    }

    // Crypto pairs - use percentage of price
    if (symbolUpper.includes("BTC") || symbolUpper.includes("ETH") || symbolUpper.includes("XRP") || symbolUpper.includes("LTC") || symbolUpper.includes("ADA")) {
      return price * 0.0001; // 0.01% of price
    }

    // Indices and stocks
    if (this.isKnownIndexSymbol(symbolUpper)) {
      return 0.1; // Most indices use 1 decimal place
    }

    // Commodities
    if (symbolUpper.includes("GOLD") || symbolUpper.includes("SILVER") || symbolUpper.includes("OIL")) {
      return 0.01; // Most commodities use 2 decimal places
    }

    // Default for stocks and others
    return 0.01;
  }

  /**
   * Get minimum broker distance for stop loss or take profit
   */
  getMinimumBrokerDistance(symbol: string, type: "stopLoss" | "takeProfit"): number {
    const symbolUpper = symbol.toUpperCase();

    // Crypto pairs - typically need larger distances due to volatility
    if (
      symbolUpper.includes("BTC") ||
      symbolUpper.includes("ETH") ||
      symbolUpper.includes("XRP") ||
      symbolUpper.includes("LTC") ||
      symbolUpper.includes("ADA") ||
      symbolUpper.includes("DOT") ||
      symbolUpper.includes("LINK") ||
      symbolUpper.includes("SOL")
    ) {
      return type === "stopLoss" ? 10 : 15; // Minimum 10-15 points for crypto
    }

    // Major forex pairs
    if (
      symbolUpper.includes("EUR") ||
      symbolUpper.includes("GBP") ||
      symbolUpper.includes("JPY") ||
      symbolUpper.includes("CHF") ||
      symbolUpper.includes("CAD") ||
      symbolUpper.includes("AUD") ||
      symbolUpper.includes("NZD")
    ) {
      return type === "stopLoss" ? 5 : 8; // Minimum 5-8 points for forex
    }

    // Indices
    if (this.isKnownIndexSymbol(symbolUpper)) {
      return type === "stopLoss" ? 3 : 5; // Minimum 3-5 points for indices
    }

    // Commodities
    if (symbolUpper.includes("GOLD") || symbolUpper.includes("SILVER") || symbolUpper.includes("OIL") || symbolUpper.includes("GAS")) {
      return type === "stopLoss" ? 5 : 8; // Minimum 5-8 points for commodities
    }

    // Default for stocks and others
    return type === "stopLoss" ? 2 : 3;
  }
}
