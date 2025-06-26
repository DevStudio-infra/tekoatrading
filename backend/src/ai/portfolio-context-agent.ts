import { BaseAgent } from "./base-agent";

interface AccountContext {
  balance: number;
  availableMargin: number;
  equity: number;
  marginLevel: number;
  currency: string;
  unrealizedPnL: number;
}

interface PositionSummary {
  totalPositions: number;
  totalExposure: number;
  symbolExposures: { [symbol: string]: number };
  correlatedPositions: string[];
  riskExposurePercent: number;
  maxSingleExposurePercent: number;
}

interface PortfolioRiskAssessment {
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  maxPositionSize: number;
  recommendedPositionSize: number;
  maxRiskPerTrade: number;
  portfolioHeatLevel: number; // 0-100
  warnings: string[];
  recommendations: string[];
  canTrade: boolean;
}

export class PortfolioContextAgent extends BaseAgent {
  constructor() {
    super("PortfolioContextAgent");
  }

  async analyze(data: any): Promise<any> {
    return this.analyzePortfolio(data);
  }

  async analyzePortfolio(context: {
    accountContext: AccountContext;
    openPositions: any[];
    proposedTrade: {
      symbol: string;
      amount: number;
      action: "buy" | "sell";
      price: number;
    };
  }): Promise<PortfolioRiskAssessment> {
    try {
      const { accountContext, openPositions, proposedTrade } = context;

      // Analyze current portfolio state
      const positionSummary = this.analyzePositions(openPositions, accountContext.balance);

      // Assess portfolio risk level
      const riskLevel = this.assessPortfolioRisk(accountContext, positionSummary);

      // Calculate position sizing recommendations
      const positionSizing = this.calculatePositionSizing(
        accountContext,
        positionSummary,
        proposedTrade,
        riskLevel,
      );

      // Generate warnings and recommendations
      const warnings = this.generateWarnings(accountContext, positionSummary, proposedTrade);
      const recommendations = this.generateRecommendations(accountContext, positionSummary);

      return {
        riskLevel,
        maxPositionSize: positionSizing.maxSize,
        recommendedPositionSize: positionSizing.recommendedSize,
        maxRiskPerTrade: positionSizing.maxRiskPercent,
        portfolioHeatLevel: this.calculatePortfolioHeat(accountContext, positionSummary),
        warnings,
        recommendations,
        canTrade: warnings.length === 0 || !warnings.some((w) => w.includes("CRITICAL")),
      };
    } catch (error) {
      return this.getConservativeAssessment(context.proposedTrade.amount);
    }
  }

  private analyzePositions(positions: any[], accountBalance: number): PositionSummary {
    let totalExposure = 0;
    const symbolExposures: { [symbol: string]: number } = {};
    const correlatedPositions: string[] = [];

    // Analyze each position
    positions.forEach((position) => {
      const exposure = position.quantity * position.currentPrice;
      totalExposure += Math.abs(exposure);

      // Track symbol exposure
      const symbol = position.symbol;
      symbolExposures[symbol] = (symbolExposures[symbol] || 0) + Math.abs(exposure);
    });

    // Find correlated positions (simplified correlation detection)
    const symbols = Object.keys(symbolExposures);
    symbols.forEach((symbol1) => {
      symbols.forEach((symbol2) => {
        if (symbol1 !== symbol2 && this.areSymbolsCorrelated(symbol1, symbol2)) {
          const pairKey = [symbol1, symbol2].sort().join("-");
          if (!correlatedPositions.includes(pairKey)) {
            correlatedPositions.push(pairKey);
          }
        }
      });
    });

    // Calculate risk metrics
    const riskExposurePercent = (totalExposure / accountBalance) * 100;
    const exposureValues = Object.values(symbolExposures);
    const maxSingleExposurePercent =
      exposureValues.length > 0 ? (Math.max(...exposureValues) / accountBalance) * 100 : 0;

    return {
      totalPositions: positions.length,
      totalExposure,
      symbolExposures,
      correlatedPositions,
      riskExposurePercent,
      maxSingleExposurePercent,
    };
  }

  private assessPortfolioRisk(
    account: AccountContext,
    positions: PositionSummary,
  ): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
    // Multiple risk factors
    let riskScore = 0;

    // Factor 1: Position count
    if (positions.totalPositions > 8) riskScore += 3;
    else if (positions.totalPositions > 5) riskScore += 2;
    else if (positions.totalPositions > 3) riskScore += 1;

