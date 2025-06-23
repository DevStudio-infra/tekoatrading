/**
 * Capital.com API Module
 * Provides services for interacting with the Capital.com trading platform
 */

// Export interfaces
export * from "./interfaces/capital-session.interface";
export * from "./interfaces/capital-market.interface";
export * from "./interfaces/capital-price.interface";
export * from "./interfaces/capital-position.interface";

// Export individual services
export { CapitalBaseService } from "./services/capital-base.service";
export { CapitalMarketService } from "./services/capital-market.service";
export { CapitalPriceService } from "./services/capital-price.service";
export { CapitalPositionService } from "./services/capital-position.service";
export { CapitalSymbolService } from "./services/capital-symbol.service";

// Export main service class
export { CapitalMainService } from "./services/capital-main.service";

// Import and re-export the enhanced API instance function with credential support
import { getCapitalApiInstance, clearCapitalApiInstance } from "./services/capital-main.service";

// Export the functions directly for use with credentials
export { getCapitalApiInstance, clearCapitalApiInstance };

// REMOVED: Problematic singleton that was trying to initialize with env vars
// This was causing startup errors when no .env credentials were provided
// Services should now use getCapitalApiInstance() with user credentials instead

// Enhanced convenience function that supports credential parameters
export function getCapitalService(options?: { apiKey?: string; username?: string; password?: string; isDemo?: boolean; instanceId?: string }) {
  return getCapitalApiInstance(options);
}

// Backward compatibility function - returns null if no credentials available
// This prevents startup errors while maintaining API compatibility
export function getDefaultCapitalService(): import("./services/capital-main.service").CapitalMainService | null {
  try {
    // Only create instance if environment variables are actually provided
    if (process.env.CAPITAL_API_KEY && process.env.CAPITAL_USERNAME && process.env.CAPITAL_PASSWORD) {
      return getCapitalApiInstance({
        instanceId: "default-env",
      });
    }
    return null;
  } catch (error) {
    // If creation fails, return null instead of throwing
    return null;
  }
}
