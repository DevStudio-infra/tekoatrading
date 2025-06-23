import { loggerService } from "../../logger.service";

export interface OrderTypeDecision {
  orderType: "MARKET" | "LIMIT" | "STOP";
  limitPrice?: number;
  reasoning: string;
}

export interface StopLossTakeProfitResult {
  stopLoss: number;
  takeProfit: number;
  reasoning: string;
  atr: number;
}

export class BotTradingService {
  /**
   * Determine optimal order type based on market conditions and AI confidence
   * Prefers pending orders but will use market orders when appropriate
   */
  determineOptimalOrderType(confidence: number, prediction: string, currentPrice: number, symbolData: any[]): OrderTypeDecision {
    const direction = prediction.toUpperCase() as "BUY" | "SELL";

    console.log(`[BOT TRADING] 🔍 ORDER TYPE DEBUG - Input: confidence=${confidence}%, direction=${direction}, currentPrice=${currentPrice}`);

    // Calculate recent volatility from symbol data
    const recentCandles = symbolData.slice(-20); // Last 20 candles
    const volatility = this.calculateVolatility(recentCandles);

    // Calculate support/resistance levels
    const { support, resistance } = this.calculateSupportResistance(recentCandles);

    // CRITICAL FIX: For now, disable STOP orders due to take profit calculation issues
    // Use MARKET orders for immediate execution when confidence is high
    if (confidence >= 85) {
      return {
        orderType: "MARKET",
        reasoning: `Very high confidence (${confidence}%) - using MARKET order for immediate execution`,
      };
    }

    // High confidence (80%+) + Low volatility = Prefer LIMIT orders for better entry
    if (confidence >= 80 && volatility < 0.015) {
      // CRITICAL FIX: Calculate proper offset based on actual symbol price level
      let limitOffset: number;

      // For high-value assets like BTC (~$106k), we need reasonable point offsets
      if (currentPrice > 50000) {
        // For BTC-level prices, use 100-500 point offsets for meaningful better entries
        limitOffset = 100 + Math.random() * 400; // 100-500 points
      } else if (currentPrice > 1000) {
        // For mid-range assets, use 10-50 point offsets
        limitOffset = 10 + Math.random() * 40; // 10-50 points
      } else {
        // For lower-priced assets, use smaller offsets
        limitOffset = 1 + Math.random() * 5; // 1-5 points
      }

      let limitPrice: number;
      let reasoning: string;

      if (direction === "BUY") {
        limitPrice = currentPrice - limitOffset;
        reasoning = `High confidence (${confidence}%) + low volatility: Using LIMIT BUY at ${limitPrice.toFixed(5)} for better entry (${limitOffset.toFixed(5)} below market)`;

        console.log(`[BOT TRADING] 🔍 ORDER TYPE DEBUG - BUY calculation: ${currentPrice} - ${limitOffset} = ${limitPrice}`);

        // CRITICAL VALIDATION: LIMIT BUY must be BELOW current market price
        if (limitPrice >= currentPrice) {
          console.error(`[BOT TRADING] ❌ Invalid LIMIT BUY calculation: ${limitPrice} should be < ${currentPrice}`);
          // Fallback to MARKET order if calculation is wrong
          return {
            orderType: "MARKET",
            reasoning: `Limit price calculation error, falling back to MARKET order`,
          };
        }

        console.log(`[BOT TRADING] ✅ LIMIT order validation: BUY at ${limitPrice.toFixed(2)} vs market ${currentPrice.toFixed(2)} - Valid: ${limitPrice < currentPrice}`);
      } else {
        limitPrice = currentPrice + limitOffset;
        reasoning = `High confidence (${confidence}%) + low volatility: Using LIMIT SELL at ${limitPrice.toFixed(5)} for better entry (${limitOffset.toFixed(5)} above market)`;

        // CRITICAL VALIDATION: LIMIT SELL must be ABOVE current market price
        if (limitPrice <= currentPrice) {
          console.error(`[BOT TRADING] ❌ Invalid LIMIT SELL calculation: ${limitPrice} should be > ${currentPrice}`);
          // Fallback to MARKET order if calculation is wrong
          return {
            orderType: "MARKET",
            reasoning: `Limit price calculation error, falling back to MARKET order`,
          };
        }
      }

      return {
        orderType: "LIMIT",
        limitPrice,
        reasoning,
      };
    }

    // Medium confidence (60-80%) = Use MARKET orders for reliability
    if (confidence >= 60) {
      return {
        orderType: "MARKET",
        reasoning: `Medium confidence (${confidence}%) - using MARKET order for reliable execution`,
      };
    }

    // Low confidence (<60%) = REJECT the trade
    return {
      orderType: "MARKET", // This won't be used since confidence is too low
      reasoning: `Low confidence (${confidence}%) - trade should be rejected`,
    };
  }

