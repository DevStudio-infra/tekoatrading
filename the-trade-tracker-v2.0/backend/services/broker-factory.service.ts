import { CapitalMainService, getCapitalApiInstance } from "../modules/capital";
import { brokerCredentialService } from "./broker-credential.service";
import { loggerService } from "./logger.service";

/**
 * BrokerFactory Service
 *
 * This service acts as a central hub for creating and managing broker API instances.
 * It supports different broker types (Capital.com, Binance, etc.) and selects the
 * appropriate service implementation based on broker credentials.
 */
export class BrokerFactoryService {
  // Store broker API instances for reuse (keyed by credentialId)
  private brokerInstances: Map<string, any> = new Map();

  /**
   * Get the appropriate broker API instance based on broker credentials
   */
  async getBrokerApi(credentialId: string, userId: string): Promise<any> {
    try {
      // Check if we already have a broker instance for this credential
      if (this.brokerInstances.has(credentialId)) {
        return this.brokerInstances.get(credentialId);
      }

      // Get broker credential (already decrypted by getBrokerCredentialById)
      const credential = await brokerCredentialService.getBrokerCredentialById(credentialId, userId);

      if (!credential) {
        throw new Error(`Broker credential not found: ${credentialId}`);
      }

      // Check if credential is active
      if (!credential.isActive) {
        throw new Error(`Broker credential is inactive: ${credentialId}`);
      }

      // The credentials are already decrypted by getBrokerCredentialById
      const decryptedCredentials = credential.credentials;

      // Validate that we have the decrypted credentials
      if (!decryptedCredentials || typeof decryptedCredentials !== "object") {
        loggerService.error(`Invalid credentials format for credential ${credentialId}:`, decryptedCredentials);
        throw new Error("Invalid broker credentials format");
      }

      // Create appropriate broker API instance based on broker name
      let brokerApi;

      // Handle both broker and brokerName fields for compatibility
      // Support various formats of Capital.com broker names
      const brokerType = (credential.brokerName || credential.broker || "").toLowerCase();
      const isCapitalBroker = brokerType.includes("capital") || brokerType === "capital.com" || brokerType === "capital";

      loggerService.debug(`Creating broker API for type: ${brokerType}, isCapital: ${isCapitalBroker}`);

      if (isCapitalBroker) {
        brokerApi = this.createCapitalApi(decryptedCredentials);
      } else if (brokerType === "binance") {
        brokerApi = this.createBinanceApi(decryptedCredentials);
      } else {
        throw new Error(`Unsupported broker type: ${credential.brokerName || credential.broker}. Supported types: capital.com, capital, binance`);
      }

      // Store for reuse
      this.brokerInstances.set(credentialId, brokerApi);

      loggerService.info(`Successfully created broker API instance for credential: ${credentialId}`);
      return brokerApi;
    } catch (error) {
      loggerService.error(`Error getting broker API instance: ${error}`);
      throw error;
    }
  }

  /**
   * Create Capital.com API instance
   */
  private createCapitalApi(credentials: any): CapitalMainService {
    // Validate required credential fields
    if (!credentials.apiKey || !credentials.identifier || !credentials.password) {
      throw new Error("Missing required Capital.com API credentials");
    }

    // Create a unique instanceId for this credential set
    const instanceId = `capital-${Date.now()}-${Math.round(Math.random() * 1000)}`;

    // Create Capital.com API instance with direct credential passing
    const isDemo = credentials.isDemo !== undefined ? credentials.isDemo : true;

    // Log the credentials we're about to use (with sensitive parts masked)
    const maskedCredentials = {
      apiKey: credentials.apiKey ? `${credentials.apiKey.substring(0, 3)}...${credentials.apiKey.substring(credentials.apiKey.length - 3)}` : "missing",
      identifier: credentials.identifier ? `${credentials.identifier.substring(0, 2)}...${credentials.identifier.substring(credentials.identifier.length - 2)}` : "missing",
      passwordLength: credentials.password ? credentials.password.length : 0,
      isDemo: isDemo,
    };

    loggerService.debug("Creating Capital.com API instance with credentials:", maskedCredentials);
    loggerService.info(`🔍 DEMO MODE DEBUG - Raw credentials.isDemo value: ${credentials.isDemo}`);
    loggerService.info(`🔍 DEMO MODE DEBUG - Final isDemo value: ${isDemo}`);
    loggerService.info(`🔍 DEMO MODE DEBUG - Will connect to: ${isDemo ? "DEMO" : "LIVE"} Capital.com API`);

    // Use the enhanced getCapitalApiInstance to create an instance with these credentials
    const brokerApi = getCapitalApiInstance({
      apiKey: credentials.apiKey,
      identifier: credentials.identifier,
      password: credentials.password,
      isDemo: isDemo,
      instanceId: instanceId,
    });

    loggerService.info(`Creating Capital.com API instance with credentials: ${JSON.stringify(maskedCredentials)}`);
    return brokerApi;
  }

  /**
   * Create Binance API instance (placeholder for future implementation)
   */
  private createBinanceApi(credentials: any): any {
    // This is a placeholder for future Binance API implementation
    // In a real implementation, you would import and create a BinanceApiService

    // Validate required credential fields
    if (!credentials.apiKey || !credentials.secretKey) {
      throw new Error("Missing required Binance API credentials");
    }

    // For now, return a mock object
    return {
      getBrokerType: () => "binance",
      getMarketData: async () => {
        throw new Error("Binance API not yet implemented");
      },
      getPositions: async () => {
        throw new Error("Binance API not yet implemented");
      },
      createOrder: async () => {
        throw new Error("Binance API not yet implemented");
      },
    };
  }

  /**
   * Clear a broker API instance from cache
   */
  clearBrokerInstance(credentialId: string): boolean {
    return this.brokerInstances.delete(credentialId);
  }

  /**
   * Clear all broker API instances from cache
   */
  clearAllBrokerInstances(): void {
    this.brokerInstances.clear();
  }
}

// Export singleton instance
export const brokerFactoryService = new BrokerFactoryService();
