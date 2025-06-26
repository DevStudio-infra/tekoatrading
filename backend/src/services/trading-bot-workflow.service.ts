/**
 * Trading Bot Workflow Service
 * Orchestrates the entire trading bot evaluation and execution process
 */

import { logger } from "../logger";
import { prisma } from "../prisma";
import { TradingDecisionAgent } from "../ai/trading-decision-agent";
import { EnhancedTradingDecisionAgent } from "../ai/enhanced-trading-decision-agent";

export interface BotWorkflowResult {
  success: boolean;
  botId: string;
  decision?: any;
  tradeExecuted?: boolean;
  error?: string;
  evaluationId?: string;
}

export interface MarketData {
  symbol: string;
  price: number;
  volume: number;
  high24h: number;
  low24h: number;
  change24h: number;
}

export interface AccountData {
  balance: number;
  openPositions: any[];
  riskTolerance: "conservative" | "moderate" | "aggressive";
}

export class TradingBotWorkflowService {
  private tradingAgent: TradingDecisionAgent;
  private enhancedAgent: EnhancedTradingDecisionAgent;

  constructor() {
    this.tradingAgent = new TradingDecisionAgent();
    this.enhancedAgent = new EnhancedTradingDecisionAgent();
  }

  /**
   * Main bot evaluation workflow
   */
  async evaluateBot(botId: string): Promise<BotWorkflowResult> {
    try {
      logger.info(`🤖 Starting bot evaluation workflow for: ${botId}`);

      // 1. Get bot configuration
      const bot = await this.getBotConfig(botId);
      if (!bot) {
        throw new Error(`Bot not found: ${botId}`);
      }

      if (!bot.isActive) {
        logger.info(`Bot ${botId} is not active, skipping evaluation`);
        return { success: true, botId, decision: { action: "hold", reasoning: "Bot not active" } };
      }

      // 2. Gather market data using bot's credentials
      const marketData = await this.gatherMarketData(bot.tradingPairSymbol, botId);

      // 3. Gather account context
      const accountData = await this.gatherAccountData(bot.userId, botId);

      // 4. Perform AI analysis
      const decision = await this.performAIAnalysis({
        symbol: bot.tradingPairSymbol,
        timeframe: bot.timeframe || "1H",
        strategy: bot.strategy?.name || "default",
        marketData,
        accountData,
      });

      // 5. Create evaluation record
      const evaluationId = await this.createEvaluationRecord(
        botId,
        decision,
        marketData,
        accountData,
      );

      // 6. Execute trade if recommended and AI trading is active
      let tradeExecuted = false;
      if (bot.isAiTradingActive && this.shouldExecuteTrade(decision)) {
        tradeExecuted = await this.executeTrade(botId, decision, evaluationId);
      }

      logger.info(
        `✅ Bot evaluation completed: ${botId} - Decision: ${decision.action} - Trade executed: ${tradeExecuted}`,
      );

      return {
        success: true,
        botId,
        decision,
        tradeExecuted,
        evaluationId,
      };
    } catch (error) {
      logger.error(`❌ Bot evaluation workflow failed for ${botId}:`, error);
      return {
        success: false,
        botId,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get bot configuration from database
   */
  private async getBotConfig(botId: string) {
    return await prisma.bot.findUnique({
      where: { id: botId },
      include: {
        strategy: true,
        brokerCredential: true,
        user: true,
      },
    });
  }

  /**
   * Gather market data for the trading symbol using bot's broker credentials
   */
  private async gatherMarketData(symbol: string, botId: string): Promise<MarketData> {
    try {
      logger.info(`Fetching real market data for ${symbol} using bot ${botId} credentials`);

      // Get bot configuration with broker credentials
      const bot = await prisma.bot.findUnique({
        where: { id: botId },
        include: { brokerCredential: true },
      });

      if (!bot?.brokerCredential) {
        const error = `❌ BROKER CREDENTIALS MISSING: Bot ${botId} has no broker credentials configured. Please configure broker credentials for this bot.`;
        logger.error(error);
        throw new Error(error);
      }

      // Parse the encrypted credentials
      let credentialsData;
      try {
        credentialsData = JSON.parse(bot.brokerCredential.credentials);
      } catch (error) {
        const errorMsg = `❌ CREDENTIAL PARSING FAILED: Bot ${botId} broker credentials are corrupted. Please re-configure broker credentials.`;
        logger.error(errorMsg, error);
        throw new Error(errorMsg);
      }

      // Validate required credentials for Capital.com
      if (!credentialsData.apiKey || !credentialsData.identifier || !credentialsData.password) {
        const errorMsg = `❌ INCOMPLETE CREDENTIALS: Bot ${botId} broker credentials are missing required fields (apiKey, identifier, or password).`;
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

      // Get current market data
      const latestPrice = await capitalApi.getLatestPrice(epic);
      const marketData = await capitalApi.getMarketData(epic);

      // Get historical data for volume and 24h stats
      const to = new Date().toISOString();
      const from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 24 hours ago

      const historicalPrices = await capitalApi.getHistoricalPrices(epic, "HOUR", from, to);

      let high24h = latestPrice.bid;
      let low24h = latestPrice.bid;
      let volume = 0;
      let openPrice = latestPrice.bid;

      if (historicalPrices.length > 0) {
        openPrice = (historicalPrices[0].openPrice.bid + historicalPrices[0].openPrice.ask) / 2;

        historicalPrices.forEach((price) => {
          const high = (price.highPrice.bid + price.highPrice.ask) / 2;
          const low = (price.lowPrice.bid + price.lowPrice.ask) / 2;
          high24h = Math.max(high24h, high);
          low24h = Math.min(low24h, low);
          volume += price.lastTradedVolume || 0;
        });
      }

      const currentPrice = (latestPrice.bid + latestPrice.ask) / 2;
      const change24h = openPrice > 0 ? ((currentPrice - openPrice) / openPrice) * 100 : 0;

      const realMarketData = {
        symbol,
        price: currentPrice,
        volume,
        high24h,
        low24h,
        change24h,
      };

      logger.info(`Real market data fetched for ${symbol}: ${JSON.stringify(realMarketData)}`);
      return realMarketData;
    } catch (error) {
      logger.error(`❌ MARKET DATA FETCH FAILED for ${symbol}:`, error);
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
   * Gather account data and portfolio context using bot's broker credentials
   */
  private async gatherAccountData(userId: string, botId: string): Promise<AccountData> {
    try {
      logger.info(`Fetching real account data for user ${userId}`);

      // Get bot configuration to access broker credentials
      const bot = await prisma.bot.findUnique({
        where: { id: botId },
        include: { brokerCredential: true },
      });

      if (!bot?.brokerCredential) {
        const error = `❌ BROKER CREDENTIALS MISSING: Bot ${botId} has no broker credentials configured for account data access.`;
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
        const errorMsg = `❌ INCOMPLETE CREDENTIALS: Bot ${botId} broker credentials are missing required fields for account access.`;
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

      // Get real account details
      const accountDetails = await capitalApi.getAccountDetails();
      const realBalance = accountDetails.balance;

      if (!realBalance || realBalance <= 0) {
        const error = `❌ INVALID ACCOUNT BALANCE: Account balance is ${realBalance}. Check broker account status.`;
        logger.error(error);
        throw new Error(error);
      }

      logger.info(`Real account balance fetched: ${realBalance}`);

      // Get current open trades
      const openTrades = await prisma.trade.findMany({
        where: {
          userId,
          status: "OPEN",
        },
        take: 20,
      });

      return {
        balance: realBalance,
        openPositions: openTrades.map((trade) => ({
          id: trade.id,
          symbol: trade.symbol,
          direction: trade.side, // Use 'side' field from database
          quantity: trade.size, // Use 'size' field from database
          entryPrice: trade.entryPrice || 0,
          currentPrice: trade.exitPrice || trade.entryPrice || 0, // Use exitPrice or entryPrice
          unrealizedPnL: trade.profitLoss || 0,
        })),
        riskTolerance: "moderate",
      };
    } catch (error) {
      logger.error(`❌ ACCOUNT DATA FETCH FAILED for ${userId}:`, error);
      throw error; // Re-throw instead of fallback
    }
  }

  /**
   * Perform AI analysis using the enhanced trading agent
   */
  private async performAIAnalysis(context: {
    symbol: string;
    timeframe: string;
    strategy: string;
    marketData: MarketData;
    accountData: AccountData;
  }) {
    try {
      // Use the enhanced trading decision agent with analyze method
      const decision = await this.enhancedAgent.analyze({
        symbol: context.symbol,
        timeframe: context.timeframe,
        strategy: context.strategy,
        marketData: context.marketData,
        riskData: {
          portfolioBalance: context.accountData.balance,
          currentPositions: context.accountData.openPositions.length,
          symbol: context.symbol,
          proposedTradeSize: 100,
          marketVolatility: 10,
        },
        accountBalance: context.accountData.balance,
        openPositions: context.accountData.openPositions,
      });
      return decision;
    } catch (error) {
      const errorMsg = `❌ AI ANALYSIS FAILED: Trading decision agent failed for ${context.symbol}. ${error instanceof Error ? error.message : "Unknown error"}`;
      logger.error(errorMsg);
      throw new Error(errorMsg);
    }
  }

  /**
   * Create evaluation record in database
   */
  private async createEvaluationRecord(
    botId: string,
    decision: any,
    marketData: MarketData,
    accountData: AccountData,
  ): Promise<string> {
    const evaluation = await prisma.evaluation.create({
      data: {
        botId,
        userId: (await prisma.bot.findUnique({ where: { id: botId } }))?.userId || "",
        symbol: marketData.symbol,
        timeframe: "1H", // Default timeframe
        decision: decision.action || decision.decision,
        confidence: decision.confidence || 0.5,
        reasoning: Array.isArray(decision.reasoning)
          ? decision.reasoning.join("; ")
          : decision.reasoning,
        portfolioData: JSON.stringify({
          balance: accountData.balance,
          openPositions: accountData.openPositions.length,
        }),
        marketPrice: marketData.price,
        createdAt: new Date(),
      },
    });

    return evaluation.id;
  }

  /**
   * Determine if trade should be executed
   */
  private shouldExecuteTrade(decision: any): boolean {
    const action = decision.action || decision.decision;
    const confidence = decision.confidence || 0;

    return (
      (action === "buy" || action === "sell" || action === "BUY" || action === "SELL") &&
      confidence > 0.6 // Only execute if confidence is above 60%
    );
  }

  /**
   * Execute trade based on AI decision
   */
  private async executeTrade(botId: string, decision: any, evaluationId: string): Promise<boolean> {
    try {
      logger.info(
        `📊 Executing trade for bot ${botId}: ${decision.action} with confidence ${decision.confidence}`,
      );

      // Get bot configuration to get user ID
      const bot = await prisma.bot.findUnique({
        where: { id: botId },
        select: { userId: true, tradingPairSymbol: true },
      });

      if (!bot) {
        throw new Error(`Bot not found: ${botId}`);
      }

      // Create a trade record in the database
      const trade = await prisma.trade.create({
        data: {
          botId,
          evaluationId,
          userId: bot.userId, // Use real user ID from bot config
          symbol: decision.symbol || bot.tradingPairSymbol || "EURUSD",
          side: decision.action === "buy" || decision.action === "BUY" ? "BUY" : "SELL", // Use 'side' field
          type: "MARKET", // Use 'type' field instead of 'orderType'
          size: decision.quantity || decision.suggestedPosition || 100, // Use 'size' field
          status: "PENDING",
          confidence: Math.round((decision.confidence || 0.5) * 100), // Use 'confidence' field
          reason: Array.isArray(decision.reasoning)
            ? decision.reasoning.join("; ")
            : decision.reasoning, // Use 'reason' field
          createdAt: new Date(),
        },
      });

      logger.info(`✅ Trade created: ${trade.id}`);

      // TODO: Integrate with actual broker API for real trade execution
      // This would involve calling the Capital.com API to place the actual order

      return true;
    } catch (error) {
      logger.error(`❌ Trade execution failed for bot ${botId}:`, error);
      return false;
    }
  }
}

export const tradingBotWorkflowService = new TradingBotWorkflowService();
