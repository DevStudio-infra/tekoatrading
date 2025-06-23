import { loggerService } from "./logger.service";

export interface ParsedStrategyRule {
  type: "EXIT_AFTER_CANDLES" | "EXIT_AFTER_TIME" | "EXIT_ON_PROFIT" | "EXIT_ON_LOSS" | "TRAIL_STOP" | "SCALE_OUT" | "CUSTOM";
  trigger: {
    value: number;
    unit: "candles" | "minutes" | "hours" | "percent" | "pips";
    condition?: "greater_than" | "less_than" | "equal_to";
  };
  action: "close_full" | "close_partial" | "modify_sl" | "modify_tp";
  parameters?: {
    percentage?: number;
    newStopLoss?: number;
    newTakeProfit?: number;
  };
  priority: number; // 1-10, higher = more important
  enabled: boolean;
}

export interface ParsedStrategy {
  rules: ParsedStrategyRule[];
  timeframe: string;
  riskManagement: {
    maxRiskPerTrade?: number;
    stopLossPercentage?: number;
    takeProfitPercentage?: number;
  };
  entryConditions: string[];
  exitConditions: string[];
}

export class StrategyRuleParserService {
  /**
   * Parse a strategy description and extract actionable rules
   */
  parseStrategyDescription(description: string, timeframe: string = "M1"): ParsedStrategy {
    try {
      loggerService.info("Parsing strategy description", { description, timeframe });

      const rules: ParsedStrategyRule[] = [];
      const lines = description
        .toLowerCase()
        .split("\n")
        .map((line) => line.trim());

      for (const line of lines) {
        const parsedRule = this.parseIndividualRule(line, timeframe);
        if (parsedRule) {
          rules.push(parsedRule);
        }
      }

      // Extract risk management settings
      const riskManagement = this.extractRiskManagement(description);
      const entryConditions = this.extractEntryConditions(description);
      const exitConditions = this.extractExitConditions(description);

      loggerService.info(`Parsed ${rules.length} rules from strategy description`);

      return {
        rules,
        timeframe,
        riskManagement,
        entryConditions,
        exitConditions,
      };
    } catch (error) {
      loggerService.error("Error parsing strategy description:", error);
      return {
        rules: [],
        timeframe,
        riskManagement: {},
        entryConditions: [],
        exitConditions: [],
      };
    }
  }

  /**
   * Parse an individual rule from a line of text
   */
  private parseIndividualRule(line: string, timeframe: string): ParsedStrategyRule | null {
    // Remove common words and normalize
    const cleanLine = line
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Pattern: "close after X candles"
    const candleExitMatch = cleanLine.match(/close.*after\s+(\d+)\s+candles?/);
    if (candleExitMatch) {
      const candleCount = parseInt(candleExitMatch[1]);
      return {
        type: "EXIT_AFTER_CANDLES",
        trigger: {
          value: candleCount,
          unit: "candles",
        },
        action: "close_full",
        priority: 8,
        enabled: true,
      };
    }

    // Pattern: "close after X minutes/hours"
    const timeExitMatch = cleanLine.match(/close.*after\s+(\d+)\s+(minutes?|hours?)/);
    if (timeExitMatch) {
      const timeValue = parseInt(timeExitMatch[1]);
      const timeUnit = timeExitMatch[2].startsWith("hour") ? "hours" : "minutes";
      return {
        type: "EXIT_AFTER_TIME",
        trigger: {
          value: timeValue,
          unit: timeUnit as "minutes" | "hours",
        },
        action: "close_full",
        priority: 7,
        enabled: true,
      };
    }

    // Pattern: "take profit at X%" or "close when profit reaches X%"
    const profitExitMatch = cleanLine.match(/(?:take profit|close).*(?:at|reaches)\s+(\d+(?:\.\d+)?)\s*%/);
    if (profitExitMatch) {
      const profitPercent = parseFloat(profitExitMatch[1]);
      return {
        type: "EXIT_ON_PROFIT",
        trigger: {
          value: profitPercent,
          unit: "percent",
          condition: "greater_than",
        },
        action: "close_full",
        priority: 9,
        enabled: true,
      };
    }

    // Pattern: "stop loss at X%" or "close if loss exceeds X%"
    const lossExitMatch = cleanLine.match(/(?:stop loss|close).*(?:at|exceeds)\s+(\d+(?:\.\d+)?)\s*%/);
    if (lossExitMatch) {
      const lossPercent = parseFloat(lossExitMatch[1]);
      return {
        type: "EXIT_ON_LOSS",
        trigger: {
          value: -lossPercent,
          unit: "percent",
          condition: "less_than",
        },
        action: "close_full",
        priority: 10,
        enabled: true,
      };
    }

    // Pattern: "trail stop" or "trailing stop"
    const trailStopMatch = cleanLine.match(/trail(?:ing)?\s+stop/);
    if (trailStopMatch) {
      return {
        type: "TRAIL_STOP",
        trigger: {
          value: 2, // Default 2% trail distance
          unit: "percent",
        },
        action: "modify_sl",
        priority: 6,
        enabled: true,
      };
    }

    // Pattern: "scale out at X%" or "partial close at X%"
    const scaleOutMatch = cleanLine.match(/(?:scale out|partial close).*(?:at|when)\s+(\d+(?:\.\d+)?)\s*%/);
    if (scaleOutMatch) {
      const scalePercent = parseFloat(scaleOutMatch[1]);
      return {
        type: "SCALE_OUT",
        trigger: {
          value: scalePercent,
          unit: "percent",
          condition: "greater_than",
        },
        action: "close_partial",
        parameters: {
          percentage: 50, // Default to closing 50% of position
        },
        priority: 5,
        enabled: true,
      };
    }

    return null;
  }

