import { z } from "zod";
import { BaseTradingTool } from "./base.tool";

export class RiskCalculationTool extends BaseTradingTool {
  name = "risk_calculation";
  description = `Risk calculation tool for portfolio and position risk assessment.
  Available actions:
  - calculate_position_risk: Calculate risk for a specific position
  - calculate_portfolio_risk: Calculate overall portfolio risk
  - calculate_var: Calculate Value at Risk (VaR)
  - calculate_correlation: Calculate correlation between assets
  - calculate_volatility: Calculate asset volatility
  - calculate_sharpe_ratio: Calculate Sharpe ratio
  - calculate_max_drawdown: Calculate maximum drawdown
  - assess_risk_score: Assess overall risk score (1-10)
  - calculate_kelly_criterion: Calculate Kelly criterion for position sizing
  - calculate_risk_reward: Calculate risk-reward ratio`;

  schema = z.object({
    action: z.enum([
      "calculate_position_risk",
      "calculate_portfolio_risk",
      "calculate_var",
      "calculate_correlation",
      "calculate_volatility",
      "calculate_sharpe_ratio",
      "calculate_max_drawdown",
      "assess_risk_score",
      "calculate_kelly_criterion",
      "calculate_risk_reward",
    ]),
    params: z
      .object({
        symbol: z.string().optional(),
        position: z
          .object({
            symbol: z.string(),
            size: z.number(),
            entryPrice: z.number(),
            currentPrice: z.number(),
            side: z.enum(["BUY", "SELL"]),
          })
          .optional(),
        portfolio: z
          .array(
            z.object({
              symbol: z.string(),
              size: z.number(),
              value: z.number(),
              weight: z.number(),
            })
          )
          .optional(),
        priceData: z.array(z.number()).optional(),
        period: z.number().optional(),
        confidenceLevel: z.number().optional(),
        riskFreeRate: z.number().optional(),
        targetPrice: z.number().optional(),
        stopLoss: z.number().optional(),
        winRate: z.number().optional(),
        avgWin: z.number().optional(),
        avgLoss: z.number().optional(),
      })
      .optional(),
  });

