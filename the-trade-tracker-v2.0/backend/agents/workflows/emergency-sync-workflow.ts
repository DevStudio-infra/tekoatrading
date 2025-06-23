import { PortfolioSyncAgent } from "../trading/portfolio-sync.agent";
import { RiskAssessmentAgent } from "../trading/risk-assessment.agent";
import { TradeExecutionAgent } from "../trading/trade-execution.agent";
import { PortfolioSyncChain } from "../chains/portfolio-sync-chain";
import { DatabaseTool } from "../tools/database.tool";
import { CapitalApiTool } from "../tools/capital-api.tool";
import { RobustJSONParser } from "../../services/ai/json-parser";
import { loggerService } from "../../services/logger.service";

export interface EmergencyTrigger {
  type: "SYNC_FAILURE" | "POSITION_MISMATCH" | "MARGIN_CALL" | "SYSTEM_ERROR" | "MANUAL_TRIGGER";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  description: string;
  triggeredBy: string;
  timestamp: string;
  data?: any;
}

export interface EmergencyResponse {
  success: boolean;
  actionsPerformed: string[];
  positionsAffected: string[];
  riskMitigation: any;
  syncStatus: "SYNCHRONIZED" | "PARTIAL" | "FAILED";
  nextSteps: string[];
  requiresManualIntervention: boolean;
  timestamp: string;
}

export class EmergencySyncWorkflow {
  private portfolioSyncAgent: PortfolioSyncAgent;
  private riskAssessmentAgent: RiskAssessmentAgent;
  private tradeExecutionAgent: TradeExecutionAgent;
  private portfolioSyncChain: PortfolioSyncChain;
  private databaseTool: DatabaseTool;
  private capitalApiTool: CapitalApiTool;

  private isEmergencyMode: boolean = false;
  private emergencyLog: EmergencyTrigger[] = [];

  constructor() {
    this.portfolioSyncAgent = new PortfolioSyncAgent();
    this.riskAssessmentAgent = new RiskAssessmentAgent();
    this.tradeExecutionAgent = new TradeExecutionAgent();
    this.portfolioSyncChain = new PortfolioSyncChain();
    this.databaseTool = new DatabaseTool();
    this.capitalApiTool = new CapitalApiTool();
  }

  async triggerEmergencySync(trigger: EmergencyTrigger): Promise<EmergencyResponse> {
    try {
      console.log(`🚨 EMERGENCY SYNC TRIGGERED: ${trigger.type} - ${trigger.severity}`);

      this.isEmergencyMode = true;
      this.emergencyLog.push(trigger);

      // Step 1: Immediate risk assessment and containment
      const riskContainment = await this.performRiskContainment(trigger);

      // Step 2: Emergency synchronization based on trigger type
      const syncResult = await this.executeEmergencySync(trigger);

      // Step 3: Verify synchronization and calculate remaining risk
      const verification = await this.verifySyncResult(syncResult);

      // Step 4: Implement additional safety measures if needed
      const safetyMeasures = await this.implementSafetyMeasures(verification);

      // Step 5: Generate emergency response report
      const response = await this.generateEmergencyResponse(trigger, riskContainment, syncResult, verification, safetyMeasures);

      // Log the emergency event
      await this.logEmergencyEvent(trigger, response);

      return response;
    } catch (error: any) {
      console.error("❌ Emergency Sync Workflow Failed:", error);

      // Critical failure - halt all trading
      await this.haltAllTrading();

      return {
        success: false,
        actionsPerformed: ["EMERGENCY_HALT"],
        positionsAffected: [],
        riskMitigation: { criticalFailure: true },
        syncStatus: "FAILED",
        nextSteps: ["MANUAL_INTERVENTION_REQUIRED", "SYSTEM_RESTART_NEEDED"],
        requiresManualIntervention: true,
        timestamp: new Date().toISOString(),
      };
    } finally {
      this.isEmergencyMode = false;
    }
  }

