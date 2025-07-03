import { prisma } from "../prisma";
import { logger } from "../logger";

export interface PortfolioContext {
  userId: string;
  botId: string;
  totalPositions: number;
  totalBotsCount: number;
  recentTradesCount: number;
  accountBalance: number;
  availableCapital: number;
  currentDrawdown: number;
  correlationRisk: "LOW" | "MEDIUM" | "HIGH";
  userRiskProfile: any;
  portfolioExposure: number;
  activeSymbols: string[];
}

export class PortfolioContextService {
  /**
   * Collect comprehensive portfolio context for a user
   */
  async collectPortfolioContext(userId: string, botId: string): Promise<PortfolioContext> {
    try {
      logger.info(`📊 Collecting portfolio context for user: ${userId}, bot: ${botId}`);

      // Get all user's bots
      const userBots = await prisma.bot.findMany({
        where: {
          userId,
          isActive: true,
        },
        include: {
          strategy: true,
          _count: {
            select: {
              trades: {
                where: {
                  status: "OPEN",
                },
              },
            },
          },
        },
      });

      // Get total open positions across all bots
      const totalPositions = userBots.reduce((sum, bot) => sum + bot._count.trades, 0);

      // Get recent trades (last 24 hours)
      const recent24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentTrades = await prisma.trade.findMany({
        where: {
          bot: {
            userId,
          },
          createdAt: {
            gte: recent24Hours,
          },
        },
      });

      // Calculate account metrics
      const accountMetrics = await this.calculateAccountMetrics(userId);

      // Assess correlation risk
      const correlationRisk = await this.assessCorrelationRisk(userId, userBots);

      // Get user risk profile
      const userRiskProfile = await this.getUserRiskProfile(userId);

      // Calculate portfolio exposure
      const portfolioExposure = await this.calculatePortfolioExposure(userId);

      // Get active symbols
      const activeSymbols = userBots
        .filter((bot) => bot._count.trades > 0)
        .map((bot) => bot.tradingPairSymbol);

      const portfolioContext: PortfolioContext = {
        userId,
        botId,
        totalPositions,
        totalBotsCount: userBots.length,
        recentTradesCount: recentTrades.length,
        accountBalance: accountMetrics.accountBalance,
        availableCapital: accountMetrics.availableCapital,
        currentDrawdown: accountMetrics.currentDrawdown,
        correlationRisk,
        userRiskProfile,
        portfolioExposure,
        activeSymbols,
      };

      logger.info(
        `✅ Portfolio context collected: ${totalPositions} positions, ${recentTrades.length} recent trades`,
      );
      logger.info(
        `💰 Account: $${accountMetrics.accountBalance.toFixed(2)}, Available: $${accountMetrics.availableCapital.toFixed(2)}`,
      );
      logger.info(
        `⚠️ Drawdown: ${(accountMetrics.currentDrawdown * 100).toFixed(2)}%, Correlation Risk: ${correlationRisk}`,
      );

      return portfolioContext;
    } catch (error) {
      logger.error(`❌ Portfolio context collection failed:`, error);

      // Return minimal fallback context
      return {
        userId,
        botId,
        totalPositions: 0,
        totalBotsCount: 0,
        recentTradesCount: 0,
        accountBalance: 10000, // Default fallback
        availableCapital: 10000,
        currentDrawdown: 0,
        correlationRisk: "LOW",
        userRiskProfile: { riskTolerance: "MODERATE" },
        portfolioExposure: 0,
        activeSymbols: [],
      };
    }
  }

  /**
   * Calculate account metrics including balance and drawdown
   */
  private async calculateAccountMetrics(userId: string): Promise<{
    accountBalance: number;
    availableCapital: number;
    currentDrawdown: number;
  }> {
    try {
      // Get user's broker credentials to fetch real account balance
      const brokerCredential = await prisma.brokerCredential.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });

      let accountBalance = 1000; // Reduced fallback
      let availableCapital = 1000;

      // Fetch REAL account balance from Capital.com API
      if (brokerCredential && brokerCredential.credentials) {
        try {
          const { credentialsEncryption } = await import("./credentials-encryption.service");
          const credentials = credentialsEncryption.decryptCredentials(
            brokerCredential.credentials,
          );

          const { CapitalMainService } = await import(
            "../modules/capital/services/capital-main.service"
          );
          const capitalApi = new CapitalMainService({
            apiKey: credentials.apiKey,
            identifier: credentials.identifier,
            password: credentials.password,
            isDemo: brokerCredential.isDemo,
            instanceId: `portfolio-context-${userId}`,
          });

          await capitalApi.authenticate();
          const realAccountData = await capitalApi.getAccountDetails();

          if (realAccountData && realAccountData.balance) {
            accountBalance = realAccountData.balance;
            availableCapital = realAccountData.available || realAccountData.balance;

            logger.info(
              `✅ Using REAL account balance: $${accountBalance.toFixed(2)}, Available: $${availableCapital.toFixed(2)}`,
            );
          } else {
            logger.warn(
              `⚠️ Could not fetch real account balance - using fallback: $${accountBalance}`,
            );
          }
        } catch (apiError) {
          logger.error(`❌ Failed to fetch real account balance:`, apiError);
          logger.warn(`⚠️ Using fallback account balance: $${accountBalance}`);
        }
      }

