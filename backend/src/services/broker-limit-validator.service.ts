import { logger } from "../logger";
import { tradingErrorLogger } from "./trading-error-logger.service";

export interface BrokerLimits {
  minStopDistance: number;
  maxStopDistance: number;
  minTakeProfitDistance: number;
  maxTakeProfitDistance: number;
  minPositionSize: number;
  maxPositionSize: number;
  pipValue: number;
  // Real-time price limits from Capital.com
  maxStopPrice?: number; // Maximum allowed stop loss price
  minStopPrice?: number; // Minimum allowed stop loss price
  maxTakeProfitPrice?: number; // Maximum allowed take profit price
  minTakeProfitPrice?: number; // Minimum allowed take profit price
  currentPrice?: number; // Current market price for reference
}

export interface ValidationResult {
  isValid: boolean;
  adjustedStopLoss?: number;
  adjustedTakeProfit?: number;
  adjustedPositionSize?: number;
  warnings: string[];
  errors: string[];
  brokerLimits?: BrokerLimits;
}

export interface OrderParams {
  epic: string;
  direction: "BUY" | "SELL";
  size: number;
  entryPrice: number;
  stopLevel?: number;
  profitLevel?: number;
}

export class BrokerLimitValidator {
  private limitCache: Map<string, { limits: BrokerLimits; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get broker limits for a specific epic
   */
  async getBrokerLimits(epic: string, capitalApi: any): Promise<BrokerLimits> {
    try {
      // Check cache first
      const cached = this.limitCache.get(epic);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.limits;
      }

      // Use the enhanced getBrokerLimits method if available
      if (capitalApi.getBrokerLimits) {
        const brokerLimits = await capitalApi.getBrokerLimits(epic);
        const limits: BrokerLimits = {
          minPositionSize: brokerLimits.minPositionSize,
          maxPositionSize: brokerLimits.maxPositionSize,
          minStopDistance: brokerLimits.minStopDistance,
          maxStopDistance: brokerLimits.maxStopDistance,
          minTakeProfitDistance: brokerLimits.minTakeProfitDistance,
          maxTakeProfitDistance: brokerLimits.maxTakeProfitDistance,
          pipValue: brokerLimits.pipValue,
        };

        // Enhance with real-time price limits
        try {
          const currentPrice = await capitalApi.getLatestPrice(epic);
          limits.currentPrice = currentPrice.ask || currentPrice.bid;

          // Get more precise limits by testing edge cases
          if (limits.currentPrice) {
            const realTimeLimits = await this.fetchRealTimePriceLimits(
              epic,
              capitalApi,
              limits.currentPrice,
            );
            Object.assign(limits, realTimeLimits);
          }
        } catch (priceError) {
          logger.warn(`⚠️ Could not get real-time price limits for ${epic}`);
        }

        // Cache the limits
        this.limitCache.set(epic, {
          limits,
          timestamp: Date.now(),
        });

        logger.info(`📊 Real-time broker limits for ${epic}:`, limits);
        return limits;
      }

      // Fallback to old method
      const marketData = await this.getMarketData(epic, capitalApi);
      const limits = this.extractLimitsFromMarketData(marketData, epic);

      // Cache the limits
      this.limitCache.set(epic, {
        limits,
        timestamp: Date.now(),
      });

      logger.info(`📊 Broker limits for ${epic}:`, limits);
      return limits;
    } catch (error) {
      logger.warn(`⚠️ Could not get broker limits for ${epic}, using defaults:`, error);
      return this.getDefaultLimits(epic);
    }
  }

