import { loggerService } from "../logger.service";
import { CapitalMainService } from "../../modules/capital";
import { VerificationResult } from "./types";

/**
 * TradeVerificationService
 *
 * Handles trade execution verification and confirmation logic.
 * Extracted from TradingService to improve maintainability.
 */
export class TradeVerificationService {
  private logger: typeof loggerService;

  constructor() {
    this.logger = loggerService;
  }

  /**
   * Verify trade execution with broker
   */
  async verifyTradeExecution(dealReference: string, capitalApi: CapitalMainService): Promise<VerificationResult> {
    try {
      this.logger.info(`Verifying trade execution for deal: ${dealReference}`);

      // Wait a moment for the trade to settle
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Use the proper Capital.com confirmation API first
      try {
        const confirmation = await capitalApi.getDealConfirmation(dealReference);

        if (confirmation && confirmation.dealStatus === "ACCEPTED") {
          this.logger.info(`Trade confirmed as ACCEPTED via confirmation API: ${JSON.stringify(confirmation)}`);
          return { success: true, position: confirmation };
        } else if (confirmation && confirmation.dealStatus === "REJECTED") {
          const rejectReason = confirmation.rejectReason || "Unknown rejection reason";
          this.logger.info(`Trade was REJECTED by broker: ${rejectReason}. This is normal risk management behavior.`);
          return {
            success: false,
            wasRejected: true,
            rejectReason: rejectReason,
            error: `Trade rejected by broker: ${rejectReason}`,
            position: confirmation,
          };
        } else {
          this.logger.warn(`Deal confirmation shows non-accepted status: ${confirmation?.dealStatus || "Unknown"}`);
        }
      } catch (confirmError: any) {
        this.logger.warn(`Deal confirmation API failed: ${confirmError.message}, falling back to position search`);
      }

      // Fallback: search through open positions
      const positions = await capitalApi.getOpenPositions();
      this.logger.info(`Retrieved ${positions?.positions?.length || "undefined"} open positions as fallback`);

      const brokerPositions = Array.isArray(positions?.positions) ? positions.positions : [];
      this.logger.info(`Found ${brokerPositions.length} open positions on Capital.com`);

      const ourPosition = brokerPositions.find(
        (pos: any) => pos.position?.dealReference === dealReference || pos.position?.dealId === dealReference || pos.position?.contractId === dealReference
      );

      if (ourPosition) {
        this.logger.info(`Position found via position search: ${JSON.stringify(ourPosition)}`);
        return { success: true, position: ourPosition };
      }

      this.logger.warn(`Position not found for deal reference: ${dealReference}. This could be due to broker rejection or immediate closure.`);
      return {
        success: false,
        error: `Position not found for deal reference: ${dealReference}. This could be due to broker rejection or immediate closure.`,
      };
    } catch (error: any) {
      this.logger.error(`Error verifying trade execution: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check recent deals if position not found in open positions
   * DEPRECATED: This method has been replaced by proper confirmation API
   */
  async checkRecentDeals(dealReference: string, capitalApi: CapitalMainService): Promise<{ found: boolean; deal?: any }> {
    try {
      // Use the proper confirmation API instead of trying various methods
      const confirmation = await capitalApi.getDealConfirmation(dealReference);

      if (confirmation) {
        this.logger.info(`Found deal via confirmation API: ${JSON.stringify(confirmation)}`);
        return { found: true, deal: confirmation };
      }

      return { found: false };
    } catch (error) {
      this.logger.warn(`Could not get deal confirmation: ${error instanceof Error ? error.message : "Unknown error"}`);
      return { found: false };
    }
  }

  /**
   * Get closing details for a trade
   */
  async getClosingDetails(dbTrade: any, capitalApi: CapitalMainService): Promise<any> {
    try {
      const recentActivity = await capitalApi.getTransactionHistory();

      if (!recentActivity || !Array.isArray(recentActivity)) {
        this.logger.warn(`No transaction history available for trade ${dbTrade.id}`);
        return {};
      }

      const closingActivity = recentActivity.find(
        (activity: any) => (activity.dealReference === dbTrade.broker_deal_id || activity.contractId === dbTrade.broker_order_id) && activity.type === "CLOSE"
      );

      return closingActivity || {};
    } catch (error) {
      this.logger.warn(`Could not get closing details for trade ${dbTrade.id}`);
      return {};
    }
  }
}
