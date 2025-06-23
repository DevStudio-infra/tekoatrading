import { LLMChain } from "langchain/chains";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { PromptTemplate } from "@langchain/core/prompts";
import { HumanMessage } from "@langchain/core/messages";
import { AgentResult } from "../types/agent.types";
import { loggerService } from "../../services/logger.service";
import { langchainConfig } from "../../config/langchain.config";
import { RobustJSONParser } from "../../services/ai/json-parser";

export class PortfolioSyncChain extends LLMChain {
  private isInitialized: boolean = false;
  private hasLLM: boolean = false;

  constructor(llm?: ChatGoogleGenerativeAI) {
    let model;
    let hasLLM = false;

    if (llm) {
      model = llm;
      hasLLM = true;
    } else if (langchainConfig.llm.googleApiKey) {
      model = new ChatGoogleGenerativeAI({
        model: langchainConfig.llm.modelName,
        temperature: 0.1, // Lower temperature for more consistent results
        maxOutputTokens: langchainConfig.llm.maxOutputTokens,
        apiKey: langchainConfig.llm.googleApiKey,
      });
      hasLLM = true;
    } else {
      // Create a dummy model for initialization - won't be used
      console.warn("⚠️  GOOGLE_API_KEY not found - PortfolioSyncChain will use fallback mode");
      model = {} as ChatGoogleGenerativeAI;
      hasLLM = false;
    }

    const prompt = PromptTemplate.fromTemplate(`
You are an expert portfolio synchronization specialist responsible for reconciling trading positions between different systems.

Current Synchronization Context:
- Database Positions: {databasePositions}
- Broker Positions: {brokerPositions}
- Pending Orders: {pendingOrders}
- Bot Configurations: {botConfigurations}
- Last Sync Time: {lastSyncTime}
- Sync Tolerance: {syncTolerance}

Please analyze the position discrepancies and provide synchronization recommendations:

1. POSITION RECONCILIATION
   - Identify positions that exist in database but not at broker
   - Identify positions that exist at broker but not in database
   - Compare position sizes and entry prices for accuracy
   - Flag any significant discrepancies requiring attention

2. ORDER RECONCILIATION
   - Match pending orders with broker orders
   - Identify orphaned orders that need cleanup
   - Check for orders that failed to execute properly
   - Recommend order cancellations or updates

3. SYNC ACTIONS REQUIRED
   - Database updates needed to match broker reality
   - Broker orders needed to align with intended positions
   - Position closures required for orphaned positions
   - Risk management actions for out-of-sync positions

4. RISK ASSESSMENT
   - Calculate risk exposure from sync discrepancies
   - Identify high-priority sync actions
   - Assess impact of sync delays on trading strategy
   - Recommend emergency actions if needed

5. SYNC PLAN
   - Step-by-step synchronization sequence
   - Priority order for sync actions
   - Safety checks and rollback procedures
   - Monitoring points for sync completion

Format your response as a JSON object:
{{
  "reconciliation": {{
    "positionDiscrepancies": [{{
      "symbol": string,
      "discrepancyType": "MISSING_DB|MISSING_BROKER|SIZE_MISMATCH|PRICE_MISMATCH",
      "databaseData": object,
      "brokerData": object,
      "severity": "HIGH|MEDIUM|LOW"
    }}],
    "orderDiscrepancies": [{{
      "orderId": string,
      "discrepancyType": "ORPHANED|FAILED|DUPLICATE|STALE",
      "details": string,
      "action": "CANCEL|UPDATE|RETRY|IGNORE"
    }}],
    "totalDiscrepancies": number
  }},
  "syncActions": [{{
    "action": "UPDATE_DB|CLOSE_POSITION|CANCEL_ORDER|CREATE_ORDER",
    "symbol": string,
    "details": object,
    "priority": "HIGH|MEDIUM|LOW",
    "estimated_impact": string
  }}],
  "riskAssessment": {{
    "totalRiskExposure": number,
    "highRiskDiscrepancies": number,
    "emergencyAction": boolean,
    "riskLevel": "LOW|MEDIUM|HIGH|CRITICAL"
  }},
  "syncPlan": {{
    "sequence": [string],
    "estimatedDuration": string,
    "rollbackPlan": [string],
    "successCriteria": [string]
  }}
}}

Be conservative and prioritize safety. Always recommend closing orphaned positions rather than creating new ones.
    `);

    super({ llm: model, prompt });

    // Set instance variables after super call
    this.hasLLM = hasLLM;
    this.isInitialized = true;
  }