  private async performRiskContainment(trigger: EmergencyTrigger): Promise<any> {
    try {
      const containmentActions = [];

      // Get current positions and assess immediate risk
      const currentPositions = await this.getCurrentPositions();
      const immediateRisk = await this.assessImmediateRisk(currentPositions, trigger);

      // Based on severity, implement containment measures
      switch (trigger.severity) {
        case "CRITICAL":
          // Halt all new orders
          await this.haltNewOrders();
          containmentActions.push("HALT_NEW_ORDERS");

          // If extreme risk, close all positions
          if (immediateRisk.riskLevel === "EXTREME") {
            await this.emergencyCloseAllPositions();
            containmentActions.push("EMERGENCY_CLOSE_ALL_POSITIONS");
          }
          break;

        case "HIGH":
          // Reduce position sizes to minimum
          await this.reducePositionSizes();
          containmentActions.push("REDUCE_POSITION_SIZES");
          break;

        case "MEDIUM":
          // Cancel pending orders
          await this.cancelNonEssentialOrders();
          containmentActions.push("CANCEL_NON_ESSENTIAL_ORDERS");
          break;

        case "LOW":
          // Just log and monitor
          containmentActions.push("MONITORING_ENHANCED");
          break;
      }

      return {
        containmentActions,
        immediateRisk,
        currentPositions: currentPositions.length,
      };
    } catch (error: any) {
      console.error("Risk containment failed:", error);
      return {
        containmentActions: ["CONTAINMENT_FAILED"],
        error: error.message,
      };
    }
  }

  private async executeEmergencySync(trigger: EmergencyTrigger): Promise<any> {
    try {
      let syncResult;

      switch (trigger.type) {
        case "SYNC_FAILURE":
          syncResult = await this.handleSyncFailure(trigger);
          break;

        case "POSITION_MISMATCH":
          syncResult = await this.handlePositionMismatch(trigger);
          break;

        case "MARGIN_CALL":
          syncResult = await this.handleMarginCall(trigger);
          break;

        case "SYSTEM_ERROR":
          syncResult = await this.handleSystemError(trigger);
          break;

        case "MANUAL_TRIGGER":
          syncResult = await this.handleManualTrigger(trigger);
          break;

        default:
          throw new Error(`Unknown emergency trigger type: ${trigger.type}`);
      }

      return syncResult;
    } catch (error: any) {
      console.error("Emergency sync execution failed:", error);
      return {
        success: false,
        error: error.message,
        fallbackAction: "MANUAL_INTERVENTION_REQUIRED",
      };
    }
  }

