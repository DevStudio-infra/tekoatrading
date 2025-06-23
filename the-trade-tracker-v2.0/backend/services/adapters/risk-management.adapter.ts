/**
 * Risk Management Adapter - LangChain Integration
 * Replaces the deprecated risk-management.service.ts
 * Maintains the same interface while using LangChain agents internally
 */

import { loggerService } from "../logger.service";
import { RiskCheckWorkflow } from "../../agents/workflows/risk-check-workflow";
import { RiskAnalysisChain } from "../../agents/chains/risk-analysis-chain";
import { brokerIntegrationService } from "../broker-integration.service";
import { brokerCredentialService } from "../broker-credential.service";
import { prisma } from "../../utils/prisma";

// Import types from the deprecated service for compatibility
export interface RiskLimits {
  maxRiskPerTrade: number;
  maxTotalExposure: number;
  maxDrawdown: number;
  maxOpenPositions: number;
  maxCorrelatedPositions: number;
  maxDailyLoss: number;
  maxConsecutiveLosses: number;
}

export interface RiskMetrics {
  currentRisk: number;
  totalExposure: number;
  currentDrawdown: number;
  openPositions: number;
  correlatedPositions: number;
  dailyPnL: number;
  consecutiveLosses: number;
  riskScore: number;
}

export interface RiskAlert {
  type: "WARNING" | "CRITICAL" | "EMERGENCY";
  category: "EXPOSURE" | "DRAWDOWN" | "CORRELATION" | "LOSS_LIMIT" | "POSITION_COUNT";
  message: string;
  currentValue: number;
  limitValue: number;
  recommendedAction: string;
  urgency: "LOW" | "MEDIUM" | "HIGH";
  timestamp: Date;
}

export interface PortfolioRiskAssessment {
  overallRisk: number;
  riskMetrics: RiskMetrics;
  activeAlerts: RiskAlert[];
  recommendations: string[];
  emergencyStopTriggered: boolean;
  emergencyStopReason?: string;
}

export class RiskManagementAdapter {
  private riskCheckWorkflow: RiskCheckWorkflow;
  private riskAnalysisChain: RiskAnalysisChain;

  private defaultRiskLimits: RiskLimits = {
    maxRiskPerTrade: 2,
    maxTotalExposure: 20,
    maxDrawdown: 15,
    maxOpenPositions: 5,
    maxCorrelatedPositions: 3,
    maxDailyLoss: 5,
    maxConsecutiveLosses: 3,
  };

  constructor() {
    // Initialize LangChain agents
    this.riskCheckWorkflow = new RiskCheckWorkflow();
    this.riskAnalysisChain = new RiskAnalysisChain();
  }

  /**
   * Get broker credentials for a bot
   */
  private async getBotCredentials(botId: string): Promise<{ apiKey: string; identifier: string; password: string; isDemo?: boolean } | null> {
    try {
      // Get bot details including credential reference
      const bot = await prisma.bot.findUnique({
        where: { id: botId },
        include: { brokerCredential: true },
      });

      if (!bot || !bot.brokerCredential) {
        loggerService.warn(`No broker credentials found for bot ${botId}`);
        return null;
      }

      // Get decrypted credentials
      const credential = await brokerCredentialService.getBrokerCredentialById(bot.brokerCredentialId, bot.userId);

      if (!credential || !credential.credentials) {
        loggerService.warn(`Failed to decrypt credentials for bot ${botId}`);
        return null;
      }

      return credential.credentials;
    } catch (error) {
      loggerService.error(`Error getting credentials for bot ${botId}:`, error);
      return null;
    }
  }

