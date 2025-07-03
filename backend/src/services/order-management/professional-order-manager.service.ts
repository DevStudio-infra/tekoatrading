import { EventEmitter } from "events";
import { logger } from "../../logger";
import { StrategyRuleValidator } from "./strategy-rule-validator.service";
import { OrderCoordinator } from "./order-coordinator.service";
import { OrderTypeDecisionEngine } from "./order-type-decision-engine.service";
import { ProfessionalRiskManager } from "./professional-risk-manager.service";

export interface OrderRequest {
  botId: string;
  symbol: string;
  direction: "BUY" | "SELL";
  analysis: any;
  strategy: any;
  marketConditions: any;
  portfolioContext: any;
  timeframe: string;
  requestingAgent: string;
}

export interface ProfessionalOrderDecision {
  orderType: "MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT";
  entryPrice?: number;
  stopLoss: number;
  takeProfit: number;
  positionSize: number;
  reasoning: string;
  strategyCompliance: {
    isCompliant: boolean;
    violations: string[];
    recommendations: string[];
  };
  riskAssessment: {
    riskScore: number;
    riskRewardRatio: number;
    maxDrawdown: number;
  };
  urgency: "LOW" | "MEDIUM" | "HIGH";
  expiration?: Date;
  conditions: string[];
}

export class ProfessionalOrderManager extends EventEmitter {
  private strategyValidator: StrategyRuleValidator;
  private orderCoordinator: OrderCoordinator;
  private orderDecisionEngine: OrderTypeDecisionEngine;
  private riskManager: ProfessionalRiskManager;

  constructor() {
    super();
    this.strategyValidator = new StrategyRuleValidator();
    this.orderCoordinator = new OrderCoordinator();
    this.orderDecisionEngine = new OrderTypeDecisionEngine();
    this.riskManager = new ProfessionalRiskManager();
  }

