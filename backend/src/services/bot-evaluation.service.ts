import { prisma } from "../prisma";
import { logger } from "../logger";
import { CapitalMainService } from "../modules/capital/services/capital-main.service";
import {
  SophisticatedTradingAgent,
  SophisticatedTradeParams,
  SophisticatedTradeResult,
} from "../agents/trading/sophisticated-trading.agent";
import { CandleData } from "../modules/chart/chart-engine.service";
import { EnhancedTradingDecisionAgent } from "../ai/enhanced-trading-decision-agent";
import { credentialsEncryption } from "./credentials-encryption.service";
import { supabaseStorageService } from "./supabase-storage.service";
import { ChartService } from "../modules/chart/chart.service";
import { marketValidationService } from "./market-validation.service";
import { PositionAwarenessAgent } from "../agents/trading/position-awareness.agent";
import { PositionContextEvaluationAgent } from "../agents/trading/position-context-evaluation.agent";
import { DynamicTradeManagerAgent } from "../agents/trading/dynamic-trade-manager.agent";
import { BotService } from "./bot.service";

// Type definitions
interface MarketData {
  symbol: string;
  price: number;
  // Other market data properties
}

interface RiskData {
  symbol: string;
  riskLevel: number;
  // Other risk data properties
}

interface TradingDecision {
  decision: string;
  confidence: number;
  reasoning: string;
}

interface RiskAssessment {
  riskScore?: number;
  recommendedPositionSize?: number;
  stopLoss?: number;
  takeProfit?: number;
}

export interface BotEvaluationResult {
  success: boolean;
  data?: any;
  error?: string;
  tradeExecuted?: boolean;
  evaluationId?: string;
}

export interface TradeExecutionResult {
  success: boolean;
  tradeId?: string;
  error?: string;
  executionDetails?: any;
}

/**
 * Sophisticated bot evaluation service with real trading capabilities
 */
export class BotEvaluationService {
  private sophisticatedTradingAgent: SophisticatedTradingAgent;
  private positionAwarenessAgent: PositionAwarenessAgent;
  private dynamicTradeManagerAgent: DynamicTradeManagerAgent;
  private capitalApiInstances: Map<string, any> = new Map(); // Cache authenticated instances

  constructor() {
    this.sophisticatedTradingAgent = new SophisticatedTradingAgent();
    this.positionAwarenessAgent = new PositionAwarenessAgent();
    this.dynamicTradeManagerAgent = new DynamicTradeManagerAgent();
  }

