import { EventEmitter } from "events";
import { loggerService } from "../../../services/logger.service";
import { CapitalAuthConfig } from "../interfaces/capital-session.interface";
import { CapitalBaseService } from "./capital-base.service";
import { CapitalMarketService } from "./capital-market.service";
import { capitalApiRateLimiter } from "../../../services/capital-api-rate-limiter.service";
import { CapitalPriceService } from "./capital-price.service";
import { CapitalPositionService } from "./capital-position.service";
import { CapitalSymbolService } from "./capital-symbol.service";

/**
 * Main service that integrates all Capital.com API functionality
 * Acts as a facade for the individual services
 */
export class CapitalMainService extends EventEmitter {
  private readonly authConfig: CapitalAuthConfig;

  // Individual services
  private readonly baseService: CapitalBaseService;
  private readonly marketService: CapitalMarketService;
  private readonly priceService: CapitalPriceService;
  private readonly positionService: CapitalPositionService;
  private readonly symbolService: CapitalSymbolService;

  // Rate limiting properties
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;
  private lastRequestTime = 0;
  private readonly MIN_REQUEST_INTERVAL = 500; // 500ms between requests
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 2000; // 2 seconds

  constructor(apiKey: string, identifier: string, password: string, isDemo: boolean = true) {
    super();

    // Increase max listeners to prevent memory leak warnings
    this.setMaxListeners(20);

    // Create auth config
    this.authConfig = {
      apiKey,
      identifier,
      password,
      isDemo,
    };

    // Initialize individual services
    this.baseService = new CapitalBaseService(this.authConfig);
    this.marketService = new CapitalMarketService(this.authConfig);
    this.priceService = new CapitalPriceService(this.authConfig);
    this.positionService = new CapitalPositionService(this.authConfig);
    this.symbolService = new CapitalSymbolService(this.authConfig);

    // Forward events from services
    this.setupEventForwarding();
  }

  /**
   * Initialize all services
   */
  async initialize(): Promise<void> {
    try {
      loggerService.info("Initializing Capital.com API services");

      // Initialize base service first (establishes authentication)
      await this.baseService.initialize();

      // Connect to WebSocket for real-time data
      await this.marketService.connectWebSocket();

      loggerService.info("Capital.com API services initialized successfully");
    } catch (error) {
      loggerService.error(`Failed to initialize Capital.com API services: ${error instanceof Error ? error.message : "Unknown error"}`);
      throw error;
    }
  }

  /**
   * Set up event forwarding from individual services
   */
  private setupEventForwarding(): void {
    // Forward market data events
    this.marketService.on("market_data", (data) => {
      this.emit("market_data", data);
    });

    this.marketService.on("ws_connected", () => {
      this.emit("ws_connected");
    });

    this.marketService.on("ws_disconnected", () => {
      this.emit("ws_disconnected");
    });

    this.marketService.on("ws_error", (error) => {
      this.emit("ws_error", error);
    });

    // Forward other events as needed
    this.priceService.on("subscribe_ohlc_request", (request) => {
      // Handle OHLC subscription requests from the price service
      this.marketService.subscribeToMarketData(request.epics);
    });
  }

  // --------------------------------------------------------------------------
  // Base Service Methods
  // --------------------------------------------------------------------------

  /**
   * Get account details
   */
  async getAccountDetails(): Promise<any> {
    return this.baseService.getAccountDetails();
  }

  // --------------------------------------------------------------------------
  // Market Service Methods
  // --------------------------------------------------------------------------

  /**
   * Subscribe to market data updates
   *
   * @param epics List of market epics to subscribe to
   */
  subscribeToMarketData(epics: string[]): void {
    this.marketService.subscribeToMarketData(epics);
  }

  /**
   * Unsubscribe from market data
   *
   * @param epics List of market epics to unsubscribe from
   */
  unsubscribeFromMarketData(epics: string[]): void {
    this.marketService.unsubscribeFromMarketData(epics);
  }

