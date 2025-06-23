import { EventEmitter } from "events";
import { CapitalMainService } from "./capital-main.service";
import { loggerService } from "../../../services/logger.service";

/**
 * Adapter service to maintain backward compatibility with the original Capital API service
 * This service provides the same interface as the original service while using the new modular structure internally
 */
export class CapitalApiAdapterService extends EventEmitter {
  private capitalService: CapitalMainService;

  constructor(apiKey?: string, identifier?: string, password?: string, isDemo: boolean = true) {
    super();

    // Create a new instance with credentials
    if (apiKey && identifier && password) {
      // Create a new instance with explicit credentials
      this.capitalService = new CapitalMainService(apiKey, identifier, password, isDemo);
    } else {
      // Create instance with environment variables
      this.capitalService = new CapitalMainService(
        process.env.CAPITAL_API_KEY || "",
        process.env.CAPITAL_USERNAME || "",
        process.env.CAPITAL_PASSWORD || "",
        process.env.CAPITAL_IS_DEMO === "true"
      );
    }

    // Forward all events from the capital service
    this.forwardEvents();
  }

  /**
   * Forward events from the capital service to maintain event compatibility
   */
  private forwardEvents(): void {
    // Forward market data events
    this.capitalService.on("market_data", (data) => {
      this.emit("market_data", data);
    });

    // Forward connection events
    this.capitalService.on("ws_connected", () => {
      this.emit("ws_connected");
    });

    this.capitalService.on("ws_disconnected", () => {
      this.emit("ws_disconnected");
    });

    this.capitalService.on("ws_error", (error) => {
      this.emit("ws_error", error);
    });
  }

  /**
   * Initialize the API connection
   */
  async initialize(): Promise<void> {
    return this.capitalService.initialize();
  }

  /**
   * Create a new API session (for backward compatibility)
   */
  async createSession(): Promise<any> {
    // This is already handled by the initialize method in the new structure
    loggerService.info("Create session called via adapter, using initialize method");
    return this.capitalService.initialize();
  }

  /**
   * Refresh the API session
   */
  async refreshSession(): Promise<void> {
    // This is automatically handled by the base service now
    loggerService.info("Refresh session called via adapter - this is now handled automatically");
  }

  /**
   * Connect to the WebSocket API for real-time data
   */
  async connectWebSocket(): Promise<void> {
    // This is now called as part of initialize
    loggerService.info("Connect WebSocket called via adapter, this is now part of initialize");
    return this.capitalService.initialize();
  }

  /**
   * Subscribe to market data updates
   */
  subscribeToMarketData(epics: string[]): void {
    return this.capitalService.subscribeToMarketData(epics);
  }

  /**
   * Subscribe to OHLC (candlestick) data
   */
  subscribeToOHLCData(epics: string[], resolutions: string[] = ["MINUTE"]): void {
    return this.capitalService.subscribeToOHLCData(epics, resolutions);
  }

  /**
   * Unsubscribe from market data
   */
  unsubscribeFromMarketData(epics: string[]): void {
    return this.capitalService.unsubscribeFromMarketData(epics);
  }

  /**
   * Get account details
   */
  async getAccountDetails(): Promise<any> {
    return this.capitalService.getAccountDetails();
  }

  /**
   * Search for markets by term
   */
  async searchMarkets(searchTerm: string): Promise<any> {
    return this.capitalService.searchMarkets(searchTerm);
  }

  /**
   * Get market details for a specific epic
   */
  async getMarketDetails(epic: string): Promise<any> {
    return this.capitalService.getMarketDetails(epic);
  }

  /**
   * Get historical prices for a specific epic
   */
  async getHistoricalPrices(epic: string, resolution: string = "MINUTE", from?: string, to?: string, max?: number): Promise<any> {
    return this.capitalService.getHistoricalPrices(epic, resolution, from, to, max);
  }

  /**
   * Get open positions
   */
  async getOpenPositions(): Promise<any> {
    return this.capitalService.getOpenPositions();
  }

  /**
   * Get position by ID
   */
  async getPositionById(dealId: string): Promise<any> {
    return this.capitalService.getPositionById(dealId);
  }

  /**
   * Create a position
   */
  async createPosition(epic: string, direction: "BUY" | "SELL", size: number, stopLevel?: number, profitLevel?: number): Promise<any> {
    return this.capitalService.createPosition(epic, direction, size, stopLevel, profitLevel);
  }

  /**
   * Close a position
   */
  async closePosition(dealId: string, direction: "BUY" | "SELL", size: number): Promise<any> {
    return this.capitalService.closePosition(dealId, direction, size);
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.capitalService.cleanup();
  }
}

// Export singleton instance
export const capitalApiAdapter = new CapitalApiAdapterService();
