import { BaseAgent } from "./base-agent";

interface TradePosition {
  id: string;
  symbol: string;
  direction: "BUY" | "SELL";
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  stopLoss: number;
  takeProfit: number;
  openedAt: Date;
  strategy: string;
  timeframe: string;
}

interface TradeManagementAction {
  action:
    | "HOLD"
    | "MOVE_TO_BREAKEVEN"
    | "TRAIL_STOP"
    | "PARTIAL_CLOSE"
    | "FULL_CLOSE"
    | "EXTEND_TARGET";
  newStopLoss?: number;
  newTakeProfit?: number;
  closeQuantity?: number;
  reasoning: string[];
  confidence: number;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
}

interface TradeMetrics {
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  riskRewardAchieved: number;
  timeInPosition: number; // minutes
  maxFavorableExcursion: number; // best price reached
  maxAdverseExcursion: number; // worst price reached
  currentRiskRewardRatio: number;
}

export class TradeManagementAgent extends BaseAgent {
  constructor() {
    super("TradeManagementAgent");
  }

  async analyze(data: any): Promise<any> {
    return this.analyzeTradeManagement(data);
  }

  async analyzeTradeManagement(context: {
    // ... existing code ...
  }): Promise<any> {
    // ... existing code ...
  }

  async analyzePosition(position: TradePosition): Promise<TradeManagementAction> {
    try {
      // Calculate current trade metrics
      const metrics = this.calculateTradeMetrics(position);

      // Analyze various management rules
      const breakevenAction = this.checkBreakevenMove(position, metrics);
      const trailingAction = this.checkTrailingStop(position, metrics);
      const partialCloseAction = this.checkPartialClose(position, metrics);
      const fullCloseAction = this.checkFullClose(position, metrics);
      const targetExtensionAction = this.checkTargetExtension(position, metrics);

      // Prioritize actions
      const actions = [
        fullCloseAction,
        partialCloseAction,
        breakevenAction,
        trailingAction,
        targetExtensionAction,
      ].filter((action) => action.action !== "HOLD");

      // Return highest priority action or HOLD
      return actions.length > 0
        ? this.selectHighestPriorityAction(actions)
        : {
            action: "HOLD",
            reasoning: ["Position within normal parameters"],
            confidence: 0.8,
            priority: "LOW",
          };
    } catch (error) {
      return {
        action: "HOLD",
        reasoning: ["Error in analysis - maintaining current position"],
        confidence: 0.3,
        priority: "LOW",
      };
    }
  }

  private calculateTradeMetrics(position: TradePosition): TradeMetrics {
    const { direction, entryPrice, currentPrice, quantity, stopLoss, takeProfit, openedAt } =
      position;

    // Calculate P&L
    const priceDiff = direction === "BUY" ? currentPrice - entryPrice : entryPrice - currentPrice;
    const unrealizedPnL = priceDiff * quantity;
    const unrealizedPnLPercent = (priceDiff / entryPrice) * 100;

    // Calculate time in position
    const timeInPosition = Math.floor((Date.now() - openedAt.getTime()) / (1000 * 60));

    // Calculate risk-reward metrics
    const initialRisk = Math.abs(entryPrice - stopLoss) * quantity;
    const initialReward = Math.abs(takeProfit - entryPrice) * quantity;
    const riskRewardAchieved = initialRisk > 0 ? unrealizedPnL / initialRisk : 0;

    // Current risk-reward to remaining target
    const remainingReward = Math.abs(takeProfit - currentPrice) * quantity;
    const currentRisk = Math.abs(currentPrice - stopLoss) * quantity;
    const currentRiskRewardRatio = currentRisk > 0 ? remainingReward / currentRisk : 0;

    // Calculate excursions (simplified - in real implementation would track historical data)
    const maxFavorableExcursion =
      direction === "BUY" ? Math.max(currentPrice, entryPrice) : Math.min(currentPrice, entryPrice);
    const maxAdverseExcursion =
      direction === "BUY" ? Math.min(currentPrice, entryPrice) : Math.max(currentPrice, entryPrice);

    return {
      unrealizedPnL,
      unrealizedPnLPercent,
      riskRewardAchieved,
      timeInPosition,
      maxFavorableExcursion,
      maxAdverseExcursion,
      currentRiskRewardRatio,
    };
  }