      // In a real implementation, you would fetch this from the broker API
      // For now, we'll calculate based on trade history
      const allTrades = await prisma.trade.findMany({
        where: {
          bot: {
            userId,
          },
          status: {
            in: ["CLOSED", "CANCELLED"],
          },
        },
        orderBy: { createdAt: "asc" },
      });

      // Calculate account balance based on trade PnL
      let totalPnL = 0;
      let peakBalance = accountBalance;
      let maxDrawdown = 0;

      for (const trade of allTrades) {
        if (trade.profitLoss) {
          totalPnL += trade.profitLoss;
          const currentBalance = accountBalance + totalPnL;

          if (currentBalance > peakBalance) {
            peakBalance = currentBalance;
          }

          const drawdown = (peakBalance - currentBalance) / peakBalance;
          if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown;
          }
        }
      }

      const finalBalance = accountBalance + totalPnL;
      const currentDrawdown =
        finalBalance < peakBalance ? (peakBalance - finalBalance) / peakBalance : 0;

      // Reserve some capital for open positions
      const openPositions = await prisma.trade.count({
        where: {
          bot: { userId },
          status: "OPEN",
        },
      });

      availableCapital = Math.max(0, finalBalance - openPositions * finalBalance * 0.05); // 5% per position

      return {
        accountBalance: Math.max(0, finalBalance),
        availableCapital,
        currentDrawdown,
      };
    } catch (error) {
      logger.error(`❌ Account metrics calculation failed:`, error);
      return {
        accountBalance: 10000,
        availableCapital: 10000,
        currentDrawdown: 0,
      };
    }
  }

  /**
   * Assess correlation risk across user's portfolio
   */
  private async assessCorrelationRisk(
    userId: string,
    userBots: any[],
  ): Promise<"LOW" | "MEDIUM" | "HIGH"> {
    try {
      if (userBots.length <= 1) {
        return "LOW";
      }

      // Check for similar symbols
      const symbols = userBots.map((bot) => bot.tradingPairSymbol);
      const uniqueSymbols = new Set(symbols);
      const symbolDiversity = uniqueSymbols.size / symbols.length;

      // Check for similar strategies
      const strategies = userBots.map((bot) => bot.strategy?.category).filter(Boolean);
      const uniqueStrategies = new Set(strategies);
      const strategyDiversity =
        strategies.length > 0 ? uniqueStrategies.size / strategies.length : 1;

      const overallDiversity = (symbolDiversity + strategyDiversity) / 2;

      if (overallDiversity > 0.8) {
        return "LOW";
      } else if (overallDiversity > 0.5) {
        return "MEDIUM";
      } else {
        return "HIGH";
      }
    } catch (error) {
      logger.error(`❌ Correlation risk assessment failed:`, error);
      return "MEDIUM"; // Safe default
    }
  }

  /**
   * Get user risk profile
   */
  private async getUserRiskProfile(userId: string): Promise<any> {
    try {
      // In a real implementation, this would come from user settings
      // For now, we'll infer from trading behavior
      const userTrades = await prisma.trade.findMany({
        where: {
          bot: { userId },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      if (userTrades.length === 0) {
        return { riskTolerance: "MODERATE" };
      }

      // Analyze trading patterns
      const avgPositionSize =
        userTrades.reduce((sum, trade) => sum + (trade.size || 0), 0) / userTrades.length;
      const totalPositions = userTrades.length;

      let riskTolerance = "MODERATE";
      if (avgPositionSize > 0.05 || totalPositions > 20) {
        riskTolerance = "HIGH";
      } else if (avgPositionSize < 0.01 || totalPositions < 5) {
        riskTolerance = "LOW";
      }

      return {
        riskTolerance,
        avgPositionSize,
        totalTrades: totalPositions,
        maxPositionCount: riskTolerance === "HIGH" ? 10 : riskTolerance === "LOW" ? 3 : 6,
      };
    } catch (error) {
      logger.error(`❌ User risk profile calculation failed:`, error);
      return { riskTolerance: "MODERATE" };
    }
  }

  /**
   * Calculate portfolio exposure
   */
  private async calculatePortfolioExposure(userId: string): Promise<number> {
    try {
      const openTrades = await prisma.trade.findMany({
        where: {
          bot: { userId },
          status: "OPEN",
        },
      });

      return openTrades.reduce((sum, trade) => {
        return sum + (trade.size || 0) * (trade.entryPrice || 0);
      }, 0);
    } catch (error) {
      logger.error(`❌ Portfolio exposure calculation failed:`, error);
      return 0;
    }
  }
}
