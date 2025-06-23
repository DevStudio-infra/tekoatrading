// Trading Services - Barrel Export
// This file exports all the refactored trading services for easy importing

export * from "./types";
export { SymbolMappingService } from "./symbol-mapping.service";
export { MarketValidationService } from "./market-validation.service";
// RiskManagementService replaced with LangChain adapter
export { TradeDataService } from "./trade-data.service";
export { TradeVerificationService } from "./trade-verification.service";
// PositionSyncService replaced with LangChain adapter
export { TradeExecutionService } from "./trade-execution.service";

// Import the services properly for the factory
import { SymbolMappingService } from "./symbol-mapping.service";
import { MarketValidationService } from "./market-validation.service";
import { riskManagementService } from "../adapters/risk-management.adapter";
import { TradeDataService } from "./trade-data.service";
import { TradeVerificationService } from "./trade-verification.service";
import { positionSyncService } from "../adapters/position-sync.adapter";
import { TradeExecutionService } from "./trade-execution.service";

// Service Factory for creating initialized services with proper dependencies
export class TradingServicesFactory {
  static create() {
    const symbolMapping = new SymbolMappingService();
    const marketValidation = new MarketValidationService(symbolMapping);
    const riskManagement = riskManagementService;
    const tradeData = new TradeDataService();
    const tradeVerification = new TradeVerificationService();
    const positionSync = positionSyncService;
    const tradeExecution = new TradeExecutionService(symbolMapping);

    return {
      symbolMapping,
      marketValidation,
      riskManagement,
      tradeData,
      tradeVerification,
      positionSync,
      tradeExecution,
    };
  }
}