  /**
   * Search for markets by term
   *
   * @param searchTerm Search term to find markets
   * @returns List of matching markets
   */
  async searchMarkets(searchTerm: string): Promise<any> {
    return this.marketService.searchMarkets(searchTerm);
  }

  /**
   * Get details for a specific market
   *
   * @param epic Market epic or symbol to get details for
   * @returns Market details
   */
  async getMarketDetails(epic: string): Promise<any> {
    // Try to map the symbol to the correct epic first
    let correctEpic = epic;
    try {
      const mappedEpic = await this.symbolService.getEpicForSymbol(epic);
      if (mappedEpic) {
        correctEpic = mappedEpic;
        loggerService.debug(`[CAPITAL MAIN] Symbol mapped for market details: ${epic} → ${correctEpic}`);
      }
    } catch (symbolError) {
      loggerService.debug(`[CAPITAL MAIN] Symbol mapping failed for ${epic}, using as-is: ${symbolError instanceof Error ? symbolError.message : "Unknown error"}`);
    }

    return this.marketService.getMarketDetails(correctEpic);
  }

  // --------------------------------------------------------------------------
  // Price Service Methods
  // --------------------------------------------------------------------------

  /**
   * Get historical prices for a specific instrument
   *
   * @param epic Instrument epic
   * @param resolution Price candle resolution (timeframe)
   * @param from Start date (ISO string format)
   * @param to End date (ISO string format)
   * @param max Maximum number of data points to return
   * @returns Historical price data
   */
  async getHistoricalPrices(epic: string, resolution?: string, from?: string, to?: string, max?: number): Promise<any> {
    return this.queueRequest(() => this.priceService.getHistoricalPrices(epic, resolution, from, to, max));
  }

  /**
   * Get the latest price for a specific instrument
   *
   * @param epic Instrument epic or symbol
   * @returns Latest price data
   */
  async getLatestPrice(epic: string): Promise<any> {
    // Try to map the symbol to the correct epic first
    let correctEpic = epic;
    try {
      const mappedEpic = await this.symbolService.getEpicForSymbol(epic);
      if (mappedEpic) {
        correctEpic = mappedEpic;
        loggerService.info(`[CAPITAL MAIN] Symbol mapped for price lookup: ${epic} → ${correctEpic}`);
      }
    } catch (symbolError) {
      loggerService.debug(`[CAPITAL MAIN] Symbol mapping failed for ${epic}, using as-is: ${symbolError instanceof Error ? symbolError.message : "Unknown error"}`);
    }

    return this.queueRequest(() => this.priceService.getLatestPrice(correctEpic));
  }

  /**
   * Subscribe to OHLC (candlestick) data
   *
   * @param epics Array of instrument epics
   * @param resolutions Array of price resolutions
   */
  subscribeToOHLCData(epics: string[], resolutions?: string[]): void {
    this.priceService.subscribeToOHLCData(epics, resolutions);
  }

  // --------------------------------------------------------------------------
  // Position Service Methods
  // --------------------------------------------------------------------------

  /**
   * Get all open positions for the account
   *
   * @returns List of open positions
   */
  async getOpenPositions(): Promise<any> {
    return this.positionService.getOpenPositions();
  }

  /**
   * Get details for a specific position
   *
   * @param dealId Deal ID of the position
   * @returns Position details
   */
  async getPositionById(dealId: string): Promise<any> {
    return this.positionService.getPositionById(dealId);
  }

  /**
   * Create a new trading position
   *
   * @param epic Market epic to trade
   * @param direction Buy or sell direction
   * @param size Position size
   * @param stopLevel Optional stop loss level
   * @param profitLevel Optional take profit level
   * @returns Position creation response
   */
  async createPosition(epic: string, direction: "BUY" | "SELL", size: number, stopLevel?: number, profitLevel?: number): Promise<any> {
    return this.positionService.createPosition(epic, direction, size, stopLevel, profitLevel);
  }

