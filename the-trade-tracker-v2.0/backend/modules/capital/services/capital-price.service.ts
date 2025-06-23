import { loggerService } from "../../../services/logger.service";
import { CapitalBaseService } from "./capital-base.service";
import { CapitalAuthConfig } from "../interfaces/capital-session.interface";
import { HistoricalPriceResponse, HistoricalPrice, PriceResolution, OHLCData } from "../interfaces/capital-price.interface";
import { AxiosError } from "axios";
import { capitalApiRateLimiter } from "../../../services/capital-api-rate-limiter.service";

/**
 * Service for managing Capital.com price data operations
 */
export class CapitalPriceService extends CapitalBaseService {
  constructor(config: CapitalAuthConfig) {
    super(config);
  }

  /**
   * Map internal resolution to Capital.com API resolution
   */
  private mapToApiResolution(resolution: string): string {
    const resolutionMap: { [key: string]: string } = {
      MINUTE: "MINUTE",
      M1: "MINUTE",
      MINUTE_5: "MINUTE_5",
      M5: "MINUTE_5",
      MINUTE_15: "MINUTE_15",
      M15: "MINUTE_15",
      MINUTE_30: "MINUTE_30",
      M30: "MINUTE_30",
      HOUR: "HOUR",
      H1: "HOUR",
      HOUR_4: "HOUR_4",
      H4: "HOUR_4",
      DAY: "DAY",
      D1: "DAY",
      WEEK: "WEEK",
      W1: "WEEK",
    };

    return resolutionMap[resolution.toUpperCase()] || "MINUTE";
  }

  /**
   * Get historical prices for a specific instrument
   *
   * @param epic Instrument epic
   * @param resolution Price candle resolution (timeframe)
   * @param from Start timestamp (ISO format YYYY-MM-DDTHH:MM:SS)
   * @param to End timestamp (ISO format YYYY-MM-DDTHH:MM:SS)
   * @param max Maximum number of data points to return
   * @returns Historical price data
   */
  async getHistoricalPrices(epic: string, resolution: string = PriceResolution.MINUTE, from?: string, to?: string, max?: number): Promise<HistoricalPriceResponse> {
    // Store original params for logging
    const originalParams = { resolution, from, to, max };
    let apiParams: any = {};

    try {
      loggerService.info(`Fetching historical prices for ${epic} with params: ${JSON.stringify({ resolution, from, to, max })}`);

      // Convert to API format
      apiParams = {
        resolution: this.mapToApiResolution(resolution),
      };

      if (max !== undefined) apiParams.max = max;
      if (from !== undefined) apiParams.from = from;
      if (to !== undefined) apiParams.to = to;

      loggerService.info(`Fetching historical prices for ${epic} with API params: ${JSON.stringify(apiParams)}`);

      try {
        // Try the direct format first using makeAuthenticatedRequest with rate limiting
        const response = await capitalApiRateLimiter.addToQueueWithTimeout(
          () =>
            this.makeAuthenticatedRequest(`api/v1/prices/${encodeURIComponent(epic)}`, {
              method: "GET",
              params: apiParams,
            }),
          30000, // 30 second timeout
          `historical-prices-${epic}`,
          "normal"
        );

        loggerService.info(`Direct format succeeded. Count: ${response.data.prices?.length || 0}`);

        // Debug logging for timestamp issues
        if (response.data.prices && response.data.prices.length > 0) {
          const firstPrice = response.data.prices[0];
          const lastPrice = response.data.prices[response.data.prices.length - 1];
          loggerService.debug(`First price timestamp: ${firstPrice.snapshotTimeUTC}, Last price timestamp: ${lastPrice.snapshotTimeUTC}`);
        }

        return response.data as HistoricalPriceResponse;
      } catch (directError) {
        loggerService.info(`Direct format failed, trying standard Capital.com format: CS.D.${epic.replace("/", "")}.MINI.IP`);

        try {
          // Try Capital.com specific format with makeAuthenticatedRequest
          const standardFormat = `CS.D.${epic.replace("/", "")}.MINI.IP`;
          const standardResponse = await capitalApiRateLimiter.addToQueueWithTimeout(
            () =>
              this.makeAuthenticatedRequest(`api/v1/prices/${encodeURIComponent(standardFormat)}`, {
                method: "GET",
                params: apiParams,
              }),
            30000,
            `historical-prices-${standardFormat}`,
            "normal"
          );

          loggerService.info(`Standard format succeeded. Count: ${standardResponse.data.prices?.length || 0}`);
          return standardResponse.data as HistoricalPriceResponse;
        } catch (standardError) {
          loggerService.info(`Standard format failed too, trying simplified format: CS.D.${epic.replace("/", "")}`);

          try {
            // Try simplified format with makeAuthenticatedRequest
            const simplifiedFormat = `CS.D.${epic.replace("/", "")}`;
            const simplifiedResponse = await this.makeAuthenticatedRequest(`api/v1/prices/${encodeURIComponent(simplifiedFormat)}`, {
              method: "GET",
              params: apiParams,
            });

            loggerService.info(`Simplified format succeeded. Count: ${simplifiedResponse.data.prices?.length || 0}`);
            return simplifiedResponse.data as HistoricalPriceResponse;
          } catch (simpleError) {
            // Last resort - try the original format
            loggerService.warn(`All formats failed, trying original epic format: ${epic}`);

            const originalResponse = await this.makeAuthenticatedRequest(`api/v1/prices/${encodeURIComponent(epic)}`, {
              method: "GET",
              params: apiParams,
            });

            loggerService.info(`Original format succeeded. Count: ${originalResponse.data.prices?.length || 0}`);
            return originalResponse.data as HistoricalPriceResponse;
          }
        }
      }
    } catch (error) {
      let errorStatus: number | undefined;
      let errorData: any;
      let errorMessage = "An unknown error occurred";
      let stack: string | undefined;

      // Use apiParams for logging if available, otherwise fall back to originalParams for early errors
      const paramsToLog = Object.keys(apiParams || {}).length > 1 ? apiParams : originalParams;

      if (error instanceof AxiosError) {
        errorStatus = error.response?.status;
        errorData = error.response?.data;
        errorMessage = error.message;
        stack = error.stack;
        loggerService.error(`Failed to get historical prices for ${epic} (AxiosError): ${errorMessage}`, {
          epic,
          params: paramsToLog,
          endpoint: `api/v1/prices/${epic}`,
          errorStatus,
          errorData,
          stack,
        });
      } else if (error instanceof Error) {
        errorMessage = error.message;
        stack = error.stack;
        loggerService.error(`Failed to get historical prices for ${epic} (Error): ${errorMessage}`, {
          epic,
          params: paramsToLog,
          endpoint: `api/v1/prices/${epic}`,
          stack,
        });
      } else {
        errorMessage = String(error);
        loggerService.error(`Failed to get historical prices for ${epic} (Unknown): ${errorMessage}`, {
          epic,
          params: paramsToLog,
          endpoint: `api/v1/prices/${epic}`,
        });
      }

      // Re-throw the error instead of returning fallback data
      throw error;
    }
  }