  /**
   * Validate and adjust stop loss/take profit levels based on timeframe
   * Ensures appropriate sizing for different chart timeframes
   */
  validateTimeframeStopLossTakeProfit(
    originalStopLoss: number,
    originalTakeProfit: number,
    currentPrice: number,
    direction: "BUY" | "SELL",
    timeframe: string,
    symbol: string
  ): { stopLoss: number; takeProfit: number } {
    // Define maximum distances based on timeframe
    const getMaxDistance = (tf: string): number => {
      switch (tf.toUpperCase()) {
        case "M1":
          return 20; // 1-minute: max 20 points
        case "M5":
          return 50; // 5-minute: max 50 points
        case "M15":
          return 100; // 15-minute: max 100 points
        case "M30":
          return 200; // 30-minute: max 200 points
        case "H1":
          return 300; // 1-hour: max 300 points
        case "H4":
          return 500; // 4-hour: max 500 points
        case "D1":
          return 1000; // Daily: max 1000 points
        default:
          return 50; // Default fallback
      }
    };

    const maxDistance = getMaxDistance(timeframe);

    // Get minimum broker distance for the symbol
    const minDistance = this.getMinimumBrokerDistance(symbol, "stopLoss");

    // Calculate distances from current price
    const originalStopDistance = Math.abs(originalStopLoss - currentPrice);
    const originalTakeDistance = Math.abs(originalTakeProfit - currentPrice);

    let adjustedStopLoss = originalStopLoss;
    let adjustedTakeProfit = originalTakeProfit;

    // Adjust stop loss if too far
    if (originalStopDistance > maxDistance) {
      if (direction === "BUY") {
        adjustedStopLoss = currentPrice - Math.max(maxDistance, minDistance);
      } else {
        adjustedStopLoss = currentPrice + Math.max(maxDistance, minDistance);
      }

      loggerService.warn(`[BOT TRADING] 📏 Adjusted stop loss from ${originalStopLoss} to ${adjustedStopLoss} for ${timeframe} timeframe`);
    }

    // Adjust take profit if too far
    if (originalTakeDistance > maxDistance) {
      if (direction === "BUY") {
        adjustedTakeProfit = currentPrice + Math.max(maxDistance, minDistance);
      } else {
        adjustedTakeProfit = currentPrice - Math.max(maxDistance, minDistance);
      }

      loggerService.warn(`[BOT TRADING] 📏 Adjusted take profit from ${originalTakeProfit} to ${adjustedTakeProfit} for ${timeframe} timeframe`);
    }

    // Ensure minimum distances are respected
    if (Math.abs(adjustedStopLoss - currentPrice) < minDistance) {
      if (direction === "BUY") {
        adjustedStopLoss = currentPrice - minDistance;
      } else {
        adjustedStopLoss = currentPrice + minDistance;
      }
    }

    if (Math.abs(adjustedTakeProfit - currentPrice) < minDistance) {
      if (direction === "BUY") {
        adjustedTakeProfit = currentPrice + minDistance;
      } else {
        adjustedTakeProfit = currentPrice - minDistance;
      }
    }

    // CRITICAL VALIDATION: Ensure proper direction
    if (direction === "BUY") {
      // For BUY orders: stop loss below entry, take profit above entry
      if (adjustedStopLoss >= currentPrice) {
        adjustedStopLoss = currentPrice - minDistance;
        loggerService.warn(`[BOT TRADING] 🔧 Fixed BUY stop loss direction: ${adjustedStopLoss}`);
      }
      if (adjustedTakeProfit <= currentPrice) {
        adjustedTakeProfit = currentPrice + minDistance;
        loggerService.warn(`[BOT TRADING] 🔧 Fixed BUY take profit direction: ${adjustedTakeProfit}`);
      }
    } else {
      // For SELL orders: stop loss above entry, take profit below entry
      if (adjustedStopLoss <= currentPrice) {
        adjustedStopLoss = currentPrice + minDistance;
        loggerService.warn(`[BOT TRADING] 🔧 Fixed SELL stop loss direction: ${adjustedStopLoss}`);
      }
      if (adjustedTakeProfit >= currentPrice) {
        adjustedTakeProfit = currentPrice - minDistance;
        loggerService.warn(`[BOT TRADING] 🔧 Fixed SELL take profit direction: ${adjustedTakeProfit}`);
      }
    }

    loggerService.info(
      `[BOT TRADING] ✅ Validated ${direction} ${timeframe}: SL=${adjustedStopLoss.toFixed(2)}, TP=${adjustedTakeProfit.toFixed(2)}, Entry=${currentPrice.toFixed(2)}`
    );

    return {
      stopLoss: adjustedStopLoss,
      takeProfit: adjustedTakeProfit,
    };
  }

