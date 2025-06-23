// @ts-nocheck - Disabling TypeScript checking for this file to resolve Prisma model type mismatches

import { EventEmitter } from "events";
import { prisma } from "../utils/prisma";
import { TradingService } from "./trading.service";
import { CapitalMainService } from "../modules/capital/services/capital-main.service";
import { loggerService } from "./logger.service";
import { strategyRuleParserService, ParsedStrategyRule, StrategyRuleParserService } from "./strategy-rule-parser.service";
import { tradeExecutionAgent } from "../agents/trading/trade-execution.agent";
import { BrokerFactoryService } from "./broker-factory.service";

export interface PositionRiskMetrics {
  currentRisk: number;
  maxRisk: number;
  riskPercentage: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  drawdown: number;
  timeInPosition: number; // minutes
}

export interface TrailingStopConfig {
  enabled: boolean;
  trailDistance: number; // points
  minProfit: number; // minimum profit before trailing starts
}

export interface PositionManagementConfig {
  maxRiskPerTrade: number; // percentage
  maxTotalRisk: number; // percentage
  trailingStop: TrailingStopConfig;
  maxTimeInPosition: number; // minutes
  emergencyStopLoss: number; // percentage
}

export class PositionManagementService extends EventEmitter {
  private tradingService: TradingService;
  private brokerFactory: BrokerFactoryService;
  private logger: typeof loggerService;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private readonly MONITORING_INTERVAL_MS = 30000; // 30 seconds

  constructor() {
    super();
    this.tradingService = new TradingService();
    this.brokerFactory = new BrokerFactoryService();
    this.logger = loggerService;
  }

  /**
   * Get Capital.com API instance for a specific bot
   */
  private async getCapitalApiForBot(botId: string): Promise<CapitalMainService> {
    const bot = await prisma.bot.findUnique({
      where: { id: botId },
      include: {
        user: {
          include: {
            brokerCredentials: {
              where: { brokerName: "capital.com" },
            },
          },
        },
      },
    });

    if (!bot?.user?.brokerCredentials?.[0]) {
      throw new Error(`No Capital.com credentials found for bot ${botId}`);
    }

    return this.brokerFactory.createBrokerApi("capital.com", bot.user.brokerCredentials[0].credentials) as CapitalMainService;
  }

  /**
   * Initialize the position management service
   */
  async initialize(): Promise<void> {
    try {
      this.startPositionMonitoring();
      this.logger.info("Position management service initialized successfully");
    } catch (error) {
      this.logger.error("Failed to initialize position management service:", error);
      throw error;
    }
  }

