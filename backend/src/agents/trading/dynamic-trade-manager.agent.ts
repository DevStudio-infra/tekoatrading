import { logger } from "../../logger";

export interface AgentResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
  source: string;
}

export interface TradeManagementParams {
  tradeId: string;
  botId: string;
  symbol: string;
  direction: "BUY" | "SELL";
  entryPrice: number;
  currentPrice: number;
  stopLoss: number;
  takeProfit: number;
  positionSize: number;
  strategyConfig: any;
  accountBalance: number;
  openedAt: Date;
  marketConditions: string;
}

export interface TradeManagementResult {
  shouldUseTrailingStop: boolean;
  newStopLoss?: number;
  newTakeProfit?: number;
  trailingStopDistance?: number;
  managementReason: string;
  adjustedLevels: {
    stopLoss: number;
    takeProfit: number;
    trailingStop?: {
      enabled: boolean;
      distance: number;
      increment?: number;
    };
  };
}

export class DynamicTradeManagerAgent {
  protected initialized: boolean = false;
  protected name: string;

  constructor() {
    this.name = "DynamicTradeManagerAgent";
  }

  async initialize(): Promise<void> {
    this.initialized = true;
    logger.info("🔧 Dynamic Trade Manager Agent initialized");
  }

  /**
   * Determine if trailing stop should be used and calculate optimal levels
   */
  async evaluateTradeManagement(
    params: TradeManagementParams,
  ): Promise<AgentResult<TradeManagementResult>> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      logger.info(
        `🔧 [TRADE-MANAGER] Evaluating trade management for ${params.symbol} ${params.direction}`,
      );

      // Check if strategy mentions trailing stop
      const shouldUseTrailingStop = this.shouldUseTrailingStop(params.strategyConfig);

      // Calculate current profit/loss
      const currentPnL = this.calculateCurrentPnL(params);
      const pnlPercentage = (currentPnL / (params.entryPrice * params.positionSize)) * 100;

      // Determine trade management approach
      const managementResult = this.calculateTradeManagement(
        params,
        shouldUseTrailingStop,
        currentPnL,
        pnlPercentage,
      );

      logger.info(
        `🔧 [TRADE-MANAGER] Management decision: Trailing Stop=${managementResult.shouldUseTrailingStop}, P&L=${pnlPercentage.toFixed(2)}%`,
      );

      return {
        success: true,
        data: managementResult,
        timestamp: new Date(),
        source: "DynamicTradeManagerAgent",
      };
    } catch (error) {
      logger.error(`❌ [TRADE-MANAGER] Evaluation failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date(),
        source: "DynamicTradeManagerAgent",
      };
    }
  }

  /**
   * Check if strategy configuration indicates trailing stop usage
   */
  private shouldUseTrailingStop(strategyConfig: any): boolean {
    if (!strategyConfig) return false;

    // Check strategy description for trailing stop mentions
    const description = (strategyConfig.description || "").toLowerCase();
    const name = (strategyConfig.name || "").toLowerCase();

    // Check for trailing stop keywords
    const trailingStopKeywords = [
      "trailing stop",
      "trailing",
      "dynamic stop",
      "moving stop",
      "adjustable stop",
      "progressive stop",
    ];

    const mentionsTrailingStop = trailingStopKeywords.some(
      (keyword) => description.includes(keyword) || name.includes(keyword),
    );

    // Check explicit configuration
    const explicitTrailingStop =
      strategyConfig.trailingStop === true ||
      strategyConfig.useTrailingStop === true ||
      strategyConfig.stopLossType === "trailing";

    logger.info(
      `🔧 [TRADE-MANAGER] Trailing stop analysis: mentioned=${mentionsTrailingStop}, explicit=${explicitTrailingStop}`,
    );

    return mentionsTrailingStop || explicitTrailingStop;
  }

  /**
   * Calculate current P&L for the trade
   */
  private calculateCurrentPnL(params: TradeManagementParams): number {
    const priceDiff =
      params.direction === "BUY"
        ? params.currentPrice - params.entryPrice
        : params.entryPrice - params.currentPrice;

    return priceDiff * params.positionSize;
  }

  /**
   * Calculate optimal trade management levels
   */
  private calculateTradeManagement(
    params: TradeManagementParams,
    useTrailingStop: boolean,
    currentPnL: number,
    pnlPercentage: number,
  ): TradeManagementResult {
    let newStopLoss = params.stopLoss;
    let newTakeProfit = params.takeProfit;
    let trailingStopDistance: number | undefined;

    if (useTrailingStop && pnlPercentage > 0.5) {
      // Only trail when in profit
      // Calculate trailing stop distance based on volatility and timeframe
      const baseDistance = Math.abs(params.currentPrice - params.entryPrice) * 0.3; // 30% of current move
      trailingStopDistance = Math.max(baseDistance, params.currentPrice * 0.005); // Min 0.5% distance

      if (params.direction === "BUY") {
        // For BUY: Trail stop loss up as price goes up
        const potentialNewStop = params.currentPrice - trailingStopDistance;
        if (potentialNewStop > params.stopLoss) {
          newStopLoss = potentialNewStop;
        }
      } else {
        // For SELL: Trail stop loss down as price goes down
        const potentialNewStop = params.currentPrice + trailingStopDistance;
        if (potentialNewStop < params.stopLoss) {
          newStopLoss = potentialNewStop;
        }
      }
    }

    // Adjust take profit based on market conditions and performance
    if (pnlPercentage > 2.0) {
      // If very profitable, consider extending target
      const extensionFactor = 1.2; // Extend by 20%
      const currentTpDistance = Math.abs(params.takeProfit - params.entryPrice);
      const extendedDistance = currentTpDistance * extensionFactor;

      newTakeProfit =
        params.direction === "BUY"
          ? params.entryPrice + extendedDistance
          : params.entryPrice - extendedDistance;
    }

    const managementReason = useTrailingStop
      ? `Trailing stop enabled: distance=${trailingStopDistance?.toFixed(4)}, P&L=${pnlPercentage.toFixed(2)}%`
      : `Fixed levels maintained: P&L=${pnlPercentage.toFixed(2)}%`;

    return {
      shouldUseTrailingStop: useTrailingStop,
      newStopLoss: newStopLoss,
      newTakeProfit: newTakeProfit,
      trailingStopDistance,
      managementReason,
      adjustedLevels: {
        stopLoss: newStopLoss,
        takeProfit: newTakeProfit,
        trailingStop: useTrailingStop
          ? {
              enabled: true,
              distance: trailingStopDistance || 0,
              increment: trailingStopDistance ? trailingStopDistance * 0.5 : undefined,
            }
          : undefined,
      },
    };
  }

  /**
   * Update trade levels with Capital.com API
   */
  async updateTradeLevels(
    tradeId: string,
    levels: TradeManagementResult["adjustedLevels"],
    capitalApi: any,
  ): Promise<boolean> {
    try {
      // Implementation would depend on Capital.com API for updating existing positions
      // This would typically involve modifying stop loss and take profit levels
      logger.info(
        `🔧 [TRADE-MANAGER] Updating levels for trade ${tradeId}: SL=${levels.stopLoss}, TP=${levels.takeProfit}`,
      );

      // TODO: Implement Capital.com API call to update position levels
      // await capitalApi.updatePositionLevels(tradeId, levels.stopLoss, levels.takeProfit);

      return true;
    } catch (error) {
      logger.error(`❌ [TRADE-MANAGER] Failed to update trade levels:`, error);
      return false;
    }
  }
}
