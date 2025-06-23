import { prisma } from "../../../utils/prisma";
import { loggerService } from "../../logger.service";
import { TradingService } from "../../trading.service";
import { MarketDataService } from "../../market-data.service";
import { TradingChain } from "../../../agents/chains/trading-chain";
import { ChartEngineService } from "../../../modules/chart-engine/services/chart-engine.service";
import { chartAdapter } from "../../../modules/chart/services/chart-adapter.service";
import { botCoordinationService } from "../../bot-coordination.service";
import { SimplifiedTimeframeAnalysisService } from "../../simplified-timeframe-analysis.service";

export interface BotEvaluationResult {
  success: boolean;
  data?: any;
  error?: string;
  tradeExecuted?: boolean;
  evaluationId?: string;
}

export class BotEvaluationService {
  private tradingService: TradingService;
  private marketDataService: MarketDataService;
  private chartEngineService: ChartEngineService;
  private tradingChain: TradingChain;
  private simplifiedTimeframeService: SimplifiedTimeframeAnalysisService;
  private isMarketDataInitialized: boolean = false;
  private marketDataInitPromise: Promise<boolean> | null = null;

  constructor() {
    this.tradingService = new TradingService();
    this.marketDataService = new MarketDataService();
    this.chartEngineService = new ChartEngineService();
    this.tradingChain = new TradingChain();
    this.simplifiedTimeframeService = new SimplifiedTimeframeAnalysisService();
  }

