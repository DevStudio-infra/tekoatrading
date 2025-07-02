import { PrismaClient } from "@prisma/client";
import { logger } from "../logger";

export interface PortfolioPosition {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  positionSize: number;
  entryPrice: number;
  currentPrice: number;
  currentPL: number;
  riskAmount: number;
  correlation?: number;
  botId: string;
}

export interface PortfolioRiskMetrics {
  totalAccountValue: number;
  totalPortfolioRisk: number;
  totalPortfolioRiskPercent: number;
  currentDrawdown: number;
  currentDrawdownPercent: number;
  totalOpenPositions: number;
  correlatedPositions: number;
  riskByAsset: { [symbol: string]: number };
  riskByBot: { [botId: string]: number };
  diversificationRatio: number;
  warnings: string[];
  recommendations: string[];
}

export interface RiskLimits {
  maxPortfolioRisk: number;
  maxSingleAssetRisk: number;
  maxSingleBotRisk: number;
  maxDrawdown: number;
}

export interface PositionCorrelation {
  symbol1: string;
  symbol2: string;
  correlation: number;
  riskImpact: number;
}

export class PortfolioRiskManagementService {
  private prisma: PrismaClient;
  private defaultRiskLimits: RiskLimits = {
    maxPortfolioRisk: 10.0, // 10% maximum total portfolio risk
    maxSingleAssetRisk: 5.0, // 5% maximum risk per asset
    maxSingleBotRisk: 5.0, // 5% maximum risk per bot
    maxDrawdown: 20.0, // 20% maximum drawdown
  };

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Calculate comprehensive portfolio risk metrics
   */
  async calculatePortfolioRisk(userId: string): Promise<PortfolioRiskMetrics> {
    try {
      logger.info(`[PORTFOLIO-RISK] Calculating portfolio risk for user ${userId}`);

      // Get all open positions for user
      const positions = await this.getOpenPositions(userId);

      // Get account balance
      const accountBalance = await this.getUserAccountBalance(userId);

      // Calculate risk metrics
      const metrics = await this.calculateRiskMetrics(positions, accountBalance, userId);

      logger.info(
        `[PORTFOLIO-RISK] Portfolio analysis complete: ${metrics.totalOpenPositions} positions, ${metrics.totalPortfolioRiskPercent.toFixed(2)}% total risk`,
      );

      return metrics;
    } catch (error) {
      logger.error(`[PORTFOLIO-RISK] Error calculating portfolio risk:`, error);
      throw error;
    }
  }

