import { logger } from "../logger";
import { tradingErrorLogger } from "./trading-error-logger.service";

export interface PositionSizingOptions {
  conservative: number;
  moderate: number;
  aggressive: number;
  maximum: number;
  recommended: number;
  reasoning: string;
  riskPercentages: {
    conservative: number;
    moderate: number;
    aggressive: number;
    maximum: number;
  };
}

export interface PositionSizingParams {
  accountBalance: number;
  symbol: string;
  entryPrice: number;
  stopLoss: number;
  riskPercentage: number;
  maxPositionValue?: number;
  timeframe?: string;
  volatility?: number;
}

export class EnhancedPositionSizingService {
  /**
   * Calculate position sizing options for LLM decision making
   */
  async calculatePositionSizingOptions(
    params: PositionSizingParams,
  ): Promise<PositionSizingOptions> {
    try {
      const {
        accountBalance,
        symbol,
        entryPrice,
        stopLoss,
        riskPercentage,
        maxPositionValue = accountBalance * 0.1, // Max 10% of account per trade
        timeframe = "1h",
        volatility = 1.0,
      } = params;

      // Calculate base risk amount
      const baseRiskAmount = accountBalance * (riskPercentage / 100);
      const stopDistance = Math.abs(entryPrice - stopLoss);

      if (stopDistance === 0) {
        throw new Error("Stop loss distance cannot be zero");
      }

      // Calculate different risk levels
      const riskPercentages = {
        conservative: Math.max(0.5, riskPercentage * 0.5), // 0.5-1%
        moderate: riskPercentage, // 1-2%
        aggressive: Math.min(3.0, riskPercentage * 1.5), // 1.5-3%
        maximum: Math.min(5.0, riskPercentage * 2.0), // 2-5%
      };

      // Calculate position sizes for each risk level
      const conservative = this.calculateSizeForRisk(
        accountBalance * (riskPercentages.conservative / 100),
        stopDistance,
        entryPrice,
        maxPositionValue,
        symbol,
      );

      const moderate = this.calculateSizeForRisk(
        accountBalance * (riskPercentages.moderate / 100),
        stopDistance,
        entryPrice,
        maxPositionValue,
        symbol,
      );

      const aggressive = this.calculateSizeForRisk(
        accountBalance * (riskPercentages.aggressive / 100),
        stopDistance,
        entryPrice,
        maxPositionValue,
        symbol,
      );

      const maximum = this.calculateSizeForRisk(
        accountBalance * (riskPercentages.maximum / 100),
        stopDistance,
        entryPrice,
        maxPositionValue,
        symbol,
      );

      // Apply volatility and timeframe adjustments
      const adjustedSizes = this.applyTimeframeAdjustments(
        {
          conservative,
          moderate,
          aggressive,
          maximum,
        },
        timeframe,
        volatility,
      );

      // Determine recommended size based on market conditions
      const recommended = this.determineRecommendedSize(adjustedSizes, {
        volatility,
        timeframe,
        symbol,
        accountBalance,
      });

      const reasoning = this.generatePositionSizingReasoning({
        accountBalance,
        symbol,
        timeframe,
        volatility,
        riskPercentages,
        recommended,
      });

      const result: PositionSizingOptions = {
        conservative: adjustedSizes.conservative,
        moderate: adjustedSizes.moderate,
        aggressive: adjustedSizes.aggressive,
        maximum: adjustedSizes.maximum,
        recommended,
        reasoning,
        riskPercentages,
      };

      logger.info(`📊 Position sizing options for ${symbol}:`, {
        accountBalance: `$${accountBalance}`,
        conservative: adjustedSizes.conservative,
        moderate: adjustedSizes.moderate,
        aggressive: adjustedSizes.aggressive,
        maximum: adjustedSizes.maximum,
        recommended,
      });

      return result;
    } catch (error) {
      logger.error(`❌ Position sizing calculation failed:`, error);

      await tradingErrorLogger.logPositionSizingError({
        botId: "sizing-service",
        symbol: params.symbol,
        errorMessage: error.message,
        accountBalance: params.accountBalance,
        requestedSize: 0,
      });

      // Return safe fallback
      return this.getFallbackSizing(params.accountBalance, params.symbol);
    }
  }

  private calculateSizeForRisk(
    riskAmount: number,
    stopDistance: number,
    entryPrice: number,
    maxPositionValue: number,
    symbol: string,
  ): number {
    // Base calculation: Risk Amount / Stop Distance = Position Size in units
    let positionSize = riskAmount / stopDistance;

    // Apply asset-specific constraints
    positionSize = this.applyAssetConstraints(positionSize, symbol, entryPrice);

    // Ensure position value doesn't exceed maximum
    const positionValue = positionSize * entryPrice;
    if (positionValue > maxPositionValue) {
      positionSize = maxPositionValue / entryPrice;
    }

    // Ensure minimum viable position size
    positionSize = Math.max(positionSize, this.getMinimumPositionSize(symbol));

    return Number(positionSize.toFixed(this.getDecimalPlaces(symbol)));
  }

