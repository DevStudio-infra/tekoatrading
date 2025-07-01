import axios, { AxiosInstance } from "axios";
import { CapitalAuthConfig, CapitalSession } from "../interfaces/capital-session.interface";
import {
  MarketData,
  Market,
  HistoricalPrice,
  PriceResolution,
} from "../interfaces/capital-market.interface";
import {
  Position,
  Order,
  CreatePositionRequest,
  CreateOrderRequest,
  DealConfirmation,
  AccountDetails,
} from "../interfaces/capital-position.interface";
import { logger } from "../../../logger";

/**
 * Main Capital.com service that provides comprehensive trading functionality
 */
export class CapitalMainService {
  private config: CapitalAuthConfig;
  private session: CapitalSession | null = null;
  private httpClient: AxiosInstance;
  private baseUrl: string;

  constructor(config: CapitalAuthConfig) {
    this.config = config;
    this.baseUrl = config.isDemo
      ? "https://demo-api-capital.backend-capital.com"
      : "https://api-capital.backend-capital.com";

    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
        "X-SECURITY-TOKEN": "",
        CST: "",
      },
    });
  }

  /**
   * Authenticate with Capital.com API
   */
  async authenticate(): Promise<void> {
    try {
      const response = await this.httpClient.post(
        "/api/v1/session",
        {
          identifier: this.config.identifier,
          password: this.config.password,
        },
        {
          headers: {
            "X-CAP-API-KEY": this.config.apiKey,
          },
        },
      );

      if (
        response.status === 200 &&
        response.headers["cst"] &&
        response.headers["x-security-token"]
      ) {
        this.session = {
          cst: response.headers["cst"],
          securityToken: response.headers["x-security-token"],
          streamingHost: response.data?.streamingHost,
          accountId: response.data?.accountId,
          currency: response.data?.currency,
          balance: response.data?.balance,
          available: response.data?.available,
          deposit: response.data?.deposit,
          profitLoss: response.data?.profitLoss,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours
        };

        // Update default headers
        this.httpClient.defaults.headers["CST"] = this.session.cst;
        this.httpClient.defaults.headers["X-SECURITY-TOKEN"] = this.session.securityToken;
      } else {
        throw new Error("Authentication failed: Invalid response");
      }
    } catch (error: any) {
      throw new Error(`Capital.com authentication failed: ${error.message}`);
    }
  }

  /**
   * Ensure we have a valid authenticated session
   */
  private async ensureAuthenticated(): Promise<void> {
    if (!this.session || (this.session.expiresAt && this.session.expiresAt < new Date())) {
      await this.authenticate();
    }
  }

  /**
   * Get account details
   */
  async getAccountDetails(): Promise<AccountDetails> {
    await this.ensureAuthenticated();

    try {
      const response = await this.httpClient.get("/api/v1/accounts");

      if (response.data?.accounts && response.data.accounts.length > 0) {
        const account = response.data.accounts[0];

        // Handle nested balance object from Capital.com API
        const balanceValue =
          typeof account.balance === "object" && account.balance?.balance !== undefined
            ? account.balance.balance
            : account.balance;
        const depositValue =
          typeof account.balance === "object" && account.balance?.deposit !== undefined
            ? account.balance.deposit
            : account.deposit;
        const profitLossValue =
          typeof account.balance === "object" && account.balance?.profitLoss !== undefined
            ? account.balance.profitLoss
            : account.profitLoss;
        const availableValue =
          typeof account.balance === "object" && account.balance?.available !== undefined
            ? account.balance.available
            : account.available;

        logger.info(
          `📊 Capital.com Account Data: accountId=${account.accountId}, balance=${balanceValue}, available=${availableValue}`,
        );

        return {
          accountId: account.accountId,
          accountName: account.accountName,
          accountType: account.accountType,
          preferred: account.preferred,
          balance: balanceValue,
          deposit: depositValue,
          profitLoss: profitLossValue,
          available: availableValue,
          currency: account.currency,
          status: account.status,
        };
      } else {
        throw new Error("No account data found");
      }
    } catch (error: any) {
      throw new Error(`Failed to get account details: ${error.message}`);
    }
  }

  /**
   * Get open positions
   */
  async getOpenPositions(): Promise<{ positions: Position[] }> {
    await this.ensureAuthenticated();

    try {
      const response = await this.httpClient.get("/api/v1/positions");
      return {
        positions: response.data?.positions || [],
      };
    } catch (error: any) {
      throw new Error(`Failed to get positions: ${error.message}`);
    }
  }

  /**
   * Get working orders
   */
  async getWorkingOrders(): Promise<{ workingOrders: Order[] }> {
    await this.ensureAuthenticated();

    try {
      const response = await this.httpClient.get("/api/v1/workingorders");
      return {
        workingOrders: response.data?.workingOrders || [],
      };
    } catch (error: any) {
      throw new Error(`Failed to get working orders: ${error.message}`);
    }
  }

  /**
   * Create a market position with proper Capital.com confirmation flow
   */
  async createPosition(
    epic: string,
    direction: "BUY" | "SELL",
    size: number,
    stopLevel?: number,
    limitLevel?: number,
  ): Promise<DealConfirmation> {
    await this.ensureAuthenticated();

    const request: CreatePositionRequest = {
      epic,
      direction,
      size,
      orderType: "MARKET",
      stopLevel,
      limitLevel,
      forceOpen: true,
      currencyCode: this.session?.currency || "USD",
    };

    try {
      // Log the exact request being sent
      logger.info(`Sending position request to Capital.com:`, JSON.stringify(request, null, 2));
      console.log("📤 Capital.com Position Request:", request);

      const response = await this.httpClient.post("/api/v1/positions", request);

      console.log("📥 Capital.com API Response:", response.data);
      logger.info(`Capital.com API Response:`, JSON.stringify(response.data, null, 2));

      // Capital.com returns dealReference, need to check confirmation for actual status
      if (response.data?.dealReference) {
        try {
          // Wait for the deal to settle (Capital.com needs time)
          logger.info(`⏳ Waiting 3 seconds for deal to settle...`);
          await new Promise((resolve) => setTimeout(resolve, 3000));

          // Get deal confirmation to check actual status
          const confirmation = await this.getDealConfirmation(response.data.dealReference);

          logger.info(`📋 Deal confirmation:`, JSON.stringify(confirmation, null, 2));
          console.log("📋 Deal Confirmation:", confirmation);

          // Return the confirmation with dealReference for consistency
          return {
            ...confirmation,
            dealReference: response.data.dealReference,
          };
        } catch (confirmError: any) {
          logger.warn(`⚠️ Could not verify deal confirmation: ${confirmError.message}`);
          // Return the original response with a warning
          return {
            ...response.data,
            dealStatus: "UNKNOWN",
            rejectReason: `Could not verify deal: ${confirmError.message}`,
          };
        }
      }

      return response.data;
    } catch (error: any) {
      // Enhanced error logging for debugging 400 errors
      console.log("❌ Capital.com Position Error:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        request: request,
      });

      logger.error(`Failed to create position for ${epic}:`, {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
        request: request,
      });

      if (error.response?.status === 400) {
        const errorMsg =
          error.response?.data?.errorMessage || error.response?.data?.message || "Bad Request";
        throw new Error(`Failed to create position (400): ${errorMsg}`);
      }

      throw new Error(`Failed to create position: ${error.message}`);
    }
  }

  /**
   * Get deal confirmation details
   */
  async getDealConfirmation(dealReference: string): Promise<any> {
    await this.ensureAuthenticated();

    try {
      logger.info(`Getting deal confirmation for reference: ${dealReference}`);

      const response = await this.httpClient.get(`/api/v1/confirms/${dealReference}`);

      logger.info(`Deal confirmation retrieved:`, JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error: any) {
      logger.error(`Failed to get deal confirmation for ${dealReference}: ${error.message}`);
      throw new Error(`Failed to get deal confirmation: ${error.message}`);
    }
  }

  /**
   * Create a limit order
   */
  async createLimitOrder(
    epic: string,
    direction: "BUY" | "SELL",
    size: number,
    level: number,
    stopLevel?: number,
    limitLevel?: number,
  ): Promise<DealConfirmation> {
    await this.ensureAuthenticated();

    try {
      const request: CreateOrderRequest = {
        epic,
        direction,
        size,
        level,
        type: "LIMIT",
        stopLevel,
        limitLevel,
        currencyCode: this.session?.currency || "USD",
      };

      const response = await this.httpClient.post("/api/v1/workingorders", request);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to create limit order: ${error.message}`);
    }
  }

  /**
   * Close a position
   */
  async closePosition(dealId: string, size?: number): Promise<DealConfirmation> {
    await this.ensureAuthenticated();

    try {
      const request = {
        dealId,
        direction: "CLOSE",
        orderType: "MARKET",
        size,
      };

      const response = await this.httpClient.post("/api/v1/positions/close", request);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to close position: ${error.message}`);
    }
  }

  /**
   * Delete a working order
   */
  async deleteOrder(dealId: string): Promise<DealConfirmation> {
    await this.ensureAuthenticated();

    try {
      const response = await this.httpClient.delete(`/api/v1/workingorders/${dealId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to delete order: ${error.message}`);
    }
  }

  /**
   * Get market data for a symbol
   */
  async getMarketData(epic: string): Promise<Market> {
    await this.ensureAuthenticated();

    try {
      const response = await this.httpClient.get(`/api/v1/markets/${epic}`);
      return response.data?.market;
    } catch (error: any) {
      throw new Error(`Failed to get market data: ${error.message}`);
    }
  }

  /**
   * Get latest price for a symbol
   */
  async getLatestPrice(epic: string): Promise<{ bid: number; ask: number; ofr?: number }> {
    await this.ensureAuthenticated();

    try {
      const formattedEpic = encodeURIComponent(epic);
      const response = await this.httpClient.get(`/api/v1/markets/${formattedEpic}`);

      // Capital.com API returns data in response.data.snapshot, not response.data.market
      if (response.data && response.data.snapshot) {
        return {
          bid: response.data.snapshot.bid,
          ask: response.data.snapshot.offer, // Capital.com uses 'offer' instead of 'ask'
          ofr: response.data.snapshot.offer,
        };
      } else {
        throw new Error("No market data found");
      }
    } catch (error: any) {
      // Enhanced error logging for debugging
      if (error.response?.status === 401) {
        throw new Error(`Authentication failed for latest price ${epic} - check credentials`);
      } else if (error.response?.status === 404) {
        throw new Error(`Market ${epic} not found - symbol may not be available`);
      } else {
        throw new Error(`Failed to get latest price: ${error.message}`);
      }
    }
  }

  /**
   * Search for markets/instruments
   */
  async searchMarkets(searchTerm: string): Promise<Market[]> {
    await this.ensureAuthenticated();

    try {
      const response = await this.httpClient.get(
        `/api/v1/markets?searchTerm=${encodeURIComponent(searchTerm)}`,
      );
      return response.data?.markets || [];
    } catch (error: any) {
      throw new Error(`Failed to search markets: ${error.message}`);
    }
  }

  /**
   * Search for market using Capital.com search API
   */
  private async searchMarketBySymbol(symbol: string): Promise<string | null> {
    await this.ensureAuthenticated();

    try {
      // Clean and normalize the symbol for search
      const cleanSymbol = symbol.replace("/", "").replace("-", "").trim();
      const searchTerms = [
        symbol, // Original: BTC/USD
        cleanSymbol, // Clean: BTCUSD
        symbol.split("/")[0], // Base: BTC
        symbol.replace("/", " "), // Space separated: BTC USD
      ];

      for (const searchTerm of searchTerms) {
        logger.info(`🔍 Searching Capital.com markets for: "${searchTerm}"`);

        const response = await this.httpClient.get(
          `/api/v1/markets?searchTerm=${encodeURIComponent(searchTerm)}`,
        );

        if (response.data?.markets && response.data.markets.length > 0) {
          const markets = response.data.markets;

          // Try to find the best match
          for (const market of markets) {
            const marketSymbol = (market.symbol || "").toUpperCase();
            const marketName = (market.instrumentName || "").toUpperCase();
            const upperSymbol = symbol.toUpperCase();
            const upperCleanSymbol = cleanSymbol.toUpperCase();

            // Prioritize exact matches
            if (
              marketSymbol === upperSymbol ||
              marketSymbol === upperCleanSymbol ||
              marketName.includes(upperSymbol.replace("/", "")) ||
              marketName.includes(symbol.split("/")[0].toUpperCase())
            ) {
              logger.info(
                `✅ Found matching market: ${market.epic} - ${market.instrumentName} (${market.symbol})`,
              );
              return market.epic;
            }
          }

          // If no perfect match, return the first result from this search
          const firstMarket = markets[0];
          logger.info(
            `✅ Using first search result for "${searchTerm}": ${firstMarket.epic} - ${firstMarket.instrumentName}`,
          );
          return firstMarket.epic;
        }
      }

      logger.warn(`❌ No markets found for symbol: ${symbol}`);
      return null;
    } catch (error: any) {
      logger.error(`❌ Market search failed for ${symbol}: ${error.message}`);
      return null;
    }
  }

  /**
   * Legacy method - redirects to new approach
   * @deprecated Use getEpicForSymbol instead
   */
  private getStaticEpicMapping(symbol: string): string | null {
    // Redirect to the new smart approach
    return null; // Force it to use the new approach
  }

  // --------------------------------------------------------------------------
  // Symbol Service Methods (Based on the-trade-tracker-v2.0 working implementation)
  // --------------------------------------------------------------------------

  // Symbol to epic cache for performance
  private symbolToEpicCache: Map<string, string> = new Map();

  // Known working mappings (SIMPLE FORMAT - proven to work from trade-tracker-v2.0)
  private knownMappings: Map<string, string> = new Map([
    // Crypto pairs - SIMPLE FORMAT (WORKING!)
    ["BTC", "BTCUSD"],
    ["BTC/USD", "BTCUSD"],
    ["BITCOIN", "BTCUSD"],
    ["BTCUSD", "BTCUSD"],

    ["ETH", "ETHUSD"],
    ["ETH/USD", "ETHUSD"],
    ["ETHEREUM", "ETHUSD"],
    ["ETHUSD", "ETHUSD"],

    ["LTC", "LTCUSD"],
    ["LTC/USD", "LTCUSD"],
    ["LITECOIN", "LTCUSD"],
    ["LTCUSD", "LTCUSD"],

    ["XRP", "XRPUSD"],
    ["XRP/USD", "XRPUSD"],
    ["RIPPLE", "XRPUSD"],
    ["XRPUSD", "XRPUSD"],

    ["ADA", "ADAUSD"],
    ["ADA/USD", "ADAUSD"],
    ["CARDANO", "ADAUSD"],
    ["ADAUSD", "ADAUSD"],

    ["SOL", "SOLUSD"],
    ["SOL/USD", "SOLUSD"],
    ["SOLANA", "SOLUSD"],
    ["SOLUSD", "SOLUSD"],

    ["DOGE", "DOGEUSD"],
    ["DOGE/USD", "DOGEUSD"],
    ["DOGECOIN", "DOGEUSD"],
    ["DOGEUSD", "DOGEUSD"],

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
    ["GOLD", "CS.D.GOLD.CFD.IP"],
    ["XAUUSD", "CS.D.GOLD.CFD.IP"],
    ["SILVER", "CS.D.SILVER.CFD.IP"],
    ["XAGUSD", "CS.D.SILVER.CFD.IP"],
    ["OIL", "CS.D.OILCMTY.CFD.IP"],
    ["CRUDE", "CS.D.OILCMTY.CFD.IP"],
    ["NATURALGAS", "CS.D.NATURALGAS.CFD.IP"],
  ]);

  /**
   * Get epic for symbol using Capital.com search API (CORRECT approach per documentation)
   */
  async getEpicForSymbol(symbol: string): Promise<string | null> {
    if (!symbol?.trim()) {
      logger.warn("Empty symbol provided");
      return null;
    }

    const normalizedSymbol = symbol.trim().toUpperCase();
    logger.info(`🔍 Looking for epic for symbol: ${symbol} (normalized: ${normalizedSymbol})`);

    // 1. Check cache first
    if (this.symbolToEpicCache.has(normalizedSymbol)) {
      const cached = this.symbolToEpicCache.get(normalizedSymbol)!;
      logger.info(`📋 Found in cache: ${symbol} → ${cached}`);
      return cached;
    }

    // 2. Check known mappings and TEST WITH HISTORICAL PRICES
    if (this.knownMappings.has(normalizedSymbol)) {
      const mapped = this.knownMappings.get(normalizedSymbol)!;
      logger.info(`📋 Testing known mapping: ${symbol} → ${mapped}`);

      if (await this.testEpicWithHistoricalPrices(mapped)) {
        logger.info(`✅ Known mapping works for historical prices: ${symbol} → ${mapped}`);
        this.symbolToEpicCache.set(normalizedSymbol, mapped);
        return mapped;
      } else {
        logger.warn(`❌ Known mapping ${symbol} → ${mapped} failed historical prices test`);
      }
    }

    // 3. Use Capital.com search API (CORRECT approach per documentation)
    const searchResult = await this.searchEpicUsingAPI(symbol);
    if (searchResult) {
      logger.info(`✅ Found epic via search API: ${symbol} → ${searchResult}`);
      this.symbolToEpicCache.set(normalizedSymbol, searchResult);
      return searchResult;
    }

    // 4. Last resort: try some common alternative formats
    logger.info(`🔄 Trying fallback approaches for ${symbol}`);
    const fallbackCandidates = this.generateFallbackCandidates(symbol);

    for (const candidate of fallbackCandidates) {
      logger.debug(`🧪 Testing fallback candidate: ${candidate}`);
      if (await this.testEpicWithHistoricalPrices(candidate)) {
        logger.info(`✅ Found working epic via fallback: ${symbol} → ${candidate}`);
        this.symbolToEpicCache.set(normalizedSymbol, candidate);
        return candidate;
      }
    }

    logger.error(`❌ No working epic found for symbol: ${symbol}`);
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
      // Add Capital.com crypto formats
      candidates.push(`CS.D.${normalized}.CFD.IP`);
      if (normalized.includes("BTC")) {
        candidates.push("CS.D.BITCOIN.CFD.IP");
      }
      if (normalized.includes("ETH")) {
        candidates.push("CS.D.ETHEREUM.CFD.IP");
      }
    }

    // Forex-specific variations
    if (this.isForexSymbol(normalized)) {
      candidates.push(`CS.D.${normalized}.MINI.IP`);
      candidates.push(`CS.D.${normalized}.CFD.IP`);
    }

    // General Capital.com formats
    candidates.push(`CS.D.${normalized}.CFD.IP`);
    candidates.push(`CS.D.${normalized}.MINI.IP`);

    // Remove duplicates
    return [...new Set(candidates)];
  }

  /**
   * Test if an epic works with the API
   */
  private async testEpic(epic: string): Promise<boolean> {
    try {
      await this.ensureAuthenticated();
      const response = await this.httpClient.get(`/api/v1/markets/${encodeURIComponent(epic)}`);
      return response.status === 200 && response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        logger.debug(`Epic ${epic} not found (404)`);
        return false;
      }
      logger.debug(`Epic ${epic} test failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Test if an epic works for historical prices (the real test that matters!)
   */
  private async testEpicWithHistoricalPrices(epic: string): Promise<boolean> {
    // Try multiple resolutions - Capital.com doesn't support date filtering
    const testConfigs = [
      { resolution: "DAY", max: 5 }, // Try daily data (most likely to work)
      { resolution: "HOUR", max: 10 }, // Try hourly data
      { resolution: "MINUTE", max: 10 }, // Try minute data
    ];

    for (const config of testConfigs) {
      try {
        await this.ensureAuthenticated();

        // Use simple format without date parameters (Capital.com doesn't support from/to)
        const url = `/api/v1/prices/${encodeURIComponent(epic)}?resolution=${config.resolution}&max=${config.max}`;
        logger.debug(`🧪 Testing historical prices for ${epic} (${config.resolution}): ${url}`);

        const response = await this.httpClient.get(url);

        const hasData =
          response.status === 200 && response.data?.prices && Array.isArray(response.data.prices);
        const dataCount = response.data?.prices?.length || 0;

        logger.debug(
          `📊 Historical prices test for ${epic} (${config.resolution}): status=${response.status}, hasData=${hasData}, count=${dataCount}`,
        );

        if (hasData && dataCount > 0) {
          logger.info(
            `✅ Epic ${epic} works with ${config.resolution} resolution (${dataCount} data points)`,
          );
          return true;
        }

        if (!hasData && response.data) {
          logger.debug(
            `💾 Epic ${epic} (${config.resolution}) response:`,
            JSON.stringify(response.data, null, 2),
          );
        }
      } catch (error: any) {
        const status = error.response?.status;
        const message = error.response?.data?.message || error.message;

        logger.debug(`❌ Epic ${epic} (${config.resolution}) failed: ${status} - ${message}`);

        // Continue to next resolution instead of failing completely
        continue;
      }
    }

    // If all resolutions failed, log final failure
    logger.debug(`❌ Epic ${epic} failed all historical price tests`);
    return false;
  }

  /**
   * Search for epic using Capital.com search API (CORRECT approach per documentation)
   */
  private async searchEpicUsingAPI(symbol: string): Promise<string | null> {
    try {
      await this.ensureAuthenticated();

      // Create search terms based on the symbol
      const searchTerms = this.generateSearchTerms(symbol);

      for (const searchTerm of searchTerms) {
        logger.info(`🔍 Searching Capital.com API for: "${searchTerm}"`);

        try {
          const response = await this.httpClient.get(
            `/api/v1/markets?searchTerm=${encodeURIComponent(searchTerm)}`,
          );

          if (response.data?.markets && response.data.markets.length > 0) {
            logger.info(`📋 Found ${response.data.markets.length} markets for "${searchTerm}"`);

            // Test ALL markets, not just the "best" match
            for (const market of response.data.markets) {
              logger.debug(
                `🧪 Testing market: ${market.epic} (${market.instrumentName || market.symbol})`,
              );

              if (await this.testEpicWithHistoricalPrices(market.epic)) {
                logger.info(
                  `✅ Found working epic via search: ${symbol} → ${market.epic} (${market.instrumentName || market.symbol})`,
                );
                return market.epic;
              } else {
                logger.debug(`❌ Market ${market.epic} failed historical prices test`);
              }
            }

            logger.warn(
              `❌ None of the ${response.data.markets.length} search results worked for historical prices`,
            );
          } else {
            logger.debug(`📋 No markets found for search term: "${searchTerm}"`);
          }
        } catch (searchError: any) {
          logger.warn(`Search failed for "${searchTerm}": ${searchError.message}`);
        }
      }

      return null;
    } catch (error: any) {
      logger.error(`Epic search failed for ${symbol}:`, error.message);
      return null;
    }
  }

  /**
   * Generate search terms for the Capital.com API
   */
  private generateSearchTerms(symbol: string): string[] {
    const terms: string[] = [];
    const normalized = symbol.trim().toUpperCase();

    // Add the symbol as-is
    terms.push(normalized);

    // If it's a slash-separated pair, try individual parts
    if (normalized.includes("/")) {
      const [base, quote] = normalized.split("/");
      terms.push(base);
      terms.push(quote);
      terms.push(base + quote); // BTCUSD
    }

    // Common crypto names
    if (normalized.includes("BTC")) {
      terms.push("Bitcoin");
      terms.push("BTC");
    }
    if (normalized.includes("ETH")) {
      terms.push("Ethereum");
      terms.push("ETH");
    }
    if (normalized.includes("LTC")) {
      terms.push("Litecoin");
      terms.push("LTC");
    }

    // Remove duplicates and empty strings
    return [...new Set(terms.filter((term) => term.length > 0))];
  }

  /**
   * Find the best market match from search results
   */
  private findBestMarketMatch(symbol: string, markets: any[]): any | null {
    const normalized = symbol.trim().toUpperCase();

    // Look for exact symbol match first
    for (const market of markets) {
      if (
        market.symbol?.toUpperCase() === normalized ||
        market.epic?.toUpperCase() === normalized
      ) {
        return market;
      }
    }

    // Look for partial matches in symbol or epic
    for (const market of markets) {
      const marketSymbol = market.symbol?.toUpperCase() || "";
      const marketEpic = market.epic?.toUpperCase() || "";
      const marketName = market.instrumentName?.toUpperCase() || "";

      if (
        marketSymbol.includes(normalized) ||
        marketEpic.includes(normalized) ||
        marketName.includes(normalized) ||
        normalized.includes(marketSymbol)
      ) {
        return market;
      }
    }

    // Return the first result if no specific match found
    return markets.length > 0 ? markets[0] : null;
  }

  /**
   * Generate fallback candidates for testing (SIMPLE FORMAT FIRST - proven working)
   */
  private generateFallbackCandidates(symbol: string): string[] {
    const normalized = symbol.trim().toUpperCase();
    const candidates: string[] = [];

    // CRYPTO: Simple format first (WORKING approach from trade-tracker-v2.0)
    if (this.isCryptoSymbol(normalized)) {
      // For BTC variations - SIMPLE FORMAT FIRST
      if (normalized.includes("BTC")) {
        candidates.push("BTCUSD"); // Simple format (WORKING!)
        candidates.push("BTC"); // Just BTC
        candidates.push("CS.D.BITCOIN.CFD.IP"); // Complex format as fallback
        candidates.push("CS.D.CFDBTC.CFD.IP"); // Alternative complex format
      }

      // For ETH variations - SIMPLE FORMAT FIRST
      if (normalized.includes("ETH")) {
        candidates.push("ETHUSD"); // Simple format (WORKING!)
        candidates.push("ETH"); // Just ETH
        candidates.push("CS.D.ETHEREUM.CFD.IP"); // Complex format as fallback
        candidates.push("CS.D.CFDETHEREUM.CFD.IP"); // Alternative complex format
      }

      // For any crypto pair - try simple format first
      if (normalized.includes("/")) {
        const [base, quote] = normalized.split("/");
        candidates.push(base + quote); // BTCUSD, ETHUSD, etc. (WORKING!)
        candidates.push(`CS.D.${base}.CFD.IP`); // Complex format as fallback
      }
    }

    // FOREX: Use Capital.com format
    if (normalized.includes("EUR") && normalized.includes("USD")) {
      candidates.push("EURUSD");
      candidates.push("CS.D.EURUSD.MINI.IP");
      candidates.push("EUR_USD");
    }

    if (normalized.includes("GBP") && normalized.includes("USD")) {
      candidates.push("GBPUSD");
      candidates.push("CS.D.GBPUSD.MINI.IP");
      candidates.push("GBP_USD");
    }

    // Generic alternatives for any symbol
    if (normalized.includes("/")) {
      const [base, quote] = normalized.split("/");
      candidates.push(base + quote); // Simple concatenation (BEST for crypto)
      candidates.push(base + "_" + quote); // Underscore variant
      candidates.push(base + "." + quote); // Dot variant
      candidates.push(`CS.D.${base}${quote}.CFD.IP`); // Capital.com format
      candidates.push(`CS.D.${base}${quote}.MINI.IP`); // Capital.com mini format
    }

    return [...new Set(candidates)];
  }

  /**
   * Simple crypto detection
   */
  private isCryptoSymbol(symbol: string): boolean {
    const cryptoSymbols = [
      "BTC",
      "ETH",
      "LTC",
      "XRP",
      "ADA",
      "SOL",
      "DOGE",
      "BITCOIN",
      "ETHEREUM",
      "LITECOIN",
    ];
    return cryptoSymbols.some((crypto) => symbol.includes(crypto));
  }

  /**
   * Simple forex detection
   */
  private isForexSymbol(symbol: string): boolean {
    // Usually 6 characters like EURUSD or has a slash like EUR/USD
    return (symbol.length === 6 && /^[A-Z]{6}$/.test(symbol)) || symbol.includes("/");
  }

  /**
   * Map our timeframe format to Capital.com PriceResolution format
   */
  private mapTimeframeToResolution(timeframe: string): PriceResolution {
    // If it's already a valid Capital.com resolution, return as-is
    const validResolutions = [
      "MINUTE",
      "MINUTE_5",
      "MINUTE_15",
      "MINUTE_30",
      "HOUR",
      "HOUR_4",
      "DAY",
      "WEEK",
    ];
    if (validResolutions.includes(timeframe)) {
      logger.info(`📊 Already valid resolution: ${timeframe}`);
      return timeframe as PriceResolution;
    }

    const timeframeMap: { [key: string]: PriceResolution } = {
      M1: "MINUTE",
      M5: "MINUTE_5",
      M15: "MINUTE_15",
      M30: "MINUTE_30",
      H1: "HOUR",
      H4: "HOUR_4",
      D1: "DAY",
      W1: "WEEK",
    };

    const resolution = timeframeMap[timeframe];
    if (!resolution) {
      logger.warn(`⚠️ Unknown timeframe ${timeframe}, defaulting to MINUTE`);
      return "MINUTE";
    }

    logger.info(`📊 Mapped timeframe ${timeframe} → ${resolution}`);
    return resolution;
  }

  /**
   * Get historical prices with smart symbol resolution
   * Note: Capital.com API doesn't support date filtering, returns recent data only
   */
  async getHistoricalPrices(
    symbol: string,
    timeframeOrResolution: string | PriceResolution,
    maxPoints: number = 100, // Use maxPoints instead of from/to dates
  ): Promise<HistoricalPrice[]> {
    await this.ensureAuthenticated();

    logger.info(`📊 Resolving epic for symbol: ${symbol}`);

    // Resolve symbol to epic using our smart approach
    const epic = await this.getEpicForSymbol(symbol);
    if (!epic) {
      throw new Error(
        `Market not found: ${symbol}. Could not resolve to a valid Capital.com epic.`,
      );
    }

    // Convert timeframe to Capital.com resolution format if needed
    let resolution: PriceResolution;
    if (
      typeof timeframeOrResolution === "string" &&
      (timeframeOrResolution.startsWith("M") ||
        timeframeOrResolution.startsWith("H") ||
        timeframeOrResolution.startsWith("D"))
    ) {
      resolution = this.mapTimeframeToResolution(timeframeOrResolution);
    } else {
      resolution = timeframeOrResolution as PriceResolution;
    }

    logger.info(
      `📈 Fetching historical prices for epic: ${epic} (${resolution}, max: ${maxPoints})`,
    );

    try {
      // Use simple format without date parameters (Capital.com doesn't support from/to)
      const response = await this.httpClient.get(
        `/api/v1/prices/${encodeURIComponent(epic)}?resolution=${resolution}&max=${maxPoints}`,
      );

      if (response.data?.prices?.length > 0) {
        logger.info(
          `✅ Successfully fetched ${response.data.prices.length} price points for ${symbol}`,
        );
        return response.data.prices.map((price: any) => ({
          snapshotTime: price.snapshotTime,
          snapshotTimeUTC: price.snapshotTimeUTC,
          openPrice: { bid: price.openPrice.bid, ask: price.openPrice.ask },
          closePrice: { bid: price.closePrice.bid, ask: price.closePrice.ask },
          highPrice: { bid: price.highPrice.bid, ask: price.highPrice.ask },
          lowPrice: { bid: price.lowPrice.bid, ask: price.lowPrice.ask },
          lastTradedVolume: price.lastTradedVolume,
        }));
      } else {
        logger.warn(`⚠️ No price data returned for ${symbol} (epic: ${epic})`);
        return [];
      }
    } catch (error: any) {
      const errorMsg = `❌ Failed to fetch historical prices for ${symbol} (epic: ${epic}): ${error.response?.status || error.message}`;
      logger.error(errorMsg);
      throw new Error(errorMsg);
    }
  }

  /**
   * Subscribe to market data (WebSocket functionality)
   */
  subscribeToMarketData(epics: string[]): void {
    // This would be implemented with WebSocket connection
    // For now, we'll just log the subscription
    console.log(`Subscribing to market data for: ${epics.join(", ")}`);
  }

  /**
   * Event emitter functionality for market data
   */
  on(event: string, callback: (data: any) => void): void {
    // This would be implemented with EventEmitter
    console.log(`Registered listener for event: ${event}`);
  }

  /**
   * Get session information
   */
  getSession(): CapitalSession | null {
    return this.session;
  }

  /**
   * Check if connected
   */
  get isConnected(): boolean {
    return (
      this.session !== null && (!this.session.expiresAt || this.session.expiresAt > new Date())
    );
  }

  /**
   * Check if demo account
   */
  get isDemo(): boolean {
    return this.config.isDemo || false;
  }
}
