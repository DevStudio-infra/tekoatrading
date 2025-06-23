export { CapitalMainService } from "./services/capital-main.service";
export { CapitalMarketService } from "./services/capital-market.service";
export { CapitalAuthService } from "./services/capital-auth.service";
export { CapitalTradingService } from "./services/capital-trading.service";
export { CapitalPositionService } from "./services/capital-position.service";

export type { CapitalAuthConfig } from "./interfaces/capital-session.interface";
export type { MarketData, Market } from "./interfaces/capital-market.interface";
export type { Position, Order } from "./interfaces/capital-position.interface";

/**
 * Factory function to create Capital.com API instance
 */
export function getCapitalApiInstance(config: CapitalAuthConfig): CapitalMainService {
  return new CapitalMainService(config);
}
