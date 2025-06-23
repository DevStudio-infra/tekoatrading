import { loggerService } from "../logger.service";
import { CapitalMainService } from "../../modules/capital";
import { SymbolMappingResult } from "./types";

/**
 * SymbolMappingService
 *
 * Handles all symbol mapping and epic resolution logic.
 * Extracted from TradingService to improve maintainability.
 */
export class SymbolMappingService {
  private logger: typeof loggerService;

  constructor() {
    this.logger = loggerService;
  }

  /**
   * Format trading pair symbol to Capital.com epic format
   * @param symbol Trading pair symbol
   * @returns Formatted epic string
   */
  formatTradingPairSymbol(symbol: string): string {
    // Remove any slashes, underscores, or spaces and convert to uppercase
    let formatted = symbol.replace(/[\/\-_\s]/g, "").toUpperCase();

    // Handle common trading pair formats
    const commonMappings: { [key: string]: string } = {
      BITCOIN: "BTC",
      ETHEREUM: "ETH",
      BTCUSD: "BTC",
      ETHUSD: "ETH",
      XAUUSD: "GOLD",
      XAGUSD: "SILVER",
      USOIL: "OIL_CRUDE",
      CRUDEOIL: "OIL_CRUDE",
      NATURALGAS: "NATURALGAS",
      SPX: "US500",
      SP500: "US500",
      SPX500: "US500", // S&P 500 index
      NASDAQ: "US100",
      NASDAQ100: "US100",
      NAS100: "US100",
      DJI: "US30",
      DOW: "US30",
      DOWJONES: "US30",
      DOW30: "US30",
      FTSE: "UK100",
      FTSE100: "UK100",
      DAX: "GERMANY40",
      DAX40: "GERMANY40",
      CAC: "FRANCE40",
      CAC40: "FRANCE40",
      NIKKEI: "JAPAN225",
      NIKKEI225: "JAPAN225",
      HANGSENG: "HONGKONG50",
    };

    // Check if we have a direct mapping
    if (commonMappings[formatted]) {
      return commonMappings[formatted];
    }

    // For forex pairs, try to keep the original format
    if (formatted.length === 6 && /^[A-Z]{6}$/.test(formatted)) {
      return formatted; // Already in correct format like EURUSD
    }

    return formatted;
  }