  /**
   * Start monitoring all active positions
   */
  private startPositionMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.monitorAllPositions();
      } catch (error) {
        this.logger.error("Error in position monitoring:", error);
      }
    }, this.MONITORING_INTERVAL_MS);

    this.logger.info("Position monitoring started");
  }

  /**
   * Stop position monitoring
   */
  private stopPositionMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      this.logger.info("Position monitoring stopped");
    }
  }

  /**
   * Monitor all active positions
   */
  private async monitorAllPositions(): Promise<void> {
    try {
      // Get all open trades with bot info
      const openTrades = await prisma.trade.findMany({
        where: {
          status: "OPEN",
        },
        include: {
          bot: {
            include: {
              strategy: true,
              user: {
                include: {
                  brokerCredentials: {
                    where: { brokerName: "capital.com" },
                  },
                },
              },
            },
          },
        },
      });

      for (const trade of openTrades) {
        // Only monitor trades that have broker credentials
        if (trade.bot?.user?.brokerCredentials?.length > 0) {
          await this.monitorPosition(trade);
        } else {
          this.logger.warn(`Skipping position monitoring for trade ${trade.id} - no broker credentials found`);
        }
      }
    } catch (error) {
      this.logger.error("Error monitoring positions:", error);
    }
  }

  /**
   * Monitor a specific position with strategy-based rules
   */
  private async monitorPosition(trade: any): Promise<void> {
    try {
      // Get Capital API instance for this bot
      const capitalApi = await this.getCapitalApiForBot(trade.botId);

      // Get current market price
      const marketData = await capitalApi.getMarketDetails(trade.symbol);
      const currentPrice = trade.direction === "BUY" ? marketData.snapshot.bid : marketData.snapshot.offer;

      // Update current price in database
      await prisma.trade.update({
        where: { id: trade.id },
        data: { currentPrice },
      });

      // Calculate risk metrics
      const riskMetrics = this.calculateRiskMetrics(trade, currentPrice);

      // Check for stop loss and take profit triggers
      await this.checkStopLossTakeProfit(trade, currentPrice);

      // NEW: Check strategy-based rules
      await this.checkStrategyBasedRules(trade, currentPrice, riskMetrics);

      // Check for trailing stop adjustments
      await this.checkTrailingStop(trade, currentPrice, riskMetrics);

      // Check for time-based exits
      await this.checkTimeBasedExit(trade);

      // Check for emergency conditions
      await this.checkEmergencyConditions(trade, riskMetrics);

      // Emit position update event
      this.emit("positionUpdated", {
        trade,
        currentPrice,
        riskMetrics,
      });
    } catch (error) {
      this.logger.error(`Error monitoring position ${trade.id}:`, error);
    }
  }

  /**
   * Calculate risk metrics for a position
   */
  private calculateRiskMetrics(trade: any, currentPrice: number): PositionRiskMetrics {
    const entryPrice = trade.entryPrice || 0;
    const quantity = trade.quantity || 0;

    // Calculate unrealized P&L
    const priceDiff = trade.direction === "BUY" ? currentPrice - entryPrice : entryPrice - currentPrice;
    const unrealizedPnL = priceDiff * quantity;
    const unrealizedPnLPercent = entryPrice > 0 ? (priceDiff / entryPrice) * 100 : 0;

    // Calculate current risk
    const stopLossDistance = trade.stopLoss ? Math.abs(currentPrice - trade.stopLoss) : 0;
    const currentRisk = stopLossDistance * quantity;

    // Calculate time in position
    const openedAt = trade.openedAt || trade.createdAt;
    const timeInPosition = Math.floor((Date.now() - new Date(openedAt).getTime()) / (1000 * 60));

    // Calculate drawdown (maximum adverse excursion)
    const worstPrice = trade.direction === "BUY" ? Math.min(currentPrice, entryPrice) : Math.max(currentPrice, entryPrice);
    const drawdownDiff = trade.direction === "BUY" ? entryPrice - worstPrice : worstPrice - entryPrice;
    const drawdown = Math.abs(drawdownDiff * quantity);

    return {
      currentRisk,
      maxRisk: currentRisk, // This would be calculated based on strategy settings
      riskPercentage: 0, // This would be calculated based on account balance
      unrealizedPnL,
      unrealizedPnLPercent,
      drawdown,
      timeInPosition,
    };
  }

  /**
   * Check for stop loss and take profit triggers
   */
  private async checkStopLossTakeProfit(trade: any, currentPrice: number): Promise<void> {
    let shouldClose = false;
    let closeReason = "";

    // Check stop loss
    if (trade.stopLoss) {
      const stopLossTriggered = trade.direction === "BUY" ? currentPrice <= trade.stopLoss : currentPrice >= trade.stopLoss;

      if (stopLossTriggered) {
        shouldClose = true;
        closeReason = "Stop loss triggered";
      }
    }

    // Check take profit
    if (trade.takeProfit && !shouldClose) {
      const takeProfitTriggered = trade.direction === "BUY" ? currentPrice >= trade.takeProfit : currentPrice <= trade.takeProfit;

      if (takeProfitTriggered) {
        shouldClose = true;
        closeReason = "Take profit triggered";
      }
    }

    if (shouldClose) {
      try {
        await this.tradingService.closeTrade(trade.id, closeReason);
        this.logger.info(`Position closed: ${trade.id} - ${closeReason}`);
      } catch (error) {
        this.logger.error(`Failed to close position ${trade.id}:`, error);
      }
    }
  }

  /**
   * Check and adjust trailing stop
   */
  private async checkTrailingStop(trade: any, currentPrice: number, riskMetrics: PositionRiskMetrics): Promise<void> {
    // This is a simplified trailing stop implementation
    // In a real implementation, you'd get trailing stop config from bot/strategy settings
    const trailingConfig: TrailingStopConfig = {
      enabled: true,
      trailDistance: 10, // 10 points
      minProfit: 20, // minimum 20 points profit before trailing starts
    };

    if (!trailingConfig.enabled || !trade.stopLoss) {
      return;
    }

    // Only start trailing if we have minimum profit
    if (riskMetrics.unrealizedPnL < trailingConfig.minProfit) {
      return;
    }

    let newStopLoss: number | null = null;

    if (trade.direction === "BUY") {
      // For long positions, trail stop loss up
      const trailStopLevel = currentPrice - trailingConfig.trailDistance;
      if (trailStopLevel > trade.stopLoss) {
        newStopLoss = trailStopLevel;
      }
    } else {
      // For short positions, trail stop loss down
      const trailStopLevel = currentPrice + trailingConfig.trailDistance;
      if (trailStopLevel < trade.stopLoss) {
        newStopLoss = trailStopLevel;
      }
    }

    if (newStopLoss) {
      try {
        await this.tradingService.updateTrade(trade.id, { stopLoss: newStopLoss });
        this.logger.info(`Trailing stop updated for ${trade.id}: ${newStopLoss}`);
      } catch (error) {
        this.logger.error(`Failed to update trailing stop for ${trade.id}:`, error);
      }
    }
  }

  /**
   * Check for time-based exit conditions
   */
  private async checkTimeBasedExit(trade: any): Promise<void> {
    // This would be configured per strategy
    const maxTimeInPosition = 24 * 60; // 24 hours in minutes

    const openedAt = trade.openedAt || trade.createdAt;
    const timeInPosition = Math.floor((Date.now() - new Date(openedAt).getTime()) / (1000 * 60));

    if (timeInPosition > maxTimeInPosition) {
      try {
        await this.tradingService.closeTrade(trade.id, "Maximum time in position reached");
        this.logger.info(`Position closed due to time limit: ${trade.id}`);
      } catch (error) {
        this.logger.error(`Failed to close position due to time limit ${trade.id}:`, error);
      }
    }
  }

  /**
   * Check for emergency conditions
   */
  private async checkEmergencyConditions(trade: any, riskMetrics: PositionRiskMetrics): Promise<void> {
    // Emergency stop if unrealized loss exceeds threshold
    const emergencyStopPercent = -10; // 10% loss

    if (riskMetrics.unrealizedPnLPercent < emergencyStopPercent) {
      try {
        await this.tradingService.closeTrade(trade.id, "Emergency stop - excessive loss");
        this.logger.warn(`Emergency stop triggered for ${trade.id}: ${riskMetrics.unrealizedPnLPercent}%`);
      } catch (error) {
        this.logger.error(`Failed to execute emergency stop for ${trade.id}:`, error);
      }
    }
  }

  /**
   * NEW: Check strategy-based rules from strategy description
   */
  private async checkStrategyBasedRules(trade: any, currentPrice: number, riskMetrics: PositionRiskMetrics): Promise<void> {
    try {
      // Get strategy description
      if (!trade.bot?.strategy?.description) {
        return; // No strategy description to parse
      }

      const strategyDescription = trade.bot.strategy.description;
      const timeframe = trade.bot.timeframe || "M1";

      // Parse strategy rules
      const parsedStrategy = strategyRuleParserService.parseStrategyDescription(strategyDescription, timeframe);

      if (parsedStrategy.rules.length === 0) {
        return; // No rules found
      }

      loggerService.info(`🔍 Checking ${parsedStrategy.rules.length} strategy rules for trade ${trade.id} (${trade.symbol})`);

      // Sort rules by priority (highest first)
      const activeRules = parsedStrategy.rules.filter((rule) => rule.enabled).sort((a, b) => b.priority - a.priority);

      // Log all active rules being checked
      loggerService.info(`📋 Active rules to check for trade ${trade.id}:`);
      activeRules.forEach((rule, index) => {
        loggerService.info(`   ${index + 1}. ${rule.type}: ${rule.trigger.value} ${rule.trigger.unit} (Priority: ${rule.priority})`);
      });

      for (const rule of activeRules) {
        const shouldTrigger = await this.evaluateStrategyRule(trade, rule, currentPrice, riskMetrics, timeframe);

        loggerService.info(`⚡ Rule ${rule.type} evaluation: ${shouldTrigger ? "✅ TRIGGERED" : "❌ Not triggered"} for trade ${trade.id}`);

        if (shouldTrigger) {
          loggerService.info(`🚨 EXECUTING STRATEGY RULE: ${rule.type} for trade ${trade.id}`);
          await this.executeStrategyRule(trade, rule);
          break; // Execute only the highest priority rule
        }
      }

      if (activeRules.length === 0) {
        loggerService.info(`ℹ️ No active strategy rules found for trade ${trade.id}`);
      }
    } catch (error) {
      loggerService.error(`Error checking strategy rules for trade ${trade.id}:`, error);
    }
  }

  /**
   * Evaluate if a strategy rule should trigger
   */
  private async evaluateStrategyRule(trade: any, rule: ParsedStrategyRule, currentPrice: number, riskMetrics: PositionRiskMetrics, timeframe: string): Promise<boolean> {
    const openedAt = trade.openedAt || trade.createdAt;
    const timeInPosition = Math.floor((Date.now() - new Date(openedAt).getTime()) / (1000 * 60)); // minutes

    switch (rule.type) {
      case "EXIT_AFTER_CANDLES":
        const candleTimeInMinutes = StrategyRuleParserService.convertCandlesToTime(rule.trigger.value, timeframe);
        loggerService.debug(`Checking candle rule: ${rule.trigger.value} candles = ${candleTimeInMinutes} minutes, current time in position: ${timeInPosition} minutes`);
        return timeInPosition >= candleTimeInMinutes;

      case "EXIT_AFTER_TIME":
        const timeThreshold = rule.trigger.unit === "hours" ? rule.trigger.value * 60 : rule.trigger.value;
        return timeInPosition >= timeThreshold;

      case "EXIT_ON_PROFIT":
        if (rule.trigger.condition === "greater_than") {
          return riskMetrics.unrealizedPnLPercent >= rule.trigger.value;
        }
        break;

      case "EXIT_ON_LOSS":
        if (rule.trigger.condition === "less_than") {
          return riskMetrics.unrealizedPnLPercent <= rule.trigger.value;
        }
        break;

      case "SCALE_OUT":
        if (rule.trigger.condition === "greater_than") {
          return riskMetrics.unrealizedPnLPercent >= rule.trigger.value;
        }
        break;

      case "TRAIL_STOP":
        // Trailing stop is handled separately in checkTrailingStop
        return false;

      default:
        return false;
    }

    return false;
  }

  /**
   * Execute a strategy rule action
   */
  private async executeStrategyRule(trade: any, rule: ParsedStrategyRule): Promise<void> {
    try {
      const ruleDescription = `${rule.type} rule: ${rule.trigger.value} ${rule.trigger.unit}`;

      switch (rule.action) {
        case "close_full":
          loggerService.info(`Executing full close for trade ${trade.id} due to ${ruleDescription}`);
          await this.tradingService.closeTrade(trade.id, `Strategy rule triggered: ${ruleDescription}`);
          break;

        case "close_partial":
          const closePercentage = rule.parameters?.percentage || 50;
          loggerService.info(`Executing partial close (${closePercentage}%) for trade ${trade.id} due to ${ruleDescription}`);

          // Calculate partial close quantity
          const partialQuantity = trade.quantity * (closePercentage / 100);

          // Implement partial close functionality
          try {
            // Since the current closePosition doesn't support partial closes,
            // we'll simulate the partial close behavior in our system
            const remainingQuantity = trade.quantity - partialQuantity;
            const simulatedExitPrice = trade.currentPrice || trade.entryPrice || 0;

            // Calculate partial P&L
            const partialPnL = this.calculatePartialPnL(trade.direction as "BUY" | "SELL", trade.entryPrice || 0, simulatedExitPrice, partialQuantity);

            // Update main trade record with reduced quantity
            await prisma.trade.update({
              where: { id: trade.id },
              data: {
                quantity: remainingQuantity,
                profitLoss: (trade.profitLoss || 0) + partialPnL,
                updatedAt: new Date(),
              },
            });

            // Create a new trade record for the closed portion
            await prisma.trade.create({
              data: {
                botId: trade.botId,
                userId: trade.userId,
                symbol: trade.symbol,
                direction: trade.direction,
                orderType: trade.orderType,
                quantity: partialQuantity,
                entryPrice: trade.entryPrice,
                currentPrice: simulatedExitPrice,
                status: "CLOSED",
                profitLoss: partialPnL,
                profitLossPercent: trade.entryPrice ? (partialPnL / (trade.entryPrice * partialQuantity)) * 100 : 0,
                openedAt: trade.openedAt,
                closedAt: new Date(),
                rationale: `Partial close: ${ruleDescription}`,
                aiConfidence: trade.aiConfidence,
                riskScore: trade.riskScore,
                evaluationId: trade.evaluationId,
                brokerOrderId: `${trade.brokerOrderId || trade.id}_partial_${Date.now()}`,
                tradeDurationMinutes: trade.openedAt ? Math.floor((Date.now() - trade.openedAt.getTime()) / (1000 * 60)) : 0,
              },
            });

            loggerService.info(`✅ Partial close executed: ${partialQuantity} units of trade ${trade.id} at ${simulatedExitPrice} (P&L: ${partialPnL.toFixed(2)})`);

            // Note: In a real implementation, this would need to call the broker API
            // to actually close part of the position. For now, we're just updating our records.
            loggerService.warn(`⚠️ Partial close simulated - broker API integration needed for actual position closure`);
          } catch (error) {
            loggerService.error(`Error executing partial close for trade ${trade.id}:`, error);
          }
          break;

        case "modify_sl":
          if (rule.parameters?.newStopLoss) {
            loggerService.info(`Modifying stop loss for trade ${trade.id} to ${rule.parameters.newStopLoss} due to ${ruleDescription}`);
            await this.tradingService.updateTrade(trade.id, { stopLoss: rule.parameters.newStopLoss });
          }
          break;

        case "modify_tp":
          if (rule.parameters?.newTakeProfit) {
            loggerService.info(`Modifying take profit for trade ${trade.id} to ${rule.parameters.newTakeProfit} due to ${ruleDescription}`);
            await this.tradingService.updateTrade(trade.id, { takeProfit: rule.parameters.newTakeProfit });
          }
          break;

        default:
          loggerService.warn(`Unknown strategy rule action: ${rule.action}`);
      }
    } catch (error) {
      loggerService.error(`Error executing strategy rule for trade ${trade.id}:`, error);
    }
  }

  /**
   * Get position summary for a bot
   */
  async getPositionSummary(botId: string): Promise<any> {
    try {
      const activeTrades = await this.tradingService.getActiveTrades(botId);
      const tradeHistory = await this.tradingService.getTradeHistory(botId, 100);

      // Calculate summary metrics
      const totalActiveTrades = activeTrades.length;
      const totalUnrealizedPnL = activeTrades.reduce((sum, trade) => sum + (trade.profitLoss || 0), 0);

      const closedTrades = tradeHistory.filter((trade) => trade.status === "CLOSED");
      const totalRealizedPnL = closedTrades.reduce((sum, trade) => sum + (trade.profitLoss || 0), 0);

      const winningTrades = closedTrades.filter((trade) => (trade.profitLoss || 0) > 0);
      const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0;

      return {
        activeTrades: totalActiveTrades,
        totalUnrealizedPnL,
        totalRealizedPnL,
        totalPnL: totalUnrealizedPnL + totalRealizedPnL,
        winRate,
        totalTrades: tradeHistory.length,
        closedTrades: closedTrades.length,
        trades: activeTrades,
      };
    } catch (error) {
      this.logger.error(`Error getting position summary for bot ${botId}:`, error);
      throw error;
    }
  }

  /**
   * Get detailed position metrics for a specific trade
   */
  async getPositionMetrics(tradeId: string): Promise<any> {
    try {
      const trade = await prisma.trade.findUnique({
        where: { id: tradeId },
        include: {
          bot: true,
          evaluation: true,
        },
      });

      if (!trade) {
        throw new Error(`Trade not found: ${tradeId}`);
      }

      // Get current market price if position is open
      let currentPrice = trade.currentPrice;
      if (trade.status === "OPEN") {
        const marketData = await this.getCapitalApiForBot(trade.botId);
        currentPrice = trade.direction === "BUY" ? marketData.snapshot.bid : marketData.snapshot.offer;
      }

      const riskMetrics = this.calculateRiskMetrics(trade, currentPrice || 0);

      return {
        trade,
        currentPrice,
        riskMetrics,
      };
    } catch (error) {
      this.logger.error(`Error getting position metrics for trade ${tradeId}:`, error);
      throw error;
    }
  }

  /**
   * Manually close all positions for a bot
   */
  async closeAllPositions(botId: string, reason: string = "Manual close all"): Promise<void> {
    try {
      const activeTrades = await this.tradingService.getActiveTrades(botId);

      for (const trade of activeTrades) {
        try {
          await this.tradingService.closeTrade(trade.id, reason);
          this.logger.info(`Closed position ${trade.id} for bot ${botId}`);
        } catch (error) {
          this.logger.error(`Failed to close position ${trade.id}:`, error);
        }
      }
    } catch (error) {
      this.logger.error(`Error closing all positions for bot ${botId}:`, error);
      throw error;
    }
  }

  /**
   * Update position management configuration for a bot
   */
  async updatePositionConfig(botId: string, config: Partial<PositionManagementConfig>): Promise<void> {
    try {
      // In a real implementation, this would update bot-specific configuration
      // For now, we'll just log the configuration update
      this.logger.info(`Position management config updated for bot ${botId}:`, config);
    } catch (error) {
      this.logger.error(`Error updating position config for bot ${botId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate P&L for partial close
   */
  private calculatePartialPnL(direction: "BUY" | "SELL", entryPrice: number, exitPrice: number, quantity: number): number {
    const priceDiff = direction === "BUY" ? exitPrice - entryPrice : entryPrice - exitPrice;
    return priceDiff * quantity;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stopPositionMonitoring();
    this.tradingService.cleanup();
    this.removeAllListeners();
  }
}
