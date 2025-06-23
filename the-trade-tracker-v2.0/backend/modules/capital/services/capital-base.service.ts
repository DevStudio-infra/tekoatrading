import axios, { AxiosInstance, AxiosError } from "axios";
import { EventEmitter } from "events";
import { loggerService } from "../../../services/logger.service";
import { CapitalSessionResponse, CapitalAuthConfig } from "../interfaces/capital-session.interface";

/**
 * Base service for Capital.com API integration
 * Handles authentication, session management, and base API setup
 */
export class CapitalBaseService extends EventEmitter {
  // Authentication and session details
  private readonly apiKey: string;
  private readonly identifier: string;
  private readonly password: string;
  protected readonly isDemo: boolean;

  // API client and auth tokens
  protected apiClient: AxiosInstance;
  protected cst: string | null = null;
  protected securityToken: string | null = null;
  protected accountId: string | null = null;

  // Session management
  private sessionRefreshInterval: NodeJS.Timeout | null = null;
  private lastRequestTime: number = 0;

  // Track session requests separately per credential
  private lastSessionRequest = new Map<string, number>();

  // Centralized session management to prevent concurrent session creation
  private sessionCreationLocks = new Map<string, Promise<any>>();
  private activeSessions = new Map<string, { session: any; timestamp: number; accountId: string }>();
  private readonly SESSION_TIMEOUT = 300000; // 5 minutes session timeout (reduced from 10 minutes)
  private readonly SESSION_REQUEST_INTERVAL = 2000; // 2 seconds minimum between session requests (simplified)

  constructor(config: CapitalAuthConfig) {
    super();

    // Log the incoming config object for debugging
    loggerService.debug("Capital.com auth config received:", {
      apiKey: config.apiKey ? "present" : "missing",
      identifier: config.identifier ? "present" : "missing",
      password: config.password ? "present" : "missing",
      isDemo: config.isDemo,
    });

    // No fallbacks - only use actual user credentials
    this.apiKey = config.apiKey;
    this.identifier = config.identifier;
    this.password = config.password;
    this.isDemo = typeof config.isDemo === "boolean" ? config.isDemo : true;

    // Log actual stored credentials for debugging
    loggerService.debug("Capital.com credentials stored in service:", {
      apiKey: this.apiKey ? "present" : "missing",
      identifier: this.identifier ? "present" : "missing",
      password: this.password ? "present" : "missing",
      isDemo: this.isDemo,
    });

    // Log configuration details
    if (!config.apiKey || !config.identifier || !config.password) {
      loggerService.error("Missing Capital.com API credentials - API will not work without proper credentials");
      loggerService.error("Please set valid credentials in your .env file following the instructions in assets/capital-api-setup.md");

      // Log which fields are missing for clearer debugging
      if (!config.apiKey) loggerService.error("API Key is missing from config");
      if (!config.identifier) loggerService.error("Identifier is missing from config");
      if (!config.password) loggerService.error("Password is missing from config");
    }

    const baseURL = this.isDemo ? "https://demo-api-capital.backend-capital.com/" : "https://api-capital.backend-capital.com/";

    this.apiClient = axios.create({
      baseURL,
      headers: {
        "X-CAP-API-KEY": this.apiKey,
        "Content-Type": "application/json",
      },
      timeout: 60000, // 60 second timeout for all requests (increased from 30 seconds)
    });

    // Set up session refresh timer
    this.setupSessionRefresh();
  }

  /**
   * Initialize the API connection
   */
  async initialize(): Promise<void> {
    try {
      loggerService.info("Initializing Capital.com API connection");
      await this.createSession();
      loggerService.info("Capital.com API session created successfully");
    } catch (error) {
      loggerService.error(`Failed to initialize Capital.com API: ${error instanceof Error ? error.message : "Unknown error"}`);
      throw error;
    }
  }