  /**
   * Close an existing position
   *
   * @param dealId Deal ID of the position to close
   * @param direction Closing direction (opposite of opening direction)
   * @param size Position size to close (can be partial)
   * @returns Position closing response
   */
  async closePosition(dealId: string, direction: "BUY" | "SELL", size: number): Promise<any> {
    return this.positionService.closePosition(dealId, direction, size);
  }

  /**
   * Update an existing position (modify stop or limit levels)
   *
   * @param dealId Deal ID of the position to update
   * @param stopLevel New stop loss level
   * @param profitLevel New take profit level
   * @returns Position update response
   */
  async updatePosition(dealId: string, stopLevel?: number, profitLevel?: number): Promise<any> {
    return this.positionService.updatePosition(dealId, stopLevel, profitLevel);
  }

  /**
   * Create a limit order (working order)
   *
   * @param epic Market epic to trade
   * @param direction Buy or sell direction
   * @param size Position size
   * @param limitPrice Price level for the limit order
   * @param stopLevel Optional stop loss level
   * @param profitLevel Optional take profit level
   * @param goodTillDate Optional order expiration date
   * @returns Working order creation result
   */
  async createLimitOrder(epic: string, direction: "BUY" | "SELL", size: number, limitPrice: number, stopLevel?: number, profitLevel?: number, goodTillDate?: string): Promise<any> {
    return this.positionService.createLimitOrder(epic, direction, size, limitPrice, stopLevel, profitLevel, goodTillDate);
  }

  /**
   * Create a stop order (working order)
   *
   * @param epic Market epic to trade
   * @param direction Buy or sell direction
   * @param size Position size
   * @param stopPrice Price level for the stop order
   * @param stopLevel Optional stop loss level
   * @param profitLevel Optional take profit level
   * @param goodTillDate Optional order expiration date
   * @returns Working order creation result
   */
  async createStopOrder(epic: string, direction: "BUY" | "SELL", size: number, stopPrice: number, stopLevel?: number, profitLevel?: number, goodTillDate?: string): Promise<any> {
    return this.positionService.createStopOrder(epic, direction, size, stopPrice, stopLevel, profitLevel, goodTillDate);
  }

  /**
   * Get all working orders for the account
   *
   * @returns List of working orders
   */
  async getWorkingOrders(): Promise<any> {
    return this.positionService.getWorkingOrders();
  }

  /**
   * Cancel a working order
   *
   * @param dealId Deal ID of the working order to cancel
   * @returns Cancellation result
   */
  async cancelWorkingOrder(dealId: string): Promise<any> {
    return this.positionService.cancelWorkingOrder(dealId);
  }

  /**
   * Get transaction history for the account
   *
   * @param from Start date (ISO string)
   * @param to End date (ISO string)
   * @param pageSize Number of transactions per page
   * @param pageNumber Page number
   * @returns Transaction history
   */
  async getTransactionHistory(from?: string, to?: string, pageSize: number = 20, pageNumber: number = 1): Promise<any> {
    return this.positionService.getTransactionHistory(from, to, pageSize, pageNumber);
  }

  /**
   * Get deal confirmation details
   */
  async getDealConfirmation(dealReference: string): Promise<any> {
    return this.positionService.getDealConfirmation(dealReference);
  }

  // --------------------------------------------------------------------------
  // Symbol Service Methods
  // --------------------------------------------------------------------------

  /**
   * Get epic for a trading symbol using the simplified symbol service
   */
  async getEpicForSymbol(symbol: string): Promise<string | null> {
    try {
      loggerService.info(`[CAPITAL MAIN] Getting epic for symbol: ${symbol}`);

      // Use the simplified symbol service
      if (this.symbolService) {
        await this.symbolService.initialize();
        const result = await this.symbolService.getEpicForSymbol(symbol);

        if (result) {
          loggerService.info(`[CAPITAL MAIN] Symbol service found mapping: ${symbol} → ${result}`);
          return result;
        }
      }

      loggerService.error(`[CAPITAL MAIN] Could not find epic for symbol: ${symbol}`);
      return null;
    } catch (error) {
      loggerService.error(`[CAPITAL MAIN] Error getting epic for symbol ${symbol}: ${error instanceof Error ? error.message : "Unknown error"}`);
      return null;
    }
  }