  /**
   * Get all open positions for a user
   */
  private async getOpenPositions(userId: string) {
    const trades = await this.prisma.trade.findMany({
      where: {
        bot: {
          userId: userId,
        },
        status: "FILLED",
      },
      include: {
        bot: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return trades.map((trade) => ({
      id: trade.id,
      symbol: trade.symbol,
      side: trade.side as "BUY" | "SELL",
      positionSize: trade.size,
      entryPrice: trade.entryPrice || 0,
      currentPrice: trade.entryPrice || 0,
      currentPL: trade.profitLoss || 0,
      riskAmount: Math.abs((trade.entryPrice || 0) - (trade.stopLoss || 0)) * trade.size,
      botId: trade.botId || "",
    }));
  }

  /**
   * Get user account balance
   */
  private async getUserAccountBalance(userId: string): Promise<number> {
    // TODO: Get actual account balance from Capital.com API
    return 10000; // $10,000 default
  }

  /**
   * Calculate comprehensive risk metrics
   */
  private async calculateRiskMetrics(
    positions: any[],
    accountBalance: number,
    userId: string,
  ): Promise<PortfolioRiskMetrics> {
    const totalRiskAmount = positions.reduce((sum, pos) => sum + pos.riskAmount, 0);
    const totalPortfolioRiskPercent = (totalRiskAmount / accountBalance) * 100;
    const totalPL = positions.reduce((sum, pos) => sum + pos.currentPL, 0);

    // Calculate drawdown
    const peakValue = accountBalance * 1.2; // Simplified
    const currentValue = accountBalance + totalPL;
    const currentDrawdown = peakValue - currentValue;
    const currentDrawdownPercent = (currentDrawdown / peakValue) * 100;

    // Risk by asset
    const riskByAsset: { [symbol: string]: number } = {};
    positions.forEach((pos) => {
      if (!riskByAsset[pos.symbol]) riskByAsset[pos.symbol] = 0;
      riskByAsset[pos.symbol] += pos.riskAmount;
    });

    // Risk by bot
    const riskByBot: { [botId: string]: number } = {};
    positions.forEach((pos) => {
      if (!riskByBot[pos.botId]) riskByBot[pos.botId] = 0;
      riskByBot[pos.botId] += pos.riskAmount;
    });

    // Simplified correlations
    const correlatedPositions = this.calculateCorrelatedPositions(positions);

    // Diversification ratio
    const uniqueAssets = [...new Set(positions.map((p) => p.symbol))].length;
    const diversificationRatio = positions.length > 0 ? uniqueAssets / positions.length : 1;

    // Generate warnings and recommendations
    const warnings: string[] = [];
    const recommendations: string[] = [];

    this.generateRiskWarnings(
      {
        totalPortfolioRiskPercent,
        currentDrawdownPercent,
        riskByAsset,
        riskByBot,
        correlatedPositions,
      },
      warnings,
      recommendations,
      accountBalance,
    );

    return {
      totalAccountValue: currentValue,
      totalPortfolioRisk: totalRiskAmount,
      totalPortfolioRiskPercent,
      currentDrawdown,
      currentDrawdownPercent,
      totalOpenPositions: positions.length,
      correlatedPositions,
      riskByAsset,
      riskByBot,
      diversificationRatio,
      warnings,
      recommendations,
    };
  }

  /**
   * Calculate correlated positions (simplified)
   */
  private calculateCorrelatedPositions(positions: any[]): number {
    let correlatedCount = 0;

    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const asset1 = this.extractAssetFromSymbol(positions[i].symbol);
        const asset2 = this.extractAssetFromSymbol(positions[j].symbol);

        // Simple correlation rules
        if (
          (asset1 === "BTC" && asset2 === "ETH") ||
          (asset1 === "EUR" && asset2 === "GBP") ||
          asset1 === asset2
        ) {
          correlatedCount++;
        }
      }
    }

    return correlatedCount;
  }

  /**
   * Extract base asset from symbol
   */
  private extractAssetFromSymbol(symbol: string): string {
    if (symbol.includes("BTC")) return "BTC";
    if (symbol.includes("ETH")) return "ETH";
    if (symbol.includes("EUR")) return "EUR";
    if (symbol.includes("GBP")) return "GBP";
    return symbol.split("/")[0] || symbol.substring(0, 3);
  }

  /**
   * Generate risk warnings and recommendations
   */
  private generateRiskWarnings(
    metrics: any,
    warnings: string[],
    recommendations: string[],
    accountBalance: number,
  ): void {
    // Portfolio risk warnings
    if (metrics.totalPortfolioRiskPercent > this.defaultRiskLimits.maxPortfolioRisk) {
      warnings.push(
        `🚨 Total portfolio risk ${metrics.totalPortfolioRiskPercent.toFixed(1)}% exceeds ${this.defaultRiskLimits.maxPortfolioRisk}% limit`,
      );
      recommendations.push("Consider closing some positions or reducing position sizes");
    }

    // Drawdown warnings
    if (metrics.currentDrawdownPercent > this.defaultRiskLimits.maxDrawdown / 2) {
      warnings.push(
        `⚠️ Account drawdown ${metrics.currentDrawdownPercent.toFixed(1)}% approaching maximum limit`,
      );
      recommendations.push("Implement stricter risk management");
    }

    // Asset concentration warnings
    Object.entries(metrics.riskByAsset).forEach(([asset, risk]) => {
      const riskPercent = ((risk as number) / accountBalance) * 100;
      if (riskPercent > this.defaultRiskLimits.maxSingleAssetRisk) {
        warnings.push(
          `📊 ${asset} risk ${riskPercent.toFixed(1)}% exceeds ${this.defaultRiskLimits.maxSingleAssetRisk}% limit`,
        );
        recommendations.push(`Diversify away from ${asset} concentration`);
      }
    });

    // Correlation warnings
    if (metrics.correlatedPositions > 3) {
      warnings.push(`🔗 ${metrics.correlatedPositions} highly correlated positions detected`);
      recommendations.push(
        "Reduce position correlation by diversifying across uncorrelated assets",
      );
    }

    // Positive recommendations
    if (warnings.length === 0) {
      recommendations.push("✅ Portfolio risk management within acceptable limits");
      recommendations.push("🎯 Continue monitoring position correlations and drawdown");
    }
  }

  /**
   * Check if new position violates risk limits
   */
  async validateNewPosition(
    userId: string,
    symbol: string,
    riskAmount: number,
    botId: string,
  ): Promise<{
    approved: boolean;
    warnings: string[];
    recommendations: string[];
  }> {
    try {
      const currentMetrics = await this.calculatePortfolioRisk(userId);
      const accountBalance = await this.getUserAccountBalance(userId);

      const newTotalRisk = currentMetrics.totalPortfolioRisk + riskAmount;
      const newTotalRiskPercent = (newTotalRisk / accountBalance) * 100;

      const warnings: string[] = [];
      const recommendations: string[] = [];
      let approved = true;

      // Check portfolio risk limit
      if (newTotalRiskPercent > this.defaultRiskLimits.maxPortfolioRisk) {
        approved = false;
        warnings.push(
          `New position would increase portfolio risk to ${newTotalRiskPercent.toFixed(1)}%`,
        );
        recommendations.push("Reduce position size or close existing positions");
      }

      if (approved && warnings.length === 0) {
        recommendations.push("✅ New position approved within risk limits");
      }

      return {
        approved,
        warnings,
        recommendations,
      };
    } catch (error) {
      logger.error(`[PORTFOLIO-RISK] Error validating new position:`, error);
      return {
        approved: false,
        warnings: ["Error validating position - manual review required"],
        recommendations: ["Check system status and try again"],
      };
    }
  }

  /**
   * Get portfolio risk summary
   */
  async getPortfolioRiskSummary(userId: string): Promise<{
    totalRiskPercent: number;
    drawdownPercent: number;
    openPositions: number;
    riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    topRisks: string[];
  }> {
    const metrics = await this.calculatePortfolioRisk(userId);

    let riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW";

    if (metrics.totalPortfolioRiskPercent > 15 || metrics.currentDrawdownPercent > 15) {
      riskLevel = "CRITICAL";
    } else if (metrics.totalPortfolioRiskPercent > 10 || metrics.currentDrawdownPercent > 10) {
      riskLevel = "HIGH";
    } else if (metrics.totalPortfolioRiskPercent > 5 || metrics.currentDrawdownPercent > 5) {
      riskLevel = "MEDIUM";
    }

    const topRisks = metrics.warnings.slice(0, 3);

    return {
      totalRiskPercent: metrics.totalPortfolioRiskPercent,
      drawdownPercent: metrics.currentDrawdownPercent,
      openPositions: metrics.totalOpenPositions,
      riskLevel,
      topRisks,
    };
  }
}

export const portfolioRiskManagementService = new PortfolioRiskManagementService();
