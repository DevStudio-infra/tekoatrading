import { prisma } from "../prisma";
import { logger } from "../logger";
import { TechnicalAnalysisAgent } from "../ai/technical-analysis-agent";
import { RiskAssessmentAgent } from "../ai/risk-assessment-agent";
import { TradingDecisionAgent } from "../ai/trading-decision-agent";
import { marketDataService } from "./market-data.service";
import { CapitalMainService } from "../modules/capital/services/capital-main.service";

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
   * Evaluate a bot and potentially execute trades based on AI analysis
   */
  async evaluateBot(botId: string): Promise<BotEvaluationResult> {
    try {
      logger.info(`🤖 Starting sophisticated bot evaluation: ${botId}`);

      // Get bot configuration with all relationships
      const bot = await prisma.bot.findUnique({
        where: { id: botId },
        include: {
          brokerCredential: true,
          strategy: true,
          user: true,
        },
      });

      if (!bot) {
        throw new Error(`Bot not found: ${botId}`);
      }

      if (!bot.isActive) {
        return {
          success: false,
          error: "Bot is not active",
        };
      }

      const symbol = bot.tradingPairSymbol;
      const timeframe = bot.timeframe || "M1";

      if (!symbol) {
        return {
          success: false,
          error: "Bot has no trading pair symbol configured",
        };
      }

      // Initialize market data service with broker credentials if available
      if (bot.brokerCredential && bot.brokerCredential.credentials) {
        const credentials = bot.brokerCredential.credentials as any;
        await marketDataService.initializeWithCredentials({
          apiKey: credentials.apiKey,
          identifier: credentials.identifier,
          password: credentials.password,
          isDemo: bot.brokerCredential.isDemo,
        });
      }

      // Generate chart for analysis
      const chartResult = await this.generateBotChart(botId, symbol, timeframe);
      if (!chartResult.success) {
        throw new Error(`Chart generation failed: ${chartResult.error}`);
      }

      // Collect portfolio context
      const portfolioContext = await this.collectPortfolioContext(bot.userId, botId);

      // Get current market data
      const marketPrice = await marketDataService.getLivePrice(symbol);

      // Perform AI analysis with multiple agents
      const analysisResult = await this.performAIAnalysis(
        symbol,
        timeframe,
        chartResult.chartUrl || "",
        portfolioContext,
        marketPrice,
      );

      if (!analysisResult.success) {
        throw new Error(`AI analysis failed: ${analysisResult.error}`);
      }

      logger.info(
        `🧠 AI Decision: ${analysisResult.data.decision} (${analysisResult.data.confidence}% confidence)`,
      );
      logger.info(`📝 AI Reasoning: ${analysisResult.data.reasoning}`);

      // Create evaluation record
      const evaluation = await this.createEvaluationRecord(
        botId,
        bot.userId,
        chartResult.chartUrl || "",
        analysisResult.data,
        portfolioContext,
      );

      // If AI recommends trade execution and bot has AI trading enabled, execute trade
      if (analysisResult.data.decision === "EXECUTE_TRADE" && bot.isAiTradingActive) {
        const tradeResult = await this.executeTradeFromAnalysis(
          botId,
          bot,
          analysisResult.data,
          evaluation.id,
        );

        return {
          success: true,
          data: {
            evaluation,
            analysis: analysisResult.data,
            tradeResult,
          },
          tradeExecuted: tradeResult.success,
          evaluationId: evaluation.id,
        };
      }

      return {
        success: true,
        data: {
          evaluation,
          analysis: analysisResult.data,
        },
        tradeExecuted: false,
        evaluationId: evaluation.id,
      };
    } catch (error) {
      logger.error(`❌ Bot evaluation failed: ${error}`);
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
      // Call chart engine to generate chart
      const chartEngineUrl = process.env.CHART_ENGINE_URL || "http://localhost:8001";
      const response = await fetch(`${chartEngineUrl}/generate-chart`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          symbol,
          timeframe,
          indicators: ["sma_20", "sma_50", "rsi", "macd", "bollinger"],
          chart_type: "candlestick",
        }),
      });

      if (response.ok) {
        const result = await response.json();
        return {
          success: true,
          chartUrl: result.chart_url || result.filename,
        };
      } else {
        throw new Error(`Chart engine returned ${response.status}`);
      }
    } catch (error) {
      logger.error(`Chart generation failed for ${symbol}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Collect portfolio context for AI analysis
   */
  private async collectPortfolioContext(userId: string, botId: string): Promise<any> {
    try {
      // Get user's portfolio
      const portfolio = await prisma.portfolio.findFirst({
        where: { userId },
      });

      // Get bot's recent trades
      const recentTrades = await prisma.trade.findMany({
        where: { botId },
        orderBy: { createdAt: "desc" },
        take: 10,
      });

      // Get bot's current positions
      const positions = await prisma.position.findMany({
        where: { botId },
      });

      // Calculate portfolio metrics
      const totalPnL = recentTrades.reduce((sum, trade) => sum + (trade.profitLoss || 0), 0);
      const winRate =
        recentTrades.length > 0
          ? (recentTrades.filter((trade) => (trade.profitLoss || 0) > 0).length /
              recentTrades.length) *
            100
          : 0;

      return {
        portfolio: {
          balance: portfolio?.balance || 0,
          currency: portfolio?.currency || "USD",
          totalValue: portfolio?.totalValue || 0,
          totalPnL: portfolio?.totalPnL || 0,
        },
        botMetrics: {
          totalTrades: recentTrades.length,
          totalPnL,
          winRate,
          activePositions: positions.length,
        },
        recentTrades: recentTrades.slice(0, 5),
        currentPositions: positions,
      };
    } catch (error) {
      logger.error("Error collecting portfolio context:", error);
      return {
        portfolio: { balance: 0, currency: "USD" },
        botMetrics: { totalTrades: 0, totalPnL: 0, winRate: 0 },
        recentTrades: [],
        currentPositions: [],
      };
    }
  }

  /**
   * Perform sophisticated AI analysis using multiple agents
   */
  private async performAIAnalysis(
    symbol: string,
    timeframe: string,
    chartUrl: string,
    portfolioContext: any,
    marketPrice: any,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
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
          decision: tradingDecision.decision,
          confidence: tradingDecision.confidence,
          reasoning: tradingDecision.reasoning,
          technicalAnalysis,
          riskAssessment,
          recommendedPositionSize: riskAssessment.recommendedPositionSize,
          stopLoss: riskAssessment.stopLoss,
          takeProfit: riskAssessment.takeProfit,
          riskScore: riskAssessment.riskScore,
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

      const credentials = bot.brokerCredential.credentials as any;

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
        orderBy: { startDate: "desc" },
        take: limit,
        include: {
          trades: true,
        },
      });

      return evaluations;
    } catch (error) {
      logger.error(`Error getting evaluations for bot ${botId}:`, error);
      throw error;
    }
  }

  /**
   * Create manual evaluation
   */
  async createEvaluation(botId: string, userId: string, chartData: any): Promise<any> {
    try {
      const bot = await prisma.bot.findFirst({
        where: { id: botId, userId },
        include: { strategy: true },
      });

      if (!bot) {
        throw new Error(`Bot with ID ${botId} not found or does not belong to user`);
      }

      const portfolioContext = await this.collectPortfolioContext(userId, botId);

      const analysis = chartData?.analysis || {
        decision: "MANUAL_EVALUATION",
        confidence: 50,
        reasoning: "Manual evaluation created",
        chartAnalysis: "Manual chart analysis",
      };

      const evaluation = await this.createEvaluationRecord(
        botId,
        userId,
        chartData?.chartUrl || "",
        analysis,
        portfolioContext,
      );

      return evaluation;
    } catch (error) {
      logger.error(`Error creating evaluation for bot ${botId}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const botEvaluationService = new BotEvaluationService();
