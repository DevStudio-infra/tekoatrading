import { BaseAgent } from "../../ai/base-agent";
import { logger } from "../../logger";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface PositionAwarenessParams {
  botId: string;
  userId: string;
  symbol: string;
  direction: "BUY" | "SELL";
  proposedPositionSize: number;
  accountBalance: number;
  timeframe: string;
  botConfig: {
    maxOpenTrades?: number;
    maxRiskPercentage?: number;
    minRiskPercentage?: number;
    name: string;
  };
  strategyConfig?: {
    confidenceThreshold?: number;
    riskManagement?: any;
    parameters?: any;
  };
  capitalApi: any;
  accountInfo?: any;
}

export interface PositionAwarenessResult {
  canTrade: boolean;
  reasoning: string[];
  recommendations: string[];
  currentPositions: any[];
  accountInfo: any;
  riskMetrics: {
    totalOpenPositions: number;
    symbolExposure: number;
    portfolioExposure: number;
    maxPositionLimit: number;
    timeSinceLastTrade: number;
    realAccountBalance: number;
    totalPortfolioValue: number;
  };
}

export class PositionAwarenessAgent extends BaseAgent {
  constructor() {
    super("PositionAwarenessAgent");
  }

  async analyze(data: any): Promise<any> {
    return this.checkPositionLimits(data);
  }

  async checkPositionLimits(params: PositionAwarenessParams): Promise<PositionAwarenessResult> {
    try {
      logger.info(
        `[POSITION-AWARENESS] Checking position limits for ${params.symbol} ${params.direction} (Bot: ${params.botConfig.name})`,
      );

      // Get real-time account information from Capital.com API
      const realTimeAccountInfo = await this.getRealTimeAccountInfo(params.capitalApi);

      // Update params with real account info
      if (realTimeAccountInfo) {
        params.accountInfo = realTimeAccountInfo;
        // Use real account balance instead of fallback
        params.accountBalance = realTimeAccountInfo.balance.balance;
        logger.info(
          `[POSITION-AWARENESS] Using real-time account balance: ${params.accountBalance} ${realTimeAccountInfo.currency}`,
        );
      }

      // Get current open positions from Capital.com API (real-time)
      const openPositions = await this.getOpenPositions(params.capitalApi, params.botId);

      // Get symbol-specific positions
      const symbolPositions = openPositions.filter((p) => p.symbol === params.symbol);

      // Calculate risk metrics with real-time data
      const riskMetrics = this.calculateRiskMetrics(openPositions, params);

      // Perform trading checks with real data
      const checks = await this.performTradingChecks(
        params,
        openPositions,
        symbolPositions,
        riskMetrics,
      );

      logger.info(
        `[POSITION-AWARENESS] Analysis complete: ${checks.canTrade ? "✅ TRADE ALLOWED" : "❌ TRADE BLOCKED"} - Real-time positions: ${riskMetrics.totalOpenPositions}, Real balance: $${riskMetrics.realAccountBalance}`,
      );

      return {
        canTrade: checks.canTrade,
        reasoning: checks.reasoning,
        recommendations: checks.recommendations,
        currentPositions: openPositions,
        accountInfo: realTimeAccountInfo,
        riskMetrics,
      };
    } catch (error) {
      logger.error(`[POSITION-AWARENESS] Error checking position limits:`, error);
      return {
        canTrade: false,
        reasoning: ["Error checking position limits - defaulting to no trade for safety"],
        recommendations: ["Fix position checking system"],
        currentPositions: [],
        accountInfo: params.accountInfo,
        riskMetrics: {
          totalOpenPositions: 0,
          symbolExposure: 0,
          portfolioExposure: 0,
          maxPositionLimit: 3,
          timeSinceLastTrade: 0,
          realAccountBalance: 0,
          totalPortfolioValue: 0,
        },
      };
    }
  }

