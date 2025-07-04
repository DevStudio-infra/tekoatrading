import { logger } from "../logger";
import { CapitalMainService } from "../modules/capital";

export interface MarketHoursResult {
  allowed: boolean;
  reason: string;
}

/**
 * MarketValidationService
 *
 * Handles market trading hours validation and market availability checks.
 * Based on the-trade-tracker-v2.0 implementation with Capital.com integration.
 */
export class MarketValidationService {
  /**
   * Check if market is currently within trading hours
   * @param symbol Trading pair symbol
   * @param capitalApi Capital.com API instance
   * @returns Promise with allowed status and reason
   */
  async checkMarketTradingHours(
    symbol: string,
    capitalApi: CapitalMainService,
  ): Promise<MarketHoursResult> {
    try {
      logger.info(`🕐 Checking market trading hours for ${symbol}`);

      // Get the correct epic for the symbol
      const epic = await this.resolveEpicForSymbol(symbol, capitalApi);

      if (!epic) {
        logger.warn(`Could not find working epic for ${symbol}, checking market type`);

        // For 24/7 markets like crypto, assume tradeable
        if (this.isCryptoMarket(symbol)) {
          logger.info(`Market ${symbol} is crypto (24/7), assuming tradeable despite epic issues`);
          return { allowed: true, reason: "Crypto market assumed 24/7 tradeable" };
        }

        return {
          allowed: false,
          reason: `Could not find working epic format for ${symbol}`,
        };
      }

      // Try to get market data including opening hours and status
      let marketDetails;
      try {
        logger.debug(`📊 Requesting market data for epic: ${epic}`);
        marketDetails = await capitalApi.getMarketData(epic);

        if (marketDetails) {
          logger.debug(`✅ Market data received for ${epic}:`, {
            status: marketDetails.marketStatus,
          });
        } else {
          logger.debug(`⚠️ Market data call returned null/undefined for epic: ${epic}`);
        }
      } catch (error: any) {
        logger.warn(`Market data API failed for epic ${epic}: ${error.message}`);
        // For crypto markets, be more lenient since they're typically 24/7
        if (this.isCryptoMarket(symbol)) {
          logger.info(`Market data unavailable for crypto ${symbol}, assuming 24/7 tradeable`);
          return {
            allowed: true,
            reason: "Crypto market assumed 24/7 tradeable (API unavailable)",
          };
        }
        return { allowed: false, reason: `Market data unavailable: ${error.message}` };
      }

      if (!marketDetails) {
        // More detailed logging for null market data
        if (this.isCryptoMarket(symbol)) {
          logger.info(
            `🔄 No market data for crypto ${symbol} (${epic}) - this is normal for 24/7 crypto markets, assuming tradeable`,
          );
          return {
            allowed: true,
            reason: "Crypto market assumed 24/7 tradeable (no market data needed)",
          };
        } else {
          logger.warn(`❌ No market data returned for non-crypto market ${symbol} (${epic})`);
          return { allowed: false, reason: "Could not get market details for non-crypto market" };
        }
      }

      // Check market status directly from Market interface
      if (marketDetails.marketStatus) {
        logger.info(`Market ${symbol} (${epic}) status: ${marketDetails.marketStatus}`);

        if (marketDetails.marketStatus !== "TRADEABLE") {
          return {
            allowed: false,
            reason: `Market status: ${marketDetails.marketStatus}`,
          };
        }
      } else {
        logger.info(`No market status available for ${symbol} (${epic})`);
      }

      // For crypto markets, assume 24/7 trading (no opening hours check needed)
      if (this.isCryptoMarket(symbol)) {
        logger.info(`Market ${symbol} is crypto (24/7), no opening hours check needed`);
      }

      logger.info(`✅ Market ${symbol} is tradeable`);
      return { allowed: true, reason: "Market is tradeable" };
    } catch (error: any) {
      logger.warn(`Error checking market trading hours for ${symbol}: ${error}`);

      // Don't assume market is closed on API errors - could be epic format issues
      if (error.response?.status === 400) {
        logger.warn(`400 error for ${symbol} - likely epic format issue, not market closure`);

        // For crypto markets that should be 24/7, assume tradeable
        if (this.isCryptoMarket(symbol)) {
          logger.info(`Assuming ${symbol} is tradeable (24/7 crypto with epic format issue)`);
          return { allowed: true, reason: "Crypto market assumed tradeable despite API issue" };
        }
      }

      // For other errors or non-crypto, default to allowing but log the reason
      logger.warn(
        `Could not verify market status for ${symbol}, defaulting to allow: ${error.message}`,
      );
      return { allowed: true, reason: "Could not verify market status" };
    }
  }