  private checkBreakevenMove(
    position: TradePosition,
    metrics: TradeMetrics,
  ): TradeManagementAction {
    const reasoning: string[] = [];

    // Rule 1: Move to breakeven after achieving 1:1 risk-reward
    if (metrics.riskRewardAchieved >= 1.0) {
      // Check if stop loss is not already at breakeven
      const breakevenPrice = position.entryPrice;
      const currentStopDistance = Math.abs(position.stopLoss - position.entryPrice);
      const breakevenDistance = Math.abs(position.stopLoss - breakevenPrice);

      if (breakevenDistance < currentStopDistance) {
        reasoning.push(
          `Achieved 1:1 R:R (${metrics.riskRewardAchieved.toFixed(2)}), moving SL to breakeven`,
        );

        return {
          action: "MOVE_TO_BREAKEVEN",
          newStopLoss: breakevenPrice,
          reasoning,
          confidence: 0.9,
          priority: "HIGH",
        };
      }
    }

    // Rule 2: Move to breakeven after significant time in profit (strategy-dependent)
    if (
      metrics.unrealizedPnLPercent > 0.5 &&
      metrics.timeInPosition > this.getBreakevenTimeThreshold(position.timeframe)
    ) {
      reasoning.push(
        `Position profitable for ${metrics.timeInPosition} minutes, securing breakeven`,
      );

      return {
        action: "MOVE_TO_BREAKEVEN",
        newStopLoss: position.entryPrice,
        reasoning,
        confidence: 0.7,
        priority: "MEDIUM",
      };
    }

    return {
      action: "HOLD",
      reasoning: ["Breakeven conditions not met"],
      confidence: 0.8,
      priority: "LOW",
    };
  }

  private checkTrailingStop(position: TradePosition, metrics: TradeMetrics): TradeManagementAction {
    const reasoning: string[] = [];

    // Only trail if position is profitable
    if (metrics.unrealizedPnLPercent <= 0) {
      return {
        action: "HOLD",
        reasoning: ["Position not profitable - no trailing"],
        confidence: 0.8,
        priority: "LOW",
      };
    }

    // Calculate trailing distance based on strategy and timeframe
    const trailDistance = this.calculateTrailDistance(position);

    let newStopLoss: number;
    if (position.direction === "BUY") {
      newStopLoss = position.currentPrice - trailDistance;
      // Only move stop loss up (tighter)
      if (newStopLoss > position.stopLoss) {
        reasoning.push(
          `Trailing stop from ${position.stopLoss.toFixed(4)} to ${newStopLoss.toFixed(4)}`,
        );
        reasoning.push(
          `Trail distance: ${trailDistance.toFixed(4)} (${position.timeframe}/${position.strategy})`,
        );

        return {
          action: "TRAIL_STOP",
          newStopLoss,
          reasoning,
          confidence: 0.8,
          priority: "MEDIUM",
        };
      }
    } else {
      newStopLoss = position.currentPrice + trailDistance;
      // Only move stop loss down (tighter)
      if (newStopLoss < position.stopLoss) {
        reasoning.push(
          `Trailing stop from ${position.stopLoss.toFixed(4)} to ${newStopLoss.toFixed(4)}`,
        );
        reasoning.push(
          `Trail distance: ${trailDistance.toFixed(4)} (${position.timeframe}/${position.strategy})`,
        );

        return {
          action: "TRAIL_STOP",
          newStopLoss,
          reasoning,
          confidence: 0.8,
          priority: "MEDIUM",
        };
      }
    }

    return {
      action: "HOLD",
      reasoning: ["Trailing stop not improved"],
      confidence: 0.8,
      priority: "LOW",
    };
  }