  /**
   * Calculate technical stop loss and take profit based on chart analysis
   */
  calculateTechnicalStopLossTakeProfit(symbolData: any[], direction: "BUY" | "SELL", currentPrice: number, timeframe: string, symbol: string): StopLossTakeProfitResult {
    try {
      // Calculate ATR for volatility-based levels
      const atr = this.calculateATR(symbolData);
      const atrMultiplier = this.getATRMultiplier(timeframe, "stop");
      const profitMultiplier = this.getATRMultiplier(timeframe, "profit");

      // Find recent swing highs and lows
      const { swingHighs, swingLows } = this.findSwingHighsLows(symbolData);

      // Calculate support and resistance
      const { support, resistance } = this.calculatePreciseSupportResistance(symbolData);

      let stopLoss: number;
      let takeProfit: number;
      let reasoning: string;

      if (direction === "BUY") {
        // For BUY: Stop below support/swing low, profit above resistance
        const supportLevel = Math.min(support, ...swingLows.slice(-3));
        const resistanceLevel = Math.max(resistance, ...swingHighs.slice(-3));

        // Stop loss: Below support or ATR-based, whichever is closer but reasonable
        const atrStopLoss = currentPrice - atr * atrMultiplier;
        const supportStopLoss = supportLevel - atr * 0.5; // Small buffer below support

        stopLoss = Math.max(atrStopLoss, supportStopLoss); // Use the higher (tighter) stop

        // Take profit: At resistance or ATR-based, whichever gives better R:R
        const atrTakeProfit = currentPrice + atr * profitMultiplier;
        const resistanceTakeProfit = resistanceLevel - atr * 0.3; // Small buffer below resistance

        takeProfit = Math.min(atrTakeProfit, resistanceTakeProfit); // Use the lower (more conservative) target

        reasoning = `BUY technical analysis: Stop below support (${supportLevel.toFixed(2)}), target near resistance (${resistanceLevel.toFixed(2)}), ATR=${atr.toFixed(2)}`;
      } else {
        // For SELL: Stop above resistance/swing high, profit below support
        const resistanceLevel = Math.max(resistance, ...swingHighs.slice(-3));
        const supportLevel = Math.min(support, ...swingLows.slice(-3));

        // Stop loss: Above resistance or ATR-based
        const atrStopLoss = currentPrice + atr * atrMultiplier;
        const resistanceStopLoss = resistanceLevel + atr * 0.5; // Small buffer above resistance

        stopLoss = Math.min(atrStopLoss, resistanceStopLoss); // Use the lower (tighter) stop

        // Take profit: At support or ATR-based
        const atrTakeProfit = currentPrice - atr * profitMultiplier;
        const supportTakeProfit = supportLevel + atr * 0.3; // Small buffer above support

        takeProfit = Math.max(atrTakeProfit, supportTakeProfit); // Use the higher (more conservative) target

        reasoning = `SELL technical analysis: Stop above resistance (${resistanceLevel.toFixed(2)}), target near support (${supportLevel.toFixed(2)}), ATR=${atr.toFixed(2)}`;
      }

      // Apply minimum broker distances
      const minDistance = this.getMinimumBrokerDistance(symbol, "stopLoss");

      // Ensure minimum distances
      if (Math.abs(stopLoss - currentPrice) < minDistance) {
        stopLoss = direction === "BUY" ? currentPrice - minDistance : currentPrice + minDistance;
      }

      if (Math.abs(takeProfit - currentPrice) < minDistance) {
        takeProfit = direction === "BUY" ? currentPrice + minDistance : currentPrice - minDistance;
      }

      loggerService.info(`[BOT TRADING] 📊 Technical analysis for ${symbol} ${direction}: SL=${stopLoss.toFixed(2)}, TP=${takeProfit.toFixed(2)}`);

      return {
        stopLoss,
        takeProfit,
        reasoning,
        atr,
      };
    } catch (error) {
      loggerService.error(`Technical analysis error: ${error}`);

      // Fallback to simple percentage-based levels
      const fallbackDistance = currentPrice * 0.01; // 1% fallback

      return {
        stopLoss: direction === "BUY" ? currentPrice - fallbackDistance : currentPrice + fallbackDistance,
        takeProfit: direction === "BUY" ? currentPrice + fallbackDistance : currentPrice - fallbackDistance,
        reasoning: "Fallback percentage-based levels due to technical analysis error",
        atr: 0,
      };
    }
  }

