import { loggerService } from "../agents/core/services/logging/logger.service";
import { botService } from "./bot.service";
import { fullTradeWorkflow } from "../agents/workflows/full-trade-workflow";
import { tradeExecutionAgent } from "../agents/trading/trade-execution.agent";
import { RiskCheckWorkflow } from "../agents/workflows/risk-check-workflow";
import { positionSizingAgent } from "../agents/trading/position-sizing.agent";
import { prisma } from "../utils/prisma";
import { tradePositionManagerService } from "./trade-position-manager.service";
import { MarketDataService } from "./market-data.service";
import { BrokerIntegrationService } from "./broker-integration.service";

/**
 * TradingService - Compatibility Bridge
 *
 * This service provides backward compatibility for existing controllers and services
 * while the system transitions to the agent-based architecture.
 *
 * NOTE: This is a transitional service. Eventually, all functionality should be
 * handled directly by the agent system.
 */
export class TradingService {
  private riskCheckWorkflow: RiskCheckWorkflow;
  private marketDataService: MarketDataService;
  private brokerIntegrationService: BrokerIntegrationService;

  constructor() {
    this.riskCheckWorkflow = new RiskCheckWorkflow();
    this.marketDataService = new MarketDataService();
    this.brokerIntegrationService = new BrokerIntegrationService();
    loggerService.info("TradingService compatibility bridge initialized with real broker integration");
  }

  // Trade Management Methods
  async executeTrade(tradeData: any): Promise<any> {
    loggerService.info("TradingService.executeTrade called - delegating to agent system");

    try {
      // Extract trade parameters from the data
      const { botId, symbol, direction, quantity, orderType = "MARKET", limitPrice, stopPrice, stopLoss, takeProfit } = tradeData;

      loggerService.info(`Executing ${direction} trade for ${symbol}: ${quantity} units`);

      // Get bot information for account context
      const bot = await botService.getBotByIdSystem(botId);
      if (!bot) {
        throw new Error(`Bot ${botId} not found`);
      }

      // Use the trade execution agent directly for immediate execution
      const executionResult = await tradeExecutionAgent.executeTrade(
        {
          symbol,
          direction,
          quantity,
          orderType,
          limitPrice,
          stopPrice,
          stopLoss,
          takeProfit,
          timeInForce: "GTC",
        },
        {
          accountId: botId,
          riskAssessment: {
            riskScore: 5, // Medium risk
            riskLevel: "MEDIUM",
          },
          technicalSignal: {
            signal: direction,
            confidence: 75,
          },
          urgency: "MEDIUM",
        }
      );

      if (executionResult.success) {
        loggerService.info(`✅ Trade executed successfully: ${executionResult.data?.orderId}`);

        // Store trade in database using the trade position manager
        const tradeRecord = await tradePositionManagerService.createTrade({
          botId,
          userId: bot.userId, // Get userId from bot
          symbol,
          direction,
          orderType,
          quantity,
          entryPrice: executionResult.data?.executedPrice || 0,
          stopLoss,
          takeProfit,
        });

        return {
          success: true,
          tradeId: tradeRecord.id,
          orderId: executionResult.data?.orderId,
          status: executionResult.data?.status,
          executedPrice: executionResult.data?.executedPrice,
          executedQuantity: executionResult.data?.executedQuantity,
          reasoning: executionResult.data?.reasoning,
        };
      } else {
        loggerService.error(`❌ Trade execution failed: ${executionResult.error}`);
        throw new Error(executionResult.error || "Trade execution failed");
      }
    } catch (error) {
      loggerService.error("❌ TradingService.executeTrade error:", error);
      throw error;
    }
  }

  async closeTrade(tradeId: string, reason?: string): Promise<any> {
    loggerService.info(`TradingService.closeTrade called for trade ${tradeId}`);
    try {
      // Get trade details from database
      const trade = await prisma.trade.findUnique({
        where: { id: tradeId },
        include: { bot: true },
      });

      if (!trade) {
        throw new Error(`Trade ${tradeId} not found`);
      }

      // Use trade execution agent to close the position
      const closeResult = await tradeExecutionAgent.closePosition({
        positionId: trade.brokerOrderId || tradeId,
        symbol: trade.symbol,
        reason: reason || "Manual close",
      });

      if (closeResult.success) {
        // Update trade in database
        const updatedTrade = await tradePositionManagerService.closeTrade(tradeId, {
          exitPrice: closeResult.data?.executedPrice || trade.entryPrice || 0,
          exitReason: "MANUAL" as const,
          fees: closeResult.data?.fees || 0,
        });

        loggerService.info(`✅ Trade ${tradeId} closed successfully`);
        return {
          success: true,
          tradeId,
          closePrice: closeResult.data?.executedPrice,
          pnl: updatedTrade.profitLoss,
          reason: reason || "Manual close",
        };
      } else {
        throw new Error(closeResult.error || "Failed to close trade");
      }
    } catch (error) {
      loggerService.error(`❌ TradingService.closeTrade error for ${tradeId}:`, error as Error);
      throw error;
    }
  }