  private checkPartialClose(position: TradePosition, metrics: TradeMetrics): TradeManagementAction {
    const reasoning: string[] = [];

    // Rule 1: Partial close at 1.5:1 risk-reward
    if (metrics.riskRewardAchieved >= 1.5 && metrics.riskRewardAchieved < 2.5) {
      const closePercentage = 0.5; // Close 50%
      reasoning.push(`Achieved ${metrics.riskRewardAchieved.toFixed(2)}:1 R:R, taking 50% profit`);

      return {
        action: "PARTIAL_CLOSE",
        closeQuantity: position.quantity * closePercentage,
        reasoning,
        confidence: 0.8,
        priority: "MEDIUM",
      };
    }

    // Rule 2: Partial close based on time and strategy
    if (this.shouldPartialCloseByTime(position, metrics)) {
      reasoning.push(`Time-based partial close after ${metrics.timeInPosition} minutes`);

      return {
        action: "PARTIAL_CLOSE",
        closeQuantity: position.quantity * 0.3, // Close 30%
        reasoning,
        confidence: 0.6,
        priority: "LOW",
      };
    }

    return {
      action: "HOLD",
      reasoning: ["Partial close conditions not met"],
      confidence: 0.8,
      priority: "LOW",
    };
  }

  private checkFullClose(position: TradePosition, metrics: TradeMetrics): TradeManagementAction {
    const reasoning: string[] = [];

    // Rule 1: Emergency close on excessive loss
    if (metrics.unrealizedPnLPercent < -5.0) {
      reasoning.push(
        `Emergency close: Loss exceeds 5% (${metrics.unrealizedPnLPercent.toFixed(2)}%)`,
      );

      return {
        action: "FULL_CLOSE",
        reasoning,
        confidence: 0.95,
        priority: "URGENT",
      };
    }

    // Rule 2: Time-based exit for scalping strategies
    if (position.strategy.includes("scalping") && metrics.timeInPosition > 15) {
      reasoning.push("Scalping position held too long (>15 minutes)");

      return {
        action: "FULL_CLOSE",
        reasoning,
        confidence: 0.7,
        priority: "HIGH",
      };
    }

    // Rule 3: Risk-reward deterioration
    if (metrics.currentRiskRewardRatio < 0.5 && metrics.unrealizedPnLPercent > 1.0) {
      reasoning.push(
        `Poor remaining R:R (${metrics.currentRiskRewardRatio.toFixed(2)}) - close profitable position`,
      );

      return {
        action: "FULL_CLOSE",
        reasoning,
        confidence: 0.6,
        priority: "MEDIUM",
      };
    }

    // Rule 4: Maximum time in position
    const maxTime = this.getMaxTimeInPosition(position.timeframe);
    if (metrics.timeInPosition > maxTime) {
      reasoning.push(`Maximum time limit reached (${metrics.timeInPosition}/${maxTime} minutes)`);

      return {
        action: "FULL_CLOSE",
        reasoning,
        confidence: 0.7,
        priority: "HIGH",
      };
    }

    return {
      action: "HOLD",
      reasoning: ["No full close conditions met"],
      confidence: 0.8,
      priority: "LOW",
    };
  }

  private checkTargetExtension(
    position: TradePosition,
    metrics: TradeMetrics,
  ): TradeManagementAction {
    const reasoning: string[] = [];

    // Only consider target extension for trending strategies
    if (!position.strategy.includes("trend") && !position.strategy.includes("momentum")) {
      return {
        action: "HOLD",
        reasoning: ["Strategy doesn't support target extension"],
        confidence: 0.8,
        priority: "LOW",
      };
    }

    // Extend target if close to current target and momentum continues
    const distanceToTarget = Math.abs(position.takeProfit - position.currentPrice);
    const totalDistance = Math.abs(position.takeProfit - position.entryPrice);
    const proximityPercent = (1 - distanceToTarget / totalDistance) * 100;

    if (proximityPercent > 80 && metrics.unrealizedPnLPercent > 3.0) {
      const extension = totalDistance * 0.5; // Extend by 50% of original target distance
      const newTakeProfit =
        position.direction === "BUY"
          ? position.takeProfit + extension
          : position.takeProfit - extension;

      reasoning.push(
        `Strong momentum - extending TP from ${position.takeProfit.toFixed(4)} to ${newTakeProfit.toFixed(4)}`,
      );

      return {
        action: "EXTEND_TARGET",
        newTakeProfit,
        reasoning,
        confidence: 0.6,
        priority: "LOW",
      };
    }

    return {
      action: "HOLD",
      reasoning: ["Target extension not warranted"],
      confidence: 0.8,
      priority: "LOW",
    };
  }