  // Helper methods
  private calculateVolatility(candles: any[]): number {
    if (!candles || candles.length < 2) return 0.02; // Default volatility

    const returns = [];
    for (let i = 1; i < candles.length; i++) {
      const currentPrice = candles[i].close;
      const previousPrice = candles[i - 1].close;
      const returnPct = (currentPrice - previousPrice) / previousPrice;
      returns.push(returnPct);
    }

    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    return Math.sqrt(variance);
  }

  private calculateSupportResistance(candles: any[]): { support: number; resistance: number } {
    if (!candles || candles.length < 10) {
      const fallbackPrice = candles?.[candles.length - 1]?.close || 50000;
      return {
        support: fallbackPrice * 0.995,
        resistance: fallbackPrice * 1.005,
      };
    }

    const highs = candles.map((c) => c.high).sort((a, b) => b - a);
    const lows = candles.map((c) => c.low).sort((a, b) => a - b);

    const resistance = highs.slice(0, Math.max(1, Math.floor(highs.length * 0.1))).reduce((sum, h) => sum + h, 0) / Math.max(1, Math.floor(highs.length * 0.1));
    const support = lows.slice(0, Math.max(1, Math.floor(lows.length * 0.1))).reduce((sum, l) => sum + l, 0) / Math.max(1, Math.floor(lows.length * 0.1));

    return { support, resistance };
  }

  private calculateATR(candles: any[], period: number = 14): number {
    if (!candles || candles.length < period + 1) return 100; // Default ATR for BTC

    const trueRanges = [];
    for (let i = 1; i < candles.length; i++) {
      const high = candles[i].high;
      const low = candles[i].low;
      const prevClose = candles[i - 1].close;

      const trueRange = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
      trueRanges.push(trueRange);
    }

    const recentTrueRanges = trueRanges.slice(-period);
    return recentTrueRanges.reduce((sum, tr) => sum + tr, 0) / recentTrueRanges.length;
  }

  private findSwingHighsLows(candles: any[], lookback: number = 5): { swingHighs: number[]; swingLows: number[] } {
    const swingHighs: number[] = [];
    const swingLows: number[] = [];

    if (!candles || candles.length < lookback * 2 + 1) {
      return { swingHighs, swingLows };
    }

    for (let i = lookback; i < candles.length - lookback; i++) {
      const currentHigh = candles[i].high;
      const currentLow = candles[i].low;

      // Check if it's a swing high
      let isSwingHigh = true;
      for (let j = i - lookback; j <= i + lookback; j++) {
        if (j !== i && candles[j].high >= currentHigh) {
          isSwingHigh = false;
          break;
        }
      }

      // Check if it's a swing low
      let isSwingLow = true;
      for (let j = i - lookback; j <= i + lookback; j++) {
        if (j !== i && candles[j].low <= currentLow) {
          isSwingLow = false;
          break;
        }
      }

      if (isSwingHigh) swingHighs.push(currentHigh);
      if (isSwingLow) swingLows.push(currentLow);
    }

    return { swingHighs, swingLows };
  }