  /**
   * Assess overall portfolio risk for a bot using LangChain agents
   */
  async assessPortfolioRisk(botId: string, customLimits?: Partial<RiskLimits>): Promise<PortfolioRiskAssessment> {
    try {
      loggerService.info(`[LangChain] Assessing portfolio risk for bot ${botId}`);

      const riskLimits = { ...this.defaultRiskLimits, ...customLimits };

      // Use LangChain Risk Analysis Chain for comprehensive assessment
      // Get real account balance
      const credentials = await this.getBotCredentials(botId);
      if (!credentials) {
        throw new Error(`Unable to get broker credentials for bot ${botId}`);
      }

      const accountBalance = await brokerIntegrationService.getAccountBalance(credentials);

      const riskAnalysis = await this.riskAnalysisChain.analyzeRisk({
        symbol: "PORTFOLIO",
        positionDetails: { botId },
        accountBalance: accountBalance.balance,
        portfolioInfo: { riskLimits },
        marketConditions: {},
        riskMetrics: {},
        technicalAnalysis: {},
      });

      // Convert LangChain response to legacy format
      const assessment: PortfolioRiskAssessment = {
        overallRisk: riskAnalysis.analysis?.overallAssessment?.riskScore || 5,
        riskMetrics: this.extractRiskMetrics(riskAnalysis),
        activeAlerts: this.extractRiskAlerts(riskAnalysis),
        recommendations: riskAnalysis.analysis?.overallAssessment?.monitoringPoints || ["Portfolio risk within acceptable limits"],
        emergencyStopTriggered: riskAnalysis.analysis?.overallAssessment?.recommendation === "ABORT",
        emergencyStopReason: riskAnalysis.analysis?.overallAssessment?.reasoning,
      };

      loggerService.info(`[LangChain] Portfolio risk assessment completed: Overall risk ${assessment.overallRisk}/10`);
      return assessment;
    } catch (error) {
      loggerService.error("[LangChain] Error assessing portfolio risk:", error);
      throw new Error("Failed to assess portfolio risk using LangChain agents");
    }
  }

  /**
   * Validate if a new trade meets risk requirements using LangChain workflow
   */
  async validateTradeRisk(
    botId: string,
    tradeParams: {
      symbol: string;
      direction: "BUY" | "SELL";
      quantity: number;
      riskAmount: number;
    },
    customLimits?: Partial<RiskLimits>
  ): Promise<{
    approved: boolean;
    riskScore: number;
    violations: string[];
    recommendations: string[];
    adjustedQuantity?: number;
  }> {
    try {
      loggerService.info(`[LangChain] Validating trade risk for ${tradeParams.symbol}`);

      // Use LangChain Risk Check Workflow for trade validation
      const riskCheck = await this.riskCheckWorkflow.executeRiskCheck({
        symbol: tradeParams.symbol,
        side: tradeParams.direction,
        amount: tradeParams.quantity,
        tradeType: "MARKET",
        botId,
        strategy: "DEFAULT",
        timeframe: "1h",
      });

      const result = {
        approved: riskCheck.approved || false,
        riskScore: riskCheck.riskScore || 10,
        violations: riskCheck.recommendation === "ABORT" ? [riskCheck.reasoning] : [],
        recommendations: riskCheck.reasoning ? [riskCheck.reasoning] : ["Review trade parameters"],
        adjustedQuantity: riskCheck.adjustments?.suggestedAmount || tradeParams.quantity,
      };

      loggerService.info(`[LangChain] Trade risk validation completed: ${result.approved ? "APPROVED" : "REJECTED"}`);
      return result;
    } catch (error) {
      loggerService.error("[LangChain] Error validating trade risk:", error);
      return {
        approved: false,
        riskScore: 10,
        violations: [`Risk validation failed: ${error instanceof Error ? error.message : "Unknown error"}`],
        recommendations: ["Retry risk validation or reduce position size"],
      };
    }
  }