  /**
   * Resolve epic for symbol using Capital.com known mappings
   */
  private async resolveEpicForSymbol(
    symbol: string,
    capitalApi: CapitalMainService,
  ): Promise<string | null> {
    try {
      // Try common mappings first
      const symbolMappings: Record<string, string> = {
        "BTC/USD": "BTCUSD",
        "ETH/USD": "ETHUSD",
        "EUR/USD": "EURUSD",
        "GBP/USD": "GBPUSD",
        "USD/JPY": "USDJPY",
        "AUD/USD": "AUDUSD",
        "USD/CAD": "USDCAD",
        "USD/CHF": "USDCHF",
        "NZD/USD": "NZDUSD",
      };

      const epic = symbolMappings[symbol] || symbol.replace("/", "");

      // Test if epic works with a simple historical data request
      try {
        // Use MINUTE timeframe for testing since it's most universally supported
        await capitalApi.getHistoricalPrices(epic, "MINUTE", 1);
        logger.info(`✅ Epic ${epic} works for ${symbol}`);
        return epic;
      } catch (testError) {
        logger.warn(`Epic ${epic} failed for ${symbol}:`, testError);
        return null;
      }
    } catch (error) {
      logger.error(`Error resolving epic for ${symbol}:`, error);
      return null;
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
        logger.info(`No trading hours for ${currentDay}, market closed`);
        return false;
      }

      // Get current time in minutes since midnight UTC
      const currentMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();

      // Check each trading session for today
      for (const session of todayHours) {
        if (this.isTimeInSession(currentMinutes, session)) {
          logger.info(`Market is open - within session: ${session}`);
          return true;
        }
      }

      logger.info(`Market is closed - outside all trading sessions for ${currentDay}`);
      return false;
    } catch (error) {
      logger.error("Error checking trading hours:", error);
      return true; // Default to allowing trading if there's an error
    }
  }

  /**
   * Check if current time is within a specific trading session
   * @param currentMinutes Current time in minutes since midnight UTC
   * @param session Trading session string like "09:30 - 16:00"
   * @returns boolean - true if within session
   */
  private isTimeInSession(currentMinutes: number, session: string): boolean {
    try {
      // Parse session format "09:30 - 16:00"
      const [startTime, endTime] = session.split(" - ");

      const [startHour, startMin] = startTime.split(":").map(Number);
      const [endHour, endMin] = endTime.split(":").map(Number);

      const sessionStartMinutes = startHour * 60 + startMin;
      const sessionEndMinutes = endHour * 60 + endMin;

      // Handle sessions that cross midnight (end < start)
      if (sessionEndMinutes < sessionStartMinutes) {
        // Session crosses midnight: either after start time or before end time
        return currentMinutes >= sessionStartMinutes || currentMinutes <= sessionEndMinutes;
      } else {
        // Normal session: between start and end
        return currentMinutes >= sessionStartMinutes && currentMinutes <= sessionEndMinutes;
      }
    } catch (error) {
      logger.error(`Error parsing trading session ${session}:`, error);
      return true; // Default to allowing trading if parsing fails
    }
  }
}

export const marketValidationService = new MarketValidationService();