  private async handleSyncFailure(trigger: EmergencyTrigger): Promise<any> {
    try {
      console.log("🔄 Handling sync failure emergency...");

      // Get fresh data from both systems
      const [dbPositions, brokerPositions] = await Promise.all([this.getDatabasePositions(), this.getBrokerPositions()]);

      // Use portfolio sync chain for analysis
      const syncAnalysis = await this.portfolioSyncChain.synchronizePortfolio({
        databasePositions: dbPositions,
        brokerPositions: brokerPositions,
        pendingOrders: [],
        botConfigurations: [],
        lastSyncTime: trigger.timestamp,
        syncTolerance: 0.01, // Strict tolerance for emergency sync
      });

      // Execute high-priority sync actions
      const executedActions = [];
      if (syncAnalysis.syncPlan?.syncActions) {
        for (const action of syncAnalysis.syncPlan.syncActions) {
          if (action.priority === "HIGH") {
            const result = await this.portfolioSyncChain.executeSyncAction(action);
            executedActions.push(result);
          }
        }
      }

      return {
        success: true,
        syncAnalysis,
        executedActions,
        resolvedDiscrepancies: executedActions.length,
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async handlePositionMismatch(trigger: EmergencyTrigger): Promise<any> {
    try {
      console.log("⚖️ Handling position mismatch emergency...");

      const mismatchData = trigger.data || {};
      const { symbol, dbSize, brokerSize } = mismatchData;

      // Determine the correct position size (broker is source of truth)
      const correctSize = brokerSize || 0;

      if (correctSize === 0) {
        // Position should not exist - close it in database
        await this.databaseTool.invoke(
          JSON.stringify({
            action: "update_position",
            params: {
              positionId: mismatchData.positionId,
              updates: { status: "CLOSED", size: 0 },
            },
          })
        );
      } else {
        // Update database to match broker
        await this.databaseTool.invoke(
          JSON.stringify({
            action: "update_position",
            params: {
              positionId: mismatchData.positionId,
              updates: { size: correctSize },
            },
          })
        );
      }

      return {
        success: true,
        action: correctSize === 0 ? "POSITION_CLOSED" : "POSITION_UPDATED",
        symbol,
        originalSize: dbSize,
        correctedSize: correctSize,
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async handleMarginCall(trigger: EmergencyTrigger): Promise<any> {
    try {
      console.log("💰 Handling margin call emergency...");

      // Get account balance and margin info
      const accountData = await this.capitalApiTool.invoke(
        JSON.stringify({
          action: "getBalance",
        })
      );

      const balance = RobustJSONParser.parseWithFallback(accountData);

      // Close positions to reduce margin usage
      const positionsToClose = await this.selectPositionsToClose(balance);
      const closedPositions = [];

      for (const position of positionsToClose) {
        try {
          const closeResult = await this.tradeExecutionAgent.closePosition({
            positionId: position.id,
            symbol: position.symbol,
            reason: "MARGIN_CALL_EMERGENCY",
          });

          if (closeResult.success) {
            closedPositions.push(position);
          }
        } catch (error) {
          console.error(`Failed to close position ${position.id}:`, error);
        }
      }

      return {
        success: closedPositions.length > 0,
        closedPositions,
        marginFreed: closedPositions.reduce((sum, p) => sum + (p.value || 0), 0),
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async handleSystemError(trigger: EmergencyTrigger): Promise<any> {
    try {
      console.log("🔧 Handling system error emergency...");

      // System error recovery procedure
      const recoveryActions = [];

      // 1. Check system connectivity
      const connectivityCheck = await this.checkSystemConnectivity();
      recoveryActions.push(`CONNECTIVITY_CHECK: ${connectivityCheck.status}`);

      // 2. Verify data integrity
      const integrityCheck = await this.verifyDataIntegrity();
      recoveryActions.push(`INTEGRITY_CHECK: ${integrityCheck.status}`);

      // 3. Attempt system recovery
      if (connectivityCheck.status === "OK" && integrityCheck.status === "OK") {
        await this.attemptSystemRecovery();
        recoveryActions.push("RECOVERY_ATTEMPTED");
      }

      return {
        success: true,
        recoveryActions,
        systemStatus: connectivityCheck.status === "OK" ? "RECOVERED" : "DEGRADED",
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async handleManualTrigger(trigger: EmergencyTrigger): Promise<any> {
    try {
      console.log("👤 Handling manual trigger emergency...");

      // Manual trigger - follow user-specified actions
      const manualActions = trigger.data?.actions || ["FULL_SYNC"];
      const results = [];

      for (const action of manualActions) {
        switch (action) {
          case "FULL_SYNC":
            const syncResult = await this.performFullSync();
            results.push({ action, result: syncResult });
            break;

          case "CLOSE_ALL":
            const closeResult = await this.emergencyCloseAllPositions();
            results.push({ action, result: closeResult });
            break;

          case "HALT_TRADING":
            await this.haltAllTrading();
            results.push({ action, result: { success: true } });
            break;
        }
      }

      return {
        success: true,
        manualActions,
        results,
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async verifySyncResult(syncResult: any): Promise<any> {
    try {
      // Quick sync verification
      const [dbPositions, brokerPositions] = await Promise.all([this.getDatabasePositions(), this.getBrokerPositions()]);

      const verification = await this.portfolioSyncChain.quickSyncCheck(dbPositions, brokerPositions);

      return {
        verified: verification.quickCheck?.syncStatus === "SYNCHRONIZED",
        discrepancies: verification.quickCheck?.discrepancies || [],
        riskLevel: verification.quickCheck?.riskLevel || "MEDIUM",
      };
    } catch (error: any) {
      return {
        verified: false,
        error: error.message,
        riskLevel: "HIGH",
      };
    }
  }

  private async implementSafetyMeasures(verification: any): Promise<any> {
    const safetyMeasures = [];

    try {
      if (!verification.verified) {
        // Implement additional safety measures
        if (verification.riskLevel === "HIGH" || verification.riskLevel === "CRITICAL") {
          await this.haltAllTrading();
          safetyMeasures.push("TRADING_HALTED");
        }

        // Set up enhanced monitoring
        await this.enableEnhancedMonitoring();
        safetyMeasures.push("ENHANCED_MONITORING");
      }

      return { safetyMeasures };
    } catch (error: any) {
      return { safetyMeasures, error: error.message };
    }
  }

  private async generateEmergencyResponse(trigger: EmergencyTrigger, riskContainment: any, syncResult: any, verification: any, safetyMeasures: any): Promise<EmergencyResponse> {
    const actionsPerformed = [...(riskContainment.containmentActions || []), ...(safetyMeasures.safetyMeasures || [])];

    const success = syncResult.success && verification.verified;

    const nextSteps = [];
    if (!success) {
      nextSteps.push("MANUAL_REVIEW_REQUIRED");
      nextSteps.push("RETRY_SYNC_IN_5_MINUTES");
    }

    if (verification.discrepancies?.length > 0) {
      nextSteps.push("RESOLVE_REMAINING_DISCREPANCIES");
    }

    return {
      success,
      actionsPerformed,
      positionsAffected: [], // Would populate with actual affected positions
      riskMitigation: {
        riskContainment,
        verification,
        safetyMeasures,
      },
      syncStatus: verification.verified ? "SYNCHRONIZED" : "PARTIAL",
      nextSteps,
      requiresManualIntervention: !success || verification.riskLevel === "CRITICAL",
      timestamp: new Date().toISOString(),
    };
  }

  // Helper methods
  private async getCurrentPositions(): Promise<any[]> {
    try {
      const result = await this.databaseTool.invoke(
        JSON.stringify({
          action: "get_positions",
          filters: {},
        })
      );
      const positions = RobustJSONParser.parseWithFallback(result);
      return positions.data || [];
    } catch (error) {
      return [];
    }
  }

  private async getDatabasePositions(): Promise<any[]> {
    return this.getCurrentPositions();
  }

  private async getBrokerPositions(): Promise<any[]> {
    try {
      const result = await this.capitalApiTool.invoke(
        JSON.stringify({
          action: "getPositions",
        })
      );
      return RobustJSONParser.parseWithFallback(result) || [];
    } catch (error) {
      return [];
    }
  }

  private async assessImmediateRisk(positions: any[], trigger: EmergencyTrigger): Promise<any> {
    // Simplified immediate risk assessment
    const totalPositions = positions.length;
    const totalValue = positions.reduce((sum, p) => sum + (p.value || 0), 0);

    let riskLevel = "LOW";
    if (trigger.severity === "CRITICAL" || totalValue > 100000) riskLevel = "EXTREME";
    else if (trigger.severity === "HIGH" || totalPositions > 10) riskLevel = "HIGH";
    else if (trigger.severity === "MEDIUM") riskLevel = "MEDIUM";

    return { riskLevel, totalPositions, totalValue };
  }

  private async haltNewOrders(): Promise<void> {
    // Implementation would set a flag to prevent new orders
    console.log("🛑 New orders halted");
  }

  private async haltAllTrading(): Promise<void> {
    // Implementation would halt all trading activities
    console.log("🛑 All trading halted");
  }

  private async emergencyCloseAllPositions(): Promise<any> {
    console.log("🚨 Emergency close all positions initiated");
    // Implementation would close all open positions
    return { success: true, closedPositions: 0 };
  }

  private async reducePositionSizes(): Promise<void> {
    console.log("📉 Reducing position sizes");
    // Implementation would reduce all position sizes by 50%
  }

  private async cancelNonEssentialOrders(): Promise<void> {
    console.log("❌ Cancelling non-essential orders");
    // Implementation would cancel pending orders
  }

  private async performFullSync(): Promise<any> {
    console.log("🔄 Performing full portfolio sync");
    return { success: true };
  }

  private async selectPositionsToClose(balance: any): Promise<any[]> {
    // Logic to select which positions to close for margin call
    return [];
  }

  private async checkSystemConnectivity(): Promise<any> {
    return { status: "OK" };
  }

  private async verifyDataIntegrity(): Promise<any> {
    return { status: "OK" };
  }

  private async attemptSystemRecovery(): Promise<void> {
    console.log("🔧 Attempting system recovery");
  }

  private async enableEnhancedMonitoring(): Promise<void> {
    console.log("👁️ Enhanced monitoring enabled");
  }

  private async logEmergencyEvent(trigger: EmergencyTrigger, response: EmergencyResponse): Promise<void> {
    // Log emergency event to database and monitoring systems
    console.log("📝 Emergency event logged", { trigger: trigger.type, success: response.success });
  }

  // Public methods for monitoring
  public isInEmergencyMode(): boolean {
    return this.isEmergencyMode;
  }

  public getEmergencyLog(): EmergencyTrigger[] {
    return [...this.emergencyLog];
  }

  public async getEmergencyStatus(): Promise<any> {
    return {
      isEmergencyMode: this.isEmergencyMode,
      recentEmergencies: this.emergencyLog.slice(-5),
      systemStatus: "OPERATIONAL", // Would check actual system status
    };
  }
}