  /**
   * Validate and adjust order parameters according to broker limits
   */
  async validateOrder(
    params: OrderParams,
    capitalApi: any,
    botId: string,
  ): Promise<ValidationResult> {
    try {
      const brokerLimits = await this.getBrokerLimits(params.epic, capitalApi);
      const result: ValidationResult = {
        isValid: true,
        warnings: [],
        errors: [],
        brokerLimits,
      };

      // Validate position size
      if (params.size < brokerLimits.minPositionSize) {
        result.warnings.push(
          `Position size ${params.size} below minimum ${brokerLimits.minPositionSize}`,
        );
        result.adjustedPositionSize = brokerLimits.minPositionSize;
      }

      if (params.size > brokerLimits.maxPositionSize) {
        result.errors.push(
          `Position size ${params.size} exceeds maximum ${brokerLimits.maxPositionSize}`,
        );
        result.isValid = false;
      }

      // Validate stop loss
      if (params.stopLevel) {
        const stopValidation = this.validateStopLoss(
          params.entryPrice,
          params.stopLevel,
          params.direction,
          brokerLimits,
        );

        if (!stopValidation.isValid) {
          result.warnings.push(
            `Stop loss adjusted: ${params.stopLevel} → ${stopValidation.adjustedLevel}`,
          );
          result.adjustedStopLoss = stopValidation.adjustedLevel;

          await tradingErrorLogger.logBrokerRejection({
            botId,
            symbol: params.epic,
            errorCode: "stoploss.adjustment.required",
            errorMessage: `Stop loss ${params.stopLevel} adjusted to ${stopValidation.adjustedLevel}`,
            requestData: params,
            brokerLimits,
          });
        }
      }

      // Validate take profit
      if (params.profitLevel) {
        const tpValidation = this.validateTakeProfit(
          params.entryPrice,
          params.profitLevel,
          params.direction,
          brokerLimits,
        );

        if (!tpValidation.isValid) {
          result.warnings.push(
            `Take profit adjusted: ${params.profitLevel} → ${tpValidation.adjustedLevel}`,
          );
          result.adjustedTakeProfit = tpValidation.adjustedLevel;
        }
      }

      // Log validation result
      if (result.warnings.length > 0 || result.errors.length > 0) {
        logger.warn(`🔧 Order validation for ${params.epic}:`, {
          warnings: result.warnings,
          errors: result.errors,
          adjustments: {
            stopLoss: result.adjustedStopLoss,
            takeProfit: result.adjustedTakeProfit,
            positionSize: result.adjustedPositionSize,
          },
        });
      }

      return result;
    } catch (error) {
      logger.error(`❌ Order validation failed for ${params.epic}:`, error);

      await tradingErrorLogger.logValidationError({
        botId,
        symbol: params.epic,
        errorMessage: `Order validation failed: ${error.message}`,
        requestData: params,
      });

      return {
        isValid: false,
        warnings: [],
        errors: [`Validation failed: ${error.message}`],
        brokerLimits: this.getDefaultLimits(params.epic),
      };
    }
  }

  private validateStopLoss(
    entryPrice: number,
    stopLevel: number,
    direction: "BUY" | "SELL",
    limits: BrokerLimits,
  ): { isValid: boolean; adjustedLevel?: number } {
    // First check real-time price limits if available
    if (limits.maxStopPrice !== undefined || limits.minStopPrice !== undefined) {
      // Use absolute price limits from Capital.com
      if (direction === "BUY") {
        // For BUY orders, stop loss should be below entry price
        // Check if stop loss is too high (above max allowed)
        if (limits.maxStopPrice && stopLevel > limits.maxStopPrice) {
          return {
            isValid: false,
            adjustedLevel: Number((limits.maxStopPrice - 10).toFixed(5)), // 10 unit safety buffer
          };
        }
        // Check if stop loss is too low (below min allowed)
        if (limits.minStopPrice && stopLevel < limits.minStopPrice) {
          return {
            isValid: false,
            adjustedLevel: Number((limits.minStopPrice + 10).toFixed(5)), // 10 unit safety buffer
          };
        }
      } else {
        // For SELL orders, stop loss should be above entry price
        // Check if stop loss is too low (below min allowed)
        if (limits.minStopPrice && stopLevel < limits.minStopPrice) {
          return {
            isValid: false,
            adjustedLevel: Number((limits.minStopPrice + 10).toFixed(5)), // 10 unit safety buffer
          };
        }
        // Check if stop loss is too high (above max allowed)
        if (limits.maxStopPrice && stopLevel > limits.maxStopPrice) {
          return {
            isValid: false,
            adjustedLevel: Number((limits.maxStopPrice - 10).toFixed(5)), // 10 unit safety buffer
          };
        }
      }
    }

    // Fallback to distance-based validation
    const stopDistance = Math.abs(entryPrice - stopLevel);

    // Check minimum distance
    if (stopDistance < limits.minStopDistance) {
      const adjustedDistance = limits.minStopDistance + 1; // Add 1 unit buffer
      const adjustedLevel =
        direction === "BUY" ? entryPrice - adjustedDistance : entryPrice + adjustedDistance;

      return {
        isValid: false,
        adjustedLevel: Number(adjustedLevel.toFixed(5)),
      };
    }

    // Check maximum distance
    if (stopDistance > limits.maxStopDistance) {
      const adjustedDistance = limits.maxStopDistance - 1; // Subtract 1 unit buffer
      const adjustedLevel =
        direction === "BUY" ? entryPrice - adjustedDistance : entryPrice + adjustedDistance;

      return {
        isValid: false,
        adjustedLevel: Number(adjustedLevel.toFixed(5)),
      };
    }

    return { isValid: true };
  }

