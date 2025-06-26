import { prisma } from "../prisma";
import { logger } from "../logger";
import { CapitalMainService } from "../modules/capital";
import { TechnicalAnalysisAgent, RiskAssessmentAgent, TradingDecisionAgent } from "../agents";
import { EnhancedTradingDecisionAgent } from "../ai/enhanced-trading-decision-agent";
import { credentialsEncryption } from "./credentials-encryption.service";
import { supabaseStorageService } from "./supabase-storage.service";
import { ChartService } from "../modules/chart";

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
  private technicalAnalysisAgent: TechnicalAnalysisAgent;
  private riskAssessmentAgent: RiskAssessmentAgent;
  private tradingDecisionAgent: TradingDecisionAgent;

  constructor() {
    this.technicalAnalysisAgent = new TechnicalAnalysisAgent();
    this.riskAssessmentAgent = new RiskAssessmentAgent();
    this.tradingDecisionAgent = new TradingDecisionAgent();
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

      // Step 1: Generate chart
      const chartResult = await this.generateBotChart(botId, bot.tradingPairSymbol, bot.timeframe);

      if (!chartResult.success) {
        throw new Error(`Chart generation failed: ${chartResult.error}`);
      }

      // Step 2: Collect portfolio context
      const portfolioContext = await this.collectPortfolioContext(bot.userId, botId);

      // Step 3: Perform AI analysis
      const analysisResult = await this.performAIAnalysis(
        bot.tradingPairSymbol,
        bot.timeframe,
        chartResult.chartUrl!,
        portfolioContext,
        await this.getRealMarketPrice(bot.tradingPairSymbol, botId), // Real market price
      );

      if (!analysisResult.success) {
        throw new Error(`AI analysis failed: ${analysisResult.error}`);
      }

      // Step 4: Create evaluation record
      const evaluation = await this.createEvaluationRecord(
        botId,
        bot.userId,
        chartResult.chartUrl!,
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
        tradeResult = await this.executeTradeFromAnalysis(
          botId,
          bot,
          analysisResult.data,
          evaluation.id,
        );
        tradeExecuted = tradeResult.success;
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
  ): Promise<{
    success: boolean;
    chartUrl?: string;
    error?: string;
  }> {
    try {
      logger.info(`📊 Generating chart for ${symbol} (${timeframe})`);

      const chartService = new ChartService();
      const chartResult = await chartService.generateChart({
        symbol,
        timeframe,
        width: 1200,
        height: 800,
        theme: "dark",
        indicators: ["SMA", "EMA", "RSI"],
        botId, // Pass botId to use user's broker credentials
      });

      if (!chartResult.success || !chartResult.data) {
        throw new Error("Chart generation failed");
      }

      // Upload chart to Supabase storage
      const fileName = `${symbol}-${timeframe}-${Date.now()}.png`;
      const chartUrl = await supabaseStorageService.uploadBase64Image(
        chartResult.data,
        fileName,
        botId,
      );

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

      // Parse the encrypted credentials
      let credentialsData;
      try {
        credentialsData = JSON.parse(bot.brokerCredential.credentials);
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

      // Import Capital API service
      const { getCapitalApiInstance } = await import("../modules/capital");
      const capitalApi = getCapitalApiInstance(config);
      await capitalApi.authenticate();

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
   * Convert symbol to Capital.com epic format
   */
  private convertSymbolToEpic(symbol: string): string {
    const symbolMappings: { [key: string]: string } = {
      BTCUSD: "BITCOIN",
      ETHUSD: "ETHEREUM",
      EURUSD: "EURUSD",
      GBPUSD: "GBPUSD",
      USDJPY: "USDJPY",
      AUDUSD: "AUDUSD",
      USDCAD: "USDCAD",
      USDCHF: "USDCHF",
      NZDUSD: "NZDUSD",
      EURGBP: "EURGBP",
      EURJPY: "EURJPY",
      GBPJPY: "GBPJPY",
    };

    return symbolMappings[symbol.toUpperCase()] || symbol;
  }

  /**
   * Perform AI analysis using multiple agents
   */
  private async performAIAnalysis(
    symbol: string,
    timeframe: string,
    chartUrl: string,
    portfolioContext: any,
    marketPrice: any,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      logger.info(`🧠 Performing AI analysis for ${symbol}`);

      // Technical Analysis
      const technicalAnalysis = await this.technicalAnalysisAgent.analyze({
        symbol,
        timeframe,
        chartUrl,
        marketPrice,
      });

      // Risk Assessment
      const riskAssessment = await this.riskAssessmentAgent.analyze({
        symbol,
        portfolioContext,
        marketPrice,
        technicalAnalysis,
      });

      // Trading Decision
      const tradingDecision = await this.tradingDecisionAgent.analyze({
        symbol,
        technicalAnalysis,
        riskAssessment,
        portfolioContext,
        marketPrice,
      });

      return {
        success: true,
        data: {
          decision: (tradingDecision as any).decision,
          confidence: tradingDecision.confidence,
          reasoning: tradingDecision.reasoning,
          technicalAnalysis,
          riskAssessment,
          recommendedPositionSize: (riskAssessment as any).recommendedPositionSize,
          stopLoss: (riskAssessment as any).stopLoss,
          takeProfit: (riskAssessment as any).takeProfit,
          riskScore: (riskAssessment as any).riskScore,
        },
      };
    } catch (error) {
      logger.error("AI analysis failed:", error);
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
          symbol: analysis.symbol || "UNKNOWN",
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
          aiResponse: analysis,
          portfolioData: portfolioContext,
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
   * Execute trade based on AI analysis
   */
  private async executeTradeFromAnalysis(
    botId: string,
    bot: any,
    analysis: any,
    evaluationId: string,
  ): Promise<TradeExecutionResult> {
    try {
      logger.info(`🔄 Executing trade for bot ${botId} based on AI analysis`);

      if (!bot.brokerCredential || !bot.brokerCredential.credentials) {
        throw new Error("No broker credentials configured for bot");
      }

      const credentials = credentialsEncryption.decryptCredentials(
        bot.brokerCredential.credentials,
      );

      // Initialize Capital.com API
      const capitalApi = new CapitalMainService({
        apiKey: credentials.apiKey,
        identifier: credentials.identifier,
        password: credentials.password,
        isDemo: bot.brokerCredential.isDemo,
        instanceId: `bot-${botId}`,
      });

      await capitalApi.authenticate();

      // Get epic for symbol
      const epic = await capitalApi.getEpicForSymbol(bot.tradingPairSymbol);
      if (!epic) {
        throw new Error(`Could not find epic for symbol: ${bot.tradingPairSymbol}`);
      }

      // Determine trade direction
      const direction =
        analysis.decision === "BUY" || analysis.decision === "EXECUTE_TRADE" ? "BUY" : "SELL";

      // Execute the trade
      const result = await capitalApi.createPosition(
        epic,
        direction,
        analysis.recommendedPositionSize || bot.maxPositionSize,
        analysis.stopLoss,
        analysis.takeProfit,
      );

      if (result.dealStatus === "ACCEPTED") {
        // Create trade record
        const trade = await prisma.trade.create({
          data: {
            userId: bot.userId,
            botId,
            symbol: bot.tradingPairSymbol,
            side: direction,
            type: "MARKET",
            size: analysis.recommendedPositionSize || bot.maxPositionSize,
            entryPrice: analysis.marketPrice?.price,
            stopLoss: analysis.stopLoss,
            takeProfit: analysis.takeProfit,
            status: "FILLED",
            brokerOrderId: result.dealReference,
            brokerTradeId: result.dealId,
            reason: analysis.reasoning,
            confidence: analysis.confidence,
            evaluationId,
            openedAt: new Date(),
          },
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
        throw new Error(`Trade execution rejected: ${result.reason || "Unknown reason"}`);
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
}

// Export singleton instance
export const botEvaluationService = new BotEvaluationService();
