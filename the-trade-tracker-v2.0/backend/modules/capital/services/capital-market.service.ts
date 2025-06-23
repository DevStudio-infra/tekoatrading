import WebSocket from "ws";
import { loggerService } from "../../../services/logger.service";
import { CapitalBaseService } from "./capital-base.service";
import { CapitalAuthConfig } from "../interfaces/capital-session.interface";
import { MarketData, Market, MarketSearchResponse, MarketDetailsResponse } from "../interfaces/capital-market.interface";

/**
 * Service for managing Capital.com market data operations
 */
export class CapitalMarketService extends CapitalBaseService {
  private wsClient: WebSocket | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private activeEpics: string[] = [];
  private wsEndpoint: string | null = null;

  constructor(config: CapitalAuthConfig) {
    super(config);
  }

  /**
   * Connect to the WebSocket API for real-time data
   */
  async connectWebSocket(): Promise<void> {
    try {
      // TEMPORARILY DISABLED: Let's focus on fixing the historical data API first
      loggerService.info("WebSocket connection temporarily disabled - focusing on historical data API");

      // Ensure we have a valid session first
      await this.ensureAuthenticated();

      // Get session data to find the streaming endpoint
      const sessionData = await this.createSession();

      // Handle different formats of streamingHost from Capital.com
      let streamingHost = sessionData.streamingHost;

      if (!streamingHost) {
        // Use the correct Capital.com WebSocket endpoint from documentation
        streamingHost = this.isDemo ? "demo-api-streaming-capital.backend-capital.com" : "api-streaming-capital.backend-capital.com";

        loggerService.warn(`No streamingHost in session data, using fallback: ${streamingHost}`);
      }

      // Clean up the streaming host URL
      // Remove any protocol prefix if present
      streamingHost = streamingHost.replace(/^(https?:\/\/|wss?:\/\/)/, "");
      // Remove trailing slash and any path
      streamingHost = streamingHost.replace(/\/.*$/, "");

      this.wsEndpoint = streamingHost;

      loggerService.info(`Using streaming host: ${this.wsEndpoint}`);

      // Close existing WebSocket if any
      if (this.wsClient) {
        this.wsClient.close();
        this.wsClient = null;
      }

      // Clear existing intervals
      this.clearIntervals();

      // Construct the proper WebSocket URL with /connect path as per Capital.com documentation
      const wsUrl = `wss://${this.wsEndpoint}/connect`;
      loggerService.info(`Connecting to Capital.com WebSocket at ${wsUrl}`);

      this.wsClient = new WebSocket(wsUrl);

      // Set up WebSocket event handlers
      this.wsClient.on("open", () => {
        loggerService.info("✅ WebSocket connection established successfully");

        // Send authentication message first using Capital.com WebSocket API format
        if (this.cst && this.securityToken) {
          const authMessage = {
            destination: "ping", // Start with ping to test connection
            correlationId: "auth_" + Date.now(),
            cst: this.cst,
            securityToken: this.securityToken,
          };

          loggerService.info("Sending WebSocket authentication message");
          this.wsClient?.send(JSON.stringify(authMessage));
        } else {
          loggerService.error("Missing CST or Security Token for WebSocket authentication");
        }

        // Set up ping interval to keep the connection alive (every 5 minutes as per docs)
        this.pingInterval = setInterval(() => this.pingWebSocket(), 300000); // 5 minutes

        this.emit("ws_connected");
      });

      this.wsClient.on("message", (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());

          loggerService.debug(`WebSocket message received:`, message);

          // Handle different message types according to Capital.com WebSocket API
          if (message.status === "OK") {
            if (message.destination === "ping") {
              loggerService.info("✅ WebSocket ping successful - connection authenticated");

              // Now re-subscribe to active epics if any
              if (this.activeEpics.length > 0) {
                loggerService.info(`Re-subscribing to ${this.activeEpics.length} active epics`);
                this.subscribeToMarketData(this.activeEpics);
              }
            } else if (message.destination === "marketData.subscribe") {
              loggerService.info("✅ Market data subscription successful");
            } else if (message.destination === "quote") {
              // Real-time market data
              const marketData: MarketData = {
                epic: message.payload.epic,
                product: message.payload.product || "",
                bid: parseFloat(message.payload.bid),
                bidQty: parseFloat(message.payload.bidQty || "0"),
                ofr: parseFloat(message.payload.ofr),
                ofrQty: parseFloat(message.payload.ofrQty || "0"),
                timestamp: message.payload.timestamp || Date.now(),
              };

              this.emit("market_data", marketData);
            }
          } else {
            // Handle error messages
            loggerService.warn(`WebSocket message with status: ${message.status}`, message);
          }
        } catch (error) {
          loggerService.error(`Error processing WebSocket message: ${error instanceof Error ? error.message : "Unknown error"}`);
          loggerService.debug(`Raw message data:`, data.toString());
        }
      });