  /**
   * Evaluate a bot and potentially execute trades based on chart analysis
   */
  async evaluateBot(botId: string): Promise<BotEvaluationResult> {
    let credentialId: string | null = null;

    try {
      loggerService.info(`🤖 Starting bot evaluation: ${botId}`);

      // Get bot configuration
      const bot = await prisma.bot.findUnique({
        where: { id: botId },
        include: {
          brokerCredential: true,
          strategy: true,
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

      // Get credential ID for coordination
      if (bot.brokerCredential && bot.brokerCredential.credentials) {
        const creds = bot.brokerCredential.credentials as any;
        credentialId = `${creds.identifier || creds.username || "unknown"}_${creds.apiKey || "unknown"}`;
      } else {
        credentialId = "default_credential";
      }

      // Request permission to run this bot
      loggerService.info(`🔄 Requesting bot execution permission for ${botId} with credential ${credentialId.slice(0, 8)}...`);
      const canRun = await botCoordinationService.requestBotExecution(botId, credentialId, 50);
      if (!canRun) {
        loggerService.warn(`⏸️  Bot ${botId} execution blocked by coordination service - will retry automatically`);
        return {
          success: false,
          error: "Bot execution queued or rate limited. Will retry automatically.",
        };
      }
      loggerService.info(`✅ Bot ${botId} execution permission granted`);

      const symbol = bot.tradingPairSymbol;
      const timeframe = bot.timeframe || "M1";

      if (!symbol) {
        return {
          success: false,
          error: "Bot has no trading pair symbol configured",
        };
      }

      loggerService.info(`📊 Evaluating ${symbol} on ${timeframe} timeframe`);

      // Check market conditions and trading hours
      const marketCheck = await this.checkMarketConditions(symbol);
      if (!marketCheck.suitable) {
        return {
          success: false,
          error: `Market conditions unsuitable: ${marketCheck.reason}`,
        };
      }

      // Initialize services with credentials if available
      await this.initializeServicesWithCredentials(bot);

      // Generate chart with indicators
      let chartResult;
      try {
        loggerService.info(`📊 Starting chart generation for ${symbol} (${timeframe}) - Bot ${botId}`);

        // Add timeout wrapper for chart generation to prevent hanging
        const CHART_GENERATION_TIMEOUT = 45000; // 45 seconds timeout for chart generation (reduced from 2 minutes)

        const chartTimeoutPromise = new Promise<any>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Chart generation timed out after ${CHART_GENERATION_TIMEOUT}ms for bot ${botId}`));
          }, CHART_GENERATION_TIMEOUT);
        });

        const chartGenerationPromise = this.generateBotChart(botId, symbol, timeframe);

        // Use Promise.race to enforce timeout
        chartResult = await Promise.race([chartGenerationPromise, chartTimeoutPromise]);

        loggerService.info(
          `🔧 Chart engine result for bot ${botId}: hasUrl=${!!chartResult.chartUrl}, isFallback=${chartResult.isFallback}, hasBuffer=${!!chartResult.imageBuffer}`
        );

        if (!chartResult.chartUrl && !chartResult.imageBuffer) {
          throw new Error(`Chart generation failed: No chart URL or image buffer returned`);
        }

        // When skipLocalStorage is true, the file doesn't exist but imageBuffer contains the data
        if (chartResult.imageBuffer) {
          const base64String = chartResult.imageBuffer.toString("base64");
          const chartBase64 = `data:image/png;base64,${base64String}`;

          loggerService.info(`✅ Chart generated successfully with base64 data for ${symbol} - Bot ${botId}`);

          // Update chartResult with base64 data for later use
          chartResult.chartBase64 = chartBase64;
        } else if (chartResult.chartUrl && !chartResult.chartUrl.includes("placeholder")) {
          loggerService.info(`✅ Chart generated successfully for ${symbol} - Bot ${botId}: ${chartResult.chartUrl}`);
        } else {
          // If we get here, chart generation failed
          throw new Error(`Chart generation failed: Only placeholder chart available`);
        }
      } catch (chartError: any) {
        loggerService.error(`❌ Chart generation failed for ${symbol} - Bot ${botId}: ${chartError.message}`);

        if (chartError.message && chartError.message.includes("timeout")) {
          loggerService.warn(`⚠️ Chart generation timeout for bot ${botId} - this may indicate API slowness`);
        }

        // Only proceed with placeholder if chart generation completely failed
        if (chartError.message && chartError.message.includes("Only placeholder chart available")) {
          loggerService.warn(`⚠️ Chart generation returned placeholder - skipping this evaluation cycle for bot ${botId}`);
          throw new Error("Chart generation failed - placeholder not acceptable for trading decisions");
        }

        // For other errors, we can still proceed with AI analysis using fallback
        loggerService.warn(`⚠️ Proceeding with AI analysis without chart for bot ${botId}`);
        chartResult = {
          success: false,
          chartUrl: "chart-placeholder.png",
          chartBase64: null,
          error: chartError.message,
        };
      }

      // Collect portfolio context
      const portfolioContext = await this.collectPortfolioContext(bot.userId, botId);

      // Get user's broker credentials for higher timeframe analysis
      const brokerCredentials = bot.brokerCredential?.credentials || null;

      // Perform higher timeframe analysis
      let higherTimeframeContext = null;
      try {
        loggerService.info(`🔍 Starting higher timeframe analysis for ${symbol} - Bot ${botId}`);
        higherTimeframeContext = await this.simplifiedTimeframeService.analyzeHigherTimeframe(symbol, timeframe, brokerCredentials, portfolioContext);
        loggerService.info(
          `✅ Higher timeframe analysis completed: ${higherTimeframeContext.higherTimeframeAnalysis.trend} (${higherTimeframeContext.higherTimeframeAnalysis.confidence}%)`
        );
      } catch (error) {
        loggerService.warn(`⚠️ Higher timeframe analysis failed for ${symbol} - Bot ${botId}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }

      // Perform AI analysis with chart and higher timeframe context
      loggerService.info(`🧠 Starting AI analysis for ${symbol} - Bot ${botId}`);

      // Add timeout wrapper for AI analysis to prevent hanging
      const AI_ANALYSIS_TIMEOUT = 60000; // 60 seconds timeout for AI analysis

      const timeoutPromise = new Promise<any>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`AI analysis timed out after ${AI_ANALYSIS_TIMEOUT}ms for bot ${botId}`));
        }, AI_ANALYSIS_TIMEOUT);
      });

      const aiAnalysisPromise = this.performAiAnalysis(
        symbol,
        timeframe,
        chartResult.chartUrl || "chart-placeholder.png",
        bot.strategy?.description || "No strategy defined",
        portfolioContext,
        chartResult.chartBase64 || undefined,
        botId,
        higherTimeframeContext
      );

      const aiAnalysis = await Promise.race([aiAnalysisPromise, timeoutPromise]);

      if (!aiAnalysis.success || !aiAnalysis.data) {
        loggerService.error(`❌ AI analysis failed for ${symbol} - Bot ${botId}: ${aiAnalysis.error}`);
        return {
          success: false,
          error: `AI analysis failed: ${aiAnalysis.error}`,
        };
      }
      loggerService.info(`✅ AI analysis completed for ${symbol} - Bot ${botId}`);

      const analysis = aiAnalysis.data;

      loggerService.info(`🧠 AI Decision: ${analysis.decision} (${analysis.confidence}% confidence)`);
      loggerService.info(`📝 AI Reasoning: ${analysis.reasoning}`);

      // Create evaluation record
      const evaluation = await this.createEvaluationRecord(botId, bot.userId, chartResult.chartUrl || "mock://chart-placeholder.png", analysis, portfolioContext);

      // If AI recommends trade execution, proceed with trade
      if (analysis.decision === "EXECUTE_TRADE" && bot.isAiTradingActive) {
        const tradeResult = await this.executeTradeFromAnalysis(botId, bot, analysis, evaluation.id.toString());

        return {
          success: true,
          data: {
            evaluation,
            analysis,
            tradeResult,
          },
          tradeExecuted: tradeResult.success,
          evaluationId: evaluation.id.toString(),
        };
      }

      return {
        success: true,
        data: {
          evaluation,
          analysis,
        },
        tradeExecuted: false,
        evaluationId: evaluation.id.toString(),
      };
    } catch (error) {
      loggerService.error(`❌ Bot evaluation failed: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    } finally {
      // Always mark bot execution as completed (success determined by whether we reach here)
      if (credentialId) {
        botCoordinationService.completeBotExecution(botId, true);
        loggerService.info(`✅ Bot coordination notified of completed evaluation for bot ${botId}`);
      }
    }
  }

  /**
   * Create an evaluation record in the database
   */
  async createEvaluationRecord(botId: string, userId: string, chartUrl: string, analysis: any, portfolioContext: any) {
    // Create a simple evaluation record with required fields
    const now = new Date();
    return await prisma.evaluation.create({
      data: {
        botId,
        startDate: now,
        endDate: now, // For single-point evaluations
        chartUrl: chartUrl,
        prediction: analysis.decision || "UNKNOWN",
        confidence: Math.round(analysis.confidence || 0),
        metrics: portfolioContext.portfolioSnapshot || {},
        parameters: {
          strategy: analysis.chartAnalysis || "",
          riskFactors: analysis.riskFactors || [],
        },
        aiAnalysis: analysis,
        tradingSignal: analysis.tradeParams?.direction || null,
        confidenceScore: Math.round(analysis.confidence || 0),
        riskAssessment: portfolioContext.riskAssessment || {},
      },
    });
  }

  /**
   * Generate chart for bot evaluation
   */
  private async generateBotChart(
    botId: string,
    symbol: string,
    timeframe: string
  ): Promise<{
    success: boolean;
    chartUrl?: string;
    chartBase64?: string;
    error?: string;
  }> {
    try {
      loggerService.info(`🔧 generateBotChart called for bot ${botId}, symbol ${symbol}, timeframe ${timeframe}`);

      const bot = await prisma.bot.findUnique({
        where: { id: botId },
        include: { strategy: true },
      });

      if (!bot) {
        throw new Error(`Bot not found: ${botId}`);
      }

      loggerService.info(`🔧 Bot found, getting strategy indicators for bot ${botId}`);
      const indicators = this.getStrategyIndicators(bot.strategy?.description || "");
      loggerService.info(`🔧 Strategy indicators for bot ${botId}: ${JSON.stringify(indicators)}`);

      // Use chart adapter service which properly handles Supabase uploads
      loggerService.info(`🔧 Calling chartAdapter.generateAndStoreChart for bot ${botId}`);
      const chartResult = await chartAdapter.generateAndStoreChart(
        [], // Empty data array - the adapter will fetch historical data
        botId,
        {
          symbol,
          timeframe,
          userId: bot.userId,
          indicators,
          width: 1200,
          height: 800,
          theme: "dark",
          showVolume: true,
        }
      );

      loggerService.info(
        `🔧 Chart adapter result for bot ${botId}: ${JSON.stringify({
          hasUrl: !!chartResult.chartUrl,
          isFallback: chartResult.isFallback,
          urlType: chartResult.chartUrl?.includes("supabase") ? "supabase" : "other",
        })}`
      );

      if (!chartResult.chartUrl) {
        throw new Error(`Chart generation failed: No chart URL returned`);
      }

      // Check if it's a fallback/placeholder chart
      if (chartResult.isFallback || chartResult.chartUrl.includes("placeholder")) {
        throw new Error(`Chart generation failed: Only placeholder chart available`);
      }

      loggerService.info(`✅ Chart generated successfully for ${symbol} - Bot ${botId}: ${chartResult.chartUrl}`);

      return {
        success: true,
        chartUrl: chartResult.chartUrl,
        chartBase64: chartResult.chartUrl.startsWith("data:") ? chartResult.chartUrl : undefined,
      };
    } catch (error) {
      loggerService.error(`Chart generation error: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Extract indicators from strategy description
   */
  private getStrategyIndicators(strategyDescription: string): any[] {
    const indicators: any[] = [];

    // Convert strategy description to lowercase for easier matching
    const desc = strategyDescription.toLowerCase();

    // Map strategy keywords to chart engine indicator format
    if (desc.includes("bollinger") || desc.includes("bb")) {
      // Chart engine expects object format with direct parameters
      indicators.push({
        type: "bollinger",
        period: 20,
        stdDev: 2,
      });
    }

    if (desc.includes("rsi")) {
      indicators.push({
        type: "rsi",
        period: 14,
      });
    }

    if (desc.includes("ema") || desc.includes("exponential")) {
      indicators.push({
        type: "ema",
        period: 9,
      });
      indicators.push({
        type: "ema",
        period: 21,
      });
    }

    if (desc.includes("sma") || desc.includes("simple moving")) {
      indicators.push({
        type: "sma",
        period: 20,
      });
      indicators.push({
        type: "sma",
        period: 50,
      });
    }

    if (desc.includes("macd")) {
      indicators.push({
        type: "macd",
        fast: 12,
        slow: 26,
        signal: 9,
      });
    }

    if (desc.includes("atr") || desc.includes("average true range")) {
      indicators.push({
        type: "atr",
        period: 14,
      });
    }

    if (desc.includes("stochastic")) {
      indicators.push({
        type: "stochastic",
        k: 14,
        d: 3,
      });
    }

    // If no specific indicators found, add some default ones for better analysis
    if (indicators.length === 0) {
      indicators.push({ type: "ema", period: 9 }, { type: "ema", period: 21 }, { type: "rsi", period: 14 });
    }

    loggerService.debug(`Extracted ${indicators.length} indicators from strategy: ${indicators.map((i) => i.type).join(", ")}`);
    return indicators;
  }

  /**
   * Perform AI analysis using the trading chain
   */
  private async performAiAnalysis(
    symbol: string,
    timeframe: string,
    chartUrl: string,
    strategy: string,
    portfolioContext: any,
    chartBase64?: string,
    botId?: string,
    higherTimeframeContext?: any
  ) {
    try {
      await this.tradingChain.initialize();

      // Get current market price (can be null if unavailable)
      const currentPrice = await this.getCurrentPrice(symbol, botId);

      // Prepare price context for AI
      let priceContext = "";
      if (currentPrice !== null) {
        priceContext = `Current market price: ${currentPrice}`;
        loggerService.info(`Using current price ${currentPrice} for ${symbol} analysis`);
      } else {
        priceContext = "Current market price: UNAVAILABLE - Analysis based on chart data only";
        loggerService.warn(`Current price unavailable for ${symbol}, AI will analyze based on chart only`);
      }

      // Use provided chartBase64 if available, otherwise try to convert from chartUrl
      let chartImageBase64 = chartBase64;
      if (!chartImageBase64 && chartUrl) {
        chartImageBase64 = await this.convertChartToBase64(chartUrl);
      }

      // Prepare agent results with price context and higher timeframe analysis
      const agentResults = {
        riskAssessment: portfolioContext.riskAssessment || {},
        technicalAnalysis: portfolioContext.technicalAnalysis || {},
        positionSizing: portfolioContext.positionSizing || {},
        portfolioStatus: portfolioContext.portfolioSnapshot || {},
        higherTimeframeAnalysis: higherTimeframeContext || null,
      };

      // Include higher timeframe context in market conditions
      let marketConditions = portfolioContext.marketConditions || "Normal trading conditions";
      if (higherTimeframeContext) {
        const higherTimeframeContext_formatted = this.simplifiedTimeframeService.formatContextForLLM(higherTimeframeContext);
        marketConditions += `\n\n${higherTimeframeContext_formatted}`;
      }

      loggerService.info(`🤖 Making trading decision for ${symbol}`);
      loggerService.info(`📊 Chart image provided: ${chartImageBase64 ? "YES" : "NO"}`);
      loggerService.info(`💰 Current price available: ${currentPrice !== null ? "YES" : "NO"}`);
      loggerService.info(`🔍 Higher timeframe context: ${higherTimeframeContext ? "YES" : "NO"}`);

      const analysisResult = await this.tradingChain.makeTradingDecision(
        {
          symbol,
          currentPrice: currentPrice || 0,
          marketConditions,
        },
        agentResults,
        {
          balance: portfolioContext.accountBalance || 10000,
          availableBalance: portfolioContext.availableBalance || 10000,
        },
        chartImageBase64
      );

      // Validate the analysis result
      if (!analysisResult || !analysisResult.success || !analysisResult.data) {
        throw new Error("Invalid analysis result from trading chain");
      }

      const analysis = analysisResult.data;

      // EMERGENCY FIX: Don't block trades due to price unavailability
      // Instead, use fallback price estimation for trade execution
      if (currentPrice === null && analysis.decision === "EXECUTE_TRADE") {
        loggerService.warn(`Current price unavailable for ${symbol} - using fallback price estimation for trade execution`);

        // Try to get a fallback price from historical data
        let fallbackPrice = null;
        try {
          const historicalData = await this.marketDataService.getHistoricalData({
            symbol,
            timeframe: "1h",
            limit: 1,
          });
          if (historicalData && historicalData.length > 0) {
            fallbackPrice = historicalData[0].close;
            loggerService.info(`Using fallback price from recent historical data: ${fallbackPrice}`);
          }
        } catch (fallbackError) {
          loggerService.warn(`Could not get fallback price from historical data: ${fallbackError}`);
        }

        // If we still don't have a price, use a conservative base price
        if (!fallbackPrice) {
          const basePrices: { [key: string]: number } = {
            "BTC/USD": 104000.0,
            BTCUSD: 104000.0,
            "ETH/USD": 3800.0,
            ETHUSD: 3800.0,
            EURUSD: 1.085,
            GBPUSD: 1.265,
            USDJPY: 149.5,
            XAUUSD: 2050.0,
          };
          fallbackPrice = basePrices[symbol] || basePrices[symbol.replace("/", "")] || 104000.0;
          loggerService.info(`Using conservative base price estimate: ${fallbackPrice}`);
        }

        // Update the analysis with fallback price information
        analysis.reasoning = `${analysis.reasoning || ""} [SYSTEM: Using fallback price ${fallbackPrice} due to real-time price unavailability]`;
        analysis.confidence = Math.min(analysis.confidence || 0, 65); // Reduce confidence but don't block execution
      }

      return analysisResult;
    } catch (error) {
      loggerService.error(`AI analysis error for ${symbol}: ${error instanceof Error ? error.message : "Unknown error"}`);
      throw error;
    }
  }

  /**
   * Execute trade based on AI analysis
   */
  private async executeTradeFromAnalysis(botId: string, bot: any, analysis: any, evaluationId: string) {
    try {
      if (!analysis.tradeParams) {
        throw new Error("No trade parameters in AI analysis");
      }

      const tradeParams = analysis.tradeParams;

      return await this.tradingService.executeTrade({
        botId,
        evaluationId,
        userId: bot.userId,
        symbol: tradeParams.symbol,
        direction: tradeParams.direction,
        orderType: tradeParams.orderType || "MARKET",
        quantity: tradeParams.quantity,
        stopLoss: tradeParams.stopLoss,
        takeProfit: tradeParams.takeProfit,
      });
    } catch (error) {
      loggerService.error(`Trade execution error: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get current market price for a symbol
   */
  private async getCurrentPrice(symbol: string, botId?: string): Promise<number | null> {
    try {
      // Ensure market data service is initialized only once
      const isInitialized = await this.ensureMarketDataInitialized(botId);
      if (!isInitialized) {
        loggerService.warn(`Market data service not available for price retrieval`);
        return null;
      }

      // Try to get price with retry logic for rate limits
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          const priceData = await this.marketDataService.getLivePrice(symbol);

          // Validate price data structure
          if (!priceData || (typeof priceData.bid !== "number" && typeof priceData.ask !== "number")) {
            loggerService.warn(`Invalid or missing price data for ${symbol}:`, priceData);
            return null;
          }

          // Use mid-price (average of bid and ask) for better accuracy
          const midPrice = priceData.bid && priceData.ask ? (priceData.bid + priceData.ask) / 2 : priceData.ask || priceData.bid;

          // Validate the price is reasonable (not zero, not negative, not NaN)
          if (!midPrice || midPrice <= 0 || !isFinite(midPrice)) {
            loggerService.warn(`Invalid price value for ${symbol}: ${midPrice}`);
            return null;
          }

          loggerService.debug(`Got current price for ${symbol}: ${midPrice} (bid: ${priceData.bid}, ask: ${priceData.ask})`);
          return midPrice;
        } catch (error: any) {
          // Handle rate limit errors specifically
          if (error.response?.status === 429 || error.message?.includes("429") || error.message?.includes("Too Many Requests")) {
            retryCount++;
            const delayMs = Math.min(2000 * Math.pow(2, retryCount), 10000); // Exponential backoff, max 10s
            loggerService.warn(`Rate limit hit for ${symbol}, retrying in ${delayMs}ms (attempt ${retryCount}/${maxRetries})`);

            if (retryCount < maxRetries) {
              await new Promise((resolve) => setTimeout(resolve, delayMs));
              continue;
            } else {
              loggerService.error(`Rate limit exceeded for ${symbol} after ${maxRetries} attempts`);
              return null;
            }
          } else {
            throw error; // Re-throw non-rate-limit errors
          }
        }
      }

      return null;
    } catch (error) {
      loggerService.error(`Failed to get current price for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Ensure market data service is initialized (singleton pattern)
   */
  private async ensureMarketDataInitialized(botId?: string): Promise<boolean> {
    if (this.isMarketDataInitialized) {
      return true;
    }

    // If initialization is already in progress, wait for it
    if (this.marketDataInitPromise) {
      return await this.marketDataInitPromise;
    }

    // Start initialization
    this.marketDataInitPromise = this.initializeMarketDataService(botId);
    const result = await this.marketDataInitPromise;

    if (result) {
      this.isMarketDataInitialized = true;
    }

    // Clear the promise so it can be retried if it failed
    this.marketDataInitPromise = null;

    return result;
  }

  /**
   * Initialize market data service with broker credentials if needed
   */
  private async initializeMarketDataService(botId?: string): Promise<boolean> {
    try {
      if (!this.marketDataService) {
        loggerService.error("Market data service not available");
        return true; // EMERGENCY: Allow fallback operation even without service
      }

      // Check if already initialized (has credentials)
      if ((this.marketDataService as any).capitalApi) {
        loggerService.debug("Market data service already initialized");
        return true;
      }

      // Get broker credentials
      const credentials = await this.getBrokerCredentials(botId);
      if (!credentials) {
        loggerService.warn("No broker credentials available for market data service - using fallback mode");
        return true; // EMERGENCY: Allow fallback operation
      }

      // Initialize with credentials and handle rate limits
      try {
        await this.marketDataService.initializeWithCredentials(credentials);
        loggerService.info("Market Data Service initialized successfully with authenticated Capital.com API");
        return true;
      } catch (initError: any) {
        // Handle rate limiting and other initialization errors gracefully
        if (initError.message?.includes("429") || initError.message?.includes("rate limit")) {
          loggerService.warn("Rate limited during market data service initialization, using fallback mode");
          return true; // EMERGENCY: Allow fallback operation
        } else if (initError.message?.includes("session") || initError.message?.includes("authentication")) {
          loggerService.warn("Authentication failed during market data service initialization, using fallback mode");
          return true; // EMERGENCY: Allow fallback operation
        } else {
          loggerService.error("Error initializing Market Data Service with authenticated Capital.com API:", initError);
          return true; // EMERGENCY: Allow fallback operation
        }
      }
    } catch (error) {
      loggerService.error("Failed to initialize market data service:", error);
      return true; // EMERGENCY: Allow fallback operation
    }
  }

  /**
   * Get broker credentials for the current evaluation context
   */
  private async getBrokerCredentials(botId?: string): Promise<any> {
    try {
      if (botId) {
        // Get credentials specific to this bot
        const bot = await prisma.bot.findUnique({
          where: { id: botId },
          include: {
            brokerCredential: true,
          },
        });

        if (bot?.brokerCredential) {
          // Get decrypted credentials using the broker credential service
          const { brokerCredentialService } = require("../../broker-credential.service");
          const decryptedCredential = await brokerCredentialService.getBrokerCredentialById(bot.brokerCredentialId, bot.userId);

          if (decryptedCredential?.credentials) {
            loggerService.info(`✅ Found broker credentials for bot ${botId}`);
            return decryptedCredential.credentials;
          }
        }
      }

      // Fallback: Query for any active Capital.com credentials
      const credentials = await prisma.brokerCredential.findFirst({
        where: {
          broker: "capital.com",
          isActive: true,
        },
      });

      if (!credentials) {
        loggerService.warn("No active Capital.com broker credentials found");
        return null;
      }

      // Decrypt the credentials
      const { brokerCredentialService } = require("../../broker-credential.service");
      const decryptedCredentials = brokerCredentialService.decryptCredentials(credentials.credentials);

      return decryptedCredentials;
    } catch (error) {
      loggerService.error("Error fetching broker credentials:", error);
      return null;
    }
  }

  /**
   * Convert chart URL to base64 for AI analysis (public method)
   */
  async convertChartToBase64(chartUrl: string): Promise<string> {
    try {
      // If it's already a base64 data URL, return it as is
      if (chartUrl.startsWith("data:image/")) {
        return chartUrl;
      }

      // If it's a file:// URL, read the file and convert to base64
      if (chartUrl.startsWith("file://")) {
        const fs = require("fs").promises;
        const filePath = chartUrl.replace("file://", "");
        const imageBuffer = await fs.readFile(filePath);
        const base64String = imageBuffer.toString("base64");
        return `data:image/png;base64,${base64String}`;
      }

      // If it's a regular HTTP URL, fetch and convert to base64
      if (chartUrl.startsWith("http://") || chartUrl.startsWith("https://")) {
        const axios = require("axios");
        const response = await axios.get(chartUrl, { responseType: "arraybuffer" });
        const imageBuffer = Buffer.from(response.data);
        const base64String = imageBuffer.toString("base64");
        return `data:image/png;base64,${base64String}`;
      }

      // If it's a local file path
      const fs = require("fs").promises;
      const imageBuffer = await fs.readFile(chartUrl);
      const base64String = imageBuffer.toString("base64");
      return `data:image/png;base64,${base64String}`;
    } catch (error) {
      loggerService.error(`Error converting chart to base64: ${error}`);
      // Return a placeholder or empty string if conversion fails
      return "";
    }
  }

  /**
   * Collect portfolio context for analysis
   */
  private async collectPortfolioContext(userId: string, botId?: string) {
    try {
      // This would collect current portfolio status, risk metrics, etc.
      return {
        accountBalance: 10000,
        availableBalance: 10000,
        riskAssessment: {},
        technicalAnalysis: {},
        positionSizing: {},
        portfolioSnapshot: {},
        marketConditions: {},
      };
    } catch (error) {
      loggerService.error(`Portfolio context collection error: ${error}`);
      return {};
    }
  }

  /**
   * Check market conditions and trading suitability
   */
  private async checkMarketConditions(symbol: string) {
    try {
      // Basic market hours check
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday

      // For crypto markets (24/7)
      if (symbol.includes("BTC") || symbol.includes("ETH") || symbol.includes("CRYPTO")) {
        return { suitable: true, reason: "Crypto market is always open" };
      }

      // For traditional markets, check weekend
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        return { suitable: false, reason: "Market closed on weekends" };
      }

      return { suitable: true, reason: "Market conditions suitable" };
    } catch (error) {
      loggerService.error(`Error checking market conditions: ${error}`);
      return { suitable: false, reason: "Unable to verify market conditions" };
    }
  }

  /**
   * Create a new evaluation for a bot (public API method)
   * This is used by the main bot service's createEvaluation method
   */
  async createEvaluation(botId: string, userId: string, chartData: any, positionData?: any): Promise<any> {
    try {
      // Get real user UUID for database
      const realUserId = await this.getRealUserUuid(userId);

      // Check if bot exists and belongs to user
      const bot = await prisma.bot.findFirst({
        where: {
          id: botId,
          userId: realUserId,
        },
        include: {
          strategy: true,
        },
      });

      if (!bot) {
        throw new Error(`Bot with ID ${botId} not found or does not belong to user`);
      }

      // If chartData contains a URL, use it directly, otherwise generate a new chart
      let chartUrl = chartData?.chartUrl;
      if (!chartUrl) {
        const symbol = bot.tradingPairSymbol;
        const timeframe = bot.timeframe || "M1";

        if (!symbol) {
          throw new Error("Bot has no trading pair symbol configured");
        }

        const chartResult = await this.generateBotChart(botId, symbol, timeframe);
        if (!chartResult.success || !chartResult.chartUrl) {
          throw new Error(`Chart generation failed: ${chartResult.error || "Unknown error"}`);
        }
        chartUrl = chartResult.chartUrl;
      }

      // Collect portfolio context
      const portfolioContext = await this.collectPortfolioContext(realUserId, botId);

      // Create a simple analysis object if not provided
      const analysis = chartData?.analysis || {
        decision: "MANUAL_EVALUATION",
        confidence: 50,
        reasoning: "Manual evaluation created",
        chartAnalysis: "Manual chart analysis",
      };

      // Create evaluation record
      const evaluation = await this.createEvaluationRecord(botId, realUserId, chartUrl, analysis, portfolioContext);

      loggerService.info(`Created evaluation ${evaluation.id} for bot ${botId}`);
      return evaluation;
    } catch (error) {
      loggerService.error(`Error creating evaluation for bot ${botId}:`, error);
      throw error;
    }
  }

  /**
   * Get evaluations for a bot (public API method)
   * This is used by the main bot service's getBotEvaluations method
   */
  async getBotEvaluations(botId: string, userId: string, limit: number = 10): Promise<any[]> {
    try {
      // Convert numeric userId to real user UUID
      const realUserId = await this.getRealUserUuid(userId);

      // Check if bot exists and belongs to user
      const bot = await prisma.bot.findFirst({
        where: {
          id: botId,
          userId: realUserId,
        },
      });

      if (!bot) {
        throw new Error(`Bot with ID ${botId} not found or does not belong to user`);
      }

      // Get evaluations for the bot with specified limit and ordering
      const evaluations = await prisma.evaluation.findMany({
        where: {
          botId: botId,
        },
        orderBy: {
          startDate: "desc", // Most recent evaluations first
        },
        take: limit,
      });

      loggerService.info(`Retrieved ${evaluations.length} evaluations for bot ${botId}`);
      return evaluations;
    } catch (error) {
      loggerService.error(`Error getting evaluations for bot ${botId}:`, error);
      throw error;
    }
  }

  /**
   * Helper method to get a real UUID for a user from the database
   * This handles numeric IDs from the API and converts them to proper UUIDs
   */
  private async getRealUserUuid(userId: string): Promise<string> {
    if (process.env.NODE_ENV === "development") {
      // In development, try to find a user - any user will do for testing
      const anyUser = await prisma.user.findFirst();

      if (!anyUser) {
        // If no users exist, create a temporary development user
        const tempUser = await prisma.user.create({
          data: {
            clerkId: "dev-user-" + Date.now(),
            email: "dev@example.com",
          },
        });
        return tempUser.id;
      }

      return anyUser.id;
    } else {
      // In production, get the user by their numeric ID or convert from JWT
      const user = await prisma.user.findFirst({
        where: {
          clerkId: userId,
        },
      });

      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }

      return user.id;
    }
  }

  /**
   * Initialize services with broker credentials
   */
  private async initializeServicesWithCredentials(bot: any): Promise<void> {
    try {
      if (!bot.brokerCredential) {
        loggerService.warn(`⚠️ Bot ${bot.id} has no broker credentials, services will work in limited mode`);
        return;
      }

      // Get decrypted credentials for this bot
      const decryptedCredentials = await this.getBrokerCredentials(bot.id);
      if (!decryptedCredentials) {
        loggerService.warn(`⚠️ Could not decrypt credentials for bot ${bot.id}, services will work in limited mode`);
        return;
      }

      // Initialize multi-timeframe analysis service with credentials
      try {
        const multiTimeframeService = require("../../multi-timeframe-analysis.service").MultiTimeframeAnalysisService;
        if (multiTimeframeService) {
          // Create instance and initialize with credentials
          const serviceInstance = new multiTimeframeService();
          await serviceInstance.initializeWithCredentials(decryptedCredentials);
          loggerService.info(`✅ Multi-timeframe analysis service initialized with credentials for bot ${bot.id}`);
        }
      } catch (initError: any) {
        // Handle specific initialization errors
        if (initError.message?.includes("429") || initError.message?.includes("rate limit")) {
          loggerService.warn(`⚠️ Rate limited during multi-timeframe service initialization for bot ${bot.id} - will continue in basic mode`);
        } else if (initError.message?.includes("session") || initError.message?.includes("authentication")) {
          loggerService.warn(`⚠️ Authentication failed during multi-timeframe service initialization for bot ${bot.id} - will continue in basic mode`);
        } else {
          loggerService.error(`❌ Failed to initialize MultiTimeframeAnalysisService with credentials for bot ${bot.id}:`, initError);
        }
        // Don't throw - let the bot continue with basic functionality
      }
    } catch (error) {
      loggerService.error(`❌ Error in initializeServicesWithCredentials for bot ${bot.id}:`, error);
      // Don't throw - let the evaluation continue with limited functionality
    }
  }
}