  /**
   * Convert historical prices to OHLC data
   *
   * @param epic Instrument epic
   * @param resolution Price resolution
   * @param prices Historical price data
   * @returns Array of OHLC data points
   */
  convertToOHLCData(epic: string, resolution: string, prices: HistoricalPrice[]): OHLCData[] {
    return prices.map((price) => {
      // Calculate middle price between bid and ask
      const open = (price.openPrice.bid + price.openPrice.ask) / 2;
      const high = (price.highPrice.bid + price.highPrice.ask) / 2;
      const low = (price.lowPrice.bid + price.lowPrice.ask) / 2;
      const close = (price.closePrice.bid + price.closePrice.ask) / 2;

      // Convert UTC string to timestamp
      const timestamp = new Date(price.snapshotTimeUTC).getTime();

      return {
        epic,
        type: "OHLC",
        resolution,
        timestamp,
        open,
        high,
        low,
        close,
        volume: price.lastTradedVolume || 0,
      };
    });
  }

  /**
   * Get the latest price for a specific instrument
   *
   * @param epic Instrument epic or symbol
   * @returns Latest price data
   */
  async getLatestPrice(epic: string): Promise<any> {
    try {
      loggerService.info(`Getting latest price for ${epic}`);

      // Try multiple epic formats to find the correct one
      const epicFormats = this.getEpicFormats(epic);

      for (const formatEpic of epicFormats) {
        try {
          loggerService.debug(`Trying epic format: ${formatEpic}`);

          // Use makeAuthenticatedRequest for proper session management with rate limiting
          const formattedEpic = encodeURIComponent(formatEpic);
          const response = await capitalApiRateLimiter.addToQueueWithTimeout(
            () =>
              this.makeAuthenticatedRequest(`api/v1/markets/${formattedEpic}`, {
                method: "GET",
              }),
            15000,
            `latest-price-${formatEpic}`,
            "high" // Higher priority for current price requests
          );

          if (response.data && response.data.snapshot) {
            loggerService.info(`Successfully got price for ${epic} using format ${formatEpic}`);
            return {
              epic: formatEpic,
              bid: response.data.snapshot.bid,
              ask: response.data.snapshot.offer,
              timestamp: Date.now(),
              marketStatus: response.data.snapshot.marketStatus,
            };
          }
        } catch (formatError: any) {
          loggerService.debug(`Format ${formatEpic} failed: ${formatError.response?.status || formatError.message}`);
          continue;
        }
      }

      // If all formats failed, log and throw error
      loggerService.error(`All epic formats failed for ${epic}. Tried: ${epicFormats.join(", ")}`);
      throw new Error(`No valid epic format found for ${epic}`);
    } catch (error) {
      loggerService.error(`Failed to get latest price for ${epic}: ${error instanceof Error ? error.message : "Unknown error"}`);
      throw error;
    }
  }