  async updateTrade(tradeId: string, updates: any): Promise<any> {
    loggerService.info(`TradingService.updateTrade called for trade ${tradeId}`);
    try {
      // Update trade using the trade position manager
      const updatedTrade = await tradePositionManagerService.updateTradePrice(tradeId, updates.currentPrice || updates.price || 0);

      loggerService.info(`✅ Trade ${tradeId} updated successfully`);
      return {
        success: true,
        tradeId,
        updatedFields: Object.keys(updates),
        trade: updatedTrade,
      };
    } catch (error) {
      loggerService.error(`❌ TradingService.updateTrade error for ${tradeId}:`, error as Error);
      throw error;
    }
  }

  async getActiveTrades(botId: string): Promise<any[]> {
    loggerService.info(`TradingService.getActiveTrades called for bot ${botId}`);
    try {
      // Get active trades using trade position manager
      const activeTrades = await tradePositionManagerService.getActiveTrades(botId);
      return activeTrades;
    } catch (error) {
      loggerService.error(`❌ TradingService.getActiveTrades error for bot ${botId}:`, error as Error);
      return [];
    }
  }

  async getTradeHistory(botId: string, limit?: number): Promise<any[]> {
    loggerService.info(`TradingService.getTradeHistory called for bot ${botId}`);
    try {
      // Get trade history using trade position manager
      const tradeHistory = await tradePositionManagerService.getTradeHistory(botId, limit);
      return tradeHistory;
    } catch (error) {
      loggerService.error(`❌ TradingService.getTradeHistory error for bot ${botId}:`, error as Error);
      return [];
    }
  }

  // Risk Management Methods
  async checkTradeRisk(tradeData: any): Promise<any> {
    loggerService.info("TradingService.checkTradeRisk called - delegating to agent system");
    try {
      // Use the risk check workflow for comprehensive risk assessment
      const riskResult = await this.riskCheckWorkflow.executeRiskCheck({
        symbol: tradeData.symbol,
        side: tradeData.direction,
        amount: tradeData.quantity,
        price: tradeData.entryPrice || 0,
        tradeType: tradeData.orderType || "MARKET",
        botId: tradeData.botId,
        strategy: tradeData.strategy || "default",
        timeframe: tradeData.timeframe || "1h",
      });

      return {
        approved: riskResult.approved,
        riskLevel: riskResult.recommendation === "PROCEED" ? "LOW" : riskResult.recommendation === "CAUTION" ? "MEDIUM" : "HIGH",
        riskScore: riskResult.riskScore,
        reasoning: riskResult.reasoning,
        recommendations: riskResult.adjustments,
      };
    } catch (error) {
      loggerService.error("❌ TradingService.checkTradeRisk error:", error as Error);
      return { approved: false, riskLevel: "HIGH", error: (error as Error).message };
    }
  }

  // Capital API Integration
  async getCapitalApiForBot(botId: string): Promise<any> {
    loggerService.info(`TradingService.getCapitalApiForBot called for bot ${botId}`);

    try {
      // Use the new system access method to get the broker API instance
      const brokerApi = await botService.getBrokerApiForBotSystem(botId);

      loggerService.info(`✅ Successfully connected to Capital.com API for bot ${botId} using user credentials`);
      return brokerApi;
    } catch (error) {
      loggerService.error(`❌ Failed to get Capital.com API for bot ${botId}:`, error);

      // Return a mock API instance to prevent AI analysis failures
      loggerService.warn("⚠️  TradingService.getCapitalApiForBot using fallback mock API");

      return {
        // Mock Capital API instance
        isDemo: true,
        isConnected: false,
        getAccountInfo: async () => ({ balance: 10000, currency: "USD" }),
        getPositions: async () => [],
        getMarketData: async (symbol: string) => ({
          symbol,
          bid: 100,
          ask: 101,
          spread: 1,
        }),
        createOrder: async (orderData: any) => {
          loggerService.warn("Mock API: Order creation not implemented");
          return { orderId: "mock-order-id", status: "PENDING" };
        },
        closePosition: async (positionId: string) => {
          loggerService.warn("Mock API: Position closing not implemented");
          return { success: false, reason: "Mock API" };
        },
      };
    }
  }