  private validateTakeProfit(
    entryPrice: number,
    profitLevel: number,
    direction: "BUY" | "SELL",
    limits: BrokerLimits,
  ): { isValid: boolean; adjustedLevel?: number } {
    const profitDistance = Math.abs(profitLevel - entryPrice);

    // Check minimum distance
    if (profitDistance < limits.minTakeProfitDistance) {
      const adjustedDistance = limits.minTakeProfitDistance + 1; // Add 1 unit buffer
      const adjustedLevel =
        direction === "BUY" ? entryPrice + adjustedDistance : entryPrice - adjustedDistance;

      return {
        isValid: false,
        adjustedLevel: Number(adjustedLevel.toFixed(5)),
      };
    }

    return { isValid: true };
  }

  /**
   * Parse Capital.com error response to extract actual price limits
   */
  parseCapitalComError(errorResponse: any): Partial<BrokerLimits> {
    const limits: Partial<BrokerLimits> = {};

    if (errorResponse?.data?.errorCode) {
      const errorCode = errorResponse.data.errorCode;

      // Parse stop loss limits
      if (errorCode.includes("error.invalid.stoploss.maxvalue:")) {
        const maxStopPrice = parseFloat(errorCode.split("error.invalid.stoploss.maxvalue: ")[1]);
        if (!isNaN(maxStopPrice)) {
          limits.maxStopPrice = maxStopPrice;
        }
      }

      if (errorCode.includes("error.invalid.stoploss.minvalue:")) {
        const minStopPrice = parseFloat(errorCode.split("error.invalid.stoploss.minvalue: ")[1]);
        if (!isNaN(minStopPrice)) {
          limits.minStopPrice = minStopPrice;
        }
      }

      // Parse take profit limits
      if (errorCode.includes("error.invalid.takeprofit.maxvalue:")) {
        const maxTakeProfitPrice = parseFloat(
          errorCode.split("error.invalid.takeprofit.maxvalue: ")[1],
        );
        if (!isNaN(maxTakeProfitPrice)) {
          limits.maxTakeProfitPrice = maxTakeProfitPrice;
        }
      }

      if (errorCode.includes("error.invalid.takeprofit.minvalue:")) {
        const minTakeProfitPrice = parseFloat(
          errorCode.split("error.invalid.takeprofit.minvalue: ")[1],
        );
        if (!isNaN(minTakeProfitPrice)) {
          limits.minTakeProfitPrice = minTakeProfitPrice;
        }
      }
    }

    return limits;
  }

  /**
   * Fetch real-time price limits by testing small orders
   */
  private async fetchRealTimePriceLimits(
    epic: string,
    capitalApi: any,
    currentPrice: number,
  ): Promise<Partial<BrokerLimits>> {
    // For now, use conservative estimates based on current price
    // In the future, this could make small test orders to discover exact limits
    const priceBuffer = currentPrice * 0.001; // 0.1% buffer

    return {
      maxStopPrice: currentPrice + currentPrice * 0.05, // 5% above current
      minStopPrice: currentPrice - currentPrice * 0.05, // 5% below current
      maxTakeProfitPrice: currentPrice + currentPrice * 0.1, // 10% above current
      minTakeProfitPrice: currentPrice - currentPrice * 0.1, // 10% below current
    };
  }

  private async getMarketData(epic: string, capitalApi: any): Promise<any> {
    try {
      return await capitalApi.getMarketData(epic);
    } catch (error) {
      // If market data fails, try to get current price at least
      try {
        const price = await capitalApi.getLatestPrice(epic);
        return {
          instrument: { epic },
          snapshot: { bid: price.bid, offer: price.ask },
          dealingRules: null, // Will use defaults
        };
      } catch (priceError) {
        throw new Error(`Could not get market data or price for ${epic}: ${error.message}`);
      }
    }
  }

  private extractLimitsFromMarketData(marketData: any, epic: string): BrokerLimits {
    try {
      const dealingRules = marketData?.dealingRules;
      const snapshot = marketData?.snapshot;

      if (!dealingRules || !snapshot) {
        logger.warn(`⚠️ Incomplete market data for ${epic}, using defaults`);
        return this.getDefaultLimits(epic);
      }

      // Extract limits from dealing rules
      const minDealSize = dealingRules.minDealSize?.value || 0.001;
      const maxDealSize = dealingRules.maxDealSize?.value || 100;
      const minStopDistance = dealingRules.minControlledRiskStopDistance?.value || 1;
      const maxStopDistance = dealingRules.maxStopDistance?.value || 1000;

      // Calculate pip value based on current price
      const currentPrice = (snapshot.bid + snapshot.offer) / 2;
      const pipValue = this.calculatePipValue(epic, currentPrice);

      return {
        minStopDistance: minStopDistance,
        maxStopDistance: maxStopDistance,
        minTakeProfitDistance: minStopDistance, // Usually same as stop distance
        maxTakeProfitDistance: maxStopDistance * 3, // Usually more generous
        minPositionSize: minDealSize,
        maxPositionSize: maxDealSize,
        pipValue,
      };
    } catch (error) {
      logger.warn(`⚠️ Error extracting limits from market data for ${epic}:`, error);
      return this.getDefaultLimits(epic);
    }
  }