  /**
   * Get alternative epic formats to try for a symbol
   */
  getAlternativeEpicFormats(symbol: string): string[] {
    const alternatives: string[] = [];
    const symbolUpper = symbol.toUpperCase();

    // For BTC/USD and crypto pairs
    if (symbolUpper.includes("BTC")) {
      alternatives.push("BTC/USD", "BTCUSD", "CS.D.BITCOIN.CFD.IP", "CS.D.BTCUSD.CFD.IP", "BITCOIN");
    }

    if (symbolUpper.includes("ETH")) {
      alternatives.push("ETH/USD", "ETHUSD", "CS.D.ETHEREUM.CFD.IP", "CS.D.ETHUSD.CFD.IP", "ETHEREUM");
    }

    // For USD/CAD and forex pairs
    if (symbolUpper.includes("USD") && symbolUpper.includes("CAD")) {
      alternatives.push("USD/CAD", "USDCAD", "CS.D.USDCAD.CFD.IP", "CS.D.USDCAD.MINI.IP");
    }

    if (symbolUpper.includes("EUR") && symbolUpper.includes("USD")) {
      alternatives.push("EUR/USD", "EURUSD", "CS.D.EURUSD.CFD.IP", "CS.D.EURUSD.MINI.IP");
    }

    if (symbolUpper.includes("GBP") && symbolUpper.includes("USD")) {
      alternatives.push("GBP/USD", "GBPUSD", "CS.D.GBPUSD.CFD.IP", "CS.D.GBPUSD.MINI.IP");
    }

    // For index symbols, use proper mappings instead of generic slash pattern
    if (symbolUpper.includes("SPX") || symbolUpper.includes("S&P") || symbolUpper === "SPX500") {
      alternatives.push("US500", "SPX500", "S&P 500", "CS.D.US500.CFD.IP");
    }

    if (symbolUpper.includes("NASDAQ") || symbolUpper === "NAS100" || symbolUpper === "US100") {
      alternatives.push("US100", "NASDAQ100", "NAS100", "CS.D.US100.CFD.IP");
    }

    if (symbolUpper.includes("DOW") || symbolUpper === "US30" || symbolUpper === "DJI") {
      alternatives.push("US30", "DOW", "DOWJONES", "CS.D.US30.CFD.IP");
    }

    if (symbolUpper.includes("FTSE") || symbolUpper === "UK100") {
      alternatives.push("UK100", "FTSE100", "CS.D.UK100.CFD.IP");
    }

    if (symbolUpper.includes("DAX") || symbolUpper === "GERMANY40") {
      alternatives.push("GERMANY40", "DAX40", "CS.D.GERMANY40.CFD.IP");
    }

    // Generic patterns - but exclude known index symbols to avoid invalid formats like SPX/500
    if (symbol.includes("/")) {
      const withoutSlash = symbol.replace("/", "");
      alternatives.push(withoutSlash);
      alternatives.push(`CS.D.${withoutSlash}.CFD.IP`);
      alternatives.push(`CS.D.${withoutSlash}.MINI.IP`);
    } else if (symbol.length === 6 && !this.isKnownIndexSymbol(symbolUpper)) {
      // Only add slash pattern for forex pairs, not for index symbols
      const withSlash = `${symbol.substring(0, 3)}/${symbol.substring(3)}`;
      alternatives.push(withSlash);
    }

    // Add the original symbol if not already included
    if (!alternatives.includes(symbol)) {
      alternatives.unshift(symbol);
    }

    return [...new Set(alternatives)]; // Remove duplicates
  }

  /**
   * Check if a symbol is a known index symbol to avoid incorrect slash formatting
   */
  isKnownIndexSymbol(symbolUpper: string): boolean {
    const indexSymbols = [
      "SPX500",
      "US500",
      "NAS100",
      "US100",
      "US30",
      "UK100",
      "GERMANY40",
      "DAX40",
      "FRANCE40",
      "CAC40",
      "JAPAN225",
      "NIKKEI225",
      "HONGKONG50",
      "ASX200",
      "FTSE100",
    ];
    return indexSymbols.includes(symbolUpper);
  }

