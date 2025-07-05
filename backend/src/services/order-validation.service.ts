import { logger } from "../logger";
import { CandleData } from "../agents/core/technical-analysis.agent";

export interface OrderValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  corrections?: {
    adjustedStopLoss?: number;
    adjustedTakeProfit?: number;
    adjustedPositionSize?: number;
    adjustedOrderType?: "MARKET" | "LIMIT" | "STOP";
  };
}

export interface OrderValidationConfig {
  symbol: string;
  side: "BUY" | "SELL";
  orderType: "MARKET" | "LIMIT" | "STOP";
  size: number;
  price?: number; // Current or entry price
  limitPrice?: number; // For LIMIT orders
  stopPrice?: number; // For STOP orders
  stopLoss?: number;
  takeProfit?: number;
  timeframe: string;
  accountBalance: number;
  currentPrice: number;
  candleData?: CandleData[];
}

export class OrderValidationService {
  private readonly minPositionSize = 0.0001; // Minimum position size
  private readonly maxPositionSize = 10; // Maximum position size for safety
  private readonly minStopDistance = 0.0001; // Minimum distance for stop loss (0.01%)
  private readonly maxStopDistance = 0.5; // Maximum distance for stop loss (50%)
  private readonly minRiskRewardRatio = 1; // Minimum 1:1 risk/reward
  private readonly maxRiskRewardRatio = 10; // Maximum 10:1 risk/reward

  /**
   * Validate an order configuration
   */
  async validateOrder(config: OrderValidationConfig): Promise<OrderValidationResult> {
    logger.debug(
      `🔍 Validating order: ${config.orderType} ${config.side} ${config.size} ${config.symbol}`,
    );

    const result: OrderValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      corrections: {},
    };

    // Validate basic order parameters
    this.validateBasicParameters(config, result);

    // Validate order type specific parameters
    this.validateOrderTypeParameters(config, result);

    // Validate position sizing
    this.validatePositionSizing(config, result);

    // Validate stop loss and take profit
    this.validateStopLossAndTakeProfit(config, result);

    // Validate risk management
    this.validateRiskManagement(config, result);

    // Validate market conditions
    this.validateMarketConditions(config, result);

    // Apply automatic corrections if possible
    this.applyAutomaticCorrections(config, result);

    // Final validation
    result.isValid = result.errors.length === 0;

    if (result.isValid) {
      logger.info(`✅ Order validation passed for ${config.symbol}`);
    } else {
      logger.warn(`⚠️ Order validation failed for ${config.symbol}: ${result.errors.join(", ")}`);
    }

    if (result.warnings.length > 0) {
      logger.info(`ℹ️ Order validation warnings: ${result.warnings.join(", ")}`);
    }