  private calculatePreciseSupportResistance(candles: any[]): { support: number; resistance: number } {
    if (!candles || candles.length < 20) {
      const fallbackPrice = candles?.[candles.length - 1]?.close || 50000;
      return {
        support: fallbackPrice * 0.99,
        resistance: fallbackPrice * 1.01,
      };
    }

    // Use the last 50 candles for more precise levels
    const recentCandles = candles.slice(-50);
    const { swingHighs, swingLows } = this.findSwingHighsLows(recentCandles, 3);

    // Group similar levels (within 0.1% of each other)
    const groupSimilarLevels = (levels: number[], tolerance: number = 0.001): number[] => {
      const grouped: number[] = [];
      const sorted = levels.sort((a, b) => a - b);

      for (const level of sorted) {
        const existing = grouped.find((g) => Math.abs(g - level) / level < tolerance);
        if (!existing) {
          grouped.push(level);
        }
      }

      return grouped;
    };

    const supportLevels = groupSimilarLevels(swingLows);
    const resistanceLevels = groupSimilarLevels(swingHighs);

    const currentPrice = candles[candles.length - 1].close;

    // Find nearest support below current price
    const supportBelow = supportLevels.filter((s) => s < currentPrice).sort((a, b) => b - a);
    const support = supportBelow[0] || currentPrice * 0.99;

    // Find nearest resistance above current price
    const resistanceAbove = resistanceLevels.filter((r) => r > currentPrice).sort((a, b) => a - b);
    const resistance = resistanceAbove[0] || currentPrice * 1.01;

    return { support, resistance };
  }

  private getATRMultiplier(timeframe: string, purpose: "stop" | "profit"): number {
    const multipliers: { [key: string]: { stop: number; profit: number } } = {
      M1: { stop: 1.5, profit: 2.0 },
      M5: { stop: 2.0, profit: 3.0 },
      M15: { stop: 2.5, profit: 4.0 },
      M30: { stop: 3.0, profit: 5.0 },
      H1: { stop: 3.5, profit: 6.0 },
      H4: { stop: 4.0, profit: 7.0 },
      D1: { stop: 5.0, profit: 8.0 },
    };

    const timeframeMultipliers = multipliers[timeframe.toUpperCase()] || multipliers.M1;
    return timeframeMultipliers[purpose];
  }

  private getMinimumBrokerDistance(symbol: string, type: "stopLoss" | "takeProfit"): number {
    const symbolUpper = symbol.toUpperCase();

    // Cryptocurrency minimum distances (Capital.com specific)
    if (symbolUpper.includes("BTC") || symbolUpper.includes("BITCOIN")) {
      return type === "takeProfit" ? 50 : 40; // Increased from 25/20 to be safer
    }
    if (symbolUpper.includes("ETH") || symbolUpper.includes("ETHEREUM")) {
      return type === "takeProfit" ? 15 : 12; // Increased from 10/8
    }
    if (symbolUpper.includes("LTC") || symbolUpper.includes("LITECOIN")) {
      return type === "takeProfit" ? 3 : 2.5; // Increased from 2/1.5
    }

    // Index minimum distances
    if (symbolUpper.includes("US500") || symbolUpper.includes("SPX")) {
      return type === "takeProfit" ? 3 : 2.5; // Increased from 2/1.5
    }
    if (symbolUpper.includes("NASDAQ") || symbolUpper.includes("NDX")) {
      return type === "takeProfit" ? 4 : 3; // Increased from 3/2
    }

    // Forex minimum distances
    if (symbolUpper.includes("EUR") || symbolUpper.includes("GBP") || symbolUpper.includes("USD")) {
      return type === "takeProfit" ? 0.0015 : 0.001; // Increased from 0.001/0.0008
    }

    // Default fallback (conservative)
    return type === "takeProfit" ? 10 : 8;
  }
}
