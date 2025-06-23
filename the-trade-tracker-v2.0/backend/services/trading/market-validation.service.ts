import { loggerService } from "../logger.service";
import { CapitalMainService } from "../../modules/capital";
import { MarketHoursResult } from "./types";
import { SymbolMappingService } from "./symbol-mapping.service";

/**
 * MarketValidationService
 *
 * Handles market trading hours validation and market availability checks.
 * Extracted from TradingService to improve maintainability.
 */
export class MarketValidationService {
  private logger: typeof loggerService;
  private symbolMapping: SymbolMappingService;

  constructor(symbolMapping: SymbolMappingService) {
    this.logger = loggerService;
    this.symbolMapping = symbolMapping;
  }

  /**
   * Check if market is currently within trading hours
   * @param symbol Trading pair symbol
   * @param capitalApi Capital.com API instance
   * @returns Promise with allowed status and reason
   */
  async checkMarketTradingHours(symbol: string, capitalApi: CapitalMainService): Promise<MarketHoursResult> {
    try {
      this.logger.info(`Checking market trading hours for ${symbol}`);

      // Try to get the correct epic for the symbol
      const mappingResult = await this.symbolMapping.getEpicForSymbol(symbol, capitalApi);
      let epic = mappingResult.epic;

      // If we still don't have an epic, check if we should assume tradeable
      if (!epic) {
        this.logger.warn(`Could not find working epic for ${symbol}, checking market type`);

        // For 24/7 markets like crypto, assume tradeable
        if (this.isCryptoMarket(symbol)) {
          this.logger.info(`Market ${symbol} is crypto (24/7), assuming tradeable despite epic issues`);
          return { allowed: true, reason: "Crypto market assumed 24/7 tradeable" };
        }

        return {
          allowed: false,
          reason: `Could not find working epic format for ${symbol}`,
        };
      }

      // Get market details including opening hours and status
      const marketDetails = await capitalApi.getMarketDetails(epic);

      if (!marketDetails) {
        this.logger.warn(`Could not get market details for epic ${epic}`);
        // For crypto markets, be more lenient
        if (this.isCryptoMarket(symbol)) {
          return { allowed: true, reason: "Crypto market assumed tradeable" };
        }
        return { allowed: false, reason: "Could not get market details" };
      }

      // Check if we have snapshot data with market status
      if (marketDetails.snapshot?.marketStatus) {
        const marketStatus = marketDetails.snapshot.marketStatus;
        this.logger.info(`Market ${symbol} (${epic}) status: ${marketStatus}`);

        if (marketStatus !== "TRADEABLE") {
          return {
            allowed: false,
            reason: `Market status: ${marketStatus}`,
          };
        }
      } else if (marketDetails.instrument?.marketStatus) {
        const marketStatus = marketDetails.instrument.marketStatus;
        this.logger.info(`Market ${symbol} (${epic}) instrument status: ${marketStatus}`);

        if (marketStatus !== "TRADEABLE") {
          return {
            allowed: false,
            reason: `Market status: ${marketStatus}`,
          };
        }
      } else {
        this.logger.info(`No market status available for ${symbol} (${epic}), checking trading hours`);
      }

      // If we have opening hours, check them
      if (marketDetails.instrument?.openingHours) {
        const isWithinHours = this.isWithinTradingHours(marketDetails.instrument.openingHours);
        if (!isWithinHours) {
          return {
            allowed: false,
            reason: "Outside trading hours",
          };
        }
      } else {
        // No opening hours info - for crypto, assume 24/7
        if (this.isCryptoMarket(symbol)) {
          this.logger.info(`Market ${symbol} is crypto (24/7), no opening hours check needed`);
        } else {
          this.logger.info(`No opening hours data for ${symbol}, assuming tradeable`);
        }
      }

      return { allowed: true, reason: "Market is tradeable" };
    } catch (error: any) {
      this.logger.warn(`Error checking market trading hours for ${symbol}: ${error}`);

      // Don't assume market is closed on API errors - could be epic format issues
      // Check if this is a 400 error which likely means wrong epic format
      if (error.response?.status === 400) {
        this.logger.warn(`400 error for ${symbol} - likely epic format issue, not market closure`);

        // For crypto markets that should be 24/7, assume tradeable
        if (this.isCryptoMarket(symbol)) {
          this.logger.info(`Assuming ${symbol} is tradeable (24/7 crypto with epic format issue)`);
          return { allowed: true, reason: "Crypto market assumed tradeable despite API issue" };
        }
      }

      // For other errors or non-crypto, default to allowing but log the reason
      this.logger.warn(`Could not verify market status for ${symbol}, defaulting to allow: ${error.message}`);
      return { allowed: true, reason: "Could not verify market status" }; // Default to allowing
    }
  }

  /**
   * Check if a symbol represents a cryptocurrency market
   */
  isCryptoMarket(symbol: string): boolean {
    const symbolUpper = symbol.toUpperCase();
    const cryptoIndicators = [
      "BTC",
      "ETH",
      "LTC",
      "XRP",
      "ADA",
      "SOL",
      "DOGE",
      "MATIC",
      "LINK",
      "UNI",
      "BITCOIN",
      "ETHEREUM",
      "LITECOIN",
      "RIPPLE",
      "CARDANO",
      "SOLANA",
      "DOGECOIN",
    ];

    return cryptoIndicators.some((crypto) => symbolUpper.includes(crypto));
  }

  /**
   * Check if current time is within trading hours
   * @param openingHours Opening hours object from Capital.com API
   * @returns boolean - true if within trading hours
   */
  isWithinTradingHours(openingHours: any): boolean {
    try {
      if (!openingHours || !openingHours.zone) {
        return true; // If no hours specified, assume always open (like crypto)
      }

      const now = new Date();
      const dayNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
      const currentDay = dayNames[now.getUTCDay()]; // Use UTC day since API uses UTC

      const todayHours = openingHours[currentDay];

      if (!todayHours || todayHours.length === 0) {
        // No trading hours for today (e.g., weekend for forex)
        return false;
      }

      // Get current time in minutes since midnight UTC
      const currentMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();

      // Check each trading session for today
      for (const session of todayHours) {
        if (this.isTimeInSession(currentMinutes, session)) {
          return true;
        }
      }

      return false;
    } catch (error) {
      this.logger.error("Error checking trading hours:", error);
      return true; // Default to allowing trading if there's an error
    }
  }

  /**
   * Check if current time is within a specific trading session
   * @param currentMinutes Current time in minutes since midnight UTC
   * @param session Trading session string like "09:30 - 16:00"
   * @returns boolean - true if within session
   */
  isTimeInSession(currentMinutes: number, session: string): boolean {
    try {
      // Parse session string like "09:30 - 16:00" or "23:05 - 00:00"
      const [startStr, endStr] = session.split(" - ");

      const [startHour, startMin] = startStr.split(":").map(Number);
      const [endHour, endMin] = endStr.split(":").map(Number);

      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      // Handle overnight sessions (like "23:05 - 00:00")
      if (endMinutes < startMinutes) {
        // Session crosses midnight
        return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
      } else {
        // Normal session within same day
        return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
      }
    } catch (error) {
      this.logger.error(`Error parsing trading session ${session}: ${error}`);
      return false;
    }
  }
}