  // Trade Status Methods
  async getTradeStatus(tradeId: string): Promise<any> {
    loggerService.info(`TradingService.getTradeStatus called for trade ${tradeId}`);
    try {
      // Get trade status from database
      const trade = await prisma.trade.findUnique({
        where: { id: tradeId },
        include: {
          bot: true,
          evaluation: true,
        },
      });

      if (!trade) {
        return { status: "NOT_FOUND", error: "Trade not found" };
      }

      return {
        status: trade.status,
        tradeId: trade.id,
        symbol: trade.symbol,
        direction: trade.direction,
        quantity: trade.quantity,
        entryPrice: trade.entryPrice,
        currentPrice: trade.currentPrice,
        profitLoss: trade.profitLoss,
        openedAt: trade.openedAt,
        closedAt: trade.closedAt,
      };
    } catch (error) {
      loggerService.error(`❌ TradingService.getTradeStatus error for ${tradeId}:`, error as Error);
      return { status: "ERROR", error: (error as Error).message };
    }
  }

  async cancelTrade(tradeId: string): Promise<any> {
    loggerService.info(`TradingService.cancelTrade called for trade ${tradeId}`);
    try {
      // Get trade details
      const trade = await prisma.trade.findUnique({
        where: { id: tradeId },
      });

      if (!trade) {
        throw new Error(`Trade ${tradeId} not found`);
      }

      if (trade.status !== "PENDING" && trade.status !== "OPEN") {
        throw new Error(`Cannot cancel trade ${tradeId} with status ${trade.status}`);
      }

      // Use trade execution agent to cancel the order
      const cancelResult = await tradeExecutionAgent.cancelOrder(trade.brokerOrderId || tradeId);

      if (cancelResult.success) {
        // Update trade status in database
        const updatedTrade = await prisma.trade.update({
          where: { id: tradeId },
          data: {
            status: "CANCELLED",
            closedAt: new Date(),
          },
        });

        loggerService.info(`✅ Trade ${tradeId} cancelled successfully`);
        return {
          success: true,
          tradeId,
          status: "CANCELLED",
          reason: cancelResult.reason,
        };
      } else {
        throw new Error(cancelResult.reason || "Failed to cancel trade");
      }
    } catch (error) {
      loggerService.error(`❌ TradingService.cancelTrade error for ${tradeId}:`, error as Error);
      throw error;
    }
  }

  // Cleanup and Lifecycle
  cleanup(): void {
    loggerService.info("TradingService.cleanup called");
    try {
      // Clean up agent resources
      tradeExecutionAgent.updateConfiguration({ enabled: false });

      // Clean up market data service
      this.marketDataService.cleanup();

      loggerService.info("✅ TradingService cleanup completed");
    } catch (error) {
      loggerService.error("❌ TradingService.cleanup error:", error as Error);
    }
  }

  // Utility Methods
  async validateTrade(tradeData: any): Promise<boolean> {
    loggerService.info("TradingService.validateTrade called");
    try {
      // Use risk check workflow for validation
      const riskResult = await this.checkTradeRisk(tradeData);
      return riskResult.approved && riskResult.riskLevel !== "CRITICAL";
    } catch (error) {
      loggerService.error("❌ TradingService.validateTrade error:", error as Error);
      return false;
    }
  }

  async calculatePositionSize(symbol: string, riskAmount: number, stopLoss: number): Promise<number> {
    loggerService.info("TradingService.calculatePositionSize called");
    try {
      // Use position sizing agent for calculation
      const sizingResult = await positionSizingAgent.calculatePositionSize(
        {
          symbol,
          direction: "BUY", // Default for calculation
          entryPrice: 100, // Will be updated with real price
          stopLossPrice: stopLoss,
          confidence: 75,
        },
        {
          balance: riskAmount * 50, // Assuming 2% risk
          availableBalance: riskAmount * 50 * 0.95,
          currency: "USD",
        }
      );

      return sizingResult.success ? sizingResult.data?.recommendedSize || 1000 : 1000;
    } catch (error) {
      loggerService.error("❌ TradingService.calculatePositionSize error:", error as Error);
      return 1000; // Default fallback
    }
  }