  private applyAssetConstraints(size: number, symbol: string, entryPrice: number): number {
    const normalizedSymbol = symbol.toUpperCase().replace(/[\/\-_]/g, "");

    if (this.isCryptoPair(normalizedSymbol)) {
      // Crypto constraints
      if (normalizedSymbol.includes("BTC")) {
        return Math.min(Math.max(size, 0.001), 5.0); // 0.001 - 5 BTC
      } else if (normalizedSymbol.includes("ETH")) {
        return Math.min(Math.max(size, 0.01), 50.0); // 0.01 - 50 ETH
      } else {
        return Math.min(Math.max(size, 0.1), 1000.0); // Other crypto
      }
    } else if (this.isForexPair(normalizedSymbol)) {
      // Forex constraints (in lots)
      return Math.min(Math.max(size, 0.01), 100.0); // 0.01 - 100 lots
    } else if (this.isIndexPair(normalizedSymbol)) {
      // Index constraints
      return Math.min(Math.max(size, 0.1), 50.0); // 0.1 - 50 units
    } else {
      // Commodity/other constraints
      return Math.min(Math.max(size, 0.01), 100.0);
    }
  }

  private applyTimeframeAdjustments(
    sizes: { conservative: number; moderate: number; aggressive: number; maximum: number },
    timeframe: string,
    volatility: number,
  ) {
    // Timeframe risk adjustment multipliers
    const timeframeMultipliers = {
      "1m": 0.3, // Very conservative for scalping
      "5m": 0.5, // Conservative for short-term
      "15m": 0.7, // Moderate for short-term
      "1h": 1.0, // Base multiplier
      "4h": 1.2, // Slightly more aggressive
      "1d": 1.5, // More aggressive for swing trading
    };

    const multiplier = timeframeMultipliers[timeframe as keyof typeof timeframeMultipliers] || 1.0;

    // Volatility adjustment (reduce size in high volatility)
    const volatilityAdjustment = Math.max(0.5, Math.min(1.5, 1 / Math.sqrt(volatility)));

    const finalMultiplier = multiplier * volatilityAdjustment;

    return {
      conservative: Number((sizes.conservative * finalMultiplier * 0.8).toFixed(8)), // Extra conservative
      moderate: Number((sizes.moderate * finalMultiplier).toFixed(8)),
      aggressive: Number((sizes.aggressive * finalMultiplier * 1.1).toFixed(8)),
      maximum: Number((sizes.maximum * finalMultiplier * 1.2).toFixed(8)),
    };
  }

  private determineRecommendedSize(
    sizes: { conservative: number; moderate: number; aggressive: number; maximum: number },
    context: { volatility: number; timeframe: string; symbol: string; accountBalance: number },
  ): number {
    const { volatility, timeframe, symbol, accountBalance } = context;

    // Start with moderate as base
    let recommended = sizes.moderate;

    // Adjust based on market conditions
    if (volatility > 2.0) {
      // High volatility - lean conservative
      recommended = (sizes.conservative + sizes.moderate) / 2;
    } else if (volatility < 0.5) {
      // Low volatility - can be more aggressive
      recommended = (sizes.moderate + sizes.aggressive) / 2;
    }

    // Adjust based on timeframe
    if (timeframe === "1m" || timeframe === "5m") {
      // Short timeframes - more conservative
      recommended = Math.min(recommended, sizes.conservative * 1.5);
    } else if (timeframe === "1d") {
      // Daily timeframe - can be more aggressive
      recommended = Math.min(recommended, sizes.aggressive);
    }

    // Account balance consideration
    if (accountBalance < 1000) {
      // Small account - more conservative
      recommended = sizes.conservative;
    } else if (accountBalance > 10000) {
      // Larger account - can handle more risk
      recommended = Math.min(recommended * 1.1, sizes.aggressive);
    }

    return Number(recommended.toFixed(this.getDecimalPlaces(symbol)));
  }