  /**
   * Enhanced symbol matching to handle various symbol mappings like SPX500 <-> US500
   */
  isSymbolMatch(brokerSymbol: string | undefined, botSymbol: string | undefined): boolean {
    if (!brokerSymbol || !botSymbol) {
      return false;
    }

    // Normalize symbols for comparison
    const normalizeBroker = this.normalizeSymbolForMatching(brokerSymbol);
    const normalizeBot = this.normalizeSymbolForMatching(botSymbol);

    // Direct match
    if (normalizeBroker === normalizeBot) {
      return true;
    }

    // Check known symbol mappings
    const symbolMappings: Record<string, string[]> = {
      // S&P 500 variations
      SPX500: ["US500", "SPX", "S&P500", "SP500"],
      US500: ["SPX500", "SPX", "S&P500", "SP500"],

      // NASDAQ variations
      NAS100: ["US100", "NASDAQ", "NASDAQ100"],
      US100: ["NAS100", "NASDAQ", "NASDAQ100"],

      // Dow Jones variations
      US30: ["DOW", "DOWJONES", "DJI"],
      DOW: ["US30", "DOWJONES", "DJI"],

      // FTSE variations
      UK100: ["FTSE", "FTSE100"],
      FTSE100: ["UK100", "FTSE"],

      // DAX variations
      GERMANY40: ["DAX", "DAX40"],
      DAX40: ["GERMANY40", "DAX"],

      // Crypto variations
      BTC: ["BITCOIN", "BTCUSD", "BTC/USD"],
      BITCOIN: ["BTC", "BTCUSD", "BTC/USD"],
      ETH: ["ETHEREUM", "ETHUSD", "ETH/USD"],
      ETHEREUM: ["ETH", "ETHUSD", "ETH/USD"],
    };

    // Check if either symbol maps to the other
    const brokerMappings = symbolMappings[normalizeBroker] || [];
    const botMappings = symbolMappings[normalizeBot] || [];

    if (brokerMappings.includes(normalizeBot) || botMappings.includes(normalizeBroker)) {
      return true;
    }

    // Check reverse mappings
    for (const [key, values] of Object.entries(symbolMappings)) {
      if (values.includes(normalizeBroker) && (key === normalizeBot || values.includes(normalizeBot))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Normalize symbol for matching purposes
   */
  normalizeSymbolForMatching(symbol: string): string {
    return symbol
      .toUpperCase()
      .replace(/[\/\-_\s]/g, "") // Remove separators
      .replace("USD", "") // Remove USD suffix for crypto
      .trim();
  }

  /**
   * Get epic for symbol using the enhanced Capital Symbol Service
   */
  async getEpicForSymbol(symbol: string, capitalApi: CapitalMainService): Promise<SymbolMappingResult> {
    try {
      this.logger.info(`Getting epic for symbol: ${symbol}`);

      const formattedSymbol = this.formatTradingPairSymbol(symbol);
      const alternatives: string[] = [];

      // Try to use the Capital Symbol Service if available
      try {
        const epic = await capitalApi.getEpicForSymbol(symbol);
        if (epic) {
          this.logger.info(`Found epic via symbol service: ${symbol} → ${epic}`);
          return {
            epic,
            mappedSymbol: symbol,
            alternativesUsed: [],
          };
        }
      } catch (error) {
        this.logger.debug(`Symbol service not available or failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      }

      // Fallback to the old method for backward compatibility
      const fallbackResult = await this.getEpicForSymbolFallback(symbol, capitalApi, formattedSymbol);
      return {
        epic: fallbackResult.epic,
        mappedSymbol: fallbackResult.mappedSymbol,
        alternativesUsed: fallbackResult.alternativesUsed,
      };
    } catch (error) {
      this.logger.error(`Error getting epic for symbol ${symbol}: ${error instanceof Error ? error.message : "Unknown error"}`);
      return {
        epic: null,
        mappedSymbol: symbol,
        alternativesUsed: [],
      };
    }
  }

  /**
   * Fallback method for getting epic when symbol service is not available
   */
  private async getEpicForSymbolFallback(symbol: string, capitalApi: CapitalMainService, formattedSymbol?: string): Promise<SymbolMappingResult> {
    // Use the formatted trading pair
    const mappedSymbol = formattedSymbol || this.formatTradingPairSymbol(symbol);
    const alternativesUsed: string[] = [];

    // Try the formatted symbol first
    try {
      const testResult = await capitalApi.getMarketDetails(mappedSymbol);
      if (testResult) {
        this.logger.info(`Direct formatted symbol worked: ${symbol} → ${mappedSymbol}`);
        return {
          epic: mappedSymbol,
          mappedSymbol,
          alternativesUsed: [mappedSymbol],
        };
      }
    } catch (error) {
      // Continue with alternatives
      alternativesUsed.push(mappedSymbol);
    }

    // Try alternative formats
    const alternatives = this.getAlternativeEpicFormats(symbol);
    this.logger.info(`Trying ${alternatives.length} alternative formats for ${symbol}`);

    for (const epic of alternatives) {
      try {
        const testResult = await capitalApi.getMarketDetails(epic);
        if (testResult) {
          this.logger.info(`Found working epic: ${symbol} → ${epic}`);
          alternativesUsed.push(epic);
          return {
            epic,
            mappedSymbol: epic,
            alternativesUsed,
          };
        }
      } catch (error: any) {
        this.logger.debug(`Alternative epic ${epic} failed: ${error.response?.status || error.message}`);
        alternativesUsed.push(epic);
        continue;
      }
    }

    this.logger.warn(`Could not find working epic for symbol: ${symbol}`);
    return {
      epic: null,
      mappedSymbol: symbol,
      alternativesUsed,
    };
  }
}
