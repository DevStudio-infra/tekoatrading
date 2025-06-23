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
        return {
          accountId: account.accountId,
          accountName: account.accountName,
          accountType: account.accountType,
          preferred: account.preferred,
          balance: account.balance,
          deposit: account.deposit,
          profitLoss: account.profitLoss,
          available: account.available,
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
   * Create a market position
   */
  async createPosition(
    epic: string,
    direction: "BUY" | "SELL",
    size: number,
    stopLevel?: number,
    limitLevel?: number,
  ): Promise<DealConfirmation> {
    await this.ensureAuthenticated();

    try {
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

      const response = await this.httpClient.post("/api/v1/positions", request);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to create position: ${error.message}`);
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
      const response = await this.httpClient.get(`/api/v1/markets/${epic}`);
      const market = response.data?.market;

      if (market) {
        return {
          bid: market.bid,
          ask: market.offer,
          ofr: market.offer,
        };
      } else {
        throw new Error("No market data found");
      }
    } catch (error: any) {
      throw new Error(`Failed to get latest price: ${error.message}`);
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
   * Get historical prices
   */
  async getHistoricalPrices(
    epic: string,
    resolution: PriceResolution,
    from: string,
    to: string,
  ): Promise<HistoricalPrice[]> {
    await this.ensureAuthenticated();

    try {
      const response = await this.httpClient.get(
        `/api/v1/prices/${epic}?resolution=${resolution}&from=${from}&to=${to}`,
      );
      return response.data?.prices || [];
    } catch (error: any) {
      throw new Error(`Failed to get historical prices: ${error.message}`);
    }
  }

  /**
   * Get epic for symbol (symbol mapping)
   */
  async getEpicForSymbol(symbol: string): Promise<string | null> {
    try {
      // Common symbol mappings for Capital.com
      const symbolMappings: Record<string, string> = {
        "BTC/USD": "BITCOIN",
        "ETH/USD": "ETHEREUM",
        "EUR/USD": "EURUSD",
        "GBP/USD": "GBPUSD",
        "USD/JPY": "USDJPY",
        AAPL: "APPLE",
        GOOGL: "ALPHABET",
        TSLA: "TESLA",
        MSFT: "MICROSOFT",
        AMZN: "AMAZON",
      };

      // Try direct mapping first
      if (symbolMappings[symbol]) {
        return symbolMappings[symbol];
      }

      // Search for the symbol
      const markets = await this.searchMarkets(symbol);
      if (markets.length > 0) {
        return markets[0].epic;
      }

      return null;
    } catch (error) {
      return null;
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