    return result;
  }

  /**
   * Validate basic order parameters
   */
  private validateBasicParameters(
    config: OrderValidationConfig,
    result: OrderValidationResult,
  ): void {
    // Validate symbol
    if (!config.symbol || config.symbol.trim() === "") {
      result.errors.push("Symbol is required");
    }

    // Validate side
    if (!config.side || !["BUY", "SELL"].includes(config.side)) {
      result.errors.push("Side must be BUY or SELL");
    }

    // Validate order type
    if (!config.orderType || !["MARKET", "LIMIT", "STOP"].includes(config.orderType)) {
      result.errors.push("Order type must be MARKET, LIMIT, or STOP");
    }

    // Validate size
    if (!config.size || config.size <= 0) {
      result.errors.push("Position size must be positive");
    } else if (config.size < this.minPositionSize) {
      result.warnings.push(`Position size ${config.size} is below minimum ${this.minPositionSize}`);
      result.corrections!.adjustedPositionSize = this.minPositionSize;
    } else if (config.size > this.maxPositionSize) {
      result.errors.push(`Position size ${config.size} exceeds maximum ${this.maxPositionSize}`);
    }

    // Validate current price
    if (!config.currentPrice || config.currentPrice <= 0) {
      result.errors.push("Current price must be positive");
    }

    // Validate account balance
    if (!config.accountBalance || config.accountBalance <= 0) {
      result.warnings.push("Account balance not available for position size validation");
    }
  }

  /**
   * Validate order type specific parameters
   */
  private validateOrderTypeParameters(
    config: OrderValidationConfig,
    result: OrderValidationResult,
  ): void {
    switch (config.orderType) {
      case "LIMIT":
        if (!config.limitPrice || config.limitPrice <= 0) {
          result.errors.push("Limit price is required for LIMIT orders");
        } else {
          this.validateLimitPrice(config, result);
        }
        break;

      case "STOP":
        if (!config.stopPrice || config.stopPrice <= 0) {
          result.errors.push("Stop price is required for STOP orders");
        } else {
          this.validateStopPrice(config, result);
        }
        break;

      case "MARKET":
        // Market orders don't need additional price validation
        if (config.limitPrice || config.stopPrice) {
          result.warnings.push("Limit/Stop prices ignored for MARKET orders");
        }
        break;
    }
  }

  /**
   * Validate limit price for LIMIT orders
   */
  private validateLimitPrice(config: OrderValidationConfig, result: OrderValidationResult): void {
    const { side, currentPrice, limitPrice } = config;

    if (!limitPrice) return;

    if (side === "BUY") {
      // Buy limit orders should be below current price
      if (limitPrice >= currentPrice) {
        result.errors.push(
          `BUY limit price ${limitPrice} must be below current price ${currentPrice}`,
        );
      }
    } else {
      // Sell limit orders should be above current price
      if (limitPrice <= currentPrice) {
        result.errors.push(
          `SELL limit price ${limitPrice} must be above current price ${currentPrice}`,
        );
      }
    }

    // Check if limit price is reasonable (not too far from current price)
    const priceDifference = Math.abs(limitPrice - currentPrice) / currentPrice;
    if (priceDifference > 0.1) {
      // 10% difference
      result.warnings.push(
        `Limit price is ${(priceDifference * 100).toFixed(1)}% away from current price`,
      );
    }
  }

  /**
   * Validate stop price for STOP orders
   */
  private validateStopPrice(config: OrderValidationConfig, result: OrderValidationResult): void {
    const { side, currentPrice, stopPrice } = config;

    if (!stopPrice) return;

    if (side === "BUY") {
      // Buy stop orders should be above current price
      if (stopPrice <= currentPrice) {
        result.errors.push(
          `BUY stop price ${stopPrice} must be above current price ${currentPrice}`,
        );
      }
    } else {
      // Sell stop orders should be below current price
      if (stopPrice >= currentPrice) {
        result.errors.push(
          `SELL stop price ${stopPrice} must be below current price ${currentPrice}`,
        );
      }
    }

    // Check if stop price is reasonable
    const priceDifference = Math.abs(stopPrice - currentPrice) / currentPrice;
    if (priceDifference > 0.1) {
      // 10% difference
      result.warnings.push(
        `Stop price is ${(priceDifference * 100).toFixed(1)}% away from current price`,
      );
    }
  }

  /**
   * Validate position sizing
   */
  private validatePositionSizing(
    config: OrderValidationConfig,
    result: OrderValidationResult,
  ): void {
    const { size, currentPrice, accountBalance } = config;

    // Calculate position value
    const positionValue = size * currentPrice;

    // Check if position size is within account balance limits
    if (accountBalance > 0) {
      const positionPercentage = positionValue / accountBalance;

      if (positionPercentage > 0.5) {
        // 50% of account
        result.warnings.push(
          `Position represents ${(positionPercentage * 100).toFixed(1)}% of account balance`,
        );
      }

      if (positionPercentage > 1.0) {
        // Over 100% of account
        result.errors.push(
          `Position value ${positionValue.toFixed(2)} exceeds account balance ${accountBalance.toFixed(2)}`,
        );
      }
    }

    // Check for reasonable position sizes based on symbol
    this.validateSymbolSpecificSizing(config, result);
  }

  /**
   * Validate symbol-specific position sizing
   */
  private validateSymbolSpecificSizing(
    config: OrderValidationConfig,
    result: OrderValidationResult,
  ): void {
    const { symbol, size } = config;
    const symbolUpper = symbol.toUpperCase();

    // Bitcoin limits
    if (symbolUpper.includes("BTC")) {
      if (size > 1) {
        result.warnings.push(`Large BTC position: ${size} BTC`);
      }
    }

    // Ethereum limits
    if (symbolUpper.includes("ETH")) {
      if (size > 10) {
        result.warnings.push(`Large ETH position: ${size} ETH`);
      }
    }

    // Forex pairs
    if (symbolUpper.includes("USD") || symbolUpper.includes("EUR") || symbolUpper.includes("GBP")) {
      if (size > 100000) {
        // 100k units
        result.warnings.push(`Large forex position: ${size} units`);
      }
    }
  }

  /**
   * Validate stop loss and take profit levels
   */
  private validateStopLossAndTakeProfit(
    config: OrderValidationConfig,
    result: OrderValidationResult,
  ): void {
    const { side, currentPrice, stopLoss, takeProfit } = config;
    const entryPrice = config.limitPrice || config.stopPrice || currentPrice;

    // Validate stop loss
    if (stopLoss) {
      this.validateStopLoss(config, entryPrice, result);
    }

    // Validate take profit
    if (takeProfit) {
      this.validateTakeProfit(config, entryPrice, result);
    }

    // Validate risk/reward ratio
    if (stopLoss && takeProfit) {
      this.validateRiskRewardRatio(config, entryPrice, result);
    }
  }

  /**
   * Validate stop loss level
   */
  private validateStopLoss(
    config: OrderValidationConfig,
    entryPrice: number,
    result: OrderValidationResult,
  ): void {
    const { side, stopLoss } = config;

    if (!stopLoss) return;

    if (side === "BUY") {
      // Stop loss should be below entry price for BUY
      if (stopLoss >= entryPrice) {
        result.errors.push(
          `Stop loss ${stopLoss} must be below entry price ${entryPrice} for BUY orders`,
        );
      }
    } else {
      // Stop loss should be above entry price for SELL
      if (stopLoss <= entryPrice) {
        result.errors.push(
          `Stop loss ${stopLoss} must be above entry price ${entryPrice} for SELL orders`,
        );
      }
    }

    // Check stop loss distance
    const stopDistance = Math.abs(entryPrice - stopLoss) / entryPrice;

    if (stopDistance < this.minStopDistance) {
      result.warnings.push(
        `Stop loss too close: ${(stopDistance * 100).toFixed(2)}% (min: ${(this.minStopDistance * 100).toFixed(2)}%)`,
      );
    }

    if (stopDistance > this.maxStopDistance) {
      result.warnings.push(
        `Stop loss very far: ${(stopDistance * 100).toFixed(2)}% (max: ${(this.maxStopDistance * 100).toFixed(2)}%)`,
      );
    }
  }

  /**
   * Validate take profit level
   */
  private validateTakeProfit(
    config: OrderValidationConfig,
    entryPrice: number,
    result: OrderValidationResult,
  ): void {
    const { side, takeProfit } = config;

    if (!takeProfit) return;

    if (side === "BUY") {
      // Take profit should be above entry price for BUY
      if (takeProfit <= entryPrice) {
        result.errors.push(
          `Take profit ${takeProfit} must be above entry price ${entryPrice} for BUY orders`,
        );
      }
    } else {
      // Take profit should be below entry price for SELL
      if (takeProfit >= entryPrice) {
        result.errors.push(
          `Take profit ${takeProfit} must be below entry price ${entryPrice} for SELL orders`,
        );
      }
    }
  }

  /**
   * Validate risk/reward ratio
   */
  private validateRiskRewardRatio(
    config: OrderValidationConfig,
    entryPrice: number,
    result: OrderValidationResult,
  ): void {
    const { side, stopLoss, takeProfit } = config;

    if (!stopLoss || !takeProfit) return;

    const risk = Math.abs(entryPrice - stopLoss);
    const reward = Math.abs(takeProfit - entryPrice);
    const riskRewardRatio = reward / risk;

    if (riskRewardRatio < this.minRiskRewardRatio) {
      result.warnings.push(
        `Poor risk/reward ratio: 1:${riskRewardRatio.toFixed(2)} (min: 1:${this.minRiskRewardRatio})`,
      );
    }

    if (riskRewardRatio > this.maxRiskRewardRatio) {
      result.warnings.push(
        `Very high risk/reward ratio: 1:${riskRewardRatio.toFixed(2)} (check if realistic)`,
      );
    }
  }

  /**
   * Validate risk management
   */
  private validateRiskManagement(
    config: OrderValidationConfig,
    result: OrderValidationResult,
  ): void {
    const { size, currentPrice, accountBalance, stopLoss } = config;

    if (accountBalance <= 0) return;

    const positionValue = size * currentPrice;
    const accountRiskPercentage = (positionValue / accountBalance) * 100;

    // Check account risk
    if (accountRiskPercentage > 10) {
      // 10% of account in one trade
      result.warnings.push(`High account risk: ${accountRiskPercentage.toFixed(1)}% of account`);
    }

    // Check stop loss risk if available
    if (stopLoss) {
      const entryPrice = config.limitPrice || config.stopPrice || currentPrice;
      const potentialLoss = Math.abs(entryPrice - stopLoss) * size;
      const lossPercentage = (potentialLoss / accountBalance) * 100;

      if (lossPercentage > 2) {
        // 2% account risk per trade
        result.warnings.push(`High stop loss risk: ${lossPercentage.toFixed(1)}% of account`);
      }
    }
  }

  /**
   * Validate market conditions
   */
  private validateMarketConditions(
    config: OrderValidationConfig,
    result: OrderValidationResult,
  ): void {
    const { timeframe, candleData } = config;

    // Validate timeframe for order type
    if (config.orderType === "LIMIT" && (timeframe === "M1" || timeframe === "M5")) {
      result.warnings.push("LIMIT orders may not fill quickly in scalping timeframes");
    }

    // Validate based on recent volatility
    if (candleData && candleData.length > 10) {
      const recentVolatility = this.calculateRecentVolatility(candleData);

      if (config.orderType === "LIMIT" && recentVolatility > 0.02) {
        result.warnings.push("High volatility may prevent LIMIT order fills");
      }

      if (config.orderType === "STOP" && recentVolatility < 0.005) {
        result.warnings.push("Low volatility may not trigger STOP orders");
      }
    }
  }

  /**
   * Apply automatic corrections
   */
  private applyAutomaticCorrections(
    config: OrderValidationConfig,
    result: OrderValidationResult,
  ): void {
    // Auto-correct position size if needed
    if (result.corrections?.adjustedPositionSize) {
      result.warnings.push(
        `Position size adjusted from ${config.size} to ${result.corrections.adjustedPositionSize}`,
      );
    }

    // Auto-correct order type for extreme volatility
    if (config.candleData && config.candleData.length > 10) {
      const volatility = this.calculateRecentVolatility(config.candleData);

      if (volatility > 0.03 && config.orderType === "LIMIT") {
        result.corrections!.adjustedOrderType = "MARKET";
        result.warnings.push("High volatility: recommending MARKET order instead of LIMIT");
      }
    }
  }

  /**
   * Calculate recent volatility from candle data
   */
  private calculateRecentVolatility(candleData: CandleData[]): number {
    if (candleData.length < 10) return 0.01;

    const returns = [];
    for (let i = 1; i < Math.min(candleData.length, 20); i++) {
      const prevClose = candleData[i - 1].close;
      const currentClose = candleData[i].close;
      const return_ = (currentClose - prevClose) / prevClose;
      returns.push(return_);
    }

    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance =
      returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    return Math.sqrt(variance);
  }
}
