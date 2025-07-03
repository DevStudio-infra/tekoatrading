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

      // 1. GET BOT DETAILS
      const bot = await this.getBotDetails(botId);
      if (!bot) {
        throw new Error(`Bot not found: ${botId}`);
      }

      if (!bot.isActive) {
        logger.info(`Bot ${botId} is not active, skipping evaluation`);
        return { success: true, data: { message: "Bot is not active" } };
      }

      // 2. SETUP AUTHENTICATED CAPITAL API
      const capitalApi = await this.setupCapitalApi(bot);

      // 3. CHECK MARKET HOURS
      const marketCheck = await this.checkMarketStatus(bot.tradingPairSymbol, capitalApi);
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

      // 4. FETCH SHARED CANDLESTICK DATA (Optimization)
      const sharedCandleData = await this.getSharedCandlestickData(
        bot.tradingPairSymbol,
        bot.timeframe,
        botId,
      );

      // 5. PROFESSIONAL EVALUATION PIPELINE
      const evaluationResult = await this.runProfessionalEvaluationPipeline(
        bot,
        capitalApi,
        sharedCandleData,
      );

      logger.info(`✅ Enhanced Professional Evaluation Complete for ${bot.name}`);
      return evaluationResult;
    } catch (error) {
      logger.error(`❌ Enhanced Bot Evaluation Failed for ${botId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown evaluation error",
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

      // STEP 4: POSITION AWARENESS CHECK
      logger.info(`🔍 Checking Position Awareness...`);

      // Extract direction from AI analysis result
      const aiDirection =
        analysisResult.data?.decision?.action ||
        analysisResult.data?.recommendation?.action ||
        analysisResult.data?.action ||
        "BUY"; // Fallback to BUY if not found

      const normalizedDirection = aiDirection.toUpperCase() === "SELL" ? "SELL" : "BUY";

      logger.info(`🎯 AI Analysis direction: ${normalizedDirection} for ${bot.tradingPairSymbol}`);

      const positionContext = await this.positionAwarenessAgent.checkPositionLimits({
        botId: bot.id,
        userId: (bot.userId || bot.user?.id || "unknown") as string,
        symbol: bot.tradingPairSymbol,
        direction: normalizedDirection as "BUY" | "SELL",
        proposedPositionSize: 0.001, // Small default size
        accountBalance: portfolioContext.accountBalance || 10000,
        timeframe: bot.timeframe,
        botConfig: {
          maxOpenTrades: bot.maxOpenTrades || 3,
          maxRiskPercentage: bot.maxRiskPercentage || 2,
          minRiskPercentage: bot.minRiskPercentage || 0.5,
          name: bot.name,
        },
        capitalApi,
      });

      // CRITICAL: Check if position awareness blocks the trade
      if (!positionContext.canTrade) {
        logger.warn(`🛑 POSITION AWARENESS BLOCKED TRADE: ${positionContext.reasoning.join("; ")}`);
        logger.info(
          `📊 Current positions: ${positionContext.riskMetrics.totalOpenPositions}, Max allowed: ${positionContext.riskMetrics.maxPositionLimit}`,
        );
        logger.info(`💰 Real account balance: $${positionContext.riskMetrics.realAccountBalance}`);

        return {
          success: true,
          data: {
            message: `Trade blocked by position awareness: ${positionContext.reasoning.join("; ")}`,
            decision: "HOLD",
            positionContext,
            portfolioContext,
            analysis: analysisResult.data,
            chartUrl,
            blocked: true,
            blockReason: "POSITION_LIMITS_EXCEEDED",
          },
          tradeExecuted: false,
        };
      }

      logger.info(`✅ Position awareness check passed - proceeding with trade decision`);

      // STEP 4.5: AI CONFIDENCE THRESHOLD CHECK
      const rawConfidence =
        analysisResult.data?.confidence || analysisResult.data?.overall_confidence || 0;

      // Convert decimal confidence (0.76) to percentage (76%) if needed
      const aiConfidence = rawConfidence <= 1 ? rawConfidence * 100 : rawConfidence;
      const minimumConfidence = 75; // 75% minimum confidence

      if (aiConfidence < minimumConfidence) {
        logger.warn(
          `🚨 LOW CONFIDENCE BLOCKED: AI confidence ${aiConfidence}% (raw: ${rawConfidence}) below minimum ${minimumConfidence}%`,
        );

        return {
          success: true,
          data: {
            message: `Trade blocked due to low AI confidence: ${aiConfidence}% (minimum ${minimumConfidence}%)`,
            decision: "HOLD",
            confidence: aiConfidence,
            minimumRequired: minimumConfidence,
            analysis: analysisResult.data,
            chartUrl,
            blocked: true,
            blockReason: "LOW_CONFIDENCE",
          },
          tradeExecuted: false,
        };
      }

      logger.info(
        `✅ AI confidence check passed: ${aiConfidence}% (raw: ${rawConfidence}) (minimum ${minimumConfidence}%)`,
      );

      // STEP 5: PROFESSIONAL ORDER MANAGEMENT DECISION
      logger.info(`⚡ Professional Order Management Decision...`);

      // 🚨 CRITICAL FIX: Add market price to analysis structure
      const enhancedAnalysis = {
        ...analysisResult.data,
        marketPrice: {
          price: realMarketPrice.price,
          bid: realMarketPrice.bid,
          ask: realMarketPrice.ask,
        },
        currentPrice: realMarketPrice.price,
        entryPrice: realMarketPrice.price,
      };

      logger.info(`🔍 Enhanced Analysis Debug:`, {
        hasMarketPrice: !!enhancedAnalysis.marketPrice,
        priceValue: enhancedAnalysis.marketPrice?.price,
        hasCurrentPrice: !!enhancedAnalysis.currentPrice,
        hasEntryPrice: !!enhancedAnalysis.entryPrice,
        originalStopLoss: enhancedAnalysis.stopLoss,
        originalTakeProfit: enhancedAnalysis.takeProfit,
      });

      const orderDecision = await this.professionalOrderManager.requestOrderDecision({
        botId: bot.id,
        symbol: bot.tradingPairSymbol,
        direction: normalizedDirection as "BUY" | "SELL", // Use AI-determined direction
        analysis: enhancedAnalysis, // Use enhanced analysis with market price
        strategy: bot.strategy,
        marketConditions: {
          volatility: "MEDIUM",
          trend: "NEUTRAL",
          marketHours: "OPEN",
        },
        portfolioContext,
        timeframe: bot.timeframe,
        requestingAgent: "EnhancedBotEvaluationService",
      });

      // STEP 6: CREATE EVALUATION RECORD
      const evaluation = await this.createEvaluationRecord(
        bot.id,
        (bot.userId || bot.user?.id || "unknown") as string,
        chartUrl || "temp://chart-failed",
        analysisResult.data,
        portfolioContext,
        orderDecision,
        bot.tradingPairSymbol, // Pass dynamic symbol
        bot.timeframe, // Pass timeframe
      );

      // STEP 7: EXECUTE TRADE IF APPROVED
      let tradeExecuted = false;
      let orderDetails = null;

      if (orderDecision.positionSize > 0 && orderDecision.strategyCompliance.isCompliant) {
        logger.info(`🚀 Executing Professional Trade...`);

        const tradeResult = await this.executeProfessionalTrade(
          bot,
          capitalApi,
          orderDecision,
          enhancedAnalysis, // Use enhanced analysis with market price
          evaluation.id,
        );

        tradeExecuted = tradeResult.success;
        orderDetails = tradeResult.orderDetails;

        if (tradeResult.success) {
          logger.info(`✅ Professional Trade Executed Successfully!`);
        } else {
          logger.warn(`⚠️ Professional Trade Execution Failed: ${tradeResult.error}`);
        }
      } else {
        if (orderDecision.positionSize <= 0) {
          // Cancel any pending order since we're not executing
          try {
            await this.professionalOrderManager.cancelOrderDecision(
              bot.id,
              bot.tradingPairSymbol,
              `Order blocked: ${orderDecision.reasoning}`,
            );
          } catch (cleanupError) {
            logger.error(`Failed to cleanup blocked order:`, cleanupError);
          }

          logger.info(`🛑 Professional Order Manager blocked trade: ${orderDecision.reasoning}`);
          return { success: false, error: "Trade blocked by order management" };
        }
      }

      return {
        success: true,
        data: {
          evaluation,
          orderDecision,
          portfolioContext,
          positionContext,
          analysis: analysisResult.data,
          chartUrl,
        },
        tradeExecuted,
        evaluationId: evaluation.id,
        orderDetails,
      };
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
        user: true,
        strategy: true,
        brokerCredential: true,
      },
    });
  }

  /**
   * Setup authenticated Capital API instance
   */
  private async setupCapitalApi(bot: any): Promise<any> {
    if (!bot.brokerCredential || !bot.brokerCredential.credentials) {
      throw new Error("No broker credentials configured for bot");
    }

    const credentials = credentialsEncryption.decryptCredentials(bot.brokerCredential.credentials);

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
        isDemo: bot.brokerCredential.isDemo,
        instanceId: `enhanced-bot-${bot.id}`,
      });

      await capitalApi.authenticate();
      this.capitalApiInstances.set(cacheKey, capitalApi);
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
   * Enhanced AI Analysis
   */
  private async performEnhancedAIAnalysis(
    bot: any,
    chartUrl: string,
    portfolioContext: any,
    marketPrice: any,
    candleData: CandleData[],
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Pass FULL bot configuration and strategy to AI agent
      const analysis = await this.enhancedTradingAgent.analyze({
        symbol: bot.tradingPairSymbol,
        timeframe: bot.timeframe,
        strategy: bot.strategy?.name || "trend_following",
        strategyConfig: {
          name: bot.strategy?.name || "trend_following",
          description: bot.strategy?.description || "Basic trend following strategy",
          rules: bot.strategy?.rules || "Follow market trends with proper risk management",
          parameters: bot.strategy?.parameters || {},
          confidenceThreshold: bot.strategy?.confidenceThreshold || 70,
          riskManagement: bot.strategy?.riskManagement || {
            maxRiskPerTrade: bot.maxRiskPercentage || 2,
            stopLossRequired: true,
            takeProfitRequired: true,
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
        marketData: marketPrice,
        riskData: { portfolioBalance: portfolioContext.accountBalance },
        accountBalance: portfolioContext.accountBalance,
        openPositions: portfolioContext.currentPositions,
      });

      return { success: true, data: analysis };
    } catch (error) {
      logger.error(`❌ Enhanced AI Analysis Failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "AI analysis error",
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
}