    // Factor 2: Total exposure
    if (positions.riskExposurePercent > 50) riskScore += 4;
    else if (positions.riskExposurePercent > 30) riskScore += 3;
    else if (positions.riskExposurePercent > 20) riskScore += 2;
    else if (positions.riskExposurePercent > 10) riskScore += 1;

    // Factor 3: Single position concentration
    if (positions.maxSingleExposurePercent > 25) riskScore += 3;
    else if (positions.maxSingleExposurePercent > 15) riskScore += 2;
    else if (positions.maxSingleExposurePercent > 10) riskScore += 1;

    // Factor 4: Margin level
    if (account.marginLevel < 150) riskScore += 4;
    else if (account.marginLevel < 200) riskScore += 3;
    else if (account.marginLevel < 300) riskScore += 2;

    // Factor 5: Unrealized P&L
    const unrealizedPercent = (account.unrealizedPnL / account.balance) * 100;
    if (unrealizedPercent < -15) riskScore += 4;
    else if (unrealizedPercent < -10) riskScore += 3;
    else if (unrealizedPercent < -5) riskScore += 2;

    // Factor 6: Correlated positions
    if (positions.correlatedPositions.length > 3) riskScore += 2;
    else if (positions.correlatedPositions.length > 1) riskScore += 1;