  async synchronizePortfolio(input: {
    databasePositions: any[];
    brokerPositions: any[];
    pendingOrders: any[];
    botConfigurations: any[];
    lastSyncTime: string;
    syncTolerance: number;
  }): Promise<any> {
    try {
      // If no LLM available, use fallback logic
      if (!this.hasLLM) {
        console.warn("⚠️  PortfolioSyncChain: Using fallback sync logic (no LLM available)");
        return this.fallbackSynchronizePortfolio(input);
      }

      const result = await this.call({
        databasePositions: JSON.stringify(input.databasePositions, null, 2),
        brokerPositions: JSON.stringify(input.brokerPositions, null, 2),
        pendingOrders: JSON.stringify(input.pendingOrders, null, 2),
        botConfigurations: JSON.stringify(input.botConfigurations, null, 2),
        lastSyncTime: input.lastSyncTime,
        syncTolerance: input.syncTolerance.toString(),
      });

      // Parse the result
      let syncPlan;
      try {
        syncPlan = RobustJSONParser.parseWithFallback(result.text);
      } catch (parseError) {
        loggerService.warn("Portfolio sync JSON parsing failed, using fallback");
        syncPlan = {
          syncStrategy: "MANUAL_REVIEW",
          priority: "HIGH",
          actions: [
            {
              type: "REVIEW",
              description: "Manual review required due to sync analysis parsing failure",
              risk: "MEDIUM",
            },
          ],
          reasoning: "Sync analysis parsing failed - manual review recommended",
          timeline: "IMMEDIATE",
        };
      }

      return {
        success: true,
        syncPlan,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error("Portfolio Sync Chain Error:", error);
      return {
        success: false,
        error: error.message,
        fallbackPlan: {
          riskAssessment: {
            riskLevel: "CRITICAL",
            emergencyAction: true,
          },
          syncActions: [
            {
              action: "HALT_TRADING",
              details: "Sync system failure - halt trading until resolved",
              priority: "HIGH",
            },
          ],
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  private fallbackSynchronizePortfolio(input: {
    databasePositions: any[];
    brokerPositions: any[];
    pendingOrders: any[];
    botConfigurations: any[];
    lastSyncTime: string;
    syncTolerance: number;
  }): any {
    const discrepancies: any[] = [];
    const syncActions: any[] = [];

    // Basic position reconciliation
    const dbSymbols = new Set(input.databasePositions.map((p) => p.symbol));
    const brokerSymbols = new Set(input.brokerPositions.map((p) => p.symbol));

    // Find positions missing in database
    const missingInDB = [...brokerSymbols].filter((s) => !dbSymbols.has(s));
    // Find positions missing in broker
    const missingInBroker = [...dbSymbols].filter((s) => !brokerSymbols.has(s));

    missingInDB.forEach((symbol) => {
      discrepancies.push({
        symbol,
        discrepancyType: "MISSING_DB",
        severity: "HIGH",
        databaseData: null,
        brokerData: input.brokerPositions.find((p) => p.symbol === symbol),
      });
      syncActions.push({
        action: "UPDATE_DB",
        symbol,
        details: { reason: "Position exists in broker but not in database" },
        priority: "HIGH",
        estimated_impact: "Database sync required",
      });
    });

    missingInBroker.forEach((symbol) => {
      discrepancies.push({
        symbol,
        discrepancyType: "MISSING_BROKER",
        severity: "HIGH",
        databaseData: input.databasePositions.find((p) => p.symbol === symbol),
        brokerData: null,
      });
      syncActions.push({
        action: "CLOSE_POSITION",
        symbol,
        details: { reason: "Position exists in database but not in broker - likely orphaned" },
        priority: "HIGH",
        estimated_impact: "Close orphaned position",
      });
    });

    const riskLevel = discrepancies.length > 0 ? "HIGH" : "LOW";
    const emergencyAction = discrepancies.some((d: any) => d.severity === "HIGH");

    return {
      success: true,
      syncPlan: {
        reconciliation: {
          positionDiscrepancies: discrepancies,
          orderDiscrepancies: [],
          totalDiscrepancies: discrepancies.length,
        },
        syncActions,
        riskAssessment: {
          totalRiskExposure: discrepancies.length,
          highRiskDiscrepancies: discrepancies.filter((d: any) => d.severity === "HIGH").length,
          emergencyAction,
          riskLevel,
        },
        syncPlan: {
          sequence: syncActions.map((a: any) => `${a.action} for ${a.symbol}`),
          estimatedDuration: "5-10 minutes",
          rollbackPlan: ["Manual verification", "Restore from backup if needed"],
          successCriteria: ["All positions reconciled", "No orphaned positions remain"],
        },
      },
      timestamp: new Date().toISOString(),
      fallbackMode: true,
    };
  }

  async quickSyncCheck(databasePositions: any[], brokerPositions: any[]): Promise<any> {
    try {
      const discrepancies = [];

      // Simple position count check
      if (databasePositions.length !== brokerPositions.length) {
        discrepancies.push({
          type: "POSITION_COUNT_MISMATCH",
          severity: "HIGH",
          details: `DB: ${databasePositions.length}, Broker: ${brokerPositions.length}`,
        });
      }

      // Symbol matching check
      const dbSymbols = new Set(databasePositions.map((p) => p.symbol));
      const brokerSymbols = new Set(brokerPositions.map((p) => p.symbol));

      const missingInDB = [...brokerSymbols].filter((s) => !dbSymbols.has(s));
      const missingInBroker = [...dbSymbols].filter((s) => !brokerSymbols.has(s));

      if (missingInDB.length > 0) {
        discrepancies.push({
          type: "POSITIONS_MISSING_IN_DB",
          severity: "HIGH",
          details: missingInDB,
        });
      }

      if (missingInBroker.length > 0) {
        discrepancies.push({
          type: "POSITIONS_MISSING_IN_BROKER",
          severity: "HIGH",
          details: missingInBroker,
        });
      }

      const syncStatus = discrepancies.length === 0 ? "SYNCHRONIZED" : "OUT_OF_SYNC";
      const riskLevel = discrepancies.some((d) => d.severity === "HIGH") ? "HIGH" : "LOW";

      return {
        success: true,
        quickCheck: {
          syncStatus,
          riskLevel,
          discrepancies,
          requiresFullSync: discrepancies.length > 0,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        quickCheck: {
          syncStatus: "ERROR",
          riskLevel: "CRITICAL",
          requiresFullSync: true,
        },
      };
    }
  }

  async executeSyncAction(action: { type: string; symbol: string; details: any; priority: string }): Promise<any> {
    try {
      let result = { success: false, message: "", data: null };

      switch (action.type) {
        case "UPDATE_DB":
          result = await this.updateDatabasePosition(action.symbol, action.details);
          break;

        case "CLOSE_POSITION":
          result = await this.closeOrphanedPosition(action.symbol, action.details);
          break;

        case "CANCEL_ORDER":
          result = await this.cancelOrder(action.details.orderId);
          break;

        case "CREATE_ORDER":
          result = await this.createSyncOrder(action.symbol, action.details);
          break;

        case "MANUAL_REVIEW":
          result = {
            success: true,
            message: "Manual review flagged - requires human intervention",
            data: { requiresManualReview: true } as any,
          };
          break;

        default:
          throw new Error(`Unknown sync action type: ${action.type}`);
      }

      return {
        success: result.success,
        action: action.type,
        symbol: action.symbol,
        result: result.message,
        data: result.data,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        action: action.type,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async validateSyncIntegrity(positions: any[], orders: any[]): Promise<any> {
    try {
      const validationChecks = {
        positionIntegrity: true,
        orderIntegrity: true,
        riskCompliance: true,
        dataConsistency: true,
      };

      const issues = [];

      // Position validation
      for (const position of positions) {
        if (!position.symbol || !position.size || !position.entryPrice) {
          validationChecks.positionIntegrity = false;
          issues.push(`Invalid position data for ${position.symbol || "unknown"}`);
        }

        if (Math.abs(position.size) > 1000) {
          // Example limit
          validationChecks.riskCompliance = false;
          issues.push(`Position size too large: ${position.symbol} ${position.size}`);
        }
      }

      // Order validation
      for (const order of orders) {
        if (!order.symbol || !order.side || !order.amount) {
          validationChecks.orderIntegrity = false;
          issues.push(`Invalid order data: ${order.id || "unknown"}`);
        }

        // Check for stale orders (older than 24 hours)
        const orderAge = Date.now() - new Date(order.createdAt).getTime();
        if (orderAge > 24 * 60 * 60 * 1000) {
          issues.push(`Stale order detected: ${order.id} (${Math.round(orderAge / (60 * 60 * 1000))} hours old)`);
        }
      }

      const isValid = Object.values(validationChecks).every((check) => check);

      return {
        success: true,
        validation: {
          isValid,
          checks: validationChecks,
          issues,
          riskLevel: isValid ? "LOW" : issues.length > 5 ? "HIGH" : "MEDIUM",
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        validation: {
          isValid: false,
          riskLevel: "CRITICAL",
        },
      };
    }
  }

  // Helper methods for sync actions
  private async updateDatabasePosition(symbol: string, details: any): Promise<any> {
    // Mock implementation - replace with actual database update
    return {
      success: true,
      message: `Updated database position for ${symbol}`,
      data: details,
    };
  }

  private async closeOrphanedPosition(symbol: string, details: any): Promise<any> {
    // Mock implementation - replace with actual position closure
    return {
      success: true,
      message: `Closed orphaned position for ${symbol}`,
      data: { symbol, closedSize: details.size },
    };
  }

  private async cancelOrder(orderId: string): Promise<any> {
    // Mock implementation - replace with actual order cancellation
    return {
      success: true,
      message: `Cancelled order ${orderId}`,
      data: { orderId, status: "CANCELLED" },
    };
  }

  private async createSyncOrder(symbol: string, details: any): Promise<any> {
    // Mock implementation - replace with actual order creation
    return {
      success: true,
      message: `Created sync order for ${symbol}`,
      data: { symbol, orderId: `sync_${Date.now()}`, ...details },
    };
  }
}
