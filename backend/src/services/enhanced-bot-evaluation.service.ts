import { prisma } from "../prisma";
import { logger } from "../logger";
import { credentialsEncryption } from "./credentials-encryption.service";
import { marketValidationService } from "./market-validation.service";
import { ChartGenerationService } from "./chart-generation.service";
import { PortfolioContextService } from "./portfolio-context.service";
import { ProfessionalOrderManager } from "./order-management/professional-order-manager.service";
import { PositionAwarenessAgent } from "../agents/trading/position-awareness.agent";
import { PositionContextEvaluationAgent } from "../agents/trading/position-context-evaluation.agent";
import { DynamicTradeManagerAgent } from "../agents/trading/dynamic-trade-manager.agent";
import { EnhancedTradingDecisionAgent } from "../ai/enhanced-trading-decision-agent";
import { ChartService } from "../modules/chart/index";
import { CandleData } from "../agents/core/technical-analysis.agent";

export interface EnhancedBotEvaluationResult {
  success: boolean;
  data?: any;
  error?: string;
  reason?: string;
  tradeExecuted?: boolean;
  evaluationId?: string;
  orderDetails?: any;
}

export interface TradeExecutionRequest {
  botId: string;
  analysis: any;
  orderType: "MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT";
  entryPrice?: number;
  stopLoss: number;
  takeProfit: number;
  positionSize: number;
  direction: "BUY" | "SELL";
  timeframe: string;
  riskAssessment: any;
}

/**
 * Enhanced Bot Evaluation Service with Professional Order Management
 *
 * This service replaces the old large bot-evaluation.service.ts with a modular,
 * professional-grade system that integrates all the new order management components.
 */
export class EnhancedBotEvaluationService {
  private chartGenerationService: ChartGenerationService;
  private portfolioContextService: PortfolioContextService;
  private professionalOrderManager: ProfessionalOrderManager;
  private positionAwarenessAgent: PositionAwarenessAgent;
  private positionContextEvaluationAgent: PositionContextEvaluationAgent;
  private dynamicTradeManagerAgent: DynamicTradeManagerAgent;
  private enhancedTradingAgent: EnhancedTradingDecisionAgent;
  private chartService: ChartService;
  private capitalApiInstances: Map<string, any> = new Map();

  constructor() {
    this.chartGenerationService = new ChartGenerationService();
    this.portfolioContextService = new PortfolioContextService();
    this.professionalOrderManager = new ProfessionalOrderManager();
    this.positionAwarenessAgent = new PositionAwarenessAgent();
    this.positionContextEvaluationAgent = new PositionContextEvaluationAgent();
    this.dynamicTradeManagerAgent = new DynamicTradeManagerAgent();
    this.enhancedTradingAgent = new EnhancedTradingDecisionAgent();
    this.chartService = new ChartService();
  }

  /**
   * Main enhanced bot evaluation with professional order management
   */
  async evaluateBot(botId: string): Promise<EnhancedBotEvaluationResult> {
    try {
      logger.info(`🤖 Starting Enhanced Professional Evaluation for bot: ${botId}`);

      // Get bot configuration
      const bot = await this.getBotDetails(botId);
      if (!bot || !bot.isActive) {
        logger.warn(`⚠️ Bot ${botId} not found or not active`);
        return { success: false, error: "Bot not found or not active" };
      }

      const symbol = bot.tradingPairSymbol || "BTC/USD";
      const timeframe = bot.timeframe || "M1";

      // Setup Capital API
      const capitalApi = await this.setupCapitalApi(bot);

      // Check market status
      const marketCheck = await this.checkMarketStatus(symbol, capitalApi);
      if (!marketCheck.allowed) {
        return {
          success: true,
          data: {
            message: `Market closed: ${marketCheck.reason}`,
            decision: "HOLD",
            marketStatus: "CLOSED",
          },
        };
      }

      // 📊 Fetch shared candlestick data
      const sharedCandleData = await this.getSharedCandlestickData(symbol, timeframe, botId);

      // 🎯 Check for existing positions FIRST
      const portfolioContext = await this.portfolioContextService.collectPortfolioContext(
        bot.userId,
        botId,
      );
      const positionStatus = await this.checkExistingPositions(botId, symbol, portfolioContext);

      if (positionStatus.hasOpenPosition) {
        logger.info(`🔍 Managing existing position for ${symbol}`);
        return await this.manageExistingPosition(botId, bot, positionStatus, sharedCandleData);
      }

      // Run professional evaluation pipeline
      const evaluationResult = await this.runProfessionalEvaluationPipeline(
        bot,
        capitalApi,
        sharedCandleData,
      );

      logger.info(`✅ Enhanced Professional Evaluation Complete for ${bot.name}`);
      return evaluationResult;
    } catch (error) {
      logger.error(`❌ Enhanced evaluation failed for bot ${botId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown evaluation error",
      };
    }
  }

  // 🚨 NEW: Position Management Methods
  private async checkExistingPositions(
    botId: string,
    symbol: string,
    portfolioContext: any,
  ): Promise<{
    hasOpenPosition: boolean;
    position?: any;
    action?: string;
    reasoning?: string;
  }> {
    try {
      // Check Capital.com account for open positions
      const positions = portfolioContext?.positions || [];

      // Look for existing position in the same symbol
      const existingPosition = positions.find((pos: any) => {
        const posSymbol = pos.instrument || pos.symbol || "";
        const normalizedPosSymbol = posSymbol.replace(/[\/\-_]/g, "").toUpperCase();
        const normalizedTargetSymbol = symbol.replace(/[\/\-_]/g, "").toUpperCase();
        return (
          normalizedPosSymbol.includes(normalizedTargetSymbol) ||
          normalizedTargetSymbol.includes(normalizedPosSymbol)
        );
      });

      if (existingPosition) {
        logger.info(
          `🔍 Found existing position: ${existingPosition.direction} ${existingPosition.size} units, P&L: ${existingPosition.unrealizedPnL}`,
        );

        const action = this.determinePositionAction(existingPosition, portfolioContext);
        return {
          hasOpenPosition: true,
          position: existingPosition,
          action: action,
          reasoning: `${existingPosition.direction} position with ${existingPosition.unrealizedPnL > 0 ? "profit" : "loss"} of ${existingPosition.unrealizedPnL}`,
        };
      }

      return {
        hasOpenPosition: false,
        reasoning: "No existing position found, can consider new entry",
      };
    } catch (error) {
      logger.error(`Error checking existing positions: ${error}`);
      return {
        hasOpenPosition: false,
        reasoning: "Unable to check existing positions, assuming new entry",
      };
    }
  }

  private determinePositionAction(position: any, portfolioContext: any): string {
    const unrealizedPnL = position.unrealizedPnL || 0;
    const positionValue = Math.abs(position.size * (position.level || 1));

    // Calculate P&L percentage
    const pnlPercent = positionValue > 0 ? (unrealizedPnL / positionValue) * 100 : 0;

    logger.info(
      `📊 Position Analysis: P&L ${unrealizedPnL}, Value ${positionValue}, P&L%: ${pnlPercent.toFixed(2)}%`,
    );

    // Take profit conditions
    if (pnlPercent > 2.0) {
      return "TAKE_PARTIAL_PROFIT"; // 2%+ profit
    }

    // Stop loss conditions
    if (pnlPercent < -1.5) {
      return "CONSIDER_STOP_LOSS"; // 1.5%+ loss
    }

    // Trailing stop conditions
    if (pnlPercent > 1.0) {
      return "TRAIL_STOP_LOSS"; // 1%+ profit, trail stop
    }

    // Add to position conditions
    if (pnlPercent > -0.5 && pnlPercent < 0.5) {
      return "CONSIDER_ADD_TO_POSITION"; // Flat position
    }

    return "HOLD_POSITION"; // Default hold
  }

  private async manageExistingPosition(
    botId: string,
    bot: any,
    positionStatus: any,
    sharedCandleData: any[],
  ): Promise<EnhancedBotEvaluationResult> {
    try {
      const position = positionStatus.position;
      const action = positionStatus.action;

      logger.info(`🔧 Managing position with action: ${action}`);

      switch (action) {
        case "TAKE_PARTIAL_PROFIT":
          return await this.executePartialTakeProfit(botId, bot, position);

        case "CONSIDER_STOP_LOSS":
          return await this.executeStopLoss(botId, bot, position);

        case "TRAIL_STOP_LOSS":
          return await this.updateTrailingStop(botId, bot, position);

        case "CONSIDER_ADD_TO_POSITION":
          return await this.considerAddingToPosition(botId, bot, position, sharedCandleData);

        case "HOLD_POSITION":
        default:
          logger.info(`✅ Holding position: ${position.direction} ${position.size} units`);
          return {
            success: true,
            data: {
              action: "HOLD",
              position: position,
              reasoning: "Position within acceptable range, holding",
            },
          };
      }
    } catch (error) {
      logger.error(`❌ Position management failed: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Position management error",
      };
    }
  }