    // Determine risk level
    if (riskScore >= 12) return "CRITICAL";
    if (riskScore >= 8) return "HIGH";
    if (riskScore >= 4) return "MEDIUM";
    return "LOW";
  }

  private calculatePositionSizing(
    account: AccountContext,
    positions: PositionSummary,
    proposedTrade: any,
    riskLevel: string,
  ): { maxSize: number; recommendedSize: number; maxRiskPercent: number } {
    // Base risk per trade based on portfolio risk level
    let baseRiskPercent: number;
    switch (riskLevel) {
      case "CRITICAL":
        baseRiskPercent = 0.5; // 0.5% max risk
        break;
      case "HIGH":
        baseRiskPercent = 1.0; // 1% max risk
        break;
      case "MEDIUM":
        baseRiskPercent = 1.5; // 1.5% max risk
        break;
      case "LOW":
        baseRiskPercent = 2.0; // 2% max risk
        break;
      default:
        baseRiskPercent = 1.0;
    }

    // Adjust for portfolio exposure
    if (positions.riskExposurePercent > 30) {
      baseRiskPercent *= 0.5; // Reduce by 50%
    } else if (positions.riskExposurePercent > 20) {
      baseRiskPercent *= 0.7; // Reduce by 30%
    }

    // Adjust for position count
    if (positions.totalPositions > 5) {
      baseRiskPercent *= 0.6; // Reduce by 40%
    } else if (positions.totalPositions > 3) {
      baseRiskPercent *= 0.8; // Reduce by 20%
    }

    // Check for symbol concentration
    const existingExposure = positions.symbolExposures[proposedTrade.symbol] || 0;
    const existingExposurePercent = (existingExposure / account.balance) * 100;

    if (existingExposurePercent > 10) {
      baseRiskPercent *= 0.3; // Severely limit additional exposure
    } else if (existingExposurePercent > 5) {
      baseRiskPercent *= 0.6; // Reduce additional exposure
    }

    // Calculate position sizes
    const riskAmount = account.balance * (baseRiskPercent / 100);
    const stopLossDistance = proposedTrade.price * 0.02; // Assume 2% stop loss
    const maxSize = riskAmount / stopLossDistance;

    // Also consider available margin
    const maxSizeByMargin = account.availableMargin / proposedTrade.price;
    const finalMaxSize = Math.min(maxSize, maxSizeByMargin);

    // Recommended size is 70% of max size for safety
    const recommendedSize = finalMaxSize * 0.7;

    return {
      maxSize: Math.max(0, finalMaxSize),
      recommendedSize: Math.max(0, recommendedSize),
      maxRiskPercent: baseRiskPercent,
    };
  }

  private generateWarnings(
    account: AccountContext,
    positions: PositionSummary,
    proposedTrade: any,
  ): string[] {
    const warnings: string[] = [];

    // Critical warnings (block trading)
    if (account.marginLevel < 150) {
      warnings.push("CRITICAL: Margin level below 150% - trading suspended");
    }

    if (positions.riskExposurePercent > 60) {
      warnings.push("CRITICAL: Portfolio exposure exceeds 60% - reduce positions");
    }

    if (positions.totalPositions >= 10) {
      warnings.push("CRITICAL: Maximum position limit (10) reached");
    }

    // High priority warnings
    if (account.marginLevel < 200) {
      warnings.push("HIGH: Low margin level - consider reducing exposure");
    }

    if (positions.riskExposurePercent > 40) {
      warnings.push("HIGH: Portfolio exposure exceeds 40% - high risk");
    }

    if (positions.maxSingleExposurePercent > 20) {
      warnings.push("HIGH: Single position concentration exceeds 20%");
    }

    const unrealizedPercent = (account.unrealizedPnL / account.balance) * 100;
    if (unrealizedPercent < -10) {
      warnings.push("HIGH: Unrealized losses exceed 10% of account");
    }

    // Medium priority warnings
    if (positions.correlatedPositions.length > 2) {
      warnings.push("MEDIUM: Multiple correlated positions detected");
    }

    const existingExposure = positions.symbolExposures[proposedTrade.symbol] || 0;
    const existingPercent = (existingExposure / account.balance) * 100;
    if (existingPercent > 15) {
      warnings.push("MEDIUM: High concentration in " + proposedTrade.symbol);
    }

    return warnings;
  }

  private generateRecommendations(account: AccountContext, positions: PositionSummary): string[] {
    const recommendations: string[] = [];

    // Portfolio management recommendations
    if (positions.totalPositions > 6) {
      recommendations.push("Consider reducing the number of open positions");
    }

    if (positions.riskExposurePercent > 25) {
      recommendations.push("Reduce overall portfolio exposure");
    }

    if (positions.maxSingleExposurePercent > 15) {
      recommendations.push("Diversify by reducing largest position");
    }

    if (positions.correlatedPositions.length > 1) {
      recommendations.push("Close correlated positions to reduce redundant risk");
    }

    if (account.marginLevel < 300) {
      recommendations.push("Improve margin level by closing losing positions");
    }

    const unrealizedPercent = (account.unrealizedPnL / account.balance) * 100;
    if (unrealizedPercent < -5) {
      recommendations.push("Review and close underperforming positions");
    }

    // Positive recommendations
    if (positions.riskExposurePercent < 10 && positions.totalPositions < 3) {
      recommendations.push("Portfolio has capacity for additional positions");
    }

    return recommendations;
  }

  private calculatePortfolioHeat(account: AccountContext, positions: PositionSummary): number {
    let heat = 0;

    // Position count heat (0-25 points)
    heat += Math.min(25, positions.totalPositions * 3);

    // Exposure heat (0-30 points)
    heat += Math.min(30, positions.riskExposurePercent * 0.6);

    // Concentration heat (0-20 points)
    heat += Math.min(20, positions.maxSingleExposurePercent * 0.8);

    // Margin heat (0-15 points)
    const marginHeat = Math.max(0, 500 - account.marginLevel) / 20;
    heat += Math.min(15, marginHeat);

    // Unrealized P&L heat (0-10 points)
    const unrealizedPercent = (account.unrealizedPnL / account.balance) * 100;
    if (unrealizedPercent < 0) {
      heat += Math.min(10, Math.abs(unrealizedPercent) * 0.5);
    }

    return Math.min(100, Math.max(0, heat));
  }

  private areSymbolsCorrelated(symbol1: string, symbol2: string): boolean {
    // Simplified correlation detection
    // In real implementation, would use historical correlation analysis

    const correlationGroups = [
      ["EURUSD", "GBPUSD", "AUDUSD", "NZDUSD"], // Major currency pairs
      ["USDJPY", "USDCHF", "USDCAD"], // USD strong pairs
      ["XAUUSD", "XAGUSD"], // Precious metals
      ["BTCUSD", "ETHUSD"], // Cryptocurrencies
      ["SPX500", "US30", "NAS100"], // US indices
    ];

    return correlationGroups.some((group) => group.includes(symbol1) && group.includes(symbol2));
  }

  private getConservativeAssessment(requestedAmount: number): PortfolioRiskAssessment {
    return {
      riskLevel: "HIGH",
      maxPositionSize: requestedAmount * 0.3,
      recommendedPositionSize: requestedAmount * 0.2,
      maxRiskPerTrade: 1.0,
      portfolioHeatLevel: 70,
      warnings: ["Unable to analyze portfolio - using conservative limits"],
      recommendations: ["Verify account status and position data"],
      canTrade: true,
    };
  }
}
