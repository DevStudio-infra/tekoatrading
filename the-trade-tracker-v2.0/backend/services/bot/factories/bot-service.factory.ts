import { BotManagementService } from "../core/bot-management.service";
import { BotEvaluationService } from "../core/bot-evaluation.service";
import { BotTradingService } from "../core/bot-trading.service";
import { BotPositionService } from "../core/bot-position.service";
import { BotMarketService } from "../core/bot-market.service";
import { IBotManagementService } from "../interfaces/bot.interfaces";

/**
 * Factory for creating bot service instances
 * This provides a centralized place to manage service dependencies and configuration
 */
export class BotServiceFactory {
  private static botManagementService: IBotManagementService | null = null;
  private static botEvaluationService: BotEvaluationService | null = null;
  private static botTradingService: BotTradingService | null = null;
  private static botPositionService: BotPositionService | null = null;
  private static botMarketService: BotMarketService | null = null;

  /**
   * Get the bot management service instance (singleton)
   */
  static getBotManagementService(): IBotManagementService {
    if (!this.botManagementService) {
      this.botManagementService = new BotManagementService();
    }
    return this.botManagementService;
  }

  /**
   * Get the bot evaluation service instance (singleton)
   */
  static getBotEvaluationService(): BotEvaluationService {
    if (!this.botEvaluationService) {
      this.botEvaluationService = new BotEvaluationService();
    }
    return this.botEvaluationService;
  }

  /**
   * Get the bot trading service instance (singleton)
   */
  static getBotTradingService(): BotTradingService {
    if (!this.botTradingService) {
      this.botTradingService = new BotTradingService();
    }
    return this.botTradingService;
  }

  /**
   * Get the bot position service instance (singleton)
   */
  static getBotPositionService(): BotPositionService {
    if (!this.botPositionService) {
      this.botPositionService = new BotPositionService();
    }
    return this.botPositionService;
  }

  /**
   * Get the bot market service instance (singleton)
   */
  static getBotMarketService(): BotMarketService {
    if (!this.botMarketService) {
      this.botMarketService = new BotMarketService();
    }
    return this.botMarketService;
  }

  /**
   * Create a new bot management service instance (for testing or special cases)
   */
  static createBotManagementService(): IBotManagementService {
    return new BotManagementService();
  }

  /**
   * Reset all services (useful for testing)
   */
  static reset(): void {
    this.botManagementService = null;
    this.botEvaluationService = null;
    this.botTradingService = null;
    this.botPositionService = null;
    this.botMarketService = null;
  }

  /**
   * Create all services with their dependencies
   * This will be expanded as we add more services
   */
  static createAllServices(): {
    botManagement: IBotManagementService;
    botEvaluation: BotEvaluationService;
    botTrading: BotTradingService;
    botPosition: BotPositionService;
    botMarket: BotMarketService;
  } {
    return {
      botManagement: this.getBotManagementService(),
      botEvaluation: this.getBotEvaluationService(),
      botTrading: this.getBotTradingService(),
      botPosition: this.getBotPositionService(),
      botMarket: this.getBotMarketService(),
    };
  }
}

// Export singleton instances for convenience
export const botManagementService = BotServiceFactory.getBotManagementService();
export const botEvaluationService = BotServiceFactory.getBotEvaluationService();
export const botTradingService = BotServiceFactory.getBotTradingService();
export const botPositionService = BotServiceFactory.getBotPositionService();
export const botMarketService = BotServiceFactory.getBotMarketService();