  /**
   * Get multiple epic format variations to try
   */
  private getEpicFormats(epic: string): string[] {
    const formats: string[] = [epic]; // Always try the original first

    // Convert BTC/USD to various formats
    if (epic.includes("/")) {
      const noslash = epic.replace("/", "");
      formats.push(noslash);

      // Add Capital.com specific formats for crypto
      if (epic.toUpperCase().includes("BTC") || epic.toUpperCase().includes("ETH") || epic.toUpperCase().includes("XRP")) {
        // Try direct crypto formats first (most likely to work)
        formats.push(`${noslash}`); // BTCUSD
        formats.push(`CS.D.${noslash}.CFD.IP`);
        formats.push(`CS.D.${noslash}.MINI.IP`);

        // Try CRYPTO prefix formats
        formats.push(`CRYPTO:${epic}`);
        formats.push(`CRYPTO:${noslash}`);

        // Try other common crypto formats
        formats.push(`${epic.split("/")[0]}`); // Just BTC
        formats.push(`${epic.split("/")[0]}USD`); // BTCUSD alternative
      }

      // Add standard Capital.com formats for forex
      if (epic.length === 7 && epic.includes("/")) {
        // EUR/USD, GBP/USD, etc.
        formats.push(`CS.D.${noslash}.MINI.IP`);
        formats.push(`CS.D.${noslash}.CFD.IP`);
      }
    } else {
      // If no slash, try adding common separators
      if (epic.length === 6) {
        // BTCUSD, EURUSD, etc.
        const withSlash = `${epic.substring(0, 3)}/${epic.substring(3)}`;
        formats.push(withSlash);
        formats.push(`CS.D.${epic}.CFD.IP`);
        formats.push(`CS.D.${epic}.MINI.IP`);

        // Add crypto-specific formats
        if (epic.toUpperCase().includes("BTC") || epic.toUpperCase().includes("ETH") || epic.toUpperCase().includes("XRP")) {
          formats.push(`CRYPTO:${withSlash}`);
          formats.push(`CRYPTO:${epic}`);
        }
      }

      // For direct symbols like BTCUSD, also try variations
      if (epic.toUpperCase() === "BTCUSD" || epic.toUpperCase() === "BTC") {
        formats.push("BTCUSD");
        formats.push("BTC/USD");
        formats.push("BTC");
        formats.push("CRYPTO:BTC/USD");
        formats.push("CRYPTO:BTCUSD");
        formats.push("CS.D.BTCUSD.CFD.IP");
        formats.push("CS.D.BTCUSD.MINI.IP");
      }
    }

    // Remove duplicates while preserving order
    return [...new Set(formats)];
  }

  /**
   * Subscribe to OHLC (candlestick) data via WebSocket
   *
   * @param epics Array of instrument epics
   * @param resolutions Array of price resolutions
   */
  subscribeToOHLCData(epics: string[], resolutions: string[] = [PriceResolution.MINUTE]): void {
    // This method would typically use the WebSocket connection managed by the MarketService
    // For completeness, we include it here but in a real implementation,
    // you would likely call a method on the MarketService

    loggerService.info(`[Capital Price Service] Attempting to subscribe to OHLC data for ${epics.join(", ")}`);
    loggerService.warn("OHLC data subscription should be handled by the MarketService");

    // Emit an event that can be handled by a parent service
    this.emit("subscribe_ohlc_request", { epics, resolutions });
  }
}