  /**
   * Get a standard trading symbol for a Capital.com epic
   *
   * @param epic Capital.com epic
   * @returns Standard trading symbol or the epic itself if not mapped
   */
  async getSymbolForEpic(epic: string): Promise<string> {
    return this.symbolService.getSymbolForEpic(epic);
  }

  /**
   * Get market details for a symbol
   *
   * @param symbol Trading symbol
   * @returns Market details
   */
  async getSymbolMarketDetails(symbol: string): Promise<any> {
    return this.symbolService.getMarketDetails(symbol);
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.baseService.cleanup();
    this.marketService.cleanup();
  }

  /**
   * Add request to queue for rate limiting
   */
  private async queueRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await this.executeWithRetry(requestFn);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  /**
   * Process the request queue with rate limiting
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;

      if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
        await new Promise((resolve) => setTimeout(resolve, this.MIN_REQUEST_INTERVAL - timeSinceLastRequest));
      }

      const requestFn = this.requestQueue.shift();
      if (requestFn) {
        this.lastRequestTime = Date.now();
        await requestFn();
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Execute request with retry logic for 429 errors
   */
  private async executeWithRetry<T>(requestFn: () => Promise<T>, retryCount = 0): Promise<T> {
    try {
      return await requestFn();
    } catch (error: any) {
      if (error?.response?.status === 429 && retryCount < this.MAX_RETRIES) {
        const delay = this.RETRY_DELAY * Math.pow(2, retryCount); // Exponential backoff
        loggerService.warn(`Rate limited (429), retrying in ${delay}ms (attempt ${retryCount + 1}/${this.MAX_RETRIES})`);

        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.executeWithRetry(requestFn, retryCount + 1);
      }
      throw error;
    }
  }
}

/**
 * Get environment variables with validation
 */
function getEnvVar(name: string, defaultValue: string = ""): string {
  const value = process.env[name];
  if (!value) {
    loggerService.warn(`Environment variable ${name} not found, using default value`);
  }
  return value || defaultValue;
}

/**
 * Validate Capital.com API credentials
 * @returns True if credentials are valid, false otherwise
 */
function validateCapitalCredentials(apiKey: string, username: string, password: string): boolean {
  // Check for obviously invalid credentials or placeholder values
  const placeholderPatterns = [/your.*api.*key/i, /your.*username/i, /your.*password/i, /replace.*this/i, /api.*key.*here/i];

  // Check API key
  if (!apiKey || apiKey === "demo-key1234567890" || apiKey.length < 10 || placeholderPatterns.some((p) => p.test(apiKey))) {
    loggerService.error("Invalid or missing CAPITAL_API_KEY - please set a valid API key in .env file");
    loggerService.error("Make sure to replace the placeholder value with your actual Capital.com API key");
    return false;
  }

  // Check username
  if (!username || username === "demouser123" || username.length < 5 || placeholderPatterns.some((p) => p.test(username))) {
    loggerService.error("Invalid or missing CAPITAL_USERNAME - please set a valid username in .env file");
    loggerService.error("Make sure to replace the placeholder value with your actual Capital.com username");
    return false;
  }

  // Check password
  if (!password || password === "demopassword123" || password.length < 8 || placeholderPatterns.some((p) => p.test(password))) {
    loggerService.error("Invalid or missing CAPITAL_PASSWORD - please set a valid password in .env file");
    loggerService.error("Make sure to replace the placeholder value with your actual Capital.com password");
    return false;
  }

  return true;
}