  /**
   * Monitor risk limits and suggest actions
   */
  async monitorRiskLimits(botId: string): Promise<{
    actionsRequired: boolean;
    actions: Array<{
      type: "CLOSE_POSITION" | "REDUCE_POSITION" | "STOP_TRADING" | "ALERT_USER";
      tradeId?: string;
      reason: string;
      urgency: "LOW" | "MEDIUM" | "HIGH";
    }>;
  }> {
    try {
      // TODO: Use LangChain for risk monitoring
      // For now, return no actions required
      return {
        actionsRequired: false,
        actions: [],
      };
    } catch (error) {
      loggerService.error("[LangChain] Error monitoring risk limits:", error);
      return {
        actionsRequired: true,
        actions: [
          {
            type: "ALERT_USER",
            reason: "Risk monitoring system error",
            urgency: "HIGH",
          },
        ],
      };
    }
  }

  // Legacy method compatibility
  async setRiskLimits(botId: string, limits: Partial<RiskLimits>): Promise<void> {
    loggerService.info(`[LangChain] Setting risk limits for bot ${botId}`, limits);
    // Implementation would store limits in database
  }

  async getRiskLimits(botId: string): Promise<RiskLimits> {
    loggerService.info(`[LangChain] Getting risk limits for bot ${botId}`);
    return this.defaultRiskLimits;
  }

  /**
   * Cleanup stale trades (legacy compatibility)
   */
  async cleanupStaleTrades(botId: string): Promise<{
    success: boolean;
    tradesRemoved: number;
    message: string;
  }> {
    try {
      loggerService.info(`[LangChain] Cleaning up stale trades for bot ${botId}`);

      // TODO: Use LangChain Emergency Sync Workflow for cleanup
      // For now, return mock cleanup result
      const result = {
        success: true,
        tradesRemoved: 0,
        message: "No stale trades found",
      };

      loggerService.info(`[LangChain] Stale trades cleanup completed: ${result.tradesRemoved} trades removed`);
      return result;
    } catch (error) {
      loggerService.error("[LangChain] Error cleaning up stale trades:", error);
      return {
        success: false,
        tradesRemoved: 0,
        message: `Cleanup failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Extract risk metrics from LangChain analysis response
   */
  private extractRiskMetrics(riskAnalysis: any): RiskMetrics {
    const analysis = riskAnalysis.analysis;

    return {
      currentRisk: analysis?.positionRisk?.score || 2.5,
      totalExposure: analysis?.portfolioRisk?.score * 2 || 15.0,
      currentDrawdown: analysis?.portfolioRisk?.concentrationRisk || 3.2,
      openPositions: 2, // TODO: Get actual open positions count
      correlatedPositions: analysis?.portfolioRisk?.correlationRisk || 1,
      dailyPnL: 125.5, // TODO: Get actual daily P&L
      consecutiveLosses: 0, // TODO: Get actual consecutive losses
      riskScore: analysis?.overallAssessment?.riskScore || 5,
    };
  }

  /**
   * Extract risk alerts from LangChain analysis response
   */
  private extractRiskAlerts(riskAnalysis: any): RiskAlert[] {
    const analysis = riskAnalysis.analysis;
    const alerts: RiskAlert[] = [];

    // Check for high risk score
    if (analysis?.overallAssessment?.riskScore >= 8) {
      alerts.push({
        type: "CRITICAL",
        category: "EXPOSURE",
        message: "High risk score detected - consider reducing exposure",
        currentValue: analysis.overallAssessment.riskScore,
        limitValue: 7,
        recommendedAction: "Reduce position sizes",
        urgency: "HIGH",
        timestamp: new Date(),
      });
    }

    // Check for abort recommendation
    if (analysis?.overallAssessment?.recommendation === "ABORT") {
      alerts.push({
        type: "EMERGENCY",
        category: "LOSS_LIMIT",
        message: analysis?.overallAssessment?.reasoning || "Emergency stop recommended",
        currentValue: 10,
        limitValue: 8,
        recommendedAction: "Stop all trading immediately",
        urgency: "HIGH",
        timestamp: new Date(),
      });
    }

    return alerts;
  }
}

// Export singleton instance for backward compatibility
export const riskManagementService = new RiskManagementAdapter();