  protected async execute(input: z.infer<typeof this.schema>): Promise<string> {
    try {
      const { action, params = {} } = input;

      switch (action) {
        case "calculate_position_risk":
          if (!params.position) {
            throw new Error("calculate_position_risk requires position parameter");
          }
          return await this.calculatePositionRisk(params.position);

        case "calculate_portfolio_risk":
          if (!params.portfolio) {
            throw new Error("calculate_portfolio_risk requires portfolio parameter");
          }
          return await this.calculatePortfolioRisk(params.portfolio);

        case "calculate_var":
          if (!params.priceData) {
            throw new Error("calculate_var requires priceData parameter");
          }
          return await this.calculateVaR(params.priceData, params.confidenceLevel || 0.95);

        case "calculate_correlation":
          if (!params.priceData) {
            throw new Error("calculate_correlation requires priceData parameter");
          }
          return await this.calculateCorrelation(params.priceData);

        case "calculate_volatility":
          if (!params.priceData) {
            throw new Error("calculate_volatility requires priceData parameter");
          }
          return await this.calculateVolatility(params.priceData, params.period || 20);

        case "calculate_sharpe_ratio":
          if (!params.priceData) {
            throw new Error("calculate_sharpe_ratio requires priceData parameter");
          }
          return await this.calculateSharpeRatio(params.priceData, params.riskFreeRate || 0.02);

        case "calculate_max_drawdown":
          if (!params.priceData) {
            throw new Error("calculate_max_drawdown requires priceData parameter");
          }
          return await this.calculateMaxDrawdown(params.priceData);

        case "assess_risk_score":
          return await this.assessRiskScore(params);

        case "calculate_kelly_criterion":
          if (!params.winRate || !params.avgWin || !params.avgLoss) {
            throw new Error("calculate_kelly_criterion requires winRate, avgWin, and avgLoss parameters");
          }
          return await this.calculateKellyCriterion(params.winRate, params.avgWin, params.avgLoss);

        case "calculate_risk_reward":
          if (!params.position || !params.targetPrice || !params.stopLoss) {
            throw new Error("calculate_risk_reward requires position, targetPrice, and stopLoss parameters");
          }
          return await this.calculateRiskReward(params.position, params.targetPrice, params.stopLoss);

        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error: any) {
      throw new Error(`Risk calculation tool error: ${error?.message || "Unknown error"}`);
    }
  }

  private async calculatePositionRisk(position: any): Promise<string> {
    try {
      const { symbol, size, entryPrice, currentPrice, side } = position;

      // Calculate unrealized P&L
      const pnl = side === "BUY" ? (currentPrice - entryPrice) * size : (entryPrice - currentPrice) * size;

      // Calculate position value
      const positionValue = Math.abs(size * currentPrice);

      // Calculate percentage risk
      const percentageRisk = Math.abs(pnl / (size * entryPrice)) * 100;

      // Calculate risk metrics
      const riskMetrics = {
        symbol,
        positionValue,
        unrealizedPnL: pnl,
        percentageRisk,
        riskLevel: this.getRiskLevel(percentageRisk),
        recommendations: this.getPositionRecommendations(percentageRisk, pnl),
      };

      return JSON.stringify({
        success: true,
        data: riskMetrics,
      });
    } catch (error: any) {
      throw new Error(`Failed to calculate position risk: ${error.message}`);
    }
  }

  private async calculatePortfolioRisk(portfolio: any[]): Promise<string> {
    try {
      const totalValue = portfolio.reduce((sum, pos) => sum + pos.value, 0);
      const weightedRisk = portfolio.reduce((sum, pos) => {
        const weight = pos.value / totalValue;
        const volatility = this.estimateVolatility(pos.symbol); // Mock volatility
        return sum + weight * volatility;
      }, 0);

      // Calculate diversification metrics
      const concentration = Math.max(...portfolio.map((pos) => pos.weight));
      const diversificationScore = 1 - concentration;

      // Calculate correlation risk (simplified)
      const correlationRisk = portfolio.length < 5 ? 0.8 : 0.4;

      const portfolioRisk = {
        totalValue,
        weightedVolatility: weightedRisk,
        concentrationRisk: concentration,
        diversificationScore,
        correlationRisk,
        overallRiskScore: this.calculateOverallRiskScore(weightedRisk, concentration, correlationRisk),
        recommendations: this.getPortfolioRecommendations(concentration, diversificationScore),
      };

      return JSON.stringify({
        success: true,
        data: portfolioRisk,
      });
    } catch (error: any) {
      throw new Error(`Failed to calculate portfolio risk: ${error.message}`);
    }
  }

  private async calculateVaR(priceData: number[], confidenceLevel: number): Promise<string> {
    try {
      // Calculate returns
      const returns = [];
      for (let i = 1; i < priceData.length; i++) {
        returns.push((priceData[i] - priceData[i - 1]) / priceData[i - 1]);
      }

      // Sort returns
      returns.sort((a, b) => a - b);

      // Calculate VaR at given confidence level
      const varIndex = Math.floor((1 - confidenceLevel) * returns.length);
      const var95 = returns[varIndex] || 0;
      const var99 = returns[Math.floor(0.01 * returns.length)] || 0;

      const varResults = {
        confidenceLevel,
        var95: Math.abs(var95 * 100), // Convert to percentage
        var99: Math.abs(var99 * 100),
        interpretation: `95% VaR: ${(Math.abs(var95) * 100).toFixed(2)}% daily loss potential`,
        riskLevel: Math.abs(var95) > 0.05 ? "HIGH" : Math.abs(var95) > 0.02 ? "MEDIUM" : "LOW",
      };

      return JSON.stringify({
        success: true,
        data: varResults,
      });
    } catch (error: any) {
      throw new Error(`Failed to calculate VaR: ${error.message}`);
    }
  }

  private async calculateCorrelation(priceData: number[]): Promise<string> {
    try {
      // Mock correlation calculation for multiple assets
      // In practice, this would calculate correlation matrix
      const correlationMatrix = {
        "BTC/USD": { "ETH/USD": 0.75, SPY: 0.45, GLD: -0.2 },
        "ETH/USD": { "BTC/USD": 0.75, SPY: 0.38, GLD: -0.15 },
        SPY: { "BTC/USD": 0.45, "ETH/USD": 0.38, GLD: 0.1 },
        GLD: { "BTC/USD": -0.2, "ETH/USD": -0.15, SPY: 0.1 },
      };

      return JSON.stringify({
        success: true,
        data: {
          correlationMatrix,
          averageCorrelation: 0.35,
          highestCorrelation: 0.75,
          lowestCorrelation: -0.2,
          interpretation: "Moderate positive correlation between crypto assets",
        },
      });
    } catch (error: any) {
      throw new Error(`Failed to calculate correlation: ${error.message}`);
    }
  }

  private async calculateVolatility(priceData: number[], period: number): Promise<string> {
    try {
      // Calculate returns
      const returns = [];
      for (let i = 1; i < Math.min(priceData.length, period + 1); i++) {
        returns.push((priceData[i] - priceData[i - 1]) / priceData[i - 1]);
      }

      // Calculate standard deviation
      const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
      const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
      const volatility = Math.sqrt(variance);

      // Annualize volatility (assuming daily data)
      const annualizedVolatility = volatility * Math.sqrt(365);

      const volatilityData = {
        dailyVolatility: volatility * 100,
        annualizedVolatility: annualizedVolatility * 100,
        period,
        riskLevel: this.getVolatilityRiskLevel(annualizedVolatility),
        interpretation: `Asset shows ${this.getVolatilityDescription(annualizedVolatility)} volatility`,
      };

      return JSON.stringify({
        success: true,
        data: volatilityData,
      });
    } catch (error: any) {
      throw new Error(`Failed to calculate volatility: ${error.message}`);
    }
  }

  private async calculateSharpeRatio(priceData: number[], riskFreeRate: number): Promise<string> {
    try {
      // Calculate returns
      const returns = [];
      for (let i = 1; i < priceData.length; i++) {
        returns.push((priceData[i] - priceData[i - 1]) / priceData[i - 1]);
      }

      // Calculate average return and volatility
      const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
      const volatility = this.calculateStandardDeviation(returns);

      // Annualize metrics
      const annualizedReturn = avgReturn * 365;
      const annualizedVolatility = volatility * Math.sqrt(365);

      // Calculate Sharpe ratio
      const sharpeRatio = (annualizedReturn - riskFreeRate) / annualizedVolatility;

      const sharpeData = {
        sharpeRatio,
        annualizedReturn: annualizedReturn * 100,
        annualizedVolatility: annualizedVolatility * 100,
        riskFreeRate: riskFreeRate * 100,
        interpretation: this.interpretSharpeRatio(sharpeRatio),
      };

      return JSON.stringify({
        success: true,
        data: sharpeData,
      });
    } catch (error: any) {
      throw new Error(`Failed to calculate Sharpe ratio: ${error.message}`);
    }
  }

  private async calculateMaxDrawdown(priceData: number[]): Promise<string> {
    try {
      let maxDrawdown = 0;
      let peak = priceData[0];
      let peakIndex = 0;
      let troughIndex = 0;

      for (let i = 1; i < priceData.length; i++) {
        if (priceData[i] > peak) {
          peak = priceData[i];
          peakIndex = i;
        }

        const drawdown = (peak - priceData[i]) / peak;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
          troughIndex = i;
        }
      }

      const drawdownData = {
        maxDrawdown: maxDrawdown * 100,
        maxDrawdownPeriod: troughIndex - peakIndex,
        peakValue: peak,
        troughValue: priceData[troughIndex],
        riskLevel: this.getDrawdownRiskLevel(maxDrawdown),
        interpretation: `Maximum loss from peak: ${(maxDrawdown * 100).toFixed(2)}%`,
      };

      return JSON.stringify({
        success: true,
        data: drawdownData,
      });
    } catch (error: any) {
      throw new Error(`Failed to calculate max drawdown: ${error.message}`);
    }
  }