  /**
   * Extract risk management settings from description
   */
  private extractRiskManagement(description: string): any {
    const riskManagement: any = {};

    // Extract risk per trade
    const riskPerTradeMatch = description.match(/risk\s+(\d+(?:\.\d+)?)\s*%\s+per\s+trade/i);
    if (riskPerTradeMatch) {
      riskManagement.maxRiskPerTrade = parseFloat(riskPerTradeMatch[1]);
    }

    // Extract stop loss percentage
    const stopLossMatch = description.match(/stop\s+loss\s+(\d+(?:\.\d+)?)\s*%/i);
    if (stopLossMatch) {
      riskManagement.stopLossPercentage = parseFloat(stopLossMatch[1]);
    }

    // Extract take profit percentage
    const takeProfitMatch = description.match(/take\s+profit\s+(\d+(?:\.\d+)?)\s*%/i);
    if (takeProfitMatch) {
      riskManagement.takeProfitPercentage = parseFloat(takeProfitMatch[1]);
    }

    return riskManagement;
  }

  /**
   * Extract entry conditions from description
   */
  private extractEntryConditions(description: string): string[] {
    const conditions: string[] = [];

    // Look for common entry indicators
    const entryPatterns = [
      /rsi\s+(?:above|below|crosses)\s+\d+/gi,
      /macd\s+(?:bullish|bearish|crosses)/gi,
      /price\s+(?:above|below)\s+(?:sma|ema|ma)/gi,
      /breakout\s+(?:above|below)/gi,
      /support\s+(?:hold|break)/gi,
      /resistance\s+(?:hold|break)/gi,
    ];

    for (const pattern of entryPatterns) {
      const matches = description.match(pattern);
      if (matches) {
        conditions.push(...matches);
      }
    }

    return conditions;
  }

  /**
   * Extract exit conditions from description
   */
  private extractExitConditions(description: string): string[] {
    const conditions: string[] = [];

    // Look for common exit indicators
    const exitPatterns = [/close\s+(?:when|if|after)/gi, /exit\s+(?:when|if|after)/gi, /take\s+profit\s+(?:when|at)/gi, /stop\s+loss\s+(?:when|at)/gi];

    for (const pattern of exitPatterns) {
      const matches = description.match(pattern);
      if (matches) {
        conditions.push(...matches);
      }
    }

    return conditions;
  }

  /**
   * Convert candles to time based on timeframe
   */
  static convertCandlesToTime(candles: number, timeframe: string): number {
    const timeframeToMinutes: { [key: string]: number } = {
      M1: 1,
      M5: 5,
      M15: 15,
      M30: 30,
      H1: 60,
      H4: 240,
      D1: 1440,
    };

    const minutesPerCandle = timeframeToMinutes[timeframe] || 1;
    return candles * minutesPerCandle;
  }

  /**
   * Validate parsed rules for consistency
   */
  validateRules(rules: ParsedStrategyRule[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for conflicting rules
    const exitRules = rules.filter((rule) => rule.action === "close_full");
    if (exitRules.length > 3) {
      errors.push("Too many exit rules may cause conflicts");
    }

    // Check for reasonable values
    for (const rule of rules) {
      if (rule.type === "EXIT_AFTER_CANDLES" && rule.trigger.value > 100) {
        errors.push(`Exit after ${rule.trigger.value} candles seems too long`);
      }

      if (rule.type === "EXIT_ON_PROFIT" && rule.trigger.value > 50) {
        errors.push(`Take profit at ${rule.trigger.value}% seems too high`);
      }

      if (rule.type === "EXIT_ON_LOSS" && Math.abs(rule.trigger.value) > 20) {
        errors.push(`Stop loss at ${Math.abs(rule.trigger.value)}% seems too high`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Export singleton instance
export const strategyRuleParserService = new StrategyRuleParserService();