      this.wsClient.on("close", (code, reason) => {
        loggerService.warn(`WebSocket connection closed with code: ${code}, reason: ${reason}`);
        this.clearIntervals();

        // Set up reconnect interval - but don't reconnect too aggressively
        if (!this.reconnectInterval) {
          this.reconnectInterval = setInterval(() => {
            loggerService.info("Attempting to reconnect WebSocket...");
            this.connectWebSocket().catch((error) => {
              loggerService.error(`Failed to reconnect WebSocket: ${error instanceof Error ? error.message : "Unknown error"}`);
            });
          }, 30000); // Try to reconnect every 30 seconds (less aggressive)
        }

        this.emit("ws_disconnected");
      });

      this.wsClient.on("error", (error) => {
        loggerService.error(`WebSocket error: ${error.message}`);
        this.emit("ws_error", error);
      });
    } catch (error) {
      loggerService.error(`Failed to connect to WebSocket: ${error instanceof Error ? error.message : "Unknown error"}`);
      throw error;
    }
  }

  /**
   * Clear all intervals to prevent memory leaks
   */
  private clearIntervals(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }
  }

  /**
   * Send ping to keep WebSocket connection alive using Capital.com format
   */
  private pingWebSocket(): void {
    if (this.wsClient && this.wsClient.readyState === WebSocket.OPEN) {
      try {
        const pingMessage = {
          destination: "ping",
          correlationId: "ping_" + Date.now(),
          cst: this.cst,
          securityToken: this.securityToken,
        };

        this.wsClient.send(JSON.stringify(pingMessage));
        loggerService.debug("WebSocket ping sent");
      } catch (error) {
        loggerService.error(`Failed to send ping: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }
  }

  /**
   * Subscribe to market data updates using Capital.com WebSocket API format
   *
   * @param epics List of market epics to subscribe to
   */
  subscribeToMarketData(epics: string[]): void {
    if (!this.wsClient || this.wsClient.readyState !== WebSocket.OPEN) {
      loggerService.warn("WebSocket not connected, storing epics for later subscription");
      this.activeEpics = [...new Set([...this.activeEpics, ...epics])];
      return;
    }

    try {
      loggerService.info(`Subscribing to market data for ${epics.join(", ")}`);

      const subscribeMessage = {
        destination: "marketData.subscribe",
        correlationId: "subscribe_" + Date.now(),
        cst: this.cst,
        securityToken: this.securityToken,
        payload: {
          epics: epics,
        },
      };

      this.wsClient.send(JSON.stringify(subscribeMessage));

      // Store active epics for reconnection
      this.activeEpics = [...new Set([...this.activeEpics, ...epics])];
    } catch (error) {
      loggerService.error(`Failed to subscribe to market data: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Unsubscribe from market data using Capital.com WebSocket API format
   *
   * @param epics List of market epics to unsubscribe from
   */
  unsubscribeFromMarketData(epics: string[]): void {
    if (!this.wsClient || this.wsClient.readyState !== WebSocket.OPEN) {
      loggerService.warn("WebSocket not connected, unable to unsubscribe from market data");
      return;
    }

    try {
      loggerService.info(`Unsubscribing from market data for ${epics.join(", ")}`);

      const unsubscribeMessage = {
        destination: "marketData.unsubscribe",
        correlationId: "unsubscribe_" + Date.now(),
        cst: this.cst,
        securityToken: this.securityToken,
        payload: {
          epics: epics,
        },
      };

      this.wsClient.send(JSON.stringify(unsubscribeMessage));

      // Remove from active epics
      this.activeEpics = this.activeEpics.filter((epic) => !epics.includes(epic));
    } catch (error) {
      loggerService.error(`Failed to unsubscribe from market data: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Search for markets by term
   *
   * @param searchTerm Search term to find markets
   * @returns List of matching markets
   */
  async searchMarkets(searchTerm: string): Promise<MarketSearchResponse> {
    try {
      await this.ensureAuthenticated();

      loggerService.info(`Searching for markets matching term: ${searchTerm}`);

      const response = await this.apiClient.get("api/v1/markets", {
        params: {
          searchTerm,
        },
      });

      return response.data as MarketSearchResponse;
    } catch (error) {
      loggerService.error(`Failed to search markets: ${error instanceof Error ? error.message : "Unknown error"}`);
      throw error;
    }
  }

  /**
   * Get market details for a specific epic
   */
  async getMarketDetails(epic: string): Promise<MarketDetailsResponse | null> {
    try {
      const formattedEpic = encodeURIComponent(epic);
      loggerService.info(`Getting market details for ${epic} (formatted: ${formattedEpic})`);

      const response = await this.makeAuthenticatedRequest(`api/v1/markets/${formattedEpic}`, {
        method: "GET",
      });

      return response.data;
    } catch (error: any) {
      // Enhanced error logging for debugging
      if (error.response?.status === 401) {
        loggerService.error(`Authentication failed for market details ${epic} - check credentials`);
      } else if (error.response?.status === 404) {
        loggerService.warn(`Market ${epic} not found - symbol may not be available`);
      } else {
        loggerService.error(`Failed to get market details for ${epic}: ${error.message}`);
      }

      // Log additional context for debugging
      if (error.response?.data) {
        loggerService.debug(`API response data:`, error.response.data);
      }

      return null;
    }
  }

  /**
   * Get latest price for an epic
   */
  async getLatestPrice(epic: string): Promise<MarketData | null> {
    try {
      const formattedEpic = encodeURIComponent(epic);
      loggerService.info(`Getting latest price for ${epic} (formatted: ${formattedEpic})`);

      const response = await this.makeAuthenticatedRequest(`api/v1/markets/${formattedEpic}`, {
        method: "GET",
      });

      if (response.data && response.data.snapshot) {
        return {
          epic: epic,
          product: response.data.product || "",
          bid: response.data.snapshot.bid,
          bidQty: 0,
          ofr: response.data.snapshot.offer, // Capital.com uses 'offer' instead of 'ask'
          ofrQty: 0,
          timestamp: Date.now(),
        };
      }

      return null;
    } catch (error: any) {
      // Enhanced error logging for debugging
      if (error.response?.status === 401) {
        loggerService.error(`Authentication failed for latest price ${epic} - check credentials`);
      } else if (error.response?.status === 404) {
        loggerService.warn(`Market ${epic} not found - symbol may not be available`);
      } else {
        loggerService.error(`Failed to get latest price for ${epic}: ${error.message}`);
      }

      // Log additional context for debugging
      if (error.response?.data) {
        loggerService.debug(`API response data:`, error.response.data);
      }

      return null;
    }
  }

  /**
   * Clean up resources
   */
  override cleanup(): void {
    super.cleanup();

    // Close WebSocket connection
    if (this.wsClient) {
      this.wsClient.close();
      this.wsClient = null;
    }

    // Clear intervals
    this.clearIntervals();

    // Reset state
    this.activeEpics = [];
    this.wsEndpoint = null;
  }
}