  private generatePositionSizingReasoning(params: {
    accountBalance: number;
    symbol: string;
    timeframe: string;
    volatility: number;
    riskPercentages: any;
    recommended: number;
  }): string {
    const { accountBalance, symbol, timeframe, volatility, riskPercentages, recommended } = params;

    let reasoning = `Position sizing analysis for ${symbol}:\n`;
    reasoning += `• Account: $${accountBalance.toLocaleString()}\n`;
    reasoning += `• Timeframe: ${timeframe}\n`;
    reasoning += `• Volatility: ${volatility.toFixed(2)}x\n`;
    reasoning += `• Risk levels: Conservative ${riskPercentages.conservative}%, Moderate ${riskPercentages.moderate}%, Aggressive ${riskPercentages.aggressive}%\n`;
    reasoning += `• Recommended: ${recommended} units\n`;

    if (volatility > 2.0) {
      reasoning += `• High volatility detected - recommending conservative sizing\n`;
    } else if (volatility < 0.5) {
      reasoning += `• Low volatility environment - allowing larger position sizes\n`;
    }

    if (timeframe === "1m" || timeframe === "5m") {
      reasoning += `• Short timeframe - reduced position size for scalping safety\n`;
    } else if (timeframe === "1d") {
      reasoning += `• Daily timeframe - increased position size for swing trading\n`;
    }

    return reasoning;
  }

  private getFallbackSizing(accountBalance: number, symbol: string): PositionSizingOptions {
    const baseSize = this.getMinimumPositionSize(symbol);

    return {
      conservative: baseSize,
      moderate: baseSize * 2,
      aggressive: baseSize * 3,
      maximum: baseSize * 5,
      recommended: baseSize,
      reasoning: `Fallback sizing due to calculation error. Using minimum safe sizes.`,
      riskPercentages: {
        conservative: 0.5,
        moderate: 1.0,
        aggressive: 2.0,
        maximum: 3.0,
      },
    };
  }

  private getMinimumPositionSize(symbol: string): number {
    const normalizedSymbol = symbol.toUpperCase().replace(/[\/\-_]/g, "");

    if (this.isCryptoPair(normalizedSymbol)) {
      if (normalizedSymbol.includes("BTC")) return 0.001;
      if (normalizedSymbol.includes("ETH")) return 0.01;
      return 0.1;
    } else if (this.isForexPair(normalizedSymbol)) {
      return 0.01; // 0.01 lots
    } else {
      return 0.1; // Indices/commodities
    }
  }

  private getDecimalPlaces(symbol: string): number {
    const normalizedSymbol = symbol.toUpperCase().replace(/[\/\-_]/g, "");

    if (this.isCryptoPair(normalizedSymbol)) {
      if (normalizedSymbol.includes("BTC")) return 6;
      if (normalizedSymbol.includes("ETH")) return 4;
      return 2;
    } else if (this.isForexPair(normalizedSymbol)) {
      return 2;
    } else {
      return 1;
    }
  }

  private isCryptoPair(symbol: string): boolean {
    const cryptoPatterns = ["BTC", "ETH", "XRP", "LTC", "ADA", "DOT", "LINK", "UNI", "SOL", "AVAX"];
    return cryptoPatterns.some((pattern) => symbol.includes(pattern));
  }

  private isForexPair(symbol: string): boolean {
    const forexPatterns = ["USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "NZD"];
    const hasBaseCurrency = forexPatterns.some((currency) => symbol.startsWith(currency));
    const hasQuoteCurrency = forexPatterns.some((currency) => symbol.endsWith(currency));
    return hasBaseCurrency && hasQuoteCurrency && symbol.length <= 6;
  }

  private isIndexPair(symbol: string): boolean {
    const indexPatterns = ["US30", "SPX500", "NAS100", "GER40", "UK100", "JPN225"];
    return indexPatterns.some((pattern) => symbol.includes(pattern));
  }

  /**
   * Format position sizing options for LLM prompt
   */
  formatForLLMPrompt(options: PositionSizingOptions): string {
    return `
POSITION SIZING OPTIONS (Choose ONE):

1. CONSERVATIVE: ${options.conservative} units (${options.riskPercentages.conservative}% risk)
   - Safest option, minimal account impact
   - Recommended for high volatility or uncertain setups

2. MODERATE: ${options.moderate} units (${options.riskPercentages.moderate}% risk)
   - Balanced risk/reward approach
   - Standard position sizing for most trades

3. AGGRESSIVE: ${options.aggressive} units (${options.riskPercentages.aggressive}% risk)
   - Higher risk for stronger setups
   - Only use with high-confidence signals

4. MAXIMUM: ${options.maximum} units (${options.riskPercentages.maximum}% risk)
   - Highest allowable risk
   - Reserve for exceptional opportunities only

5. RECOMMENDED: ${options.recommended} units
   - AI-calculated optimal size based on current conditions
   - Considers volatility, timeframe, and account size

REASONING: ${options.reasoning}

Select the position size that matches your confidence level and market analysis.
`;
  }
}

// Export singleton instance
export const enhancedPositionSizingService = new EnhancedPositionSizingService();
