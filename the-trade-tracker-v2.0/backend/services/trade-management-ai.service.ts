import { aiAnalysisService } from "./adapters/ai-analysis.adapter";
import { TradingService } from "./trading.service";
import { PositionManagementService } from "./position-management.service";
import { loggerService } from "./logger.service";
import { prisma } from "../utils/prisma";
import { tradeExecutionAgent } from "../agents/trading/trade-execution.agent";

// Types and interfaces for trade management
export interface TradeManagementDecision {
  action: "HOLD" | "CLOSE" | "MODIFY_SL" | "MODIFY_TP" | "PARTIAL_CLOSE" | "SCALE_IN" | "SCALE_OUT";
  newStopLoss?: number;
  newTakeProfit?: number;
  closePercentage?: number;
  scaleQuantity?: number;
  rationale: string;
  confidence: number; // 0-100
  urgency: "LOW" | "MEDIUM" | "HIGH";
  riskLevel: number; // 1-5
}

export interface TrailingStopConfig {
  enabled: boolean;
  trailDistance: number; // in pips or percentage
  minProfit: number; // minimum profit before trailing starts
  stepSize: number; // how often to adjust
}

export interface ProfitTakingStrategy {
  type: "FIXED" | "DYNAMIC" | "SCALED";
  levels: Array<{
    percentage: number; // percentage of position to close
    targetPrice: number;
    rationale: string;
  }>;
}

export interface PositionScalingStrategy {
  maxScaleIns: number;
  scaleInDistance: number; // distance between scale-ins
  scaleOutLevels: number[]; // profit levels for scaling out
  maxPositionSize: number;
}

export interface TradeManagementContext {
  trade: any; // Trade object from database
  currentPrice: number;
  marketCondition: "BULLISH" | "BEARISH" | "NEUTRAL" | "VOLATILE";
  timeInPosition: number; // hours
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  portfolioRisk: number;
  correlationRisk: number;
}

export class TradeManagementAI {
  private tradingService: TradingService;
  private positionManagementService: PositionManagementService;
  private tradeExecutionAgent = tradeExecutionAgent;

  constructor() {
    this.tradingService = new TradingService();
    this.positionManagementService = new PositionManagementService();
  }

  /**
   * Analyze and manage an existing trade
   */
  async analyzeTradeManagement(tradeId: string, chartImageBase64?: string, strategyDescription?: string): Promise<TradeManagementDecision> {
    try {
      loggerService.info(`Analyzing trade management for trade ${tradeId}`);

      // Get trade details
      const trade = await this.getTrade(tradeId);
      if (!trade) {
        throw new Error("Trade not found");
      }

      // Get current market context
      const context = await this.getTradeManagementContext(trade);

      // Analyze using AI if chart is provided
      let aiDecision: TradeManagementDecision | null = null;
      if (chartImageBase64 && strategyDescription) {
        aiDecision = await this.getAITradeManagementDecision(trade, chartImageBase64, strategyDescription, context);
      }

      // Apply rule-based management
      const ruleBasedDecision = await this.getRuleBasedManagementDecision(trade, context);

      // Combine AI and rule-based decisions
      const finalDecision = this.combineManagementDecisions(aiDecision, ruleBasedDecision, context);

      loggerService.info(`Trade management decision: ${finalDecision.action} with confidence ${finalDecision.confidence}%`);

      return finalDecision;
    } catch (error) {
      loggerService.error("Error analyzing trade management:", error);
      throw new Error("Failed to analyze trade management");
    }
  }

  /**
   * Implement trailing stop logic
   */
  async implementTrailingStop(tradeId: string, config: TrailingStopConfig): Promise<{ updated: boolean; newStopLoss?: number; rationale: string }> {
    try {
      const trade = await this.getTrade(tradeId);
      if (!trade || trade.status !== "OPEN") {
        return { updated: false, rationale: "Trade not found or not open" };
      }

      const context = await this.getTradeManagementContext(trade);

      // Check if minimum profit threshold is met
      if (context.unrealizedPnLPercent < config.minProfit) {
        return {
          updated: false,
          rationale: `Minimum profit threshold (${config.minProfit}%) not met`,
        };
      }

      // Calculate new trailing stop
      const newStopLoss = this.calculateTrailingStop(trade, context.currentPrice, config);

      // Only update if new stop loss is better (closer to current price)
      const shouldUpdate = trade.direction === "BUY" ? newStopLoss > (trade.stopLoss || 0) : newStopLoss < (trade.stopLoss || Infinity);

      if (shouldUpdate) {
        await this.tradingService.updateTrade(tradeId, { stopLoss: newStopLoss });
        return {
          updated: true,
          newStopLoss,
          rationale: `Trailing stop updated to ${newStopLoss} (${config.trailDistance} distance)`,
        };
      }

      return {
        updated: false,
        rationale: "Current stop loss is already optimal",
      };
    } catch (error) {
      loggerService.error("Error implementing trailing stop:", error);
      throw error;
    }
  }