  /**
   * Main bot evaluation method
   */
  async evaluateBot(botId: string): Promise<BotEvaluationResult> {
    try {
      logger.info(`🤖 Starting evaluation for bot: ${botId}`);

      // Get bot details
      const bot = await prisma.bot.findUnique({
        where: { id: botId },
        include: {
          user: true,
          strategy: true,
          brokerCredential: true,
        },
      });

      if (!bot) {
        throw new Error(`Bot not found: ${botId}`);
      }

      if (!bot.isActive) {
        logger.info(`Bot ${botId} is not active, skipping evaluation`);
        return {
          success: true,
          data: { message: "Bot is not active" },
        };
      }

      logger.info(`📊 Evaluating bot: ${bot.name} (${bot.tradingPairSymbol})`);

      // Step 0: Check if market is open for trading
      if (!bot.brokerCredential || !bot.brokerCredential.credentials) {
        throw new Error("No broker credentials configured for bot");
      }

      const credentials = credentialsEncryption.decryptCredentials(
        bot.brokerCredential.credentials,
      );
      const cacheKey = `${botId}-${credentials.apiKey.slice(-8)}`;
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
          instanceId: `bot-${botId}`,
        });
        await capitalApi.authenticate();
        this.capitalApiInstances.set(cacheKey, capitalApi);
      }

      const marketHoursCheck = await marketValidationService.checkMarketTradingHours(
        bot.tradingPairSymbol,
        capitalApi,
      );

      if (!marketHoursCheck.allowed) {
        logger.info(`⏰ Market closed for ${bot.tradingPairSymbol}: ${marketHoursCheck.reason}`);
        return {
          success: true,
          data: {
            message: `Market closed: ${marketHoursCheck.reason}`,
            decision: "HOLD",
            marketStatus: "CLOSED",
          },
        };
      }

      logger.info(`✅ Market is open for ${bot.tradingPairSymbol}: ${marketHoursCheck.reason}`);

      // Step 0.5: Fetch historical data ONCE for all processes (optimization)
      logger.info(`📊 Fetching historical data once for all processes...`);
      const sharedCandleData = await this.getHistoricalCandleData(
        bot.tradingPairSymbol,
        bot.timeframe,
        botId,
        400, // 400 bars for comprehensive analysis
      );
      logger.info(`✅ Shared candlestick data ready: ${sharedCandleData.length} bars`);

      // Step 1: Generate chart (using shared data) - OPTIONAL
      const chartResult = await this.generateBotChart(
        botId,
        bot.tradingPairSymbol,
        bot.timeframe,
        bot,
        sharedCandleData, // Pass shared data
      );

      // Chart generation is optional - don't fail the entire evaluation if it fails
      let chartUrl = "temp://chart-generation-failed";
      if (chartResult.success && chartResult.chartUrl) {
        chartUrl = chartResult.chartUrl;
        logger.info(`✅ Chart generated successfully: ${chartUrl}`);
      } else {
        logger.warn(`⚠️ Chart generation failed: ${chartResult.error || "Unknown error"}`);
        logger.info("📊 Continuing bot evaluation without chart (this is non-critical)");
      }

      // Step 2: Collect portfolio context
      const portfolioContext = await this.collectPortfolioContext(bot.userId, botId);

      // Step 3: Perform AI analysis (using shared data)
      const analysisResult = await this.performAIAnalysis(
        bot.tradingPairSymbol,
        bot.timeframe,
        chartUrl,
        { ...portfolioContext, botId, bot }, // Pass bot data to analysis
        await this.getRealMarketPrice(bot.tradingPairSymbol, botId), // Real market price
        sharedCandleData, // Pass shared data
      );

      if (!analysisResult.success) {
        throw new Error(`AI analysis failed: ${analysisResult.error}`);
      }

      // Step 4: Create evaluation record
      const evaluation = await this.createEvaluationRecord(
        botId,
        bot.userId,
        chartUrl,
        analysisResult.data,
        portfolioContext,
      );

      // Step 5: Execute trade if AI recommends it and AI trading is enabled
      let tradeExecuted = false;
      let tradeResult: TradeExecutionResult | null = null;

      if (
        bot.isAiTradingActive &&
        analysisResult.data &&
        (analysisResult.data.decision === "BUY" ||
          analysisResult.data.decision === "SELL" ||
          analysisResult.data.decision === "EXECUTE_TRADE")
      ) {
        // Step 5.1: Check position awareness before executing trade
        logger.info(`🔍 [POSITION-AWARENESS] Checking position limits before trade execution...`);

        // Get real-time account info from Capital.com API instead of database
        logger.info(
          `💰 [POSITION-AWARENESS] Fetching real-time account data from Capital.com API...`,
        );

        // Use the existing capitalApi instance for real-time data
        const positionCheck = await this.positionAwarenessAgent.checkPositionLimits({
          botId,
          userId: bot.userId,
          symbol: bot.tradingPairSymbol,
          direction: analysisResult.data.decision as "BUY" | "SELL",
          proposedPositionSize: 0.001, // Temporary value - will be calculated later
          accountBalance: 1000, // Will be updated with real balance from API
          timeframe: bot.timeframe,
          // Pass Capital.com API instance for real-time data
          capitalApi,
          // Add bot configuration from database
          botConfig: {
            maxOpenTrades: bot.maxOpenTrades,
            maxRiskPercentage: bot.maxRiskPercentage,
            minRiskPercentage: bot.minRiskPercentage,
            name: bot.name,
          },
          // Add strategy configuration if available
          strategyConfig: bot.strategy
            ? {
                confidenceThreshold: (() => {
                  try {
                    const params =
                      typeof bot.strategy.parameters === "string"
                        ? JSON.parse(bot.strategy.parameters)
                        : bot.strategy.parameters;
                    return params?.confidenceThreshold;
                  } catch {
                    return undefined;
                  }
                })(),
                riskManagement: (() => {
                  try {
                    const params =
                      typeof bot.strategy.parameters === "string"
                        ? JSON.parse(bot.strategy.parameters)
                        : bot.strategy.parameters;
                    return params?.riskManagement;
                  } catch {
                    return undefined;
                  }
                })(),
                parameters: (() => {
                  try {
                    return typeof bot.strategy.parameters === "string"
                      ? JSON.parse(bot.strategy.parameters)
                      : bot.strategy.parameters;
                  } catch {
                    return {};
                  }
                })(),
              }
            : undefined,
        });

        if (!positionCheck.canTrade) {
          logger.warn(
            `🚫 [POSITION-AWARENESS] Trade blocked by position limits: ${positionCheck.reasoning.join(", ")} | Real-time account: ${positionCheck.accountInfo?.accountName || "Unknown"} (${positionCheck.riskMetrics.realAccountBalance} ${positionCheck.accountInfo?.currency || "USD"}) | Open positions: ${positionCheck.riskMetrics.totalOpenPositions}/${positionCheck.riskMetrics.maxPositionLimit}`,
          );
          tradeResult = {
            success: false,
            error: `Position management blocked trade: ${positionCheck.reasoning[0]}`,
            executionDetails: {
              positionCheck,
              recommendations: positionCheck.recommendations,
              realTimeAccountData: {
                balance: positionCheck.riskMetrics.realAccountBalance,
                currency: positionCheck.accountInfo?.currency,
                openPositions: positionCheck.riskMetrics.totalOpenPositions,
                accountName: positionCheck.accountInfo?.accountName,
              },
            },
          };
        } else {
          // STEP 5.2: Position Context Intelligence - Use AI to evaluate if trade makes sense
          logger.info(`🧠 [POSITION-CONTEXT] Running intelligent position context evaluation...`);

          // Import Position Context Evaluation Agent
          const positionContextAgent = new PositionContextEvaluationAgent();

          // Get recent trading history for context
          // Only consider OPEN trades to prevent blocking due to recently closed trades
          const recentTrades = await prisma.trade.findMany({
            where: {
              botId,
              status: "OPEN", // Only include currently open trades for redundancy checking
            },
            orderBy: { openedAt: "desc" },
            take: 10,
          });

          // Calculate time since last trade
          const lastTrade = recentTrades[0];
          const timeSinceLastTrade =
            lastTrade && lastTrade.openedAt
              ? Math.floor((Date.now() - new Date(lastTrade.openedAt).getTime()) / 60000)
              : Infinity;

          // Prepare context for evaluation
          const positionContextParams = {
            symbol: bot.tradingPairSymbol,
            proposedDirection: analysisResult.data.decision as "BUY" | "SELL",
            currentPrice: analysisResult.data.marketPrice?.price || 50000,
            confidence: (analysisResult.data.confidence || 0.5) * 100, // Convert decimal to percentage
            technicalSignal: analysisResult.data.technicalAnalysis?.trend || "NEUTRAL",
            marketConditions: analysisResult.data.reasoning || "Standard market conditions",
            existingPositions: positionCheck.currentPositions,
            accountBalance: positionCheck.riskMetrics.realAccountBalance,
            timeSinceLastTrade,
            recentTradingHistory: recentTrades.map((t) => ({
              symbol: t.symbol,
              direction: t.side, // Use 'side' property from database
              timestamp: t.openedAt,
              size: t.size,
              entryPrice: t.entryPrice,
            })),
            strategyConfig: bot.strategy,
            botConfig: {
              maxOpenTrades: bot.maxOpenTrades,
              maxRiskPercentage: bot.maxRiskPercentage,
              minRiskPercentage: bot.minRiskPercentage,
              name: bot.name,
            },
          };

          // Run intelligent position context evaluation
          const contextEvaluation =
            await positionContextAgent.evaluatePositionContext(positionContextParams);

          logger.info(
            `🧠 [POSITION-CONTEXT] AI Decision: ${contextEvaluation.recommendedAction} (${contextEvaluation.confidence}% confidence)`,
          );
          logger.info(
            `📊 [POSITION-CONTEXT] Market Change: ${contextEvaluation.marketChangeAssessment}`,
          );
          logger.info(
            `🔗 [POSITION-CONTEXT] Position Analysis: ${contextEvaluation.positionCorrelationAnalysis}`,
          );

          if (!contextEvaluation.shouldProceed) {
            logger.warn(
              `🚫 [POSITION-CONTEXT] Trade blocked by AI context evaluation: ${contextEvaluation.reasoning.join(", ")}`,
            );
            tradeResult = {
              success: false,
              error: `Position context evaluation blocked trade: ${contextEvaluation.reasoning[0]}`,
              executionDetails: {
                positionCheck,
                contextEvaluation,
                aiRecommendation: contextEvaluation.recommendedAction,
                marketAssessment: contextEvaluation.marketChangeAssessment,
                reasoning: contextEvaluation.reasoning,
              },
            };
          } else {
            logger.info(
              `✅ [POSITION-CONTEXT] Trade approved by AI context evaluation | Strategy alignment: ${contextEvaluation.strategyAlignmentScore}% | Market change: ${contextEvaluation.marketChangeAssessment}`,
            );
            logger.info(
              `✅ [POSITION-AWARENESS] Trade approved: ${positionCheck.reasoning.join(", ")} | Real-time account: ${positionCheck.accountInfo?.accountName || "Unknown"} (${positionCheck.riskMetrics.realAccountBalance} ${positionCheck.accountInfo?.currency || "USD"}) | Open positions: ${positionCheck.riskMetrics.totalOpenPositions}/${positionCheck.riskMetrics.maxPositionLimit}`,
            );
            tradeResult = await this.executeTradeFromAnalysis(
              botId,
              bot,
              analysisResult.data,
              evaluation.id,
              sharedCandleData, // Pass shared data
            );
            tradeExecuted = tradeResult.success;
          }
        }
      }

      logger.info(
        `✅ Bot evaluation completed: ${botId} - Decision: ${analysisResult.data?.decision} - Trade executed: ${tradeExecuted}`,
      );

      return {
        success: true,
        data: {
          evaluation,
          analysis: analysisResult.data,
          tradeResult,
          chartUrl: chartResult.chartUrl,
        },
        tradeExecuted,
        evaluationId: evaluation.id,
      };
    } catch (error) {
      logger.error(`❌ Bot evaluation failed for ${botId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Generate chart for bot analysis
   */
  private async generateBotChart(
    botId: string,
    symbol: string,
    timeframe: string,
    bot: any,
    sharedCandleData?: CandleData[], // Optional shared data to avoid duplicate API calls
  ): Promise<{
    success: boolean;
    chartUrl?: string;
    error?: string;
  }> {
    try {
      logger.info(`📊 Generating chart for ${symbol} (${timeframe})`);

      // Extract indicators from bot's strategy
      let chartIndicators: any = undefined; // For ChartService format
      let fallbackIndicators = ["SMA", "EMA", "RSI"]; // String array fallback

      // Debug: Log bot strategy information
      logger.info(
        `📊 Bot strategy debug: strategyId=${bot.strategyId}, strategy=${!!bot.strategy}`,
      );
      if (bot.strategy) {
        logger.info(
          `📊 Strategy details: name="${bot.strategy.name}", indicators="${bot.strategy.indicators}"`,
        );
      }

      if (bot?.strategy?.indicators) {
        try {
          // Parse the strategy indicators (stored as JSON string)
          const parsedIndicators =
            typeof bot.strategy.indicators === "string"
              ? JSON.parse(bot.strategy.indicators)
              : bot.strategy.indicators;

          logger.info(`📊 Parsed indicators: ${JSON.stringify(parsedIndicators)}`);

          if (Array.isArray(parsedIndicators) && parsedIndicators.length > 0) {
            // Extract indicator types as strings for ChartService (it expects string[])
            chartIndicators = parsedIndicators.map((ind) => ind.type || ind.name || "unknown");
            logger.info(
              `📊 Using ${parsedIndicators.length} strategy indicators: ${chartIndicators.join(", ")}`,
            );
          } else {
            logger.warn(
              `📊 Strategy indicators not valid array, using defaults: ${fallbackIndicators.join(", ")}`,
            );
            chartIndicators = fallbackIndicators;
          }
        } catch (error) {
          logger.warn(`📊 Failed to parse strategy indicators, using defaults: ${error}`);
        }
      } else {
        logger.warn(
          `📊 No strategy indicators found, using defaults: ${fallbackIndicators.join(", ")}`,
        );
      }

      const chartService = new ChartService();
      const chartResult = await chartService.generateChart({
        symbol,
        timeframe,
        width: 1200,
        height: 800,
        theme: "dark",
        indicators: chartIndicators,
        botId, // Pass botId to use user's broker credentials
      });

      if (!chartResult.success || !chartResult.data) {
        throw new Error("Chart generation failed");
      }

      // Chart URL is already available from chartResult
      let chartUrl = chartResult.chartUrl;
      if (!chartUrl) {
        throw new Error("Chart generation did not return a valid URL");
      }

      // Check if chart was uploaded to Supabase successfully
      if (chartUrl.startsWith("temp://")) {
        logger.warn("⚠️ Chart upload to Supabase failed, using temporary URL");
      } else if (chartUrl.startsWith("http")) {
        logger.info("✅ Chart successfully uploaded to Supabase storage");
      }

      // Extract filename from the chart URL or generate one
      const fileName = `${symbol}-${timeframe}-${Date.now()}.png`;

      // Save chart reference in database
      await prisma.chartImage.create({
        data: {
          filename: fileName,
          symbol,
          timeframe,
          url: chartUrl,
          metadata: JSON.stringify({
            botId,
            generatedAt: new Date(),
            uploadedToSupabase: chartUrl.startsWith("http"),
          }),
        },
      });

      logger.info(`✅ Chart generated and uploaded: ${chartUrl}`);

      return {
        success: true,
        chartUrl,
      };
    } catch (error) {
      logger.error("Chart generation failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Collect portfolio context for analysis
   */
  private async collectPortfolioContext(userId: string, botId: string): Promise<any> {
    try {
      // Get user's portfolio data
      const portfolio = await prisma.portfolio.findFirst({
        where: { userId },
      });

      // Get open positions
      const openPositions = await prisma.position.findMany({
        where: { botId },
      });

      // Get recent trades
      const recentTrades = await prisma.trade.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
      });

      // Get bot performance metrics
      const bot = await prisma.bot.findUnique({
        where: { id: botId },
        select: {
          totalTrades: true,
          winningTrades: true,
          totalProfit: true,
          maxDrawdown: true,
        },
      });

      return {
        portfolio,
        openPositions,
        recentTrades,
        botMetrics: bot,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error("Failed to collect portfolio context:", error);
      return {};
    }
  }

  /**
   * Get real market price for a symbol using bot's broker credentials
   */
  private async getRealMarketPrice(
    symbol: string,
    botId: string,
  ): Promise<{ symbol: string; price: number }> {
    try {
      logger.info(`Fetching real market price for ${symbol} using bot ${botId} credentials`);

      // Get bot configuration with broker credentials
      const bot = await prisma.bot.findUnique({
        where: { id: botId },
        include: { brokerCredential: true },
      });

      if (!bot?.brokerCredential) {
        const error = `❌ BROKER CREDENTIALS MISSING: Bot ${botId} has no broker credentials configured for price fetching.`;
        logger.error(error);
        throw new Error(error);
      }

      // Decrypt and parse the credentials
      let credentialsData;
      try {
        const { credentialsEncryption } = await import("./credentials-encryption.service");
        credentialsData = credentialsEncryption.decryptCredentials(
          bot.brokerCredential.credentials,
        );
      } catch (error) {
        const errorMsg = `❌ CREDENTIAL PARSING FAILED: Bot ${botId} broker credentials are corrupted.`;
        logger.error(errorMsg, error);
        throw new Error(errorMsg);
      }

      if (!credentialsData.apiKey || !credentialsData.identifier || !credentialsData.password) {
        const errorMsg = `❌ INCOMPLETE CREDENTIALS: Bot ${botId} broker credentials are missing required fields.`;
        logger.error(errorMsg);
        throw new Error(errorMsg);
      }

      const config = {
        apiKey: credentialsData.apiKey,
        identifier: credentialsData.identifier,
        password: credentialsData.password,
        isDemo: bot.brokerCredential.isDemo,
      };

      // Import Capital API service and reuse/cache authenticated instance
      const { getCapitalApiInstance } = await import("../modules/capital");

      // Create cache key for this bot's credentials
      const cacheKey = `${botId}-${config.apiKey.slice(-8)}`;

      let capitalApi;
      if (this.capitalApiInstances.has(cacheKey)) {
        capitalApi = this.capitalApiInstances.get(cacheKey);
        logger.info(`Reusing cached Capital API instance for bot ${botId}`);
      } else {
        capitalApi = getCapitalApiInstance(config);
        await capitalApi.authenticate();
        this.capitalApiInstances.set(cacheKey, capitalApi);
        logger.info(`Created and cached new Capital API instance for bot ${botId}`);
      }

      // Convert symbol to epic format
      const epic = this.convertSymbolToEpic(symbol);

      // Get current market price
      const latestPrice = await capitalApi.getLatestPrice(epic);
      const currentPrice = (latestPrice.bid + latestPrice.ask) / 2;

      if (!currentPrice || currentPrice <= 0) {
        const error = `❌ INVALID PRICE: Received invalid price ${currentPrice} for ${symbol}`;
        logger.error(error);
        throw new Error(error);
      }

      logger.info(`Real market price fetched for ${symbol}: ${currentPrice}`);
      return { symbol, price: currentPrice };
    } catch (error) {
      logger.error(`❌ MARKET PRICE FETCH FAILED for ${symbol}:`, error);
      throw error; // Re-throw instead of fallback
    }
  }

  /**
   * Convert symbol to Capital.com epic format with proper mappings
   * Using working format from capital-main.service.ts
   */
  private convertSymbolToEpic(symbol: string): string {
    const symbolMappings: { [key: string]: string } = {
      // Cryptocurrency pairs - SIMPLE FORMAT (WORKING!)
      BTC: "BTCUSD",
      "BTC/USD": "BTCUSD",
      BITCOIN: "BTCUSD",
      BTCUSD: "BTCUSD",

      ETH: "ETHUSD",
      "ETH/USD": "ETHUSD",
      ETHEREUM: "ETHUSD",
      ETHUSD: "ETHUSD",

      LTC: "LTCUSD",
      "LTC/USD": "LTCUSD",
      LITECOIN: "LTCUSD",
      LTCUSD: "LTCUSD",

      XRP: "XRPUSD",
      "XRP/USD": "XRPUSD",
      RIPPLE: "XRPUSD",
      XRPUSD: "XRPUSD",

      ADA: "ADAUSD",
      "ADA/USD": "ADAUSD",
      CARDANO: "ADAUSD",
      ADAUSD: "ADAUSD",

      SOL: "SOLUSD",
      "SOL/USD": "SOLUSD",
      SOLANA: "SOLUSD",
      SOLUSD: "SOLUSD",

      DOGE: "DOGEUSD",
      "DOGE/USD": "DOGEUSD",
      DOGECOIN: "DOGEUSD",
      DOGEUSD: "DOGEUSD",

      // Index pairs - CORRECT Capital.com epic formats
      SPX500: "CS.D.SPXUSD.CFD.IP",
      "S&P500": "CS.D.SPXUSD.CFD.IP",
      SP500: "CS.D.SPXUSD.CFD.IP",
      US500: "CS.D.SPXUSD.CFD.IP",

      NASDAQ: "CS.D.NQHUSD.CFD.IP",
      NAS100: "CS.D.NQHUSD.CFD.IP",
      NASDAQ100: "CS.D.NQHUSD.CFD.IP",
      US100: "CS.D.NQHUSD.CFD.IP",

      DOW: "CS.D.DJUSD.CFD.IP",
      DOWJONES: "CS.D.DJUSD.CFD.IP",
      US30: "CS.D.DJUSD.CFD.IP",

      // Forex pairs - CORRECT Capital.com epic formats
      "EUR/USD": "CS.D.EURUSD.MINI.IP",
      EURUSD: "CS.D.EURUSD.MINI.IP",

      "GBP/USD": "CS.D.GBPUSD.MINI.IP",
      GBPUSD: "CS.D.GBPUSD.MINI.IP",

      "USD/CAD": "CS.D.USDCAD.MINI.IP",
      USDCAD: "CS.D.USDCAD.MINI.IP",

      "USD/JPY": "CS.D.USDJPY.MINI.IP",
      USDJPY: "CS.D.USDJPY.MINI.IP",

      "AUD/USD": "CS.D.AUDUSD.MINI.IP",
      AUDUSD: "CS.D.AUDUSD.MINI.IP",

      "USD/CHF": "CS.D.USDCHF.MINI.IP",
      USDCHF: "CS.D.USDCHF.MINI.IP",

      "NZD/USD": "CS.D.NZDUSD.MINI.IP",
      NZDUSD: "CS.D.NZDUSD.MINI.IP",

      "EUR/GBP": "CS.D.EURGBP.MINI.IP",
      EURGBP: "CS.D.EURGBP.MINI.IP",

      "EUR/JPY": "CS.D.EURJPY.MINI.IP",
      EURJPY: "CS.D.EURJPY.MINI.IP",

      "GBP/JPY": "CS.D.GBPJPY.MINI.IP",
      GBPJPY: "CS.D.GBPJPY.MINI.IP",

      // Commodities - CORRECT Capital.com epic formats
      GOLD: "CS.D.GOLD.CFD.IP",
      XAUUSD: "CS.D.GOLD.CFD.IP",
      "XAU/USD": "CS.D.GOLD.CFD.IP",

      SILVER: "CS.D.SILVER.CFD.IP",
      XAGUSD: "CS.D.SILVER.CFD.IP",
      "XAG/USD": "CS.D.SILVER.CFD.IP",

      OIL: "CS.D.OILCMTY.CFD.IP",
      CRUDE: "CS.D.OILCMTY.CFD.IP",
      WTI: "CS.D.OILCMTY.CFD.IP",

      NATURALGAS: "CS.D.NATURALGAS.CFD.IP",
    };

    const epic = symbolMappings[symbol.toUpperCase()] || symbol;
    logger.info(`Symbol mapping: ${symbol} -> ${epic}`);
    return epic;
  }

  /**
   * Convert symbol to Capital.com trading epic format (for actual trading)
   * Some symbols need different format for trading vs historical data
   */
  private convertSymbolToTradingEpic(symbol: string): string {
    const tradingMappings: { [key: string]: string } = {
      // Cryptocurrency pairs - Trading requires CFD format
      BTC: "CS.D.BITCOIN.CFD.IP",
      "BTC/USD": "CS.D.BITCOIN.CFD.IP",
      BITCOIN: "CS.D.BITCOIN.CFD.IP",
      BTCUSD: "CS.D.BITCOIN.CFD.IP",

      ETH: "CS.D.ETHEREUM.CFD.IP",
      "ETH/USD": "CS.D.ETHEREUM.CFD.IP",
      ETHEREUM: "CS.D.ETHEREUM.CFD.IP",
      ETHUSD: "CS.D.ETHEREUM.CFD.IP",

      LTC: "CS.D.LITECOIN.CFD.IP",
      "LTC/USD": "CS.D.LITECOIN.CFD.IP",
      LITECOIN: "CS.D.LITECOIN.CFD.IP",
      LTCUSD: "CS.D.LITECOIN.CFD.IP",

      // For non-crypto, use the same format as historical data
      "EUR/USD": "CS.D.EURUSD.MINI.IP",
      EURUSD: "CS.D.EURUSD.MINI.IP",

      "GBP/USD": "CS.D.GBPUSD.MINI.IP",
      GBPUSD: "CS.D.GBPUSD.MINI.IP",
    };

    const tradingEpic = tradingMappings[symbol.toUpperCase()];
    if (tradingEpic) {
      logger.info(`Trading symbol mapping: ${symbol} -> ${tradingEpic}`);
      return tradingEpic;
    }

    // Fallback to regular epic format
    return this.convertSymbolToEpic(symbol);
  }

  /**
   * Perform AI analysis using sophisticated trading agent
   */
  private async performAIAnalysis(
    symbol: string,
    timeframe: string,
    chartUrl: string,
    portfolioContext: any,
    marketPrice: any,
    sharedCandleData?: CandleData[], // Optional shared data to avoid duplicate API calls
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      logger.info(`🧠 Performing sophisticated AI analysis for ${symbol}`);

      // Get account balance for analysis from portfolio context
      let accountBalance = 10000; // Default fallback
      if (portfolioContext?.portfolio?.balance) {
        accountBalance = portfolioContext.portfolio.balance;
      }

      // Use shared candlestick data if available, otherwise fetch new data
      const candleData =
        sharedCandleData ||
        (await this.getHistoricalCandleData(
          symbol,
          timeframe,
          portfolioContext.botId || "unknown",
          400, // Use same 400 bars as chart for consistency
        ));

      if (sharedCandleData) {
        logger.info(
          `📊 Using shared candlestick data (${candleData.length} bars) - API call avoided`,
        );
      }

      // Run sophisticated analysis
      const sophisticatedResult = await this.sophisticatedTradingAgent.analyzeTrade({
        symbol,
        direction: "BUY", // Will be determined by the analysis
        currentPrice: marketPrice.price,
        candleData,
        timeframe,
        accountBalance,
        riskPercentage: 2.0,
        botMaxPositionSize: portfolioContext?.bot?.maxPositionSize || 1000,
        strategy: "technical_analysis",
      });

      // Map sophisticated results to expected format
      const decision = sophisticatedResult.finalRecommendation.shouldTrade
        ? sophisticatedResult.technicalAnalysis.trend === "BULLISH"
          ? "BUY"
          : "SELL"
        : "HOLD";

      return {
        success: true,
        data: {
          decision,
          confidence: sophisticatedResult.finalRecommendation.confidence,
          reasoning: sophisticatedResult.finalRecommendation.reasoning.join("; "),
          technicalAnalysis: {
            trend: sophisticatedResult.technicalAnalysis.trend,
            atr: sophisticatedResult.technicalAnalysis.atr,
            summary: `${sophisticatedResult.technicalAnalysis.trend} trend (ATR: ${sophisticatedResult.technicalAnalysis.atr.toFixed(2)})`,
          },
          riskAssessment: {
            riskScore: sophisticatedResult.riskLevels.riskRewardRatio,
            recommendedPositionSize: sophisticatedResult.finalRecommendation.positionSize,
            stopLoss: sophisticatedResult.finalRecommendation.stopLoss,
            takeProfit: sophisticatedResult.finalRecommendation.takeProfit,
          },
          recommendedPositionSize: sophisticatedResult.finalRecommendation.positionSize,
          stopLoss: sophisticatedResult.finalRecommendation.stopLoss,
          takeProfit: sophisticatedResult.finalRecommendation.takeProfit,
          riskScore: sophisticatedResult.riskLevels.riskRewardRatio,
          marketPrice,
        },
      };
    } catch (error) {
      logger.error("Sophisticated AI analysis failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Create evaluation record in database
   */
  private async createEvaluationRecord(
    botId: string,
    userId: string,
    chartUrl: string,
    analysis: any,
    portfolioContext: any,
  ): Promise<any> {
    try {
      const evaluation = await prisma.evaluation.create({
        data: {
          userId,
          botId,
          symbol: analysis.marketPrice?.symbol || analysis.symbol || "BTC/USD",
          timeframe: analysis.timeframe || "M1",
          chartUrl,
          decision: analysis.decision,
          confidence: analysis.confidence,
          reasoning: analysis.reasoning,
          chartAnalysis: analysis.technicalAnalysis?.summary || "",
          riskScore: analysis.riskScore,
          positionSize: analysis.recommendedPositionSize,
          stopLoss: analysis.stopLoss,
          takeProfit: analysis.takeProfit,
          marketPrice: analysis.marketPrice?.price,
          aiResponse: JSON.stringify(analysis),
          portfolioData: JSON.stringify(portfolioContext),
          startDate: new Date(),
          success: true,
        },
      });

      logger.info(`Created evaluation record: ${evaluation.id}`);
      return evaluation;
    } catch (error) {
      logger.error("Failed to create evaluation record:", error);
      throw error;
    }
  }

  /**
   * Get historical candlestick data for technical analysis
   */
  private async getHistoricalCandleData(
    symbol: string,
    timeframe: string,
    botId: string,
    bars: number = 100,
  ): Promise<CandleData[]> {
    try {
      logger.info(`📊 Getting historical candle data for ${symbol} (${timeframe})`);

      // Get or create capital API instance
      const bot = await prisma.bot.findUnique({
        where: { id: botId },
        include: { brokerCredential: true },
      });

      if (!bot?.brokerCredential?.credentials) {
        throw new Error("No broker credentials found");
      }

      const credentials = credentialsEncryption.decryptCredentials(
        bot.brokerCredential.credentials,
      );
      const cacheKey = `${botId}-${credentials.apiKey.slice(-8)}`;
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
          instanceId: `bot-${botId}`,
        });
        await capitalApi.authenticate();
        this.capitalApiInstances.set(cacheKey, capitalApi);
      }

      // Get epic for symbol
      const epic = await capitalApi.getEpicForSymbol(symbol);
      if (!epic) {
        throw new Error(`Could not find epic for symbol: ${symbol}`);
      }

      // Get historical data from Capital.com - REAL DATA ONLY
      logger.info(`📊 Fetching ${bars} bars of ${timeframe} data for ${epic}`);
      const historicalData = await capitalApi.getHistoricalPrices(epic, timeframe, bars);

      if (!historicalData || historicalData.length === 0) {
        throw new Error(`No historical data returned for ${epic} (${timeframe})`);
      }

      logger.info(`📊 Retrieved ${historicalData.length} real bars for ${symbol}`);

      // Convert to CandleData format - Fix Capital.com data structure
      const candleData: CandleData[] = historicalData.map((bar: any) => ({
        open: parseFloat(bar.openPrice?.bid || bar.openPrice?.ask || bar.open || 0),
        high: parseFloat(bar.highPrice?.bid || bar.highPrice?.ask || bar.high || 0),
        low: parseFloat(bar.lowPrice?.bid || bar.lowPrice?.ask || bar.low || 0),
        close: parseFloat(bar.closePrice?.bid || bar.closePrice?.ask || bar.close || 0),
        volume: parseFloat(bar.lastTradedVolume || bar.volume || 0),
        timestamp: new Date(bar.snapshotTimeUTC || bar.snapshotTime || bar.timestamp).getTime(),
      }));

      logger.info(`📊 Retrieved ${candleData.length} candles for technical analysis`);
      return candleData;
    } catch (error) {
      logger.error(`❌ Failed to get historical candle data for ${symbol}:`, error);

      // DO NOT USE FALLBACK DATA - throw error to identify real issues
      logger.error(`❌ CRITICAL: Failed to get real historical data for ${symbol}:`, error);
      throw new Error(
        `Cannot get real market data for ${symbol}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Execute trade based on AI analysis
   */
  private async executeTradeFromAnalysis(
    botId: string,
    bot: any,
    analysis: any,
    evaluationId: string,
    sharedCandleData?: CandleData[], // Optional shared data to avoid duplicate API calls
  ): Promise<TradeExecutionResult> {
    try {
      logger.info(`🔄 Executing trade for bot ${botId} based on AI analysis`);

      if (!bot.brokerCredential || !bot.brokerCredential.credentials) {
        throw new Error("No broker credentials configured for bot");
      }

      const credentials = credentialsEncryption.decryptCredentials(
        bot.brokerCredential.credentials,
      );

      // Reuse the same Capital API instance to avoid rate limiting
      const cacheKey = `${botId}-${credentials.apiKey.slice(-8)}`;
      let capitalApi = this.capitalApiInstances.get(cacheKey);

      if (!capitalApi) {
        // Fallback: create new instance if somehow not cached
        const { CapitalMainService } = await import(
          "../modules/capital/services/capital-main.service"
        );
        capitalApi = new CapitalMainService({
          apiKey: credentials.apiKey,
          identifier: credentials.identifier,
          password: credentials.password,
          isDemo: bot.brokerCredential.isDemo,
          instanceId: `bot-${botId}`,
        });
        await capitalApi.authenticate();
        this.capitalApiInstances.set(cacheKey, capitalApi);
        logger.info(`Created fallback Capital API instance for trade execution`);
      } else {
        logger.info(`Reusing cached Capital API instance for trade execution`);
      }

      // Get epic for symbol - use trading format for execution
      let epic = await capitalApi.getEpicForSymbol(bot.tradingPairSymbol);
      if (!epic) {
        throw new Error(`Could not find epic for symbol: ${bot.tradingPairSymbol}`);
      }

      // For crypto trading, we might need the full CFD epic format instead of simple format
      if (epic === "BTCUSD" || epic === "ETHUSD" || epic === "LTCUSD") {
        const tradingEpic = this.convertSymbolToTradingEpic(bot.tradingPairSymbol);
        if (tradingEpic !== epic) {
          logger.info(`Using trading epic format: ${epic} -> ${tradingEpic}`);
          epic = tradingEpic;
        }
      }

      // If trading epic doesn't work, search for the correct one
      try {
        // First, try to get market details to verify the epic exists for trading
        await capitalApi.getMarketData(epic);
        logger.info(`✅ Verified trading epic exists: ${epic}`);
      } catch (verifyError: any) {
        if (verifyError.message.includes("404")) {
          logger.warn(
            `❌ Trading epic ${epic} not found, searching for correct Bitcoin trading symbol...`,
          );

          // Search for Bitcoin trading markets
          const markets = await capitalApi.searchMarkets("Bitcoin");
          logger.info(
            `Found ${markets.length} Bitcoin markets:`,
            markets.map((m: any) => ({ epic: m.epic, name: m.instrumentName, symbol: m.symbol })),
          );

          // Look for tradeable Bitcoin market
          const bitcoinMarket = markets.find(
            (m: any) =>
              (m.instrumentName?.toUpperCase().includes("BITCOIN") ||
                m.instrumentName?.toUpperCase().includes("BTC")) &&
              !m.instrumentName?.toUpperCase().includes("TEST"),
          );

          if (bitcoinMarket) {
            logger.info(
              `✅ Found correct Bitcoin trading epic: ${bitcoinMarket.epic} (${bitcoinMarket.instrumentName})`,
            );
            epic = bitcoinMarket.epic;
          } else {
            throw new Error(
              `No tradeable Bitcoin market found. Available markets: ${markets.map((m: any) => m.instrumentName).join(", ")}`,
            );
          }
        } else {
          throw verifyError;
        }
      }

      // Determine trade direction
      const direction =
        analysis.decision === "BUY" || analysis.decision === "EXECUTE_TRADE" ? "BUY" : "SELL";

      logger.info(
        `🔍 Direction Analysis: decision="${analysis.decision}", determined direction="${direction}"`,
      );

      // 🚀 SOPHISTICATED TRADING ANALYSIS - Replace simple percentage calculations
      logger.info(`🧠 Starting sophisticated trading analysis...`);

      // Use shared candlestick data if available, otherwise fetch new data
      const candleData =
        sharedCandleData ||
        (await this.getHistoricalCandleData(
          bot.tradingPairSymbol,
          bot.timeframe,
          botId,
          400, // Get 400 bars for comprehensive analysis
        ));

      if (sharedCandleData) {
        logger.info(
          `🚀 Using shared candlestick data for trade execution (${candleData.length} bars) - API call avoided`,
        );
      }

      // Get account balance for position sizing - NO FALLBACK
      let accountBalance: number;
      try {
        const accountDetails = await capitalApi.getAccountDetails();
        accountBalance = accountDetails.balance;

        if (!accountBalance || accountBalance <= 0) {
          throw new Error(`Invalid account balance: ${accountBalance}`);
        }

        logger.info(`💰 Real account balance: $${accountBalance}`);
      } catch (error) {
        logger.error(`❌ CRITICAL: Cannot get real account balance:`, error);
        throw new Error(
          `Cannot get real account balance: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }

      // Prepare parameters for sophisticated analysis
      const sophisticatedParams: SophisticatedTradeParams = {
        symbol: bot.tradingPairSymbol,
        direction,
        currentPrice: analysis.marketPrice?.price || 50000,
        candleData,
        timeframe: bot.timeframe,
        accountBalance,
        riskPercentage: 2.0, // 2% risk per trade
        botMaxPositionSize: bot.maxPositionSize,
        strategy: bot.strategy || "technical_analysis",
      };

      // Run sophisticated trading analysis
      const sophisticatedResult: SophisticatedTradeResult =
        await this.sophisticatedTradingAgent.analyzeTrade(sophisticatedParams);

      // Check if the sophisticated analysis approves the trade
      if (!sophisticatedResult.finalRecommendation.shouldTrade) {
        logger.info(
          `❌ Trade rejected by sophisticated analysis:`,
          sophisticatedResult.finalRecommendation.reasoning,
        );
        return {
          success: false,
          error: `Trade rejected: ${sophisticatedResult.finalRecommendation.reasoning.join("; ")}`,
        };
      }

      // Use sophisticated analysis results
      const finalStopLoss = sophisticatedResult.finalRecommendation.stopLoss;
      const finalTakeProfit = sophisticatedResult.finalRecommendation.takeProfit;
      const sophisticatedPositionSize = sophisticatedResult.finalRecommendation.positionSize;

      logger.info(`🎯 Sophisticated Analysis Results:`, {
        direction,
        stopLoss: finalStopLoss,
        takeProfit: finalTakeProfit,
        positionSize: sophisticatedPositionSize,
        confidence: `${(sophisticatedResult.finalRecommendation.confidence * 100).toFixed(1)}%`,
        riskRewardRatio: `${sophisticatedResult.riskLevels.riskRewardRatio.toFixed(2)}:1`,
        technicalTrend: sophisticatedResult.technicalAnalysis.trend,
        atr: sophisticatedResult.technicalAnalysis.atr.toFixed(2),
      });

      // Execute the trade with sophisticated position sizing
      // Handle undefined bot.maxPositionSize to prevent NaN
      const safeBotMaxPositionSize = bot.maxPositionSize || 1000; // Default to 1000 if undefined
      const tradePositionSize = Math.min(sophisticatedPositionSize, safeBotMaxPositionSize);

      logger.info(
        `🚀 Executing trade: ${direction} ${tradePositionSize} units of ${bot.tradingPairSymbol} (sophisticated: ${sophisticatedPositionSize}, botMax: ${bot.maxPositionSize}, safeMax: ${safeBotMaxPositionSize})`,
      );

      const result = await capitalApi.createPosition(
        epic,
        direction,
        tradePositionSize,
        finalStopLoss,
        finalTakeProfit, // This now correctly maps to profitLevel in the API
      );

      // Log the full API response for debugging
      logger.info(`Capital.com API Response:`, JSON.stringify(result, null, 2));
      console.log("📥 Capital.com API Response:", result);

      if (result.dealStatus === "ACCEPTED") {
        // Create trade record with sophisticated analysis data
        const sophisticatedReasoning = [
          `Sophisticated Analysis: ${sophisticatedResult.finalRecommendation.reasoning.join("; ")}`,
          `Technical: ${sophisticatedResult.technicalAnalysis.trend} trend (ATR: ${sophisticatedResult.technicalAnalysis.atr.toFixed(2)})`,
          `Risk/Reward: ${sophisticatedResult.riskLevels.riskRewardRatio.toFixed(2)}:1`,
          `Position Quality: ${(sophisticatedResult.positionSizing.confidence * 100).toFixed(1)}%`,
          `Original AI: ${analysis.reasoning}`,
        ].join(" | ");

        const trade = await prisma.trade.create({
          data: {
            userId: bot.userId,
            botId,
            symbol: bot.tradingPairSymbol,
            side: direction,
            type: "MARKET",
            size: tradePositionSize,
            entryPrice: analysis.marketPrice?.price,
            stopLoss: finalStopLoss,
            takeProfit: finalTakeProfit,
            status: "FILLED",
            brokerOrderId: result.dealReference,
            brokerTradeId: result.dealId,
            reason: sophisticatedReasoning,
            confidence: sophisticatedResult.finalRecommendation.confidence,
            evaluationId,
            openedAt: new Date(),
          },
        });

        // Debug logging for sophisticated trade analysis
        logger.info(`💰 Sophisticated Trade Record Created:`, {
          tradeId: trade.id,
          direction,
          stopLoss: finalStopLoss,
          takeProfit: finalTakeProfit,
          positionSize: tradePositionSize,
          sophisticatedAnalysis: {
            technicalTrend: sophisticatedResult.technicalAnalysis.trend,
            atr: sophisticatedResult.technicalAnalysis.atr.toFixed(2),
            riskRewardRatio: sophisticatedResult.riskLevels.riskRewardRatio.toFixed(2),
            overallConfidence: `${(sophisticatedResult.finalRecommendation.confidence * 100).toFixed(1)}%`,
            positionConfidence: `${(sophisticatedResult.positionSizing.confidence * 100).toFixed(1)}%`,
          },
          originalAI: {
            stopLoss: analysis.stopLoss,
            takeProfit: analysis.takeProfit,
            confidence: analysis.confidence,
          },
          capitalResponse: {
            hasLimitLevel: result.limitLevel !== undefined,
            limitLevel: result.limitLevel,
          },
        });

        // Enhanced debugging for sophisticated analysis
        console.log(`🧠 SOPHISTICATED TRADE DEBUG:`, {
          sent_stopLoss: finalStopLoss,
          sent_takeProfit: finalTakeProfit,
          sent_positionSize: tradePositionSize,
          capital_response_limitLevel: result.limitLevel,
          technical_analysis: `${sophisticatedResult.technicalAnalysis.trend} (ATR: ${sophisticatedResult.technicalAnalysis.atr.toFixed(2)})`,
          risk_management: `${sophisticatedResult.riskLevels.riskRewardRatio.toFixed(2)}:1 R/R`,
          position_quality: `${(sophisticatedResult.positionSizing.confidence * 100).toFixed(1)}% confidence`,
        });

        // Update bot statistics
        await prisma.bot.update({
          where: { id: botId },
          data: {
            totalTrades: { increment: 1 },
            lastEvaluationAt: new Date(),
          },
        });

        logger.info(`✅ Trade executed successfully: ${trade.id}`);

        return {
          success: true,
          tradeId: trade.id,
          executionDetails: {
            dealReference: result.dealReference,
            dealId: result.dealId,
            direction,
            size: analysis.recommendedPositionSize || bot.maxPositionSize,
            entryPrice: analysis.marketPrice?.price,
          },
        };
      } else {
        // Enhanced error reporting with full response details
        const errorDetails = {
          status: result.dealStatus,
          reason: result.reason,
          fullResponse: result,
        };
        logger.error(`❌ Trade rejected by Capital.com:`, errorDetails);
        throw new Error(
          `Trade execution rejected: Status=${result.dealStatus}, Reason=${result.reason || "None provided"}, Details=${JSON.stringify(result)}`,
        );
      }
    } catch (error) {
      logger.error(`❌ Trade execution failed for bot ${botId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get bot evaluations
   */
  async getBotEvaluations(botId: string, limit: number = 10): Promise<any[]> {
    try {
      const evaluations = await prisma.evaluation.findMany({
        where: { botId },
        orderBy: { createdAt: "desc" },
        take: limit,
        include: {
          trades: {
            select: {
              id: true,
              symbol: true,
              side: true,
              size: true,
              status: true,
              profitLoss: true,
            },
          },
        },
      });

      return evaluations;
    } catch (error) {
      logger.error("Failed to get bot evaluations:", error);
      return [];
    }
  }

  /**
   * Create evaluation (legacy method for backward compatibility)
   */
  async createEvaluation(botId: string, userId: string, chartData: any): Promise<any> {
    logger.info(`Creating evaluation for bot ${botId}`);
    return await this.evaluateBot(botId);
  }

  /**
   * Adjust stop loss and take profit based on timeframe for more appropriate risk management
   */
  private adjustStopLossTakeProfitForTimeframe(
    originalStopLoss: number,
    originalTakeProfit: number,
    currentPrice: number,
    timeframe: string,
    direction: "BUY" | "SELL",
  ): { stopLoss: number; takeProfit: number } {
    if (!currentPrice || currentPrice <= 0) {
      return { stopLoss: originalStopLoss, takeProfit: originalTakeProfit };
    }

    // Timeframe-specific risk percentages (much tighter for shorter timeframes)
    const timeframeRisk: { [key: string]: { stopPercent: number; profitPercent: number } } = {
      M1: { stopPercent: 0.3, profitPercent: 0.5 }, // 1 minute: very tight
      M5: { stopPercent: 0.5, profitPercent: 0.8 }, // 5 minutes: tight
      M15: { stopPercent: 0.8, profitPercent: 1.2 }, // 15 minutes: moderate
      M30: { stopPercent: 1.0, profitPercent: 1.5 }, // 30 minutes: moderate
      H1: { stopPercent: 1.5, profitPercent: 2.0 }, // 1 hour: looser
      H4: { stopPercent: 2.0, profitPercent: 3.0 }, // 4 hours: original
      D1: { stopPercent: 2.0, profitPercent: 3.0 }, // 1 day: original
    };

    const riskConfig = timeframeRisk[timeframe] || timeframeRisk.H4; // Default to H4 if unknown

    let adjustedStopLoss: number;
    let adjustedTakeProfit: number;

    if (direction === "BUY") {
      // For BUY: stop below current price, profit above
      adjustedStopLoss = currentPrice * (1 - riskConfig.stopPercent / 100);
      adjustedTakeProfit = currentPrice * (1 + riskConfig.profitPercent / 100);
    } else {
      // For SELL: stop above current price, profit below
      adjustedStopLoss = currentPrice * (1 + riskConfig.stopPercent / 100);
      adjustedTakeProfit = currentPrice * (1 - riskConfig.profitPercent / 100);
    }

    // Ensure minimum distance for Capital.com (typically around 0.1% for major pairs)
    const minDistance = currentPrice * 0.001; // 0.1% minimum

    if (Math.abs(adjustedStopLoss - currentPrice) < minDistance) {
      adjustedStopLoss =
        direction === "BUY" ? currentPrice - minDistance : currentPrice + minDistance;
    }

    if (Math.abs(adjustedTakeProfit - currentPrice) < minDistance) {
      adjustedTakeProfit =
        direction === "BUY" ? currentPrice + minDistance : currentPrice - minDistance;
    }

    logger.info(
      `📊 Timeframe Risk Adjustment (${timeframe}): Stop ${riskConfig.stopPercent}%, Profit ${riskConfig.profitPercent}%`,
    );

    return {
      stopLoss: adjustedStopLoss,
      takeProfit: adjustedTakeProfit,
    };
  }
}

// Export singleton instance
export const botEvaluationService = new BotEvaluationService();