  private selectHighestPriorityAction(actions: TradeManagementAction[]): TradeManagementAction {
    const priorityMap = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

    return actions.reduce((highest, current) => {
      const currentPriority = priorityMap[current.priority];
      const highestPriority = priorityMap[highest.priority];

      if (currentPriority > highestPriority) {
        return current;
      } else if (currentPriority === highestPriority) {
        // If same priority, choose higher confidence
        return current.confidence > highest.confidence ? current : highest;
      }

      return highest;
    });
  }

  private calculateTrailDistance(position: TradePosition): number {
    const baseDistance = position.entryPrice * 0.01; // 1% base

    // Adjust by timeframe
    const timeframeMultiplier = this.getTimeframeTrailMultiplier(position.timeframe);

    // Adjust by strategy
    const strategyMultiplier = this.getStrategyTrailMultiplier(position.strategy);

    return baseDistance * timeframeMultiplier * strategyMultiplier;
  }

  private getTimeframeTrailMultiplier(timeframe: string): number {
    const multipliers: { [key: string]: number } = {
      "1m": 0.3, // Very tight trailing for scalping
      "5m": 0.5, // Tight trailing
      "15m": 0.7, // Moderate trailing
      "30m": 0.8, // Moderate trailing
      "1h": 1.0, // Base trailing
      "4h": 1.5, // Wider trailing
      "1d": 2.0, // Wide trailing
    };

    return multipliers[timeframe] || 1.0;
  }

  private getStrategyTrailMultiplier(strategy: string): number {
    if (strategy.includes("scalping")) return 0.5;
    if (strategy.includes("breakout")) return 0.8;
    if (strategy.includes("trend")) return 1.2;
    if (strategy.includes("swing")) return 1.0;
    return 1.0;
  }

  private getBreakevenTimeThreshold(timeframe: string): number {
    const thresholds: { [key: string]: number } = {
      "1m": 5, // 5 minutes for 1m scalping
      "5m": 15, // 15 minutes for 5m
      "15m": 45, // 45 minutes for 15m
      "30m": 90, // 1.5 hours for 30m
      "1h": 240, // 4 hours for 1h
      "4h": 720, // 12 hours for 4h
      "1d": 1440, // 1 day for daily
    };

    return thresholds[timeframe] || 240; // Default 4 hours
  }

  private shouldPartialCloseByTime(position: TradePosition, metrics: TradeMetrics): boolean {
    // Scalping strategies: partial close after 10 minutes if profitable
    if (position.strategy.includes("scalping")) {
      return metrics.timeInPosition > 10 && metrics.unrealizedPnLPercent > 0.5;
    }

    // Swing strategies: partial close after 4 hours if moderately profitable
    if (position.strategy.includes("swing")) {
      return metrics.timeInPosition > 240 && metrics.unrealizedPnLPercent > 1.0;
    }

    return false;
  }

  private getMaxTimeInPosition(timeframe: string): number {
    const maxTimes: { [key: string]: number } = {
      "1m": 30, // 30 minutes max for 1m scalping
      "5m": 120, // 2 hours max for 5m
      "15m": 480, // 8 hours max for 15m
      "30m": 960, // 16 hours max for 30m
      "1h": 2880, // 2 days max for 1h
      "4h": 7200, // 5 days max for 4h
      "1d": 20160, // 2 weeks max for daily
    };

    return maxTimes[timeframe] || 2880; // Default 2 days
  }
}