  /**
   * Professional order decision making with full strategy compliance
   */
  async requestOrderDecision(request: OrderRequest): Promise<ProfessionalOrderDecision> {
    logger.info(
      `🎯 Professional Order Request from ${request.requestingAgent} for ${request.symbol}`,
    );

    try {
      // 1. STRATEGY RULE VALIDATION (CRITICAL)
      const strategyCompliance = await this.strategyValidator.validateOrderRequest(
        request.strategy,
        request.analysis,
        request.marketConditions,
        request.timeframe,
      );

      if (!strategyCompliance.isCompliant) {
        logger.warn(
          `❌ Strategy Rule Violations for ${request.symbol}:`,
          strategyCompliance.violations,
        );

        // Return rejection with specific violations
        return {
          orderType: "MARKET", // Safe default
          stopLoss: request.analysis.stopLoss,
          takeProfit: request.analysis.takeProfit,
          positionSize: 0, // No position
          reasoning: `Order rejected due to strategy violations: ${strategyCompliance.violations.join(", ")}`,
          strategyCompliance,
          riskAssessment: {
            riskScore: 10, // Maximum risk for non-compliance
            riskRewardRatio: 0,
            maxDrawdown: 0,
          },
          urgency: "LOW",
          conditions: ["STRATEGY_VIOLATION_BLOCK"],
        };
      }

      // 2. ORDER COORDINATION CHECK
      const coordinationResult = await this.orderCoordinator.checkOrderConflicts(
        request.botId,
        request.symbol,
        request.direction,
        request.requestingAgent,
      );

      if (!coordinationResult.canProceed) {
        logger.warn(
          `⚠️ Order Coordination Block for ${request.symbol}:`,
          coordinationResult.reason,
        );

        return {
          orderType: "MARKET",
          stopLoss: request.analysis.stopLoss,
          takeProfit: request.analysis.takeProfit,
          positionSize: 0,
          reasoning: `Order blocked by coordination: ${coordinationResult.reason}`,
          strategyCompliance,
          riskAssessment: {
            riskScore: 8,
            riskRewardRatio: 0,
            maxDrawdown: 0,
          },
          urgency: "LOW",
          conditions: ["COORDINATION_BLOCK"],
        };
      }

      // 3. SOPHISTICATED ORDER TYPE DECISION
      const orderDecision = await this.orderDecisionEngine.determineOptimalOrderType(
        request.analysis,
        request.strategy,
        request.marketConditions,
        request.direction,
        request.timeframe,
      );

      // 4. PROFESSIONAL RISK MANAGEMENT
      const riskAssessment = await this.riskManager.calculateProfessionalRisk(
        request.analysis,
        request.strategy,
        request.portfolioContext,
        orderDecision.orderType,
        request.timeframe,
      );

      // 5. FINAL DECISION COMPILATION
      const finalDecision: ProfessionalOrderDecision = {
        orderType: orderDecision.orderType,
        entryPrice: orderDecision.entryPrice,
        stopLoss: riskAssessment.adjustedStopLoss,
        takeProfit: riskAssessment.adjustedTakeProfit,
        positionSize: riskAssessment.optimalPositionSize,
        reasoning: this.compileProfessionalReasoning(
          orderDecision,
          riskAssessment,
          strategyCompliance,
        ),
        strategyCompliance,
        riskAssessment: {
          riskScore: riskAssessment.riskScore,
          riskRewardRatio: riskAssessment.riskRewardRatio,
          maxDrawdown: riskAssessment.maxDrawdown,
        },
        urgency: this.determineUrgency(orderDecision, request.marketConditions),
        expiration: orderDecision.expiration,
        conditions: this.compileOrderConditions(orderDecision, strategyCompliance),
      };

      // 6. REGISTER ORDER WITH COORDINATOR
      await this.orderCoordinator.registerPendingOrder(
        request.botId,
        request.symbol,
        finalDecision,
        request.requestingAgent,
      );

      logger.info(`✅ Professional Order Decision for ${request.symbol}:`, {
        orderType: finalDecision.orderType,
        reasoning: finalDecision.reasoning,
        compliance: finalDecision.strategyCompliance.isCompliant,
        riskScore: finalDecision.riskAssessment.riskScore,
      });

      return finalDecision;
    } catch (error) {
      logger.error(`❌ Professional Order Decision Failed for ${request.symbol}:`, error);

      // Safe fallback decision
      return {
        orderType: "MARKET",
        stopLoss: request.analysis.stopLoss || 0,
        takeProfit: request.analysis.takeProfit || 0,
        positionSize: 0,
        reasoning: `Order processing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        strategyCompliance: {
          isCompliant: false,
          violations: ["PROCESSING_ERROR"],
          recommendations: ["Retry with manual review"],
        },
        riskAssessment: {
          riskScore: 10,
          riskRewardRatio: 0,
          maxDrawdown: 0,
        },
        urgency: "LOW",
        conditions: ["ERROR_FALLBACK"],
      };
    }
  }

  /**
   * Compile professional reasoning combining all factors
   */
  private compileProfessionalReasoning(
    orderDecision: any,
    riskAssessment: any,
    strategyCompliance: any,
  ): string {
    const reasoningParts = [
      `ORDER: ${orderDecision.reasoning}`,
      `RISK: ${riskAssessment.reasoning}`,
      `STRATEGY: ${strategyCompliance.recommendations.join(", ") || "Compliant"}`,
    ];

    return reasoningParts.join(" | ");
  }

  /**
   * Determine order urgency based on market conditions and order type
   */
  private determineUrgency(orderDecision: any, marketConditions: any): "LOW" | "MEDIUM" | "HIGH" {
    if (orderDecision.orderType === "MARKET") {
      return "HIGH"; // Market orders need immediate execution
    }

    if (marketConditions.volatility === "HIGH" && orderDecision.orderType === "LIMIT") {
      return "MEDIUM"; // Volatile markets may require faster limit execution
    }

    return "LOW"; // Standard pending orders
  }

  /**
   * Compile order execution conditions
   */
  private compileOrderConditions(orderDecision: any, strategyCompliance: any): string[] {
    const conditions = [];

    if (orderDecision.orderType !== "MARKET") {
      conditions.push(`ENTRY_PRICE_${orderDecision.entryPrice}`);
    }

    if (strategyCompliance.recommendations.length > 0) {
      conditions.push(...strategyCompliance.recommendations);
    }

    if (orderDecision.requiredConfirmations) {
      conditions.push(...orderDecision.requiredConfirmations);
    }

    return conditions;
  }

  /**
   * Cancel pending order decision
   */
  async cancelOrderDecision(botId: string, symbol: string, reason: string): Promise<void> {
    await this.orderCoordinator.cancelPendingOrder(botId, symbol, reason);
    logger.info(`🚫 Order Decision Cancelled: ${symbol} - ${reason}`);
  }

  /**
   * Get order statistics for monitoring
   */
  async getOrderStatistics(botId: string): Promise<any> {
    return await this.orderCoordinator.getOrderStatistics(botId);
  }
}
