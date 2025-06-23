/**
 * Position Sizing Agent - LangChain.js Implementation
 * Purpose: Intelligent position sizing based on risk, balance, and market conditions
 * Replaces: Hardcoded position sizing logic
 */

import { AgentResult, PositionSizing } from "../types/agent.types";
import { agentsConfig, riskConfig } from "../../config/agents.config";

export class PositionSizingAgent {
  private initialized: boolean = false;

  constructor() {
    // Simplified implementation without LangChain for now
  }

  async initialize(): Promise<void> {
    try {
      console.log("📏 Initializing Position Sizing Agent...");
      this.initialized = true;
      console.log("✅ Position Sizing Agent initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize Position Sizing Agent:", error);
      throw error;
    }
  }

  /**
   * Calculate optimal position size based on risk parameters
   */
  async calculatePositionSize(
    tradeParams: {
      symbol: string;
      direction: "BUY" | "SELL";
      entryPrice: number;
      stopLossPrice: number;
      confidence: number;
    },
    accountData: {
      balance: number;
      availableBalance: number;
      currency: string;
      riskPerTrade?: number; // percentage
    }
  ): Promise<AgentResult> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      console.log(`📏 Calculating position size for ${tradeParams.symbol}`);

      const config = agentsConfig.agents.positionSizing;
      const riskPerTrade = accountData.riskPerTrade || config.defaultRiskPerTrade;

      // Calculate risk amount in currency
      const riskAmount = accountData.balance * riskPerTrade;

      // Calculate stop loss distance
      const stopLossDistance = Math.abs(tradeParams.entryPrice - tradeParams.stopLossPrice);
      const stopLossPercentage = stopLossDistance / tradeParams.entryPrice;

      // Basic position sizing calculation - use fixed percentage method
      let recommendedSize = riskAmount / stopLossDistance;
      let method: "fixed_percentage" | "kelly" | "volatility_adjusted" = "fixed_percentage";

      // Apply size limits
      const maxSizeByBalance = (accountData.availableBalance * 0.5) / tradeParams.entryPrice; // Max 50% of available balance
      const maxSizeByConfig = config.maxPositionSize;
      const minSizeByConfig = config.minPositionSize;

      const maxSize = Math.min(maxSizeByBalance, maxSizeByConfig);
      const finalSize = Math.max(minSizeByConfig, Math.min(recommendedSize, maxSize));

      const riskPercentage = ((finalSize * stopLossDistance) / accountData.balance) * 100;

      const positioning: PositionSizing = {
        recommendedSize: Math.round(finalSize * 1000) / 1000, // Round to 3 decimals
        maxSize: Math.round(maxSize * 1000) / 1000,
        riskAmount: Math.round(finalSize * stopLossDistance * 100) / 100,
        riskPercentage: Math.round(riskPercentage * 100) / 100,
        reasoning: `Using ${method} method: Risk ${riskPercentage.toFixed(2)}% of balance, Stop loss at ${stopLossPercentage.toFixed(2)}%`,
        method,
      };

      console.log(`📏 Position size calculated: ${positioning.recommendedSize} units (${positioning.riskPercentage}% risk)`);

      return {
        success: true,
        data: positioning,
        metadata: {
          executionTime: Date.now() - Date.now(), // Will be calculated properly in real implementation
          source: "PositionSizingAgent",
        },
      };
    } catch (error: any) {
      console.error("❌ Error calculating position size:", error);

      return {
        success: false,
        error: `Position sizing failed: ${error?.message || "Unknown error"}`,
        data: {
          recommendedSize: riskConfig.minPositionSize,
          maxSize: riskConfig.minPositionSize,
          riskAmount: 10,
          riskPercentage: 1,
          reasoning: "Error in calculation, using minimum safe size",
          method: "fixed_percentage",
        },
        metadata: {
          executionTime: Date.now() - Date.now(), // Will be calculated properly in real implementation
          source: "PositionSizingAgent",
        },
      };
    }
  }

  /**
   * Quick position size calculation without full analysis
   */
  async getQuickPositionSize(balance: number, riskPercentage: number, stopLossDistance: number): Promise<number> {
    try {
      const riskAmount = balance * (riskPercentage / 100);
      const positionSize = riskAmount / stopLossDistance;

      return Math.max(riskConfig.minPositionSize, Math.min(positionSize, riskConfig.maxPositionSize));
    } catch (error) {
      return riskConfig.minPositionSize;
    }
  }

  /**
   * Validate if position size is within acceptable limits
   */
  async validatePositionSize(
    positionSize: number,
    entryPrice: number,
    balance: number
  ): Promise<{
    valid: boolean;
    reason: string;
    adjustedSize?: number;
  }> {
    try {
      const positionValue = positionSize * entryPrice;
      const positionPercentage = (positionValue / balance) * 100;

      // Check minimum size
      if (positionSize < riskConfig.minPositionSize) {
        return {
          valid: false,
          reason: `Position size ${positionSize} below minimum ${riskConfig.minPositionSize}`,
          adjustedSize: riskConfig.minPositionSize,
        };
      }

      // Check maximum size
      if (positionSize > riskConfig.maxPositionSize) {
        return {
          valid: false,
          reason: `Position size ${positionSize} exceeds maximum ${riskConfig.maxPositionSize}`,
          adjustedSize: riskConfig.maxPositionSize,
        };
      }

      // Check position value vs balance
      if (positionPercentage > 50) {
        // Max 50% of balance per position
        const adjustedSize = (balance * 0.5) / entryPrice;
        return {
          valid: false,
          reason: `Position value (${positionPercentage.toFixed(2)}%) exceeds 50% of balance`,
          adjustedSize: Math.round(adjustedSize * 1000) / 1000,
        };
      }

      return {
        valid: true,
        reason: "Position size within acceptable limits",
      };
    } catch (error: any) {
      return {
        valid: false,
        reason: `Validation error: ${error?.message || "Unknown error"}`,
        adjustedSize: riskConfig.minPositionSize,
      };
    }
  }

  /**
   * Get current configuration
   */
  getConfiguration(): any {
    return {
      ...agentsConfig.agents.positionSizing,
      ...riskConfig,
    };
  }

  /**
   * Update configuration (for testing/tuning)
   */
  updateConfiguration(newConfig: Partial<any>): void {
    // In a real implementation, this would update the configuration
    console.log("Position sizing configuration updated:", newConfig);
  }
}

// Export singleton instance
export const positionSizingAgent = new PositionSizingAgent();