  private async assessRiskScore(params: any): Promise<string> {
    try {
      // Comprehensive risk assessment based on multiple factors
      let riskScore = 5; // Start with medium risk

      // Adjust based on volatility
      if (params.volatility > 0.8) riskScore += 2;
      else if (params.volatility > 0.4) riskScore += 1;
      else if (params.volatility < 0.2) riskScore -= 1;

      // Adjust based on correlation
      if (params.correlation > 0.8) riskScore += 1;
      else if (params.correlation < 0.2) riskScore -= 1;

      // Adjust based on concentration
      if (params.concentration > 0.5) riskScore += 1;
      else if (params.concentration < 0.2) riskScore -= 1;

      // Cap the score between 1 and 10
      riskScore = Math.max(1, Math.min(10, riskScore));

      const assessment = {
        riskScore,
        riskLevel: this.getRiskLevelFromScore(riskScore),
        factors: {
          volatility: params.volatility || 0.3,
          correlation: params.correlation || 0.5,
          concentration: params.concentration || 0.3,
          liquidity: params.liquidity || 0.7,
        },
        recommendations: this.getRiskRecommendations(riskScore),
      };

      return JSON.stringify({
        success: true,
        data: assessment,
      });
    } catch (error: any) {
      throw new Error(`Failed to assess risk score: ${error.message}`);
    }
  }