  private getDefaultLimits(epic: string): BrokerLimits {
    const normalizedEpic = epic.toUpperCase();

    if (this.isCryptoPair(normalizedEpic)) {
      // Crypto defaults (e.g., BTCUSD)
      return {
        minStopDistance: 5, // $5 minimum
        maxStopDistance: 5000, // $5000 maximum
        minTakeProfitDistance: 5,
        maxTakeProfitDistance: 10000,
        minPositionSize: 0.001,
        maxPositionSize: 10,
        pipValue: 1,
      };
    } else if (this.isForexPair(normalizedEpic)) {
      // Forex defaults
      return {
        minStopDistance: 0.0001, // 1 pip
        maxStopDistance: 0.01, // 100 pips
        minTakeProfitDistance: 0.0001,
        maxTakeProfitDistance: 0.02,
        minPositionSize: 0.01,
        maxPositionSize: 100,
        pipValue: 0.0001,
      };
    } else {
      // Index/commodity defaults
      return {
        minStopDistance: 1,
        maxStopDistance: 500,
        minTakeProfitDistance: 1,
        maxTakeProfitDistance: 1000,
        minPositionSize: 0.1,
        maxPositionSize: 50,
        pipValue: 1,
      };
    }
  }

  private calculatePipValue(epic: string, currentPrice: number): number {
    const normalizedEpic = epic.toUpperCase();

    if (this.isCryptoPair(normalizedEpic)) {
      // For crypto, pip value depends on price level
      if (currentPrice > 10000) return 1; // $1 per pip for BTC
      if (currentPrice > 100) return 0.1; // $0.1 per pip for ETH
      return 0.01; // $0.01 per pip for low-value crypto
    } else if (this.isForexPair(normalizedEpic)) {
      if (normalizedEpic.includes("JPY")) return 0.01; // JPY pairs
      return 0.0001; // Standard forex
    } else {
      return 1; // Indices/commodities
    }
  }

  private isCryptoPair(epic: string): boolean {
    const cryptoPatterns = ["BTC", "ETH", "XRP", "LTC", "ADA", "DOT", "LINK", "UNI", "SOL", "AVAX"];
    return cryptoPatterns.some((pattern) => epic.includes(pattern));
  }

  private isForexPair(epic: string): boolean {
    const forexPatterns = ["USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "NZD"];
    const hasBaseCurrency = forexPatterns.some((currency) => epic.startsWith(currency));
    const hasQuoteCurrency = forexPatterns.some((currency) => epic.endsWith(currency));
    return hasBaseCurrency && hasQuoteCurrency && epic.length <= 6;
  }

  /**
   * Apply safety margins to calculated levels
   */
  applySafetyMargins(params: OrderParams, limits: BrokerLimits): OrderParams {
    const adjusted = { ...params };

    if (params.stopLevel) {
      const safetyMargin = limits.pipValue * 2; // 2 pip safety margin

      if (params.direction === "BUY") {
        adjusted.stopLevel = Math.min(
          params.stopLevel,
          params.entryPrice - limits.minStopDistance - safetyMargin,
        );
      } else {
        adjusted.stopLevel = Math.max(
          params.stopLevel,
          params.entryPrice + limits.minStopDistance + safetyMargin,
        );
      }
    }

    return adjusted;
  }

  /**
   * Clear cache for testing or forced refresh
   */
  clearCache(): void {
    this.limitCache.clear();
    logger.info("🔄 Broker limits cache cleared");
  }

  /**
   * CRITICAL FIX: Force update cache with real-time limits from Capital.com errors
   */
  forceUpdateCache(epic: string, realTimeLimits: BrokerLimits): void {
    try {
      // Force update the cache with real-time limits
      this.limitCache.set(epic, {
        limits: realTimeLimits,
        timestamp: Date.now(),
      });

      logger.info(`🔄 FORCED cache update for ${epic}:`, {
        maxStopPrice: realTimeLimits.maxStopPrice,
        minStopPrice: realTimeLimits.minStopPrice,
        currentPrice: realTimeLimits.currentPrice,
        cacheTimestamp: Date.now(),
      });
    } catch (error: any) {
      logger.error(`❌ Failed to force update cache for ${epic}:`, error.message);
    }
  }
}

// Export singleton instance
export const brokerLimitValidator = new BrokerLimitValidator();