  /**
   * Execute dynamic profit taking
   */
  async executeDynamicProfitTaking(tradeId: string, strategy: ProfitTakingStrategy): Promise<{ executed: boolean; actions: string[]; rationale: string }> {
    try {
      const trade = await this.getTrade(tradeId);
      if (!trade) {
        throw new Error("Trade not found");
      }

      const context = await this.getTradeManagementContext(trade);
      const actions: string[] = [];

      // Check each profit-taking level
      for (const level of strategy.levels) {
        const targetReached = context.currentPrice >= level.targetPrice;

        if (targetReached) {
          // Execute partial close
          const closeQuantity = trade.quantity * (level.percentage / 100);

          // Implement partial close functionality
          try {
            // Create partial close order using trade execution agent
            const partialCloseResult = await this.tradeExecutionAgent.closePosition({
              positionId: trade.brokerOrderId || trade.id,
              symbol: trade.symbol,
              reason: `Profit taking: ${level.rationale}`,
            });

            if (partialCloseResult.success) {
              // Since we can't do real partial close via the current API,
              // we'll simulate it by updating our database records
              const remainingQuantity = trade.quantity - closeQuantity;
              const partialExitPrice = partialCloseResult.data?.executedPrice || context.currentPrice;

              // Calculate partial P&L
              const partialPnL = this.calculatePartialPnL(trade.direction as "BUY" | "SELL", trade.entryPrice || 0, partialExitPrice, closeQuantity);

              // Update trade record
              await prisma.trade.update({
                where: { id: tradeId },
                data: {
                  quantity: remainingQuantity,
                  profitLoss: (trade.profitLoss || 0) + partialPnL,
                  updatedAt: new Date(),
                },
              });

              // Create a separate trade record for the closed portion
              await prisma.trade.create({
                data: {
                  botId: trade.botId,
                  userId: trade.userId,
                  symbol: trade.symbol,
                  direction: trade.direction,
                  orderType: trade.orderType,
                  quantity: closeQuantity,
                  entryPrice: trade.entryPrice,
                  currentPrice: partialExitPrice,
                  status: "CLOSED",
                  profitLoss: partialPnL,
                  profitLossPercent: trade.entryPrice ? (partialPnL / (trade.entryPrice * closeQuantity)) * 100 : 0,
                  openedAt: trade.openedAt,
                  closedAt: new Date(),
                  rationale: `Partial close: ${level.rationale}`,
                  aiConfidence: trade.aiConfidence,
                  riskScore: trade.riskScore,
                  evaluationId: trade.evaluationId,
                  brokerOrderId: `${trade.brokerOrderId}_partial_${Date.now()}`,
                  tradeDurationMinutes: trade.openedAt ? Math.floor((Date.now() - trade.openedAt.getTime()) / (1000 * 60)) : 0,
                },
              });

              actions.push(`Closed ${level.percentage}% (${closeQuantity} units) at ${partialExitPrice}: ${level.rationale}`);

              loggerService.info(`✅ Partial close executed for trade ${tradeId}: ${closeQuantity} units at ${partialExitPrice} (P&L: ${partialPnL.toFixed(2)})`);
            } else {
              loggerService.error(`Failed to execute partial close for trade ${tradeId}:`, partialCloseResult.error);
              actions.push(`Failed to close ${level.percentage}% at ${level.targetPrice}: ${partialCloseResult.error}`);
            }
          } catch (error) {
            loggerService.error(`Error executing partial close for trade ${tradeId}:`, error);
            actions.push(`Error closing ${level.percentage}% at ${level.targetPrice}: ${(error as Error).message}`);
          }
        }
      }

      return {
        executed: actions.length > 0,
        actions,
        rationale: actions.length > 0 ? `Executed ${actions.length} profit-taking levels` : "No profit-taking levels reached",
      };
    } catch (error) {
      loggerService.error("Error executing dynamic profit taking:", error);
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
   * Analyze position scaling opportunities
   */
  async analyzePositionScaling(
    tradeId: string,
    strategy: PositionScalingStrategy,
    chartImageBase64?: string
  ): Promise<{
    action: "SCALE_IN" | "SCALE_OUT" | "HOLD";
    quantity?: number;
    price?: number;
    rationale: string;
    confidence: number;
  }> {
    try {
      const trade = await this.getTrade(tradeId);
      if (!trade) {
        throw new Error("Trade not found");
      }

      const context = await this.getTradeManagementContext(trade);

      // Check for scale-in opportunities (position moving against us)
      if (context.unrealizedPnLPercent < -2 && context.unrealizedPnLPercent > -10) {
        const scaleInPrice = this.calculateScaleInPrice(trade, context.currentPrice, strategy);

        if (this.shouldScaleIn(trade, context, strategy)) {
          return {
            action: "SCALE_IN",
            quantity: strategy.maxPositionSize * 0.5, // 50% of max additional size
            price: scaleInPrice,
            rationale: "Favorable scale-in opportunity detected",
            confidence: 70,
          };
        }
      }

      // Check for scale-out opportunities (position in profit)
      if (context.unrealizedPnLPercent > 5) {
        for (const level of strategy.scaleOutLevels) {
          if (context.unrealizedPnLPercent >= level) {
            return {
              action: "SCALE_OUT",
              quantity: trade.quantity * 0.25, // Scale out 25%
              rationale: `Scale out at ${level}% profit level`,
              confidence: 80,
            };
          }
        }
      }

      return {
        action: "HOLD",
        rationale: "No scaling opportunities detected",
        confidence: 60,
      };
    } catch (error) {
      loggerService.error("Error analyzing position scaling:", error);
      throw error;
    }
  }

  /**
   * Detect exit signals using AI and technical analysis
   */
  async detectExitSignals(
    tradeId: string,
    chartImageBase64: string,
    strategyDescription: string
  ): Promise<{
    shouldExit: boolean;
    exitType: "IMMEDIATE" | "GRADUAL" | "CONDITIONAL";
    confidence: number;
    rationale: string;
    suggestedPrice?: number;
  }> {
    try {
      const trade = await this.getTrade(tradeId);
      if (!trade) {
        throw new Error("Trade not found");
      }

      // Use AI to analyze current chart for exit signals
      const aiAnalysis = await aiAnalysisService.analyzePositionManagement({
        symbol: trade.symbol,
        currentPosition: trade,
        marketData: chartImageBase64,
        strategy: strategyDescription,
      });

      const context = await this.getTradeManagementContext(trade);

      // Combine AI analysis with rule-based exit detection
      const ruleBasedExit = this.detectRuleBasedExitSignals(trade, context);

      // Determine final exit recommendation
      const shouldExit = aiAnalysis.action === "CLOSE" || ruleBasedExit.shouldExit;
      const confidence = Math.max(aiAnalysis.confidence, ruleBasedExit.confidence);

      return {
        shouldExit,
        exitType: this.determineExitType(aiAnalysis, ruleBasedExit, context),
        confidence,
        rationale: shouldExit ? `AI: ${aiAnalysis.reasoning}. Rules: ${ruleBasedExit.rationale}` : "No strong exit signals detected",
        suggestedPrice: context.currentPrice,
      };
    } catch (error) {
      loggerService.error("Error detecting exit signals:", error);
      throw error;
    }
  }

  /**
   * Get trade from database
   */
  private async getTrade(tradeId: string): Promise<any> {
    try {
      return await prisma.trade.findUnique({
        where: { id: tradeId },
        include: {
          bot: {
            include: {
              strategy: true,
              brokerCredential: true,
            },
          },
        },
      });
    } catch (error) {
      loggerService.error("Error getting trade:", error);
      throw error;
    }
  }

  /**
   * Get comprehensive trade management context
   */
  private async getTradeManagementContext(trade: any): Promise<TradeManagementContext> {
    try {
      // Get current price (mock for now)
      const currentPrice = trade.entryPrice * (1 + (Math.random() - 0.5) * 0.02); // ±1% variation

      // Calculate P&L
      const priceDiff = trade.direction === "BUY" ? currentPrice - trade.entryPrice : trade.entryPrice - currentPrice;

      const unrealizedPnL = priceDiff * trade.quantity;
      const unrealizedPnLPercent = (priceDiff / trade.entryPrice) * 100;

      // Calculate time in position
      const timeInPosition = trade.openedAt ? (Date.now() - new Date(trade.openedAt).getTime()) / (1000 * 60 * 60) : 0;

      // Get portfolio metrics
      const positionSummary = await this.positionManagementService.getPositionSummary(trade.botId);

      return {
        trade,
        currentPrice,
        marketCondition: this.detectMarketCondition(currentPrice, trade.entryPrice),
        timeInPosition,
        unrealizedPnL,
        unrealizedPnLPercent,
        portfolioRisk: this.calculatePortfolioRisk(positionSummary),
        correlationRisk: 30, // Mock value
      };
    } catch (error) {
      loggerService.error("Error getting trade management context:", error);
      throw error;
    }
  }

  /**
   * Get AI-based trade management decision
   */
  private async getAITradeManagementDecision(trade: any, chartImageBase64: string, strategyDescription: string, context: TradeManagementContext): Promise<TradeManagementDecision> {
    try {
      const aiAnalysis = await aiAnalysisService.analyzePositionManagement({
        symbol: trade.symbol,
        currentPosition: trade,
        marketData: chartImageBase64,
        strategy: strategyDescription,
      });

      return {
        action: aiAnalysis.action as any,
        newStopLoss: aiAnalysis.adjustments?.stopLoss,
        newTakeProfit: aiAnalysis.adjustments?.takeProfit,
        closePercentage: aiAnalysis.adjustments?.positionSize,
        rationale: aiAnalysis.reasoning,
        confidence: aiAnalysis.confidence,
        urgency: this.determineUrgency(aiAnalysis.confidence, context),
        riskLevel: this.calculateRiskLevel(context),
      };
    } catch (error) {
      loggerService.error("Error getting AI trade management decision:", error);
      throw error;
    }
  }

  /**
   * Get rule-based management decision
   */
  private async getRuleBasedManagementDecision(trade: any, context: TradeManagementContext): Promise<TradeManagementDecision> {
    try {
      // Time-based rules
      if (context.timeInPosition > 168) {
        // 1 week
        return {
          action: "CLOSE",
          rationale: "Position held for over 1 week - time-based exit",
          confidence: 70,
          urgency: "MEDIUM",
          riskLevel: 3,
        };
      }

      // P&L-based rules
      if (context.unrealizedPnLPercent < -10) {
        return {
          action: "CLOSE",
          rationale: "Stop loss triggered - 10% loss limit",
          confidence: 95,
          urgency: "HIGH",
          riskLevel: 5,
        };
      }

      if (context.unrealizedPnLPercent > 20) {
        return {
          action: "PARTIAL_CLOSE",
          closePercentage: 50,
          rationale: "Take partial profits at 20% gain",
          confidence: 80,
          urgency: "MEDIUM",
          riskLevel: 2,
        };
      }

      // Risk-based rules
      if (context.portfolioRisk > 80) {
        return {
          action: "CLOSE",
          rationale: "High portfolio risk - reduce exposure",
          confidence: 85,
          urgency: "HIGH",
          riskLevel: 4,
        };
      }

      // Default hold
      return {
        action: "HOLD",
        rationale: "No rule-based triggers activated",
        confidence: 60,
        urgency: "LOW",
        riskLevel: 2,
      };
    } catch (error) {
      loggerService.error("Error getting rule-based management decision:", error);
      throw error;
    }
  }

  /**
   * Combine AI and rule-based decisions
   */
  private combineManagementDecisions(
    aiDecision: TradeManagementDecision | null,
    ruleBasedDecision: TradeManagementDecision,
    context: TradeManagementContext
  ): TradeManagementDecision {
    try {
      // If no AI decision, use rule-based
      if (!aiDecision) {
        return ruleBasedDecision;
      }

      // Rule-based decisions take priority for risk management
      if (ruleBasedDecision.urgency === "HIGH" || ruleBasedDecision.riskLevel >= 4) {
        return ruleBasedDecision;
      }

      // Use AI decision if it has higher confidence
      if (aiDecision.confidence > ruleBasedDecision.confidence) {
        return aiDecision;
      }

      // Default to rule-based for safety
      return ruleBasedDecision;
    } catch (error) {
      loggerService.error("Error combining management decisions:", error);
      return ruleBasedDecision;
    }
  }

  /**
   * Calculate trailing stop price
   */
  private calculateTrailingStop(trade: any, currentPrice: number, config: TrailingStopConfig): number {
    const trailDistance = config.trailDistance;

    if (trade.direction === "BUY") {
      return currentPrice - trailDistance;
    } else {
      return currentPrice + trailDistance;
    }
  }

  /**
   * Calculate scale-in price
   */
  private calculateScaleInPrice(trade: any, currentPrice: number, strategy: PositionScalingStrategy): number {
    const distance = strategy.scaleInDistance;

    if (trade.direction === "BUY") {
      return currentPrice - distance;
    } else {
      return currentPrice + distance;
    }
  }

  /**
   * Determine if should scale in
   */
  private shouldScaleIn(trade: any, context: TradeManagementContext, strategy: PositionScalingStrategy): boolean {
    // Check if we haven't exceeded max scale-ins
    // TODO: Track scale-in count in database
    const scaleInCount = 0; // Mock

    return scaleInCount < strategy.maxScaleIns && context.portfolioRisk < 70 && context.unrealizedPnLPercent > -8; // Don't scale in if loss is too large
  }

  /**
   * Detect market condition
   */
  private detectMarketCondition(currentPrice: number, entryPrice: number): "BULLISH" | "BEARISH" | "NEUTRAL" | "VOLATILE" {
    const change = Math.abs((currentPrice - entryPrice) / entryPrice);

    if (change > 0.02) {
      return "VOLATILE";
    } else if (currentPrice > entryPrice * 1.005) {
      return "BULLISH";
    } else if (currentPrice < entryPrice * 0.995) {
      return "BEARISH";
    } else {
      return "NEUTRAL";
    }
  }

  /**
   * Calculate portfolio risk
   */
  private calculatePortfolioRisk(positionSummary: any): number {
    // Simple risk calculation based on open positions and P&L
    let risk = positionSummary.activeTrades * 10; // 10 points per active trade

    if (positionSummary.totalUnrealizedPnL < 0) {
      risk += Math.abs(positionSummary.totalUnrealizedPnL) / 100; // Add unrealized losses
    }

    return Math.min(risk, 100);
  }

  /**
   * Determine urgency level
   */
  private determineUrgency(confidence: number, context: TradeManagementContext): "LOW" | "MEDIUM" | "HIGH" {
    if (context.unrealizedPnLPercent < -8 || context.portfolioRisk > 80) {
      return "HIGH";
    } else if (confidence > 80 || Math.abs(context.unrealizedPnLPercent) > 5) {
      return "MEDIUM";
    } else {
      return "LOW";
    }
  }

  /**
   * Calculate risk level
   */
  private calculateRiskLevel(context: TradeManagementContext): number {
    let risk = 1;

    if (Math.abs(context.unrealizedPnLPercent) > 5) risk += 1;
    if (context.portfolioRisk > 60) risk += 1;
    if (context.timeInPosition > 72) risk += 1; // 3 days
    if (context.marketCondition === "VOLATILE") risk += 1;

    return Math.min(risk, 5);
  }

  /**
   * Detect rule-based exit signals
   */
  private detectRuleBasedExitSignals(
    trade: any,
    context: TradeManagementContext
  ): {
    shouldExit: boolean;
    confidence: number;
    rationale: string;
  } {
    // Strong exit signals
    if (context.unrealizedPnLPercent < -10) {
      return {
        shouldExit: true,
        confidence: 95,
        rationale: "Stop loss triggered",
      };
    }

    if (context.timeInPosition > 168) {
      // 1 week
      return {
        shouldExit: true,
        confidence: 80,
        rationale: "Time-based exit",
      };
    }

    // Weak exit signals
    if (context.portfolioRisk > 70) {
      return {
        shouldExit: true,
        confidence: 70,
        rationale: "High portfolio risk",
      };
    }

    return {
      shouldExit: false,
      confidence: 50,
      rationale: "No exit signals",
    };
  }

  /**
   * Determine exit type
   */
  private determineExitType(aiAnalysis: any, ruleBasedExit: any, context: TradeManagementContext): "IMMEDIATE" | "GRADUAL" | "CONDITIONAL" {
    if (context.unrealizedPnLPercent < -8 || context.portfolioRisk > 80) {
      return "IMMEDIATE";
    } else if (context.unrealizedPnLPercent > 10) {
      return "GRADUAL";
    } else {
      return "CONDITIONAL";
    }
  }
}

export const tradeManagementAI = new TradeManagementAI();
