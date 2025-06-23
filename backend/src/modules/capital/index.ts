// Import for helper function
import { CapitalMainService } from "./services/capital-main.service";
import type { CapitalAuthConfig } from "./interfaces/capital-session.interface";

// Capital.com API integration module
export { CapitalMainService } from "./services/capital-main.service";

// Re-export interfaces
export type { CapitalAuthConfig, CapitalSession } from "./interfaces/capital-session.interface";

export type {
  MarketData,
  Market,
  MarketSearchResponse,
  MarketDetailsResponse,
  HistoricalPrice,
  PriceResolution,
} from "./interfaces/capital-market.interface";

export type {
  Position,
  Order,
  CreatePositionRequest,
  CreateOrderRequest,
  DealConfirmation,
  AccountDetails,
} from "./interfaces/capital-position.interface";

// Helper function to create Capital API instance
export function getCapitalApiInstance(config: CapitalAuthConfig): CapitalMainService {
  return new CapitalMainService(config);
}