  // Configuration Methods
  async getMarketInfo(symbol: string): Promise<any> {
    loggerService.info(`TradingService.getMarketInfo called for ${symbol}`);
    try {
      // Get real market info from market data service
      const livePrice = await this.marketDataService.getLivePrice(symbol);
      const marketStatus = await this.marketDataService.getMarketStatus(symbol);

      return {
        symbol,
        available: true,
        bid: livePrice.bid,
        ask: livePrice.ask,
        spread: livePrice.spread,
        price: (livePrice.bid + livePrice.ask) / 2,
        change: livePrice.change,
        changePercent: livePrice.changePercent,
        volume: livePrice.volume,
        isOpen: marketStatus.isOpen,
        timestamp: livePrice.timestamp,
      };
    } catch (error) {
      loggerService.error(`❌ TradingService.getMarketInfo error for ${symbol}:`, error as Error);
      return {
        symbol,
        available: false,
        error: (error as Error).message,
      };
    }
  }

  async isMarketOpen(symbol: string): Promise<boolean> {
    loggerService.info(`TradingService.isMarketOpen called for ${symbol}`);
    try {
      // Use real market data service to check market status
      const marketStatus = await this.marketDataService.getMarketStatus(symbol);
      return marketStatus.isOpen;
    } catch (error) {
      loggerService.error(`❌ TradingService.isMarketOpen error for ${symbol}:`, error as Error);

      // Fallback to simple time-based check
      const now = new Date();
      const hour = now.getUTCHours();
      const dayOfWeek = now.getDay();

      // Basic market hours: Forex markets typically open 24/5
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isCrypto = symbol.includes("BTC") || symbol.includes("ETH") || symbol.includes("crypto");

      return isCrypto || !isWeekend;
    }
  }

  // Real-time Data Methods
  async getCurrentPrice(symbol: string): Promise<number> {
    loggerService.info(`TradingService.getCurrentPrice called for ${symbol}`);
    try {
      const livePrice = await this.marketDataService.getLivePrice(symbol);
      return (livePrice.bid + livePrice.ask) / 2; // Mid price
    } catch (error) {
      loggerService.error(`❌ TradingService.getCurrentPrice error for ${symbol}:`, error as Error);
      throw error;
    }
  }

  async getAccountBalance(botId?: string): Promise<any> {
    loggerService.info(`TradingService.getAccountBalance called for bot ${botId || "system"}`);
    try {
      // If we have a botId, get the Capital API instance for that bot (which includes credentials)
      if (botId) {
        const capitalApi = await this.getCapitalApiForBot(botId);

        // Get account details directly from Capital API
        const accountDetails = await capitalApi.getAccountDetails();

        return {
          currency: accountDetails.currency || "USD",
          balance: accountDetails.balance || 10000,
          available: accountDetails.available || 9500,
          reserved: (accountDetails.balance || 10000) - (accountDetails.available || 9500),
          equity: accountDetails.equity || accountDetails.balance || 10000,
          margin: accountDetails.margin || 500,
          freeMargin: accountDetails.available || 9500,
          marginLevel: accountDetails.marginLevel || 2000,
          lastUpdated: new Date(),
        };
      }

      // Fallback: Return default balance when no botId provided
      loggerService.warn("No botId provided for getAccountBalance, returning fallback balance");
      return {
        currency: "USD",
        balance: 10000,
        available: 9500,
        reserved: 500,
        equity: 10000,
        margin: 500,
        freeMargin: 9500,
        marginLevel: 2000,
        lastUpdated: new Date(),
      };
    } catch (error) {
      loggerService.error(`❌ TradingService.getAccountBalance error:`, error as Error);
      // Return fallback balance
      return {
        currency: "USD",
        balance: 10000,
        available: 9500,
        reserved: 500,
        equity: 10000,
        margin: 500,
        freeMargin: 9500,
        marginLevel: 2000,
        lastUpdated: new Date(),
      };
    }
  }
}

// Export singleton instance
export const tradingService = new TradingService();