  private async calculateKellyCriterion(winRate: number, avgWin: number, avgLoss: number): Promise<string> {
    try {
      // Kelly formula: f = (bp - q) / b
      // where b = odds received (avgWin/avgLoss), p = probability of win, q = probability of loss
      const b = Math.abs(avgWin / avgLoss);
      const p = winRate;
      const q = 1 - winRate;

      const kellyFraction = (b * p - q) / b;
      const kellyPercentage = kellyFraction * 100;

      // Apply safety factor (typically 25-50% of Kelly)
      const safeKelly = kellyPercentage * 0.25;

      const kellyData = {
        kellyFraction,
        kellyPercentage,
        safeKellyPercentage: safeKelly,
        winRate: winRate * 100,
        avgWin,
        avgLoss,
        recommendation: this.getKellyRecommendation(kellyPercentage),
      };

      return JSON.stringify({
        success: true,
        data: kellyData,
      });
    } catch (error: any) {
      throw new Error(`Failed to calculate Kelly criterion: ${error.message}`);
    }
  }

  private async calculateRiskReward(position: any, targetPrice: number, stopLoss: number): Promise<string> {
    try {
      const { entryPrice, side } = position;

      let potentialProfit, potentialLoss;

      if (side === "BUY") {
        potentialProfit = targetPrice - entryPrice;
        potentialLoss = entryPrice - stopLoss;
      } else {
        potentialProfit = entryPrice - targetPrice;
        potentialLoss = stopLoss - entryPrice;
      }

      const riskRewardRatio = potentialProfit / potentialLoss;

      const riskRewardData = {
        entryPrice,
        targetPrice,
        stopLoss,
        potentialProfit,
        potentialLoss,
        riskRewardRatio,
        recommendation: this.getRiskRewardRecommendation(riskRewardRatio),
        minAcceptableRatio: 2.0,
      };

      return JSON.stringify({
        success: true,
        data: riskRewardData,
      });
    } catch (error: any) {
      throw new Error(`Failed to calculate risk-reward ratio: ${error.message}`);
    }
  }

  // Helper methods
  private getRiskLevel(percentageRisk: number): string {
    if (percentageRisk > 10) return "VERY HIGH";
    if (percentageRisk > 5) return "HIGH";
    if (percentageRisk > 2) return "MEDIUM";
    if (percentageRisk > 1) return "LOW";
    return "VERY LOW";
  }