  /**
   * Create a new API session with centralized session management
   */
  async createSession(): Promise<CapitalSessionResponse> {
    const credentialKey = this.getCredentialKey();

    // Check for existing valid session first
    const existingSession = this.activeSessions.get(credentialKey);
    if (existingSession && Date.now() - existingSession.timestamp < this.SESSION_TIMEOUT) {
      console.log(`[15:${new Date().toISOString().slice(14, 19)}] ♻️ Reusing existing session for ${credentialKey.slice(0, 8)}.. (Account: ${existingSession.accountId})`);

      // Update internal state with existing session
      this.cst = existingSession.session.cst;
      this.securityToken = existingSession.session.securityToken;
      this.accountId = existingSession.accountId;

      // Update API client headers
      this.apiClient.defaults.headers.common["CST"] = this.cst;
      this.apiClient.defaults.headers.common["X-SECURITY-TOKEN"] = this.securityToken;

      return existingSession.session;
    }

    // Check if session creation is already in progress for this credential
    const existingLock = this.sessionCreationLocks.get(credentialKey);
    if (existingLock) {
      console.log(`[15:${new Date().toISOString().slice(14, 19)}] ⏳ Waiting for existing session creation for ${credentialKey.slice(0, 8)}..`);
      try {
        // Add timeout to prevent infinite waiting
        return await Promise.race([existingLock, new Promise((_, reject) => setTimeout(() => reject(new Error("Session creation timeout")), 2000))]);
      } catch (timeoutError) {
        console.log(`[15:${new Date().toISOString().slice(14, 19)}] ⏰ Session creation timeout for ${credentialKey.slice(0, 8)}, removing lock and creating new session`);
        this.sessionCreationLocks.delete(credentialKey);
        // Clear any existing session to force recreation
        this.activeSessions.delete(credentialKey);
        // Continue to create new session below
      }
    }

    // Create new session creation promise
    const sessionPromise = this.createNewSession(credentialKey);
    this.sessionCreationLocks.set(credentialKey, sessionPromise);

    try {
      const session = await sessionPromise;
      return session;
    } finally {
      // Clean up the lock
      this.sessionCreationLocks.delete(credentialKey);
    }
  }

  private async createNewSession(credentialKey: string): Promise<CapitalSessionResponse> {
    // Check rate limiting for this credential
    const lastSessionTime = this.lastSessionRequest.get(credentialKey) || 0;
    const timeSinceLastSession = Date.now() - lastSessionTime;

    if (timeSinceLastSession < this.SESSION_REQUEST_INTERVAL) {
      const waitTime = this.SESSION_REQUEST_INTERVAL - timeSinceLastSession;
      console.log(`[15:${new Date().toISOString().slice(14, 19)}] ⏳ Session request too soon for ${credentialKey.slice(0, 8)}.., waiting ${waitTime}ms`);
      await this.sleep(waitTime);
    }

    this.lastSessionRequest.set(credentialKey, Date.now());

    try {
      // Dump full credentials (masked) for debugging
      const maskedApiKey = this.apiKey ? `${this.apiKey.substring(0, 3)}...${this.apiKey.substring(this.apiKey.length - 3)}` : "missing";
      const maskedIdentifier = this.identifier ? `${this.identifier.substring(0, 2)}...${this.identifier.substring(this.identifier.length - 2)}` : "missing";
      const passwordLength = this.password ? this.password.length : 0;

      loggerService.debug(`AUTHENTICATION DEBUG - FULL CREDENTIALS:
        apiKey: ${maskedApiKey} (${this.apiKey ? "present" : "missing"})
        identifier: ${maskedIdentifier} (${this.identifier ? "present" : "missing"})
        password: ${passwordLength ? "********" : "missing"} (${this.password ? "present" : "missing"})
        isDemo: ${this.isDemo}
      `);

      if (!this.identifier || !this.apiKey || !this.password) {
        loggerService.error("Missing Capital.com API credentials - authentication will fail");
        loggerService.error("You must set CAPITAL_API_KEY, CAPITAL_USERNAME, and CAPITAL_PASSWORD in your .env file");
        loggerService.error("Follow the instructions in assets/capital-api-setup.md to set up your credentials");

        // Log specific fields that are missing to help with debugging
        if (!this.apiKey) loggerService.error("API Key is missing");
        if (!this.identifier) loggerService.error("Username/identifier is missing");
        if (!this.password) loggerService.error("Password is missing");

        throw new Error("Missing Capital.com API credentials. Please set valid credentials in your .env file.");
      }

      loggerService.info(`Authenticating with Capital.com API using credentials: ID=${this.identifier}`);

      // Direct debug of the request body to verify the exact payload being sent
      const requestBody = {
        identifier: this.identifier,
        password: this.password,
      };

      loggerService.debug("DIRECT REQUEST BODY VERIFICATION:");
      loggerService.debug(
        `identifier in request: ${requestBody.identifier ? "present" : "missing"}, value: ${requestBody.identifier ? requestBody.identifier.substring(0, 2) + "..." : "null"}`
      );
      loggerService.debug(`password in request: ${requestBody.password ? "present" : "missing"}, length: ${requestBody.password ? requestBody.password.length : 0}`);

      // Make the authentication request directly (bypass complex rate limiter)
      const response = await this.apiClient.post("api/v1/session", requestBody);

      // Extract security tokens from headers
      this.cst = response.headers["cst"];
      this.securityToken = response.headers["x-security-token"];

      if (!this.cst || !this.securityToken) {
        loggerService.error("Authentication succeeded but security tokens are missing in the response headers");
        loggerService.debug("Response headers:", response.headers);
        throw new Error("Missing security tokens in response");
      }

      // Update API client with authentication headers
      this.apiClient.defaults.headers.common["CST"] = this.cst;
      this.apiClient.defaults.headers.common["X-SECURITY-TOKEN"] = this.securityToken;

      const data = response.data as CapitalSessionResponse;
      this.accountId = data.currentAccountId;

      // Store session in centralized cache
      this.activeSessions.set(credentialKey, {
        session: {
          ...data,
          cst: this.cst,
          securityToken: this.securityToken,
        },
        timestamp: Date.now(),
        accountId: this.accountId,
      });

      loggerService.info(`Capital.com API session created successfully for account ${this.accountId}`);
      loggerService.debug(`Security tokens obtained: CST=${this.cst.substring(0, 5)}...`);

      return data;
    } catch (error: any) {
      // Log detailed error information for debugging
      if (error.response) {
        // The request was made and the server responded with a status code outside of 2xx range
        loggerService.error(`Capital.com API error: Status ${error.response.status}`);

        // Safely log response data without potential base64 content
        const responseData = error.response.data;
        const dataPreview = typeof responseData === "string" && responseData.length > 200 ? `${responseData.substring(0, 200)}...` : JSON.stringify(responseData).substring(0, 500);
        loggerService.error(`Response data preview: ${dataPreview}`);

        if (error.response.status === 401) {
          loggerService.error("Authentication failed. Please check your API credentials.");
        } else if (error.response.status === 400) {
          loggerService.error("Bad request. Check if your credentials format is correct.");
        } else if (error.response.status === 403) {
          loggerService.error("Forbidden. Your API key may not have sufficient permissions.");
        }
      } else if (error.request) {
        // The request was made but no response was received
        loggerService.error("No response received from Capital.com API. Check network connectivity.");
      } else {
        // Something happened in setting up the request
        loggerService.error(`Error setting up Capital.com API request: ${error.message}`);
      }

      // Add API credentials information (without exposing sensitive data)
      const maskedIdentifier = this.identifier && this.identifier.length > 3 ? `${this.identifier.substring(0, 3)}***` : this.identifier || "empty";
      const maskedApiKey = this.apiKey && this.apiKey.length > 3 ? `${this.apiKey.substring(0, 3)}***` : this.apiKey || "empty";
      const passwordStatus = this.password ? `length=${this.password.length}` : "empty";

      loggerService.debug(`API credentials used: identifier=${maskedIdentifier}, apiKey=${maskedApiKey}, password ${passwordStatus}`);

      // Check for placeholder values (provides more specific error for common issue)
      if (
        /your|placeholder|real-api-key|replace/i.test(this.identifier) ||
        /your|placeholder|real-api-key|replace/i.test(this.apiKey) ||
        /your|placeholder|real-api-key|replace/i.test(this.password || "")
      ) {
        loggerService.error("PLACEHOLDER VALUES DETECTED: You need to replace the placeholder values in your .env file with actual Capital.com credentials");
      }

      throw error;
    }
  }