// Store multiple API instances keyed by credential ID or 'default' for the singleton
const capitalApiInstances: Map<string, CapitalMainService> = new Map();

/**
 * Initialize and return the Capital.com API service instance
 *
 * This function can accept direct credentials or use environment variables as a fallback.
 * When using with broker credentials from the database, you should pass the credentials directly.
 *
 * @param options Optional credentials and configuration
 * @returns A Capital.com API service instance
 */
export function getCapitalApiInstance(options?: {
  apiKey?: string;
  username?: string; // Maintain backward compatibility
  identifier?: string; // Support the correct field name for Capital.com API
  password?: string;
  isDemo?: boolean;
  instanceId?: string; // Unique identifier for this instance, allows multiple instances with different credentials
}): CapitalMainService {
  const instanceId = options?.instanceId || "default";

  // Return existing instance if already created with this ID
  if (capitalApiInstances.has(instanceId)) {
    return capitalApiInstances.get(instanceId)!;
  }

  // Get credentials either from parameters or environment variables
  // NOTE: For the identifier/username field, support both field names for compatibility
  const apiKey = options?.apiKey || process.env.CAPITAL_API_KEY || "";
  const identifier = options?.identifier || options?.username || process.env.CAPITAL_USERNAME || "";
  const password = options?.password || process.env.CAPITAL_PASSWORD || "";
  const isDemo = options?.isDemo !== undefined ? options.isDemo : process.env.CAPITAL_DEMO_MODE !== "false";

  // Log which field we're using for clarity
  if (options?.identifier && !options?.username) {
    loggerService.debug("Using identifier field from options");
  } else if (!options?.identifier && options?.username) {
    loggerService.debug("Using username field from options and mapping to identifier");
  }

  // Track credential status but don't treat as an error at startup
  const hasMissingCredentials = !apiKey || !identifier || !password;

  // Log credential status as a debug message rather than an error
  if (hasMissingCredentials) {
    loggerService.debug(`Capital.com API credentials for instance ${instanceId} will need to be provided by the user`);
    loggerService.debug(
      `Capital.com auth config received: ${JSON.stringify({
        apiKey: apiKey ? "present" : "missing",
        identifier: identifier ? "present" : "missing",
        password: password ? "present" : "missing",
        isDemo,
      })}`
    );
  }

  // Create the Capital.com API instance with the provided credentials
  const instance = new CapitalMainService(apiKey, identifier, password, isDemo);

  // Store in the instances map
  capitalApiInstances.set(instanceId, instance);

  // Log instance creation
  if (isDemo) {
    loggerService.info(`Capital.com API instance '${instanceId}' created in DEMO mode`);
  } else {
    loggerService.info(`Capital.com API instance '${instanceId}' created in LIVE mode`);
  }

  // Log credential information without exposing sensitive data
  loggerService.info(`API key (masked): ${apiKey ? apiKey.substring(0, 3) + "..." + apiKey.substring(apiKey.length - 3) : "MISSING"}`);
  loggerService.info(`Identifier (masked): ${identifier ? identifier.substring(0, 2) + "..." + identifier.substring(identifier.length - 2) : "MISSING"}`);
  loggerService.info(`Password: ${password ? "********" : "MISSING"}`);

  return instance;
}

/**
 * Clear a specific Capital.com API instance or all instances
 * @param instanceId Optional ID of the instance to clear, if not provided all instances are cleared
 */
export function clearCapitalApiInstance(instanceId?: string): void {
  if (instanceId) {
    // Clear a specific instance
    const instance = capitalApiInstances.get(instanceId);
    if (instance) {
      instance.cleanup();
      capitalApiInstances.delete(instanceId);
      loggerService.info(`Capital.com API instance '${instanceId}' cleared`);
    }
  } else {
    // Clear all instances
    capitalApiInstances.forEach((instance, id) => {
      instance.cleanup();
      loggerService.info(`Capital.com API instance '${id}' cleared`);
    });
    capitalApiInstances.clear();
  }
}