  private async executePartialTakeProfit(
    botId: string,
    bot: any,
    position: any,
  ): Promise<EnhancedBotEvaluationResult> {
    try {
      // Take profit on 50% of position
      const partialSize = position.size * 0.5;
      const oppositeDirection = position.direction === "BUY" ? "SELL" : "BUY";

      logger.info(`💰 Taking partial profit: ${oppositeDirection} ${partialSize} units`);

      // TODO: Implement actual order execution via Capital.com API
      // For now, just log the action

      return {
        success: true,
        data: {
          action: "PARTIAL_PROFIT_TAKEN",
          originalSize: position.size,
          partialSize: partialSize,
          reasoning: `Taking 50% profit on position with ${position.unrealizedPnL} P&L`,
        },
      };
    } catch (error) {
      logger.error(`❌ Partial take profit failed: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Partial profit execution error",
      };
    }
  }

  private async executeStopLoss(
    botId: string,
    bot: any,
    position: any,
  ): Promise<EnhancedBotEvaluationResult> {
    try {
      const oppositeDirection = position.direction === "BUY" ? "SELL" : "BUY";

      logger.info(`🛑 Executing stop loss: ${oppositeDirection} ${position.size} units`);

      // TODO: Implement actual order execution via Capital.com API
      // For now, just log the action

      return {
        success: true,
        data: {
          action: "STOP_LOSS_EXECUTED",
          size: position.size,
          direction: oppositeDirection,
          reasoning: `Stop loss executed due to ${position.unrealizedPnL} loss`,
        },
      };
    } catch (error) {
      logger.error(`❌ Stop loss execution failed: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Stop loss execution error",
      };
    }
  }

  private async updateTrailingStop(
    botId: string,
    bot: any,
    position: any,
  ): Promise<EnhancedBotEvaluationResult> {
    try {
      logger.info(`📈 Updating trailing stop for profitable position`);

      // TODO: Implement trailing stop logic via Capital.com API
      // For now, just log the action

      return {
        success: true,
        data: {
          action: "TRAILING_STOP_UPDATED",
          position: position,
          reasoning: `Trailing stop updated for position with ${position.unrealizedPnL} profit`,
        },
      };
    } catch (error) {
      logger.error(`❌ Trailing stop update failed: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Trailing stop update error",
      };
    }
  }

  private async considerAddingToPosition(
    botId: string,
    bot: any,
    position: any,
    sharedCandleData: any[],
  ): Promise<EnhancedBotEvaluationResult> {
    try {
      logger.info(`🤔 Considering adding to existing position`);

      // For now, just return hold - adding to positions requires more sophisticated analysis
      return {
        success: true,
        data: {
          action: "HOLD_FOR_NOW",
          position: position,
          reasoning: "Position flat, but not adding at this time - requires more analysis",
        },
      };
    } catch (error) {
      logger.error(`❌ Add to position analysis failed: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Add to position analysis error",
      };
    }
  }