  private getCredentialKey(): string {
    return `${this.identifier}_${this.apiKey}`;
  }

  /**
   * Refresh the API session
   */
  async refreshSession(): Promise<void> {
    try {
      loggerService.info("Refreshing Capital.com API session");
      await this.createSession();
      loggerService.info("Session refreshed successfully");
    } catch (error) {
      loggerService.error(`Failed to refresh Capital.com API session: ${error instanceof Error ? error.message : "Unknown error"}`);
      throw error;
    }
  }

  /**
   * Set up automatic session refresh
   */
  private setupSessionRefresh(): void {
    // Clear any existing interval
    if (this.sessionRefreshInterval) {
      clearInterval(this.sessionRefreshInterval);
    }

    // Set up new interval (refresh every 4 hours)
    this.sessionRefreshInterval = setInterval(() => {
      this.refreshSession().catch((error) => {
        loggerService.error(`Automatic session refresh failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      });
    }, 4 * 60 * 60 * 1000); // 4 hours
  }

  /**
   * Ensure that we have a valid session
   */
  protected async ensureAuthenticated(): Promise<void> {
    const credentialKey = this.getCredentialKey();

    // Check for existing valid session first
    const existingSession = this.activeSessions.get(credentialKey);
    if (existingSession && Date.now() - existingSession.timestamp < this.SESSION_TIMEOUT) {
      // Reuse existing session
      this.cst = existingSession.session.cst;
      this.securityToken = existingSession.session.securityToken;
      this.accountId = existingSession.accountId;

      // Update API client headers
      this.apiClient.defaults.headers.common["CST"] = this.cst;
      this.apiClient.defaults.headers.common["X-SECURITY-TOKEN"] = this.securityToken;

      return; // Session is valid, no need to create new one
    }

    // Only create new session if we don't have a valid one
    if (!this.cst || !this.securityToken) {
      loggerService.info("No active session found, creating a new one");
      await this.createSession();
    }
  }

  /**
   * Get account details
   */
  async getAccountDetails(): Promise<any> {
    try {
      await this.ensureAuthenticated();

      const response = await this.apiClient.get("api/v1/accounts", {
        headers: {
          CST: this.cst,
          "X-SECURITY-TOKEN": this.securityToken,
        },
      });

      return response.data;
    } catch (error) {
      loggerService.error(`Failed to get account details: ${error instanceof Error ? error.message : "Unknown error"}`);
      throw error;
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.sessionRefreshInterval) {
      clearInterval(this.sessionRefreshInterval);
      this.sessionRefreshInterval = null;
    }

    this.cst = null;
    this.securityToken = null;
    this.accountId = null;
  }

  /**
   * Make an authenticated API request with session management and credential-aware rate limiting
   */
  protected async makeAuthenticatedRequest(url: string, options: any = {}): Promise<any> {
    try {
      // Ensure we have a valid session before making the request
      await this.ensureAuthenticated();

      // Simple rate limiting - just wait 1 second between requests
      const timeSinceLastRequest = Date.now() - this.lastRequestTime;
      if (timeSinceLastRequest < 1000) {
        await this.sleep(1000 - timeSinceLastRequest);
      }

      const response = await this.apiClient.request({
        url,
        headers: {
          CST: this.cst,
          "X-SECURITY-TOKEN": this.securityToken,
          ...options.headers,
        },
        ...options,
      });

      this.lastRequestTime = Date.now();
      return response;
    } catch (error: any) {
      // Handle session expiry (401 errors) by refreshing session and retrying ONCE
      if (error?.response?.status === 401) {
        loggerService.warn(`Session expired (401), refreshing session and retrying request to ${url}`);

        try {
          // Clear existing tokens to force fresh session
          this.cst = null;
          this.securityToken = null;

          // Create new session
          await this.createSession();

          loggerService.info("Session refreshed successfully, retrying original request");

          // Retry the original request with new session (only once)
          const response = await this.apiClient.request({
            url,
            headers: {
              CST: this.cst,
              "X-SECURITY-TOKEN": this.securityToken,
              ...options.headers,
            },
            ...options,
          });

          this.lastRequestTime = Date.now();
          return response;
        } catch (refreshError: any) {
          loggerService.error(`Failed to refresh session after 401 error: ${refreshError instanceof Error ? refreshError.message : "Unknown error"}`);
          throw refreshError;
        }
      }

      // Handle rate limiting (429 errors) with simple backoff
      if (error?.response?.status === 429) {
        loggerService.warn(`Rate limit hit (429), waiting 5 seconds...`);
        await this.sleep(5000);
        throw new Error(`Capital.com API rate limit exceeded. Please wait before making more requests.`);
      }

      throw error;
    }
  }

  /**
   * Add rate limiting delay to prevent hitting API limits
   */
  private async rateLimitDelay(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minDelay = 100; // Minimum 100ms between requests

    if (timeSinceLastRequest < minDelay) {
      const delayNeeded = minDelay - timeSinceLastRequest;
      await this.sleep(delayNeeded);
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Sleep utility for delays
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Authenticate with Capital.com API using improved session management and credential-aware rate limiting
   */
  protected async authenticate(): Promise<void> {
    if (!this.identifier || !this.apiKey || !this.password) {
      throw new Error("No credentials provided for authentication");
    }

    const sessionManager = SessionManager.getInstance();
    const credentialId = `${this.identifier}_${this.apiKey}`;

    // Try to reuse existing session first
    const existingSession = sessionManager.getSession(credentialId);
    if (existingSession) {
      console.log(`♻️ Reusing existing session for credential ${credentialId.substring(0, 8)}...`);
      this.cst = existingSession.cst;
      this.securityToken = existingSession.securityToken;
      this.accountId = existingSession.accountId;
      return;
    }

    console.log(`🔐 Creating new session for credential ${credentialId.substring(0, 8)}...`);

    // Use credential-specific rate limiter for authentication
    const credentialLimiter = CredentialRateLimiter.getInstance(credentialId);

    try {
      // Mark this as a session request for special rate limiting per credential
      const response = await credentialLimiter.addToQueue(async () => {
        return await this.apiClient.post("/api/v1/session", {
          identifier: this.identifier,
          password: this.password,
        });
      }, true); // true indicates this is a session request

      this.cst = response.headers["cst"];
      this.securityToken = response.headers["x-security-token"];

      if (!this.cst || !this.securityToken) {
        throw new Error("Failed to get authentication tokens from Capital.com");
      }

      // Get account info with separate credential-specific rate-limited request
      const accountResponse = await credentialLimiter.addToQueue(async () => {
        return await this.apiClient.get("/api/v1/accounts", {
          headers: {
            CST: this.cst,
            "X-SECURITY-TOKEN": this.securityToken,
          },
        });
      });

      this.accountId = accountResponse.data.accounts[0]?.accountId;
      if (!this.accountId) {
        throw new Error("Failed to get account ID from Capital.com");
      }

      // Store session for reuse with longer lifetime
      sessionManager.setSession(credentialId, this.cst, this.securityToken, this.accountId);

      console.log(`✅ Capital.com API session created successfully for credential ${credentialId.substring(0, 8)}... account ${this.accountId}`);
    } catch (error: any) {
      // Handle rate limiting more gracefully per credential
      if (error?.response?.status === 429) {
        console.log(`🛑 Rate limited during authentication for credential ${credentialId.substring(0, 8)}. Resetting rate limiter and delaying...`);
        credentialLimiter.resetCounters();

        // Clear any cached session that might be stale
        sessionManager.clearSession(credentialId);

        throw new Error(
          `Capital.com authentication rate limited for credential ${credentialId.substring(0, 8)}. Please wait before retrying. Error: ${
            error?.response?.data?.errorCode || "rate-limited"
          }`
        );
      }

      throw error;
    }
  }
}

/**
 * Enhanced credential-aware rate limiter with dynamic scaling for multiple bots
 * Automatically adjusts limits based on bot count and implements intelligent batching
 */
class CredentialRateLimiter {
  private static instances: Map<string, CredentialRateLimiter> = new Map();
  private queue: Array<{
    execute: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (error: any) => void;
    priority: number; // 0 = highest, 100 = lowest
    botId?: string;
    requestType: "session" | "market_data" | "trade" | "account" | "other";
  }> = [];
  private isProcessing = false;
  private lastRequestTime = 0;
  private requestCount = 0;
  private windowStart = Date.now();
  private credentialId: string;
  private activeBotIds = new Set<string>();

  // Dynamic rate limits based on bot count - BALANCED APPROACH
  private readonly BASE_MIN_INTERVAL = 3000; // 3 seconds base interval (reduced from 5 seconds)
  private readonly BASE_MAX_REQUESTS_PER_MINUTE = 6; // Base 6 requests per minute (increased from 4)
  private readonly BURST_DELAY = 20000; // 20 second delay after burst per credential (reduced from 30 seconds)
  private readonly SESSION_REQUEST_INTERVAL = 10000; // 10 seconds minimum between session requests per credential

  // Track session requests separately per credential
  private lastSessionRequestTime = 0;

  // Request batching for efficiency
  private batchableRequests: Map<string, Array<any>> = new Map();
  private batchTimer: NodeJS.Timeout | null = null;

  private constructor(credentialId: string) {
    this.credentialId = credentialId;
    console.log(`🔐 Created enhanced rate limiter for credential: ${credentialId.substring(0, 8)}...`);
  }

  static getInstance(credentialId: string): CredentialRateLimiter {
    if (!CredentialRateLimiter.instances.has(credentialId)) {
      CredentialRateLimiter.instances.set(credentialId, new CredentialRateLimiter(credentialId));
    }
    return CredentialRateLimiter.instances.get(credentialId)!;
  }

  /**
   * Register a bot as using this credential
   */
  registerBot(botId: string): void {
    this.activeBotIds.add(botId);
    console.log(`🤖 Bot ${botId} registered with credential ${this.credentialId.substring(0, 8)}... (${this.activeBotIds.size} total bots)`);
    this.adjustRateLimitsForBotCount();
  }

  /**
   * Unregister a bot from using this credential
   */
  unregisterBot(botId: string): void {
    this.activeBotIds.delete(botId);
    console.log(`🤖 Bot ${botId} unregistered from credential ${this.credentialId.substring(0, 8)}... (${this.activeBotIds.size} total bots)`);
    this.adjustRateLimitsForBotCount();
  }

  /**
   * Dynamically adjust rate limits based on number of active bots
   */
  private adjustRateLimitsForBotCount(): void {
    const botCount = this.activeBotIds.size;

    if (botCount === 0) return;

    // Calculate dynamic limits
    const scalingFactor = Math.max(1, Math.ceil(botCount / 5)); // Group every 5 bots
    this.currentMinInterval = this.BASE_MIN_INTERVAL * scalingFactor;
    this.currentMaxRequestsPerMinute = Math.max(1, Math.floor(this.BASE_MAX_REQUESTS_PER_MINUTE / scalingFactor));

    console.log(`⚙️ [${this.credentialId.substring(0, 8)}] Adjusted for ${botCount} bots: ${this.currentMinInterval}ms interval, ${this.currentMaxRequestsPerMinute} req/min`);
  }

  private currentMinInterval = this.BASE_MIN_INTERVAL;
  private currentMaxRequestsPerMinute = this.BASE_MAX_REQUESTS_PER_MINUTE;

  async addToQueue<T>(
    operation: () => Promise<T>,
    isSessionRequest: boolean = false,
    priority: number = 50,
    botId?: string,
    requestType: "session" | "market_data" | "trade" | "account" | "other" = "other"
  ): Promise<T> {
    // Register bot if provided
    if (botId) {
      this.registerBot(botId);
    }

    return new Promise((resolve, reject) => {
      const queueItem = {
        execute: async () => {
          // Apply extra delay for session requests per credential
          if (isSessionRequest) {
            const timeSinceLastSession = Date.now() - this.lastSessionRequestTime;
            if (timeSinceLastSession < this.SESSION_REQUEST_INTERVAL) {
              const sessionDelay = this.SESSION_REQUEST_INTERVAL - timeSinceLastSession;
              console.log(`🔐 [${this.credentialId.substring(0, 8)}] Session rate limiting: waiting ${sessionDelay}ms`);
              await this.delay(sessionDelay);
            }
            this.lastSessionRequestTime = Date.now();
          }
          return operation();
        },
        resolve,
        reject,
        priority,
        botId,
        requestType,
      };

      // Insert based on priority (lower number = higher priority)
      const insertIndex = this.queue.findIndex((item) => item.priority > priority);
      if (insertIndex === -1) {
        this.queue.push(queueItem);
      } else {
        this.queue.splice(insertIndex, 0, queueItem);
      }

      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const now = Date.now();

      // Reset window if needed
      if (now - this.windowStart >= 60000) {
        this.windowStart = now;
        this.requestCount = 0;
        console.log(`🔄 [${this.credentialId.substring(0, 8)}] New window: ${this.activeBotIds.size} bots, ${this.currentMaxRequestsPerMinute} req/min limit`);
      }

      // Check if we've hit the per-credential rate limit
      if (this.requestCount >= this.currentMaxRequestsPerMinute) {
        const waitTime = 60000 - (now - this.windowStart);
        console.log(
          `🛑 [${this.credentialId.substring(0, 8)}] Rate limit reached (${this.requestCount}/${this.currentMaxRequestsPerMinute}) for ${
            this.activeBotIds.size
          } bots, waiting ${waitTime}ms`
        );
        await this.delay(waitTime);
        this.windowStart = Date.now();
        this.requestCount = 0;
      }

      // Ensure minimum interval between requests for this credential
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < this.currentMinInterval) {
        const delayTime = this.currentMinInterval - timeSinceLastRequest;
        console.log(`⏱️ [${this.credentialId.substring(0, 8)}] Interval limiting: waiting ${delayTime}ms (${this.activeBotIds.size} bots)`);
        await this.delay(delayTime);
      }

      const item = this.queue.shift();
      if (!item) continue;

      try {
        const botInfo = item.botId ? ` (Bot: ${item.botId})` : "";
        console.log(`📊 [${this.credentialId.substring(0, 8)}] ${item.requestType.toUpperCase()} request (${this.requestCount + 1}/${this.currentMaxRequestsPerMinute})${botInfo}`);

        const result = await item.execute();
        this.lastRequestTime = Date.now();
        this.requestCount++;
        item.resolve(result);

        // Dynamic delay based on bot count
        const postRequestDelay = Math.min(3000, 1000 + this.activeBotIds.size * 100);
        await this.delay(postRequestDelay);
      } catch (error: any) {
        console.error(`❌ [${this.credentialId.substring(0, 8)}] API request failed:`, error.message);

        // If it's a rate limit error, add MUCH longer delay and reset counters for this credential
        if (error.response?.status === 429) {
          const dynamicBurstDelay = this.BURST_DELAY + this.activeBotIds.size * 1000; // Extra delay per bot
          console.log(`🛑 [${this.credentialId.substring(0, 8)}] Rate limit hit with ${this.activeBotIds.size} bots! Adding ${dynamicBurstDelay}ms delay`);
          await this.delay(dynamicBurstDelay);

          // Force a complete reset for this credential
          this.requestCount = 0;
          this.windowStart = Date.now();
          this.lastRequestTime = Date.now();
          this.lastSessionRequestTime = Date.now();

          // Make rate limiting even more conservative
          this.currentMinInterval *= 1.5;
          this.currentMaxRequestsPerMinute = Math.max(1, Math.floor(this.currentMaxRequestsPerMinute * 0.7));
          console.log(`🔧 [${this.credentialId.substring(0, 8)}] Made rate limiting more conservative: ${this.currentMinInterval}ms, ${this.currentMaxRequestsPerMinute} req/min`);
        }

        item.reject(error);
      }
    }

    this.isProcessing = false;
  }

  /**
   * Get comprehensive status including bot count
   */
  getStatus(): {
    credentialId: string;
    queueLength: number;
    requestCount: number;
    isProcessing: boolean;
    activeBots: number;
    currentLimits: {
      minInterval: number;
      maxRequestsPerMinute: number;
    };
    queueByType: Record<string, number>;
  } {
    const queueByType: Record<string, number> = {};
    this.queue.forEach((item) => {
      queueByType[item.requestType] = (queueByType[item.requestType] || 0) + 1;
    });

    return {
      credentialId: this.credentialId.substring(0, 8) + "...",
      queueLength: this.queue.length,
      requestCount: this.requestCount,
      isProcessing: this.isProcessing,
      activeBots: this.activeBotIds.size,
      currentLimits: {
        minInterval: this.currentMinInterval,
        maxRequestsPerMinute: this.currentMaxRequestsPerMinute,
      },
      queueByType,
    };
  }

  /**
   * Emergency mode for high bot counts - severely limit requests
   */
  enableEmergencyMode(): void {
    console.log(`🚨 [${this.credentialId.substring(0, 8)}] EMERGENCY MODE: Severely limiting requests for ${this.activeBotIds.size} bots`);
    this.currentMinInterval = 10000; // 10 seconds between requests
    this.currentMaxRequestsPerMinute = 1; // Only 1 request per minute
    this.resetCounters();
  }

  /**
   * Reset rate limiter counters for this credential (emergency reset)
   */
  resetCounters(): void {
    console.log(`🔄 [${this.credentialId.substring(0, 8)}] Emergency credential rate limiter reset (${this.activeBotIds.size} bots)`);
    this.requestCount = 0;
    this.windowStart = Date.now();
    this.lastRequestTime = Date.now() - this.currentMinInterval;
    this.lastSessionRequestTime = Date.now() - this.SESSION_REQUEST_INTERVAL;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Clear all credential rate limiters (for system reset)
   */
  static clearAllInstances(): void {
    console.log(`🗑️ Clearing all credential rate limiters`);
    CredentialRateLimiter.instances.clear();
  }

  /**
   * Get statistics for all credentials
   */
  static getAllCredentialStats(): Array<{
    credentialId: string;
    activeBots: number;
    queueLength: number;
    currentLimits: any;
  }> {
    const stats: Array<any> = [];
    CredentialRateLimiter.instances.forEach((limiter, credentialId) => {
      const status = limiter.getStatus();
      stats.push({
        credentialId: status.credentialId,
        activeBots: status.activeBots,
        queueLength: status.queueLength,
        currentLimits: status.currentLimits,
      });
    });
    return stats;
  }
}

/**
 * Global rate limiter for Capital.com API calls
 * EXTREMELY conservative rate limiting to prevent HTTP 429 errors
 * Capital.com limits: 10 requests/second general, 1 request/second for sessions
 * @deprecated Use CredentialRateLimiter instead for better per-credential coordination
 */
class GlobalRateLimiter {
  private static instance: GlobalRateLimiter;
  private queue: Array<{ execute: () => Promise<any>; resolve: (value: any) => void; reject: (error: any) => void }> = [];
  private isProcessing = false;
  private lastRequestTime = 0;
  private requestCount = 0;
  private windowStart = Date.now();

  // EXTREMELY conservative rate limits to prevent 429 errors
  private readonly MIN_INTERVAL = 3000; // 3 seconds between requests (was 2000ms)
  private readonly MAX_REQUESTS_PER_MINUTE = 5; // Max 5 requests per minute (was 10)
  private readonly BURST_DELAY = 10000; // 10 second delay after burst (was 5000ms)
  private readonly SESSION_REUSE_TIME = 600000; // 10 minutes session reuse (was 300000ms)
  private readonly SESSION_REQUEST_INTERVAL = 2000; // 2 seconds minimum between session requests

  // Track session requests separately due to 1/second limit
  private lastSessionRequestTime = 0;

  static getInstance(): GlobalRateLimiter {
    if (!GlobalRateLimiter.instance) {
      GlobalRateLimiter.instance = new GlobalRateLimiter();
    }
    return GlobalRateLimiter.instance;
  }

  async addToQueue<T>(operation: () => Promise<T>, isSessionRequest: boolean = false): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        execute: async () => {
          // Apply extra delay for session requests
          if (isSessionRequest) {
            const timeSinceLastSession = Date.now() - this.lastSessionRequestTime;
            if (timeSinceLastSession < this.SESSION_REQUEST_INTERVAL) {
              const sessionDelay = this.SESSION_REQUEST_INTERVAL - timeSinceLastSession;
              console.log(`🔐 Session rate limiting: waiting ${sessionDelay}ms before session request`);
              await this.delay(sessionDelay);
            }
            this.lastSessionRequestTime = Date.now();
          }
          return operation();
        },
        resolve,
        reject,
      });

      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const now = Date.now();

      // Reset window if needed
      if (now - this.windowStart >= 60000) {
        this.windowStart = now;
        this.requestCount = 0;
        console.log(`🔄 Rate limiter: Starting new 60-second window`);
      }

      // Check if we've hit the rate limit
      if (this.requestCount >= this.MAX_REQUESTS_PER_MINUTE) {
        const waitTime = 60000 - (now - this.windowStart);
        console.log(`🛑 Rate limit reached (${this.requestCount}/${this.MAX_REQUESTS_PER_MINUTE}), waiting ${waitTime}ms for next window...`);
        await this.delay(waitTime);
        this.windowStart = Date.now();
        this.requestCount = 0;
      }

      // Ensure minimum interval between requests
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < this.MIN_INTERVAL) {
        const delayTime = this.MIN_INTERVAL - timeSinceLastRequest;
        console.log(`⏱️ Rate limiting: waiting ${delayTime}ms before next request`);
        await this.delay(delayTime);
      }

      const item = this.queue.shift();
      if (!item) continue;

      try {
        console.log(`📊 Processing API request (${this.requestCount + 1}/${this.MAX_REQUESTS_PER_MINUTE} in current window)`);
        const result = await item.execute();
        this.lastRequestTime = Date.now();
        this.requestCount++;
        item.resolve(result);

        // Add mandatory delay after each request to be extra safe
        await this.delay(1000); // 1 second mandatory delay
      } catch (error: any) {
        console.error(`❌ API request failed:`, error.message);

        // If it's a rate limit error, add MUCH longer delay and reset counters
        if (error.response?.status === 429) {
          console.log(`🛑 Rate limit hit! Adding extra delay of ${this.BURST_DELAY}ms and resetting counters`);
          await this.delay(this.BURST_DELAY);

          // Force a complete reset to be extra conservative
          this.requestCount = 0;
          this.windowStart = Date.now();
          this.lastRequestTime = Date.now() - this.MIN_INTERVAL;
        }

        item.reject(error);
      }
    }

    this.isProcessing = false;
  }

  /**
   * Reset rate limiter counters (emergency reset)
   */
  resetCounters(): void {
    console.log(`🔄 Emergency rate limiter reset`);
    this.requestCount = 0;
    this.windowStart = Date.now();
    this.lastRequestTime = Date.now() - this.MIN_INTERVAL;
    this.lastSessionRequestTime = Date.now() - this.SESSION_REQUEST_INTERVAL;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Session manager to reuse sessions and reduce authentication calls
 */
class SessionManager {
  private static instance: SessionManager;
  private sessions = new Map<string, { cst: string; securityToken: string; accountId: string; created: number }>();
  private readonly SESSION_LIFETIME = 480000; // 8 minutes (Capital.com sessions last 10 minutes)

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  getSession(credentialId: string): { cst: string; securityToken: string; accountId: string } | null {
    const session = this.sessions.get(credentialId);

    if (!session) return null;

    // Check if session is still valid (with 2-minute buffer before Capital.com's 10-minute timeout)
    if (Date.now() - session.created > this.SESSION_LIFETIME) {
      console.log(`🕒 Session expired for ${credentialId}, removing from cache`);
      this.sessions.delete(credentialId);
      return null;
    }

    return {
      cst: session.cst,
      securityToken: session.securityToken,
      accountId: session.accountId,
    };
  }

  setSession(credentialId: string, cst: string, securityToken: string, accountId: string): void {
    console.log(`💾 Storing session for ${credentialId} (valid for ${this.SESSION_LIFETIME / 1000}s)`);
    this.sessions.set(credentialId, {
      cst,
      securityToken,
      accountId,
      created: Date.now(),
    });
  }

  clearSession(credentialId: string): void {
    console.log(`🗑️ Clearing session for ${credentialId}`);
    this.sessions.delete(credentialId);
  }

  clearAllSessions(): void {
    console.log(`🗑️ Clearing all sessions`);
    this.sessions.clear();
  }
}