  private async getOpenPositions(capitalApi: any, botId: string) {
    try {
      // Fetch real-time positions from Capital.com API
      logger.info(`[POSITION-AWARENESS] Fetching real-time positions from Capital.com API...`);

      const positionsResponse = await capitalApi.getOpenPositions();
      const livePositions = positionsResponse.positions || [];

      logger.info(
        `[POSITION-AWARENESS] Found ${livePositions.length} open positions in Capital.com account`,
      );

      // Transform Capital.com API response to our format
      return livePositions.map((p: any) => ({
        id: p.position.dealId,
        symbol: p.market.epic,
        side: p.position.direction as "BUY" | "SELL",
        size: p.position.size,
        entryPrice: p.position.level,
        currentPrice: p.market.bid, // Use current market price
        createdAt: new Date(p.position.createdDate),
        value: p.position.level * p.position.size,
        unrealizedPnL: p.position.upl || 0,
        brokerPositionId: p.position.dealId,
        leverage: p.position.leverage,
        currency: p.position.currency,
        marketStatus: p.market.marketStatus,
      }));
    } catch (error) {
      logger.error(`[POSITION-AWARENESS] Error fetching positions from Capital.com API:`, error);

      // Fallback to database positions as backup
      logger.warn(`[POSITION-AWARENESS] Falling back to database positions...`);
      const dbPositions = await prisma.position.findMany({
        where: { botId },
        orderBy: { openedAt: "desc" },
      });

      return dbPositions.map((p: any) => ({
        id: p.id,
        symbol: p.symbol,
        side: p.side as "BUY" | "SELL",
        size: p.size,
        entryPrice: p.entryPrice,
        currentPrice: p.currentPrice || p.entryPrice,
        createdAt: p.openedAt,
        value: p.entryPrice * p.size,
        unrealizedPnL: p.unrealizedPnL || 0,
        brokerPositionId: p.brokerPositionId,
      }));
    }
  }

  private async getRealTimeAccountInfo(capitalApi: any) {
    try {
      logger.info(`[POSITION-AWARENESS] Fetching real-time account info from Capital.com API...`);

      // Get account details from Capital.com API (returns single account object, not array)
      const accountDetails = await capitalApi.getAccountDetails();

      if (accountDetails) {
        logger.info(
          `[POSITION-AWARENESS] Active account: ${accountDetails.accountName} - Balance: ${accountDetails.balance} ${accountDetails.currency}`,
        );
        return {
          accountId: accountDetails.accountId,
          accountName: accountDetails.accountName,
          currency: accountDetails.currency,
          symbol: accountDetails.currency === "USD" ? "$" : "€", // Fallback symbol
          balance: {
            balance: accountDetails.balance,
            deposit: accountDetails.deposit,
            profitLoss: accountDetails.profitLoss,
            available: accountDetails.available,
          },
          accountType: accountDetails.accountType,
        };
      }

      return null;
    } catch (error) {
      logger.error(`[POSITION-AWARENESS] Error fetching account info from Capital.com API:`, error);
      return null;
    }
  }

  private calculateRiskMetrics(positions: any[], params: PositionAwarenessParams) {
    const totalPositions = positions.length;
    const symbolPositions = positions.filter((p) => p.symbol === params.symbol);
    const symbolExposure = symbolPositions.reduce((sum, p) => sum + p.value, 0);
    const portfolioExposure = positions.reduce((sum, p) => sum + p.value, 0);
    const portfolioExposurePercent = (portfolioExposure / params.accountBalance) * 100;

    // Calculate time since last trade
    const lastTrade = positions[0]; // Most recent
    const timeSinceLastTrade = lastTrade
      ? Date.now() - new Date(lastTrade.createdAt).getTime()
      : Infinity;

    // Use bot-configured max open trades instead of timeframe-based limit
    const maxPositionLimit =
      params.botConfig.maxOpenTrades || this.getMaxPositionLimit(params.timeframe);

    // Get real account balance from Capital.com API
    const realAccountBalance = params.accountInfo?.balance?.balance || params.accountBalance;
    const totalPortfolioValue = params.accountInfo?.balance?.balance || params.accountBalance;

    return {
      totalOpenPositions: totalPositions,
      symbolExposure,
      portfolioExposure: portfolioExposurePercent,
      maxPositionLimit,
      timeSinceLastTrade,
      realAccountBalance,
      totalPortfolioValue,
    };
  }