  private getPositionRecommendations(percentageRisk: number, pnl: number): string[] {
    const recommendations = [];

    if (percentageRisk > 5) {
      recommendations.push("Consider reducing position size");
    }
    if (pnl < 0 && Math.abs(pnl) > percentageRisk * 100) {
      recommendations.push("Consider implementing stop-loss");
    }
    if (percentageRisk < 1) {
      recommendations.push("Position size may be too conservative");
    }

    return recommendations;
  }

  private estimateVolatility(symbol: string): number {
    // Mock volatility estimates
    const volatilities: Record<string, number> = {
      "BTC/USD": 0.8,
      "ETH/USD": 0.9,
      "EUR/USD": 0.1,
      "GBP/USD": 0.15,
      SPY: 0.2,
    };
    return volatilities[symbol] || 0.3;
  }

  private calculateOverallRiskScore(volatility: number, concentration: number, correlation: number): number {
    return Math.min(10, Math.max(1, volatility * 4 + concentration * 3 + correlation * 3));
  }

  private getPortfolioRecommendations(concentration: number, diversification: number): string[] {
    const recommendations = [];

    if (concentration > 0.5) {
      recommendations.push("Portfolio is too concentrated, consider diversifying");
    }
    if (diversification < 0.5) {
      recommendations.push("Add more uncorrelated assets");
    }
    if (concentration < 0.2) {
      recommendations.push("Portfolio may be over-diversified");
    }

    return recommendations;
  }

  private calculateStandardDeviation(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private getVolatilityRiskLevel(volatility: number): string {
    if (volatility > 1.0) return "EXTREME";
    if (volatility > 0.6) return "HIGH";
    if (volatility > 0.3) return "MEDIUM";
    if (volatility > 0.15) return "LOW";
    return "VERY LOW";
  }

  private getVolatilityDescription(volatility: number): string {
    if (volatility > 1.0) return "extremely high";
    if (volatility > 0.6) return "high";
    if (volatility > 0.3) return "moderate";
    if (volatility > 0.15) return "low";
    return "very low";
  }

  private interpretSharpeRatio(sharpe: number): string {
    if (sharpe > 2) return "Excellent risk-adjusted returns";
    if (sharpe > 1) return "Good risk-adjusted returns";
    if (sharpe > 0.5) return "Acceptable risk-adjusted returns";
    if (sharpe > 0) return "Poor risk-adjusted returns";
    return "Negative risk-adjusted returns";
  }

  private getDrawdownRiskLevel(drawdown: number): string {
    if (drawdown > 0.5) return "EXTREME";
    if (drawdown > 0.3) return "HIGH";
    if (drawdown > 0.2) return "MEDIUM";
    if (drawdown > 0.1) return "LOW";
    return "MINIMAL";
  }

  private getRiskLevelFromScore(score: number): string {
    if (score >= 8) return "VERY HIGH";
    if (score >= 6) return "HIGH";
    if (score >= 4) return "MEDIUM";
    if (score >= 2) return "LOW";
    return "VERY LOW";
  }

  private getRiskRecommendations(score: number): string[] {
    if (score >= 8) return ["Reduce position sizes", "Increase diversification", "Consider hedging"];
    if (score >= 6) return ["Monitor positions closely", "Consider partial profit taking"];
    if (score >= 4) return ["Standard risk management", "Regular portfolio review"];
    if (score >= 2) return ["Consider increasing position sizes", "Look for opportunities"];
    return ["Very conservative approach", "Consider more aggressive strategies"];
  }

  private getKellyRecommendation(kelly: number): string {
    if (kelly > 25) return "Reduce bet size - Kelly suggests high risk";
    if (kelly > 10) return "Moderate position sizing recommended";
    if (kelly > 0) return "Conservative position sizing appropriate";
    return "Negative expectancy - avoid this trade";
  }

  private getRiskRewardRecommendation(ratio: number): string {
    if (ratio >= 3) return "Excellent risk-reward ratio";
    if (ratio >= 2) return "Good risk-reward ratio";
    if (ratio >= 1.5) return "Acceptable risk-reward ratio";
    if (ratio >= 1) return "Marginal risk-reward ratio";
    return "Poor risk-reward ratio - avoid";
  }
}
