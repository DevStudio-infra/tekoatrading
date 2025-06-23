import axios, { AxiosInstance, AxiosError } from "axios";
import { EventEmitter } from "events";
import { loggerService } from "../../../services/logger.service";
import { CapitalSessionResponse, CapitalAuthConfig } from "../interfaces/capital-session.interface";

/**
 * Simplified Capital.com API service without complex rate limiting
 * Handles authentication and basic API requests with simple timeouts
 */
export class CapitalSimpleService extends EventEmitter {
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

  // Simple session management
  private lastRequestTime: number = 0;
  private readonly MIN_REQUEST_INTERVAL = 1000; // 1 second between requests (simple)

  constructor(config: CapitalAuthConfig) {
    super();

    this.apiKey = config.apiKey;
    this.identifier = config.identifier;
    this.password = config.password;
    this.isDemo = typeof config.isDemo === "boolean" ? config.isDemo : true;

    const baseURL = this.isDemo ? "https://demo-api-capital.backend-capital.com/" : "https://api-capital.backend-capital.com/";

    this.apiClient = axios.create({
      baseURL,
      headers: {
        "X-CAP-API-KEY": this.apiKey,
        "Content-Type": "application/json",
      },
      timeout: 30000, // 30 second timeout (simpler)
    });
  }

  /**
   * Initialize the API connection
   */
  async initialize(): Promise<void> {
    try {
      loggerService.info("Initializing simplified Capital.com API connection");
      await this.createSession();
      loggerService.info("Capital.com API session created successfully");
    } catch (error) {
      loggerService.error(`Failed to initialize Capital.com API: ${error instanceof Error ? error.message : "Unknown error"}`);
      throw error;
    }
  }

  /**
   * Create a new API session (simplified)
   */
  async createSession(): Promise<CapitalSessionResponse> {
    try {
      // Simple rate limiting - wait if needed
      const timeSinceLastRequest = Date.now() - this.lastRequestTime;
      if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
        const waitTime = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
        await this.sleep(waitTime);
      }

      if (!this.identifier || !this.apiKey || !this.password) {
        throw new Error("Missing Capital.com API credentials. Please set valid credentials in your .env file.");
      }

      loggerService.info(`Authenticating with Capital.com API using credentials: ID=${this.identifier}`);

      const requestBody = {
        identifier: this.identifier,
        password: this.password,
      };

      const response = await this.apiClient.post("api/v1/session", requestBody);
      this.lastRequestTime = Date.now();

      // Extract security tokens from headers
      this.cst = response.headers["cst"];
      this.securityToken = response.headers["x-security-token"];

      if (!this.cst || !this.securityToken) {
        throw new Error("Missing security tokens in response");
      }

      // Update API client with authentication headers
      this.apiClient.defaults.headers.common["CST"] = this.cst;
      this.apiClient.defaults.headers.common["X-SECURITY-TOKEN"] = this.securityToken;

      const data = response.data as CapitalSessionResponse;
      this.accountId = data.currentAccountId;

      loggerService.info(`Capital.com API session created successfully for account ${this.accountId}`);
      return data;
    } catch (error: any) {
      loggerService.error(`Capital.com API authentication failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Make an authenticated API request (simplified)
   */
  async makeAuthenticatedRequest(url: string, options: any = {}): Promise<any> {
    try {
      // Simple rate limiting
      const timeSinceLastRequest = Date.now() - this.lastRequestTime;
      if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
        const waitTime = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
        await this.sleep(waitTime);
      }

      const response = await this.apiClient.request({
        url,
        ...options,
      });

      this.lastRequestTime = Date.now();
      return response;
    } catch (error: any) {
      if (error.response?.status === 401) {
        // Try to refresh session once
        loggerService.info("Session expired, attempting to refresh");
        await this.createSession();

        // Retry the request
        const response = await this.apiClient.request({
          url,
          ...options,
        });
        this.lastRequestTime = Date.now();
        return response;
      }
      throw error;
    }
  }

  /**
   * Get historical prices (simplified)
   */
  async getHistoricalPrices(epic: string, resolution: string, from: string, to: string, max: number): Promise<any> {
    const params = {
      resolution,
      from,
      to,
      max: max.toString(),
    };

    loggerService.info(`Fetching historical prices for ${epic} with params: ${JSON.stringify(params)}`);

    const response = await this.makeAuthenticatedRequest(`api/v1/prices/${epic}`, {
      method: "GET",
      params,
    });

    return response.data;
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  cleanup(): void {
    // Simple cleanup
    this.cst = null;
    this.securityToken = null;
    this.accountId = null;
  }
}