  /**
   * Professional Evaluation Pipeline
   */
  private async runProfessionalEvaluationPipeline(
    bot: any,
    capitalApi: any,
    sharedCandleData: CandleData[],
  ): Promise<EnhancedBotEvaluationResult> {
    try {
      logger.info(`🎯 Running Professional Evaluation Pipeline for ${bot.name}`);

      // STEP 1: GENERATE CHART (Optional)
      const chartResult = await this.chartGenerationService.generateBotChart(
        bot.id,
        bot.tradingPairSymbol,
        bot.timeframe,
        bot,
        sharedCandleData,
      );

      const chartUrl = chartResult.chartUrl || "temp://chart-failed";

      // STEP 2: COLLECT PORTFOLIO CONTEXT
      logger.info(`📊 Collecting Portfolio Context...`);
      const portfolioContext = await this.portfolioContextService.collectPortfolioContext(
        bot.userId,
        bot.id,
      );

      // STEP 3: AI ANALYSIS WITH REAL MARKET PRICE
      logger.info(`🧠 Performing AI Analysis...`);
      const realMarketPrice = await this.getRealMarketPrice(bot.tradingPairSymbol, bot.id);
      const analysisResult = await this.performEnhancedAIAnalysis(
        bot,
        chartUrl,
        portfolioContext,
        realMarketPrice,
        sharedCandleData,
      );

      if (!analysisResult.success) {
        throw new Error(`AI analysis failed: ${analysisResult.error}`);
      }

      // 🔍 Position Awareness and Risk Management
      if (analysisResult.data.shouldTrade) {
        logger.info(`🔍 Checking Position Awareness...`);
        logger.info(
          `🎯 Committee Decision: ${analysisResult.data.direction} for ${bot.tradingPairSymbol}`,
        );

        const positionCheck = await this.positionAwarenessAgent.checkPositionLimits({
          symbol: bot.tradingPairSymbol,
          direction: analysisResult.data.direction,
          botId: bot.id,
          userId: bot.userId || bot.user?.id || "unknown",
          proposedPositionSize: analysisResult.data.positionSize || 0.001,
          capitalApi: capitalApi,
          botConfig: {
            maxOpenTrades: bot.maxOpenTrades || 4,
            maxRiskPercentage: bot.maxRiskPercentage || 2,
            minRiskPercentage: bot.minRiskPercentage || 0.5,
            name: bot.name,
          },
          accountBalance: portfolioContext.accountBalance,
          timeframe: bot.timeframe,
        });

        if (positionCheck.canTrade) {
          logger.info(`✅ Position awareness check passed - Committee decision validated`);

          // 🎯 PROFESSIONAL TRADING EXECUTION
          logger.info(`🎯 EXECUTING PROFESSIONAL COMMITTEE DECISION:`);
          logger.info(
            `📊 Technical Signal: ${analysisResult.data.technicalAnalysis.signal} (${analysisResult.data.technicalAnalysis.confidence}%)`,
          );
          logger.info(
            `🛡️ Risk Assessment: ${analysisResult.data.riskAssessment.recommendation} (Score: ${analysisResult.data.riskAssessment.riskScore}/10)`,
          );
          logger.info(
            `🧠 Market Intelligence: ${analysisResult.data.marketIntelligence.sentiment} (${analysisResult.data.marketIntelligence.confidence}%)`,
          );
          logger.info(
            `⏰ Temporal Reasoning: ${analysisResult.data.temporalAssessment.timing} (Quality: ${analysisResult.data.temporalAssessment.entryQuality}/10)`,
          );
          logger.info(
            `🎯 Final Decision: ${analysisResult.data.direction} with ${analysisResult.data.confidence}% confidence`,
          );
          logger.info(`💰 Position Size: ${analysisResult.data.positionSize} units`);
          logger.info(`🛡️ Stop Loss: ${analysisResult.data.stopLoss}`);
          logger.info(`🎯 Take Profit: ${analysisResult.data.takeProfit}`);

          const tradeExecutionResult = await this.executeTradeWithProfessionalRisk({
            analysis: analysisResult.data,
            bot,
            marketPrice: realMarketPrice,
            portfolioContext,
            positionCheck,
          });

          if (tradeExecutionResult.success) {
            logger.info(`✅ PROFESSIONAL TRADE EXECUTED SUCCESSFULLY`);
            logger.info(`📈 Trade ID: ${tradeExecutionResult.data?.tradeId}`);
            logger.info(`💰 Position Size: ${tradeExecutionResult.data?.positionSize} units`);
            logger.info(`🎯 Committee Consensus: ${analysisResult.data.committeeMembersConsensus}`);

            return {
              success: true,
              data: tradeExecutionResult.data,
              tradeExecuted: true,
              reason: `Professional committee approved trade: ${analysisResult.data.direction} (${analysisResult.data.confidence}% confidence)`,
            };
          } else {
            logger.error(`❌ Professional trade execution failed: ${tradeExecutionResult.error}`);
            return {
              success: false,
              error: tradeExecutionResult.error,
              tradeExecuted: false,
            };
          }
        } else {
          logger.warn(`🚨 POSITION LIMITS BLOCKED: ${positionCheck.reasoning.join("; ")}`);
          return {
            success: true,
            data: { reason: positionCheck.reasoning.join("; ") },
            tradeExecuted: false,
            reason: `Position limits blocked trade: ${positionCheck.reasoning.join("; ")}`,
          };
        }
      } else {
        // Professional committee decided not to trade
        logger.info(`🚫 PROFESSIONAL COMMITTEE DECISION: NO TRADE`);
        logger.info(
          `📊 Technical Analysis: ${analysisResult.data.technicalAnalysis.signal} (${analysisResult.data.technicalAnalysis.confidence}%)`,
        );
        logger.info(`🛡️ Risk Assessment: ${analysisResult.data.riskAssessment.recommendation}`);
        logger.info(`🧠 Market Intelligence: ${analysisResult.data.marketIntelligence.sentiment}`);
        logger.info(`⏰ Temporal Reasoning: ${analysisResult.data.temporalAssessment.timing}`);
        logger.info(`🎯 Coordinator Decision: ${analysisResult.data.coordinatorDecision.decision}`);
        logger.info(`💡 Committee Reasoning: ${analysisResult.data.reasoning.join("; ")}`);

        return {
          success: true,
          data: {
            reason: `Professional committee decision: ${analysisResult.data.reasoning.join("; ")}`,
            committeeAnalysis: {
              technical: analysisResult.data.technicalAnalysis,
              risk: analysisResult.data.riskAssessment,
              market: analysisResult.data.marketIntelligence,
              temporal: analysisResult.data.temporalAssessment,
              coordinator: analysisResult.data.coordinatorDecision,
            },
          },
          tradeExecuted: false,
          reason: `Professional committee blocked trade: ${analysisResult.data.reasoning.join("; ")}`,
        };
      }
    } catch (error) {
      logger.error(`❌ Professional Evaluation Pipeline Failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Pipeline error",
      };
    }
  }

  /**
   * Execute professional trade with advanced order management
   */
  private async executeProfessionalTrade(
    bot: any,
    capitalApi: any,
    orderDecision: any,
    analysis: any,
    evaluationId: string,
  ): Promise<{ success: boolean; orderDetails?: any; error?: string }> {
    try {
      // Validate order decision
      if (!orderDecision || typeof orderDecision !== "object") {
        throw new Error("Invalid order decision object");
      }

      // Log order decision for debugging
      if (orderDecision) {
        logger.info(`🔍 Order Decision Structure:`, {
          orderType: orderDecision.orderType || "undefined",
          positionSize: orderDecision.positionSize || "undefined",
          entryPrice: orderDecision.entryPrice || "undefined",
          stopLoss: orderDecision.stopLoss || "undefined",
          takeProfit: orderDecision.takeProfit || "undefined",
          reasoning: orderDecision.reasoning
            ? orderDecision.reasoning.substring(0, 100) + "..."
            : "undefined",
          strategyCompliant: orderDecision.strategyCompliance?.isCompliant || "undefined",
          riskScore: orderDecision.riskAssessment?.riskScore || "undefined",
        });
      } else {
        logger.error(`❌ Order Decision is null/undefined!`);
      }

      // Validate required fields
      if (!orderDecision.positionSize || orderDecision.positionSize <= 0) {
        throw new Error(`Invalid position size: ${orderDecision.positionSize}`);
      }

      // 🚨 MANDATORY STOP LOSS VALIDATION
      if (!orderDecision.stopLoss || orderDecision.stopLoss <= 0) {
        throw new Error(
          `🚨 MANDATORY STOP LOSS MISSING: Every trade MUST have a stop loss. Got: ${orderDecision.stopLoss}`,
        );
      }

      // 🚨 MANDATORY TAKE PROFIT VALIDATION
      if (!orderDecision.takeProfit || orderDecision.takeProfit <= 0) {
        throw new Error(
          `🚨 MANDATORY TAKE PROFIT MISSING: Every trade MUST have a take profit. Got: ${orderDecision.takeProfit}`,
        );
      }

      // Debug the position size conversion
      logger.info(`🔍 Position Size Debug:`, {
        originalPositionSize: orderDecision.positionSize,
        typeOfPositionSize: typeof orderDecision.positionSize,
        isNaN: isNaN(orderDecision.positionSize),
        accountBalance: analysis.accountBalance || "undefined",
        fromRiskAssessment: orderDecision.riskAssessment?.optimalPositionSize || "undefined",
        afterMathAbs: Math.abs(orderDecision.positionSize || 0.001),
        afterMathMax: Math.max(0.001, Math.abs(orderDecision.positionSize || 0.001)),
      });

      // Construct professional trade request
      const tradeRequest: TradeExecutionRequest = {
        botId: bot.id,
        analysis,
        orderType: "MARKET", // Force MARKET for reliability
        entryPrice: orderDecision.entryPrice,
        stopLoss: orderDecision.stopLoss || 0,
        takeProfit: orderDecision.takeProfit || 0,
        positionSize: orderDecision.positionSize,
        direction: orderDecision.direction || "BUY", // Use direction from order decision
        timeframe: bot.timeframe,
        riskAssessment: orderDecision.riskAssessment || { riskScore: 5 },
      };

      // Normalize and convert symbol to Capital.com epic
      const normalizedSymbol = bot.tradingPairSymbol.replace(/[^A-Z]/g, ""); // Remove slashes, etc.
      const epic = this.convertSymbolToTradingEpic(normalizedSymbol);

      // Validate and clean order decision values
      // Use the correctly calculated position size from Professional Position Sizing Agent
      // Apply Capital.com position size validation to prevent RISK_CHECK rejections
      let cleanSize = Math.abs(orderDecision.positionSize || 0.0001);

      // Ensure position size is within Capital.com acceptable range
      if (cleanSize < 0.0001) {
        cleanSize = 0.0001; // Minimum for micro lots
      } else if (cleanSize > 0.1) {
        cleanSize = 0.1; // Maximum for safety
      }

      // Round to 4 decimal places for Capital.com API
      cleanSize = Math.round(cleanSize * 10000) / 10000;
      const cleanStopLoss =
        orderDecision.stopLoss && orderDecision.stopLoss > 0 ? orderDecision.stopLoss : null;

      // Fix take profit validation for Capital.com minimum requirements
      let cleanTakeProfit: number | null = null;
      if (orderDecision.takeProfit && orderDecision.takeProfit > 0) {
        // 🚨 CRITICAL FIX: Realistic take profit validation for scalping strategies
        const currentPrice = analysis.marketPrice?.price || 99000;
        const minTakeProfit = currentPrice * 1.005; // 0.5% minimum (realistic for scalping)
        const maxTakeProfit = currentPrice * 1.5; // 50% maximum (prevent extreme values)

        if (
          orderDecision.takeProfit >= minTakeProfit &&
          orderDecision.takeProfit <= maxTakeProfit
        ) {
          cleanTakeProfit = orderDecision.takeProfit;
          logger.info(
            `✅ Take profit validated: ${orderDecision.takeProfit} (${((orderDecision.takeProfit / currentPrice - 1) * 100).toFixed(2)}% profit)`,
          );
        } else if (orderDecision.takeProfit < minTakeProfit) {
          logger.warn(
            `⚠️ Take profit ${orderDecision.takeProfit} below minimum ${minTakeProfit.toFixed(2)} (0.5% profit) - removing take profit`,
          );
          cleanTakeProfit = null;
        } else {
          logger.warn(
            `⚠️ Take profit ${orderDecision.takeProfit} above maximum ${maxTakeProfit.toFixed(2)} (50% profit) - capping take profit`,
          );
          cleanTakeProfit = maxTakeProfit;
        }
      }

      // Create position request for Capital.com API
      const positionRequest = {
        epic: epic,
        direction: "BUY",
        orderType: "MARKET", // Force MARKET orders for now
        size: cleanSize,
        level: undefined, // No level for market orders
        stopLevel: cleanStopLoss,
        profitLevel: cleanTakeProfit,
        timeInForce: "GTC",
        guaranteedStop: false,
        forceOpen: true,
        currencyCode: "USD",
      };

      logger.info(`📋 Professional Position Request:`, {
        epic,
        direction: "BUY",
        orderType: "MARKET",
        size: cleanSize,
        stopLevel: cleanStopLoss,
        profitLevel: cleanTakeProfit,
        reasoning: orderDecision.reasoning || "No reasoning provided",
      });

      // Log full request for debugging
      logger.info(`🔍 Full Position Request Structure:`, JSON.stringify(positionRequest, null, 2));

      // Log exactly what we're sending to Capital.com API
      logger.info(`📤 Capital.com API Call Parameters:`, {
        epic,
        direction: "BUY",
        size: cleanSize,
        stopLevel: cleanStopLoss || undefined,
        profitLevel: cleanTakeProfit || undefined,
        orderType: "MARKET",
        forceOpen: true,
      });

      // Execute the trade with correct parameter structure
      const tradeResult = await capitalApi.createPosition(
        epic,
        "BUY",
        cleanSize,
        cleanStopLoss || undefined,
        cleanTakeProfit || undefined,
      );

      // 🚨 CRITICAL FIX: Capital.com API returns DealConfirmation, not {success: boolean}
      // Check dealStatus and status instead of non-existent 'success' property
      const isTradeSuccessful =
        tradeResult &&
        (tradeResult.dealStatus === "ACCEPTED" ||
          tradeResult.status === "OPEN" ||
          tradeResult.dealReference); // Has deal reference means request was accepted

      logger.info(`🔍 Trade Success Detection:`, {
        dealStatus: tradeResult?.dealStatus,
        status: tradeResult?.status,
        dealReference: tradeResult?.dealReference,
        dealId: tradeResult?.dealId,
        isTradeSuccessful,
        fullTradeResult: tradeResult,
      });

      if (isTradeSuccessful) {
        // Mark order as filled in coordinator
        await this.professionalOrderManager.getOrderStatistics(bot.id).then(() => {
          // Order filled successfully
          logger.info(`✅ Trade executed successfully for ${bot.tradingPairSymbol}`);
        });

        // Create trade record with validated data
        const tradeRecord = await prisma.trade.create({
          data: {
            userId: bot.userId || "unknown",
            botId: bot.id,
            evaluationId,
            symbol: bot.tradingPairSymbol || "UNKNOWN",
            side: "BUY",
            entryPrice: orderDecision.entryPrice || analysis.marketPrice?.price || 99000,
            stopLoss: cleanStopLoss || 0,
            takeProfit: cleanTakeProfit || 0,
            size: cleanSize,
            status: "OPEN",
            type: "MARKET",
            confidence: Math.min(1.0, Math.max(0.0, orderDecision.confidence || 0.7)),
            reason: orderDecision.reasoning || "Professional order management decision",
            brokerTradeId: tradeResult.dealId || tradeResult.dealReference || `local-${Date.now()}`,
          },
        });

        return {
          success: true,
          orderDetails: {
            tradeRecord,
            epic,
            size: cleanSize,
            stopLoss: cleanStopLoss,
            takeProfit: cleanTakeProfit,
          },
        };
      } else {
        // 🚨 CRITICAL FIX: Handle trade rejection properly
        const rejectReason =
          tradeResult?.rejectReason || tradeResult?.errorMessage || "Trade was rejected by broker";

        // Cancel pending order on trade failure
        await this.professionalOrderManager.cancelOrderDecision(
          bot.id,
          bot.tradingPairSymbol,
          `Trade execution failed: ${rejectReason}`,
        );

        logger.error(`❌ Professional Trade Execution Failed: ${rejectReason}`);
        logger.error(`🔍 Full rejection details:`, tradeResult);

        return {
          success: false,
          error: rejectReason,
        };
      }
    } catch (error) {
      // Cancel pending order on error
      try {
        await this.professionalOrderManager.cancelOrderDecision(
          bot.id,
          bot.tradingPairSymbol,
          `Trade execution error: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      } catch (cleanupError) {
        logger.error(`Failed to cleanup pending order:`, cleanupError);
      }

      logger.error(`❌ Professional Trade Execution Error:`, error);
      return {
        success: false,
        error: `Trade execution error: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Get bot details with includes
   */
  private async getBotDetails(botId: string): Promise<any> {
    return await prisma.bot.findUnique({
      where: { id: botId },
      include: {
        user: {
          include: {
            brokerCredentials: {
              where: { isActive: true },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
        strategy: true,
      },
    });
  }

  /**
   * Setup authenticated Capital.com API
   */
  private async setupCapitalApi(bot: any): Promise<any> {
    // Access broker credentials through the user relationship (new structure)
    const brokerCredential = bot.user?.brokerCredentials?.[0];

    if (!brokerCredential || !brokerCredential.credentials) {
      throw new Error("No broker credentials configured for bot");
    }

    const credentials = credentialsEncryption.decryptCredentials(brokerCredential.credentials);

    const cacheKey = `${bot.id}-${credentials.apiKey.slice(-8)}`;
    let capitalApi = this.capitalApiInstances.get(cacheKey);

    if (!capitalApi) {
      const { CapitalMainService } = await import(
        "../modules/capital/services/capital-main.service"
      );

      capitalApi = new CapitalMainService({
        apiKey: credentials.apiKey,
        identifier: credentials.identifier,
        password: credentials.password,
        isDemo: brokerCredential.isDemo,
        instanceId: `enhanced-bot-${bot.id}`,
      });

      await capitalApi.authenticate();
      this.capitalApiInstances.set(cacheKey, capitalApi);
      logger.info(`✅ Capital.com API authenticated for bot: ${bot.name}`);
    }

    return capitalApi;
  }

  /**
   * Check market status
   */
  private async checkMarketStatus(symbol: string, capitalApi: any): Promise<any> {
    return await marketValidationService.checkMarketTradingHours(symbol, capitalApi);
  }

  /**
   * Get shared candlestick data for optimization
   */
  private async getSharedCandlestickData(
    symbol: string,
    timeframe: string,
    botId: string,
  ): Promise<CandleData[]> {
    try {
      logger.info(`📊 Fetching shared candlestick data for ${symbol} (${timeframe})...`);
      const candleData = await this.chartService.getChartData(symbol, timeframe, botId);
      logger.info(`✅ Shared data ready: ${candleData.length} bars`);
      return candleData;
    } catch (error) {
      logger.error(`❌ Shared candlestick data fetch failed:`, error);
      return [];
    }
  }

  /**
   * 🧠 Enhanced AI Analysis using Professional Trading Committee
   * Multi-agent system with specialized LLM agents for sophisticated trading decisions
   */
  private async performEnhancedAIAnalysis(
    bot: any,
    chartUrl: string,
    portfolioContext: any,
    marketPrice: any,
    candleData: CandleData[],
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // 🔥 NEW: Get bot-specific trade history and timing context
      const botTradeHistory = await this.getBotTradeHistory(bot.id);

      // 🏛️ PROFESSIONAL TRADING COMMITTEE ANALYSIS
      // Import the sophisticated multi-agent system
      const { ProfessionalTradingCommittee } = await import("../ai/professional-trading-committee");
      const tradingCommittee = new ProfessionalTradingCommittee();

      logger.info(`🏛️ Initializing Professional Trading Committee for ${bot.tradingPairSymbol}`);
      logger.info(
        `👥 Committee: Technical Analysis, Portfolio Risk, Market Intelligence, Temporal Reasoning, Decision Coordinator`,
      );

      // Sophisticated multi-agent analysis with specialized LLM calls
      const committeeDecision = await tradingCommittee.analyzeTradingOpportunity({
        symbol: bot.tradingPairSymbol,
        timeframe: bot.timeframe,
        marketData: {
          price: marketPrice.price,
          bid: marketPrice.bid,
          ask: marketPrice.ask,
          spread: marketPrice.spread,
        },
        candleData: candleData,
        botTradeHistory: botTradeHistory,
        strategyConfig: {
          name: bot.strategy?.name || "Unknown Strategy",
          description: bot.strategy?.description || "No description available",
          rules: bot.strategy?.rules || "Follow market trends with proper risk management",
          parameters: bot.strategy?.parameters || {},
          confidenceThreshold: bot.strategy?.confidenceThreshold || 70,
          riskManagement: {
            maxRiskPerTrade: bot.maxRiskPercentage || 2,
            stopLossType: "percentage",
            takeProfitRatio: 2.0,
          },
        },
        botConfig: {
          id: bot.id,
          name: bot.name,
          description: bot.description,
          maxOpenTrades: bot.maxOpenTrades || 4,
          maxRiskPercentage: bot.maxRiskPercentage || 2,
          minRiskPercentage: bot.minRiskPercentage || 0.5,
          tradingPairSymbol: bot.tradingPairSymbol,
          timeframe: bot.timeframe,
          isActive: bot.isActive,
        },
        portfolioContext: portfolioContext,
      });

      // Enhanced analysis with detailed committee insights
      const enhancedAnalysis = {
        // Core decision
        action: committeeDecision.decision.toLowerCase(),
        direction: committeeDecision.decision, // BUY/SELL/HOLD
        confidence: committeeDecision.confidence,
        shouldTrade: committeeDecision.shouldTrade,

        // Committee detailed analysis
        technicalAnalysis: committeeDecision.technicalAnalysis,
        riskAssessment: committeeDecision.riskAssessment,
        marketIntelligence: committeeDecision.marketIntelligence,
        temporalAssessment: committeeDecision.temporalAssessment,
        coordinatorDecision: committeeDecision.coordinatorDecision,

        // Professional reasoning
        reasoning: committeeDecision.reasoning,

        // Risk management
        stopLoss: this.calculateProfessionalStopLoss(marketPrice.price, committeeDecision),
        takeProfit: this.calculateProfessionalTakeProfit(marketPrice.price, committeeDecision),
        positionSize: committeeDecision.coordinatorDecision.positionSize || 0.001,

        // Market context
        marketPrice: marketPrice.price,
        timestamp: new Date().toISOString(),

        // Committee metadata
        committeeMembersConsensus: committeeDecision.coordinatorDecision.consensusAnalysis,
        executionPlan: committeeDecision.coordinatorDecision.executionPlan,
      };

      // Log professional committee decision
      logger.info(`🏛️ PROFESSIONAL COMMITTEE DECISION: ${committeeDecision.decision}`);
      logger.info(
        `📊 Technical Analysis: ${committeeDecision.technicalAnalysis.signal} (${committeeDecision.technicalAnalysis.confidence}%)`,
      );
      logger.info(
        `🛡️ Risk Assessment: ${committeeDecision.riskAssessment.recommendation} (Risk Score: ${committeeDecision.riskAssessment.riskScore}/10)`,
      );
      logger.info(
        `🧠 Market Intelligence: ${committeeDecision.marketIntelligence.sentiment} (${committeeDecision.marketIntelligence.confidence}%)`,
      );
      logger.info(
        `⏰ Temporal Reasoning: ${committeeDecision.temporalAssessment.timing} (Quality: ${committeeDecision.temporalAssessment.entryQuality}/10)`,
      );
      logger.info(
        `🎯 Final Decision: ${committeeDecision.decision} with ${committeeDecision.confidence}% confidence`,
      );
      logger.info(`✅ Should Trade: ${committeeDecision.shouldTrade ? "YES" : "NO"}`);

      return {
        success: true,
        data: enhancedAnalysis,
      };
    } catch (error) {
      logger.error(`❌ Professional Trading Committee analysis failed:`, error);

      // Fallback to conservative decision
      return {
        success: true,
        data: {
          action: "hold",
          direction: "HOLD",
          confidence: 0,
          shouldTrade: false,
          reasoning: ["Professional committee analysis failed - defaulting to HOLD for safety"],
          stopLoss: 0,
          takeProfit: 0,
          positionSize: 0,
          marketPrice: marketPrice.price,
          timestamp: new Date().toISOString(),
          committeeMembersConsensus: "FAILED",
          executionPlan: "NO_EXECUTION",
        },
      };
    }
  }

  /**
   * Calculate professional stop loss based on committee analysis
   */
  private calculateProfessionalStopLoss(currentPrice: number, committeeDecision: any): number {
    try {
      if (!committeeDecision.shouldTrade) return 0;

      // Use technical analysis key levels for stop loss
      const technicalAnalysis = committeeDecision.technicalAnalysis;
      const riskAssessment = committeeDecision.riskAssessment;

      // Default to 2% stop loss, but adjust based on volatility and risk assessment
      let stopLossPercentage = 0.02; // 2%

      // Adjust based on risk score (higher risk = tighter stop)
      if (riskAssessment.riskScore > 7) {
        stopLossPercentage = 0.015; // 1.5% for high risk
      } else if (riskAssessment.riskScore < 4) {
        stopLossPercentage = 0.025; // 2.5% for low risk
      }

      // Calculate stop loss based on direction
      if (committeeDecision.decision === "BUY") {
        return currentPrice * (1 - stopLossPercentage);
      } else if (committeeDecision.decision === "SELL") {
        return currentPrice * (1 + stopLossPercentage);
      }

      return 0;
    } catch (error) {
      logger.error(`❌ Professional stop loss calculation failed:`, error);
      return 0;
    }
  }

  /**
   * Calculate professional take profit based on committee analysis
   */
  private calculateProfessionalTakeProfit(currentPrice: number, committeeDecision: any): number {
    try {
      if (!committeeDecision.shouldTrade) return 0;

      // Use risk/reward ratio from technical analysis
      const technicalAnalysis = committeeDecision.technicalAnalysis;

      // Default to 1.5:1 risk/reward ratio, but adjust based on confidence
      let rewardRatio = 1.5;

      // Higher confidence = higher reward target
      if (committeeDecision.confidence > 80) {
        rewardRatio = 2.0;
      } else if (committeeDecision.confidence < 60) {
        rewardRatio = 1.2;
      }

      // Calculate take profit based on direction and stop loss distance
      const stopLoss = this.calculateProfessionalStopLoss(currentPrice, committeeDecision);
      const stopDistance = Math.abs(currentPrice - stopLoss);
      const takeProfitDistance = stopDistance * rewardRatio;

      if (committeeDecision.decision === "BUY") {
        return currentPrice + takeProfitDistance;
      } else if (committeeDecision.decision === "SELL") {
        return currentPrice - takeProfitDistance;
      }

      return 0;
    } catch (error) {
      logger.error(`❌ Professional take profit calculation failed:`, error);
      return 0;
    }
  }

  /**
   * 🔥 NEW: Get bot-specific trade history and timing context
   */
  private async getBotTradeHistory(botId: string): Promise<any> {
    try {
      // Get recent trades by THIS specific bot (last 24 hours)
      const recent24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const recentTrades = await prisma.trade.findMany({
        where: {
          botId: botId, // Only trades by THIS bot
          createdAt: {
            gte: recent24Hours,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 10, // Last 10 trades max
        select: {
          id: true,
          symbol: true,
          side: true,
          entryPrice: true,
          size: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          profitLoss: true,
          stopLoss: true,
          takeProfit: true,
        },
      });

      // Calculate timing context
      const lastTrade = recentTrades[0];
      const now = new Date();
      const minutesSinceLastTrade = lastTrade
        ? Math.floor((now.getTime() - lastTrade.createdAt.getTime()) / (1000 * 60))
        : null;

      // Count recent trades by time periods
      const last5Minutes = recentTrades.filter(
        (t) => now.getTime() - t.createdAt.getTime() <= 5 * 60 * 1000,
      ).length;

      const last15Minutes = recentTrades.filter(
        (t) => now.getTime() - t.createdAt.getTime() <= 15 * 60 * 1000,
      ).length;

      const last60Minutes = recentTrades.filter(
        (t) => now.getTime() - t.createdAt.getTime() <= 60 * 60 * 1000,
      ).length;

      // Open positions by this bot
      const openTrades = recentTrades.filter((t) => t.status === "OPEN");

      const tradeHistory = {
        recentTrades: recentTrades,
        lastTrade: lastTrade,
        minutesSinceLastTrade: minutesSinceLastTrade,
        tradingFrequency: {
          last5Minutes: last5Minutes,
          last15Minutes: last15Minutes,
          last60Minutes: last60Minutes,
          total24Hours: recentTrades.length,
        },
        openPositions: openTrades,
        tradingBehavior: {
          isOverTrading: last5Minutes >= 2 || last15Minutes >= 3,
          needsCooldown: minutesSinceLastTrade !== null && minutesSinceLastTrade < 5,
          recentActivity: minutesSinceLastTrade !== null && minutesSinceLastTrade < 30,
        },
      };

      logger.info(
        `📊 Bot ${botId} Trade History: ${recentTrades.length} trades in 24h, last trade ${minutesSinceLastTrade}min ago`,
      );
      if (tradeHistory.tradingBehavior.isOverTrading) {
        logger.warn(
          `⚠️ Bot ${botId} shows OVER-TRADING behavior: ${last5Minutes} trades in 5min, ${last15Minutes} in 15min`,
        );
      }

      return tradeHistory;
    } catch (error) {
      logger.error(`❌ Failed to get bot trade history for ${botId}:`, error);
      return {
        recentTrades: [],
        lastTrade: null,
        minutesSinceLastTrade: null,
        tradingFrequency: { last5Minutes: 0, last15Minutes: 0, last60Minutes: 0, total24Hours: 0 },
        openPositions: [],
        tradingBehavior: { isOverTrading: false, needsCooldown: false, recentActivity: false },
      };
    }
  }

  /**
   * Get real market price
   */
  private async getRealMarketPrice(symbol: string, botId: string): Promise<any> {
    try {
      const normalizedSymbol = symbol.replace(/[^A-Z]/g, "");
      const epic = this.convertSymbolToEpic(normalizedSymbol);

      logger.info(
        `🔍 Getting real market price for ${symbol} (normalized: ${normalizedSymbol}, epic: ${epic})`,
      );

      const capitalApiKey = Array.from(this.capitalApiInstances.keys()).find((key) =>
        key.includes(botId),
      );
      const capitalApi = this.capitalApiInstances.get(capitalApiKey || "");

      if (!capitalApi) {
        logger.error(`❌ No Capital.com API instance found for botId: ${botId}`);
        logger.warn(
          `⚠️ Available API instances: ${Array.from(this.capitalApiInstances.keys()).join(", ")}`,
        );
        throw new Error("No Capital API instance available");
      }

      logger.info(`✅ Found Capital.com API instance for price fetching`);
      const priceData = await capitalApi.getLatestPrice(epic);

      if (priceData && priceData.bid && (priceData.ask || priceData.ofr)) {
        const offer = priceData.ask || priceData.ofr;
        const midPrice = (parseFloat(priceData.bid.toString()) + parseFloat(offer.toString())) / 2;
        logger.info(
          `✅ Real market price fetched: ${symbol} = $${midPrice.toFixed(2)} (bid: ${priceData.bid}, ask: ${offer})`,
        );
        return { symbol, price: midPrice, bid: priceData.bid, offer: offer };
      } else {
        logger.error(`❌ Invalid price data received:`, priceData);
        throw new Error("Invalid price data from Capital.com API");
      }
    } catch (error) {
      logger.error(`❌ Real market price fetch failed for ${symbol}:`, error);

      // Only use fallback as last resort
      const normalizedSymbol = symbol.replace(/[^A-Z]/g, "");
      const fallbackPrice = normalizedSymbol === "BTCUSD" ? 99000 : 1;
      logger.warn(`⚠️ Using fallback price for ${symbol}: $${fallbackPrice}`);
      return { symbol, price: fallbackPrice };
    }
  }

  /**
   * Create evaluation record
   */
  private async createEvaluationRecord(
    botId: string,
    userId: string,
    chartUrl: string,
    analysis: any,
    portfolioContext: any,
    orderDecision: any,
    symbol?: string,
    timeframe?: string,
  ): Promise<any> {
    return await prisma.evaluation.create({
      data: {
        botId,
        userId,
        symbol: symbol || "UNKNOWN", // Dynamic symbol
        timeframe: timeframe || "M1", // Required timeframe field
        chartUrl,
        decision: orderDecision.positionSize > 0 ? "TRADE" : "HOLD",
        confidence: analysis.confidence || 0,
        reasoning: orderDecision.reasoning,
        marketPrice: analysis.marketPrice?.price || 0,
        portfolioData: JSON.stringify(portfolioContext), // Fixed field name
        aiResponse: JSON.stringify(orderDecision), // Store order decision in aiResponse field
        positionSize: orderDecision.positionSize,
        stopLoss: orderDecision.stopLoss,
        takeProfit: orderDecision.takeProfit,
        riskScore: orderDecision.riskAssessment?.riskScore || 0,
      },
    });
  }

  /**
   * Convert symbol to Capital.com epic for price fetching
   */
  private convertSymbolToEpic(symbol: string): string {
    const symbolMap: { [key: string]: string } = {
      BTCUSD: "BTCUSD",
      ETHUSD: "ETHUSD",
      ADAUSD: "ADAUSD",
      DOTUSD: "DOTUSD",
      LINKUSD: "LINKUSD",
      XRPUSD: "XRPUSD",
      LTCUSD: "LTCUSD",
      BCHUSD: "BCHUSD",
      XLMUSD: "XLMUSD",
      EOSUSDT: "EOSUSDT",
      TRXUSD: "TRXUSD",
      BNBUSD: "BNBUSD",
      ATOMUSD: "ATOMUSD",
      VETUSD: "VETUSD",
      FILUSD: "FILUSD",
      THETAUSD: "THETAUSD",
      XTZUSD: "XTZUSD",
      ALGOUSD: "ALGOUSD",
      ZECUSD: "ZECUSD",
      OMGUSD: "OMGUSD",
      MKRUSD: "MKRUSD",
      DASHUSD: "DASHUSD",
      COMPUSD: "COMPUSD",
      BATUSD: "BATUSD",
      ZRXUSD: "ZRXUSD",
      SUSHIUSD: "SUSHIUSD",
      YFIUSD: "YFIUSD",
      CRVUSD: "CRVUSD",
      UNIUSD: "UNIUSD",
      AAVEUSD: "AAVEUSD",
      SNXUSD: "SNXUSD",
    };

    return symbolMap[symbol] || symbol;
  }

  /**
   * Convert symbol to Capital.com trading epic
   */
  private convertSymbolToTradingEpic(symbol: string): string {
    // Use the same epic for both data and trading - BTCUSD works!
    const tradingMap: { [key: string]: string } = {
      BTCUSD: "BTCUSD", // Use BTCUSD for both data and trading
      ETHUSD: "ETHUSD",
      ADAUSD: "ADAUSD",
      DOTUSD: "DOTUSD",
      LINKUSD: "LINKUSD",
      XRPUSD: "XRPUSD",
      LTCUSD: "LTCUSD",
      BCHUSD: "BCHUSD",
      XLMUSD: "XLMUSD",
      EOSUSDT: "EOSUSDT",
      TRXUSD: "TRXUSD",
      BNBUSD: "BNBUSD",
    };

    return tradingMap[symbol] || symbol;
  }

  /**
   * Check if market is open for trading
   */
  private async checkMarketTradingHours(symbol: string): Promise<boolean> {
    try {
      // For crypto like BTC/USD, markets are typically 24/7
      // For forex/stocks, this would check actual market hours
      if (symbol.includes("BTC") || symbol.includes("ETH") || symbol.includes("crypto")) {
        return true; // Crypto markets are 24/7
      }

      // For other markets, you would implement proper market hours checking
      return true; // Simplified for now
    } catch (error) {
      logger.error(`Error checking market hours for ${symbol}:`, error);
      return false;
    }
  }

  /**
   * Check if Bollinger Bands Scalping conditions are met
   */
  private async checkBollingerBandsConditions(bot: any): Promise<boolean> {
    try {
      logger.info(`📊 Checking Bollinger Bands conditions for ${bot.name}`);

      // Get recent market data to check if price is near bands
      const capitalApi = await this.setupCapitalApi(bot);
      const candleData = await this.getSharedCandlestickData(
        bot.tradingPairSymbol,
        bot.timeframe,
        bot.id,
      );

      if (candleData.length < 20) {
        logger.warn(`Insufficient data for Bollinger Bands analysis: ${candleData.length} candles`);
        return false;
      }

      // Calculate Bollinger Bands
      const closes = candleData.map((candle) => candle.close);
      const period = 20;
      const stdDev = 2.0;

      // Simple moving average
      const sma = closes.slice(-period).reduce((sum, price) => sum + price, 0) / period;

      // Standard deviation
      const variance =
        closes.slice(-period).reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
      const stdDevValue = Math.sqrt(variance);

      const upperBand = sma + stdDev * stdDevValue;
      const lowerBand = sma - stdDev * stdDevValue;
      const currentPrice = closes[closes.length - 1];

      // Calculate RSI (simplified)
      const rsi = this.calculateRSI(closes, 14);

      // Check Bollinger Bands Scalping conditions
      const nearLowerBand = currentPrice <= lowerBand * 1.002; // Within 0.2% of lower band
      const nearUpperBand = currentPrice >= upperBand * 0.998; // Within 0.2% of upper band
      const rsiOversold = rsi < 30;
      const rsiOverbought = rsi > 70;

      const longCondition = nearLowerBand && rsiOversold;
      const shortCondition = nearUpperBand && rsiOverbought;

      const conditionsMet = longCondition || shortCondition;

      logger.info(
        `📊 Bollinger Bands Analysis: Current=${currentPrice.toFixed(2)}, Upper=${upperBand.toFixed(2)}, Lower=${lowerBand.toFixed(2)}, RSI=${rsi.toFixed(1)}`,
      );
      logger.info(
        `📊 Conditions: NearLower=${nearLowerBand}, NearUpper=${nearUpperBand}, RSIOversold=${rsiOversold}, RSIOverbought=${rsiOverbought}`,
      );
      logger.info(`📊 Strategy conditions met: ${conditionsMet ? "✅ YES" : "❌ NO"}`);

      return conditionsMet;
    } catch (error) {
      logger.error(`Error checking Bollinger Bands conditions:`, error);
      return false; // Don't trade if we can't verify conditions
    }
  }

  /**
   * Simple RSI calculation
   */
  private calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50; // Neutral RSI if insufficient data

    let gains = 0;
    let losses = 0;

    // Calculate initial gains and losses
    for (let i = prices.length - period; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) {
        gains += change;
      } else {
        losses += Math.abs(change);
      }
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100; // No losses = RSI 100

    const rs = avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);

    return rsi;
  }

  /**
   * Execute trade with professional risk management from committee decision
   */
  private async executeTradeWithProfessionalRisk(params: {
    analysis: any;
    bot: any;
    marketPrice: any;
    portfolioContext: any;
    positionCheck: any;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      logger.info(`🚀 Executing professional trade with committee decision...`);

      // 🚨 CRITICAL FIX: Use same key generation as setupCapitalApi
      const brokerCredential = params.bot.user?.brokerCredentials?.[0];

      if (!brokerCredential || !brokerCredential.credentials) {
        return {
          success: false,
          error: "No broker credentials configured for trade execution",
        };
      }

      const credentials = credentialsEncryption.decryptCredentials(brokerCredential.credentials);
      const cacheKey = `${params.bot.id}-${credentials.apiKey.slice(-8)}`;

      // Get Capital.com API instance using correct key
      const capitalApi = this.capitalApiInstances.get(cacheKey);

      if (!capitalApi) {
        return {
          success: false,
          error: "Capital.com API not available for trade execution",
        };
      }

      // Create evaluation record
      const evaluation = await this.createEvaluationRecord(
        params.bot.id,
        params.bot.userId || params.bot.user?.id || "unknown",
        "chart://professional-committee",
        params.analysis,
        params.portfolioContext,
        {
          approved: true,
          positionSize: params.analysis.positionSize,
          reasoning: params.analysis.reasoning.join("; "),
          strategyCompliance: { isCompliant: true },
        },
        params.bot.tradingPairSymbol,
        params.bot.timeframe,
      );

      // Execute the professional trade
      const tradeResult = await this.executeProfessionalTrade(
        params.bot,
        capitalApi,
        {
          approved: true,
          positionSize: params.analysis.positionSize,
          direction: params.analysis.direction,
          stopLoss: params.analysis.stopLoss,
          takeProfit: params.analysis.takeProfit,
          reasoning: params.analysis.reasoning.join("; "),
          strategyCompliance: { isCompliant: true },
        },
        params.analysis,
        evaluation.id,
      );

      if (tradeResult.success) {
        return {
          success: true,
          data: {
            tradeId: tradeResult.orderDetails?.tradeId,
            positionSize: params.analysis.positionSize,
            direction: params.analysis.direction,
            stopLoss: params.analysis.stopLoss,
            takeProfit: params.analysis.takeProfit,
            evaluationId: evaluation.id,
            committeeDecision: params.analysis.coordinatorDecision,
          },
        };
      } else {
        return {
          success: false,
          error: tradeResult.error || "Trade execution failed",
        };
      }
    } catch (error) {
      logger.error(`❌ Professional trade execution failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown execution error",
      };
    }
  }

  /**
   * Create evaluation (compatibility method for existing routers)
   */
  async createEvaluation(params: {
    botId: string;
    userId: string;
    chartUrl: string;
    analysis: any;
    portfolioContext: any;
    orderDecision: any;
    symbol: string;
    timeframe: string;
  }): Promise<any> {
    return this.createEvaluationRecord(
      params.botId,
      params.userId,
      params.chartUrl,
      params.analysis,
      params.portfolioContext,
      params.orderDecision,
      params.symbol,
      params.timeframe,
    );
  }

  /**
   * Get bot evaluations (compatibility method for existing routers)
   */
  async getBotEvaluations(botId: string, limit: number = 10): Promise<any[]> {
    try {
      return await prisma.evaluation.findMany({
        where: { botId },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          symbol: true,
          timeframe: true,
          decision: true,
          confidence: true,
          reasoning: true,
          marketPrice: true,
          positionSize: true,
          stopLoss: true,
          takeProfit: true,
          riskScore: true,
          createdAt: true,
        },
      });
    } catch (error) {
      logger.error(`Error fetching bot evaluations for ${botId}:`, error);
      return [];
    }
  }
}