  private async performTradingChecks(
    params: PositionAwarenessParams,
    allPositions: any[],
    symbolPositions: any[],
    metrics: any,
  ) {
    const reasoning: string[] = [];
    const recommendations: string[] = [];
    let canTrade = true;

    // Use bot-configured limits (from database) instead of hardcoded values
    const maxOpenTrades =
      params.botConfig.maxOpenTrades || this.getMaxPositionLimit(params.timeframe);
    const maxRiskPercentage = params.botConfig.maxRiskPercentage || 2.0;
    const minRiskPercentage = params.botConfig.minRiskPercentage || 0.5;

    // Strategy-based risk limits
    const strategyMaxRiskPercentage = params.strategyConfig?.riskManagement?.riskPerTrade?.includes(
      "%",
    )
      ? parseFloat(params.strategyConfig.riskManagement.riskPerTrade.replace("%", ""))
      : maxRiskPercentage;

    logger.info(
      `[POSITION-AWARENESS] Using bot "${params.botConfig.name}" config: maxOpenTrades=${maxOpenTrades}, maxRisk=${maxRiskPercentage}%, minRisk=${minRiskPercentage}%`,
    );
    if (params.strategyConfig?.riskManagement) {
      logger.info(
        `[POSITION-AWARENESS] Strategy risk management: ${JSON.stringify(params.strategyConfig.riskManagement)}`,
      );
    }

    // Rule 1: Maximum position limit (from bot configuration)
    if (metrics.totalOpenPositions >= maxOpenTrades) {
      canTrade = false;
      reasoning.push(
        `Maximum positions reached (${metrics.totalOpenPositions}/${maxOpenTrades}) per bot config`,
      );
      recommendations.push("Close existing positions before opening new ones");
    }

    // Rule 2: Symbol-specific position limit (max 1 position per symbol)
    if (symbolPositions.length > 0) {
      const existingDirection = symbolPositions[0].side;

      if (existingDirection === params.direction) {
        canTrade = false;
        reasoning.push(`Already have ${existingDirection} position on ${params.symbol}`);
        recommendations.push("Avoid duplicate positions on same symbol");
      } else {
        canTrade = false;
        reasoning.push(
          `Opposing ${params.direction} position would hedge existing ${existingDirection} on ${params.symbol}`,
        );
        recommendations.push("Avoid hedging positions - close existing position first");
      }
    }

    // Rule 3: Portfolio exposure limit (use bot's max risk percentage)
    const maxPortfolioExposure = maxRiskPercentage * 10; // Conservative multiplier
    if (metrics.portfolioExposure > maxPortfolioExposure) {
      canTrade = false;
      reasoning.push(
        `Portfolio exposure too high (${metrics.portfolioExposure.toFixed(1)}% > ${maxPortfolioExposure}%)`,
      );
      recommendations.push(`Reduce overall portfolio exposure below ${maxPortfolioExposure}%`);
    }

    // Rule 4: REMOVED COOLDOWN - Now using intelligent Position Context Evaluation
    // Instead of arbitrary cooldowns, the bot evaluation service will use
    // PositionContextEvaluationAgent to make smart decisions about trade timing

    // Rule 5: Symbol exposure limit (use strategy risk percentage)
    const maxSymbolExposure = strategyMaxRiskPercentage * 5; // Allow multiple positions on same symbol within reason
    const symbolExposurePercent = (metrics.symbolExposure / params.accountBalance) * 100;
    if (symbolExposurePercent > maxSymbolExposure) {
      canTrade = false;
      reasoning.push(
        `Symbol exposure too high for ${params.symbol} (${symbolExposurePercent.toFixed(1)}% > ${maxSymbolExposure}%)`,
      );
      recommendations.push("Reduce exposure to this symbol");
    }

    // Positive recommendations when trade is allowed
    if (canTrade) {
      reasoning.push("All position limits satisfied");
      if (metrics.totalOpenPositions === 0) {
        recommendations.push("First position - good opportunity to start trading");
      } else {
        recommendations.push(
          `Portfolio diversification: ${metrics.totalOpenPositions}/${maxOpenTrades} positions`,
        );
      }
    }

    logger.info(
      `[POSITION-AWARENESS] ${params.symbol} ${params.direction}: ${canTrade ? "✅ ALLOWED" : "❌ BLOCKED"} - ${reasoning[0]}`,
    );

    return { canTrade, reasoning, recommendations };
  }

  private getMaxPositionLimit(timeframe: string): number {
    // More conservative limits for shorter timeframes
    switch (timeframe.toUpperCase()) {
      case "M1":
      case "1M":
        return 2; // Very conservative for scalping
      case "M5":
      case "5M":
        return 3;
      case "M15":
      case "15M":
        return 4;
      case "H1":
      case "1H":
        return 5;
      default:
        return 3; // Default conservative limit
    }
  }

  private getMinimumCooldown(timeframe: string): number {
    // Minimum time between trades in milliseconds
    switch (timeframe.toUpperCase()) {
      case "M1":
      case "1M":
        return 3 * 60 * 1000; // 3 minutes for M1
      case "M5":
      case "5M":
        return 10 * 60 * 1000; // 10 minutes for M5
      case "M15":
      case "15M":
        return 30 * 60 * 1000; // 30 minutes for M15
      case "H1":
      case "1H":
        return 2 * 60 * 60 * 1000; // 2 hours for H1
      default:
        return 5 * 60 * 1000; // 5 minutes default
    }
  }

  private areSymbolsRelated(symbol1: string, symbol2: string): boolean {
    // Check if symbols are related (same base currency, etc.)
    const normalize = (s: string) => s.replace(/[\/\-_]/g, "").toUpperCase();
    const base1 = normalize(symbol1).slice(0, 3);
    const base2 = normalize(symbol2).slice(0, 3);

    return base1 === base2; // Same base currency (e.g., BTC/USD and BTC/EUR)
  }
}
