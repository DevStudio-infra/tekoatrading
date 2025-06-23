import { loggerService } from "../logger.service";
import { prisma } from "../../utils/prisma";
import { createClient } from "@supabase/supabase-js";
import { TradeRecord } from "./types";

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * TradeDataService
 *
 * Handles all database CRUD operations for trades and performance tracking.
 * Extracted from TradingService to improve maintainability.
 */
export class TradeDataService {
  private logger: typeof loggerService;

  constructor() {
    this.logger = loggerService;
  }

  /**
   * Get database trades for a specific bot
   */
  async getDatabaseTrades(botId: string): Promise<any[]> {
    try {
      const { data: trades, error } = await supabase.from("trades").select("*").eq("bot_id", botId).in("status", ["OPEN", "PENDING"]).order("created_at", { ascending: false });

      if (error) {
        this.logger.error(`Error fetching database trades for bot ${botId}: ${error.message}`);
        return [];
      }

      return trades || [];
    } catch (error) {
      this.logger.error(`Error fetching database trades: ${error instanceof Error ? error.message : "Unknown error"}`);
      return [];
    }
  }

  /**
   * Create a trade record in the database
   */
  async createTradeRecord(tradeData: any): Promise<any> {
    try {
      // Ensure all required fields are present and valid
      const quantity = tradeData.quantity || tradeData.size || tradeData.contractSize || tradeData.adjustedSize;
      if (!quantity || quantity <= 0) {
        this.logger.error(
          `Invalid quantity for trade record: ${JSON.stringify({
            quantity: tradeData.quantity,
            size: tradeData.size,
            contractSize: tradeData.contractSize,
            adjustedSize: tradeData.adjustedSize,
          })}`
        );
        throw new Error(`Invalid quantity: ${quantity}. Cannot create trade record without valid quantity.`);
      }

      // Extract entry price from multiple possible sources, including brokerPosition
      let entryPrice = tradeData.entryPrice || tradeData.openLevel || tradeData.level;

      // Check if we have a brokerPosition object with the price
      if (!entryPrice && tradeData.brokerPosition) {
        entryPrice = tradeData.brokerPosition.level || tradeData.brokerPosition.openLevel || tradeData.brokerPosition.price;
      }

      if (!entryPrice || entryPrice <= 0) {
        this.logger.error(
          `Invalid entry price for trade record: ${JSON.stringify({
            entryPrice: tradeData.entryPrice,
            openLevel: tradeData.openLevel,
            level: tradeData.level,
            brokerPositionLevel: tradeData.brokerPosition?.level,
            brokerPositionOpenLevel: tradeData.brokerPosition?.openLevel,
            brokerPositionPrice: tradeData.brokerPosition?.price,
          })}`
        );
        throw new Error(`Invalid entry price: ${entryPrice}. Cannot create trade record without valid entry price.`);
      }

      // Extract broker deal ID from brokerPosition if available
      let brokerDealId = tradeData.brokerDealId;
      if (!brokerDealId && tradeData.brokerPosition) {
        brokerDealId = tradeData.brokerPosition.dealId || tradeData.brokerPosition.id;
      }

      // Extract broker order ID from brokerPosition if available
      let brokerOrderId = tradeData.brokerOrderId;
      if (!brokerOrderId && tradeData.brokerPosition) {
        brokerOrderId = tradeData.brokerPosition.dealReference || tradeData.brokerPosition.orderReference;
      }

      const tradeRecord = {
        id: crypto.randomUUID(),
        bot_id: tradeData.botId,
        evaluation_id: tradeData.evaluationId || null,
        user_id: tradeData.userId,
        symbol: tradeData.symbol,
        direction: tradeData.direction,
        order_type: tradeData.orderType || "MARKET",
        quantity: quantity, // Ensure quantity is properly set
        entry_price: entryPrice, // Ensure entry price is properly set
        current_price: tradeData.currentPrice || entryPrice, // Fallback to entry price if current price not available
        stop_loss: tradeData.stopLoss || null,
        take_profit: tradeData.takeProfit || null,
        status: tradeData.status || "OPEN",
        broker_order_id: brokerOrderId || null,
        broker_deal_id: brokerDealId,
        rationale: tradeData.rationale || null,
        ai_confidence: tradeData.aiConfidence || null,
        risk_score: tradeData.riskScore || null,
        profit_loss: tradeData.profitLoss || null,
        profit_loss_percent: tradeData.profitLossPercent || null,
        fees: tradeData.fees || 0,
        opened_at: tradeData.openedAt || new Date(),
        closed_at: tradeData.closedAt || null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Log the trade record being created for debugging with enhanced bot tracking
      this.logger.info(
        `[BOT POSITION TRACKING] Creating trade record: ${JSON.stringify({
          id: tradeRecord.id,
          bot_id: tradeRecord.bot_id,
          symbol: tradeRecord.symbol,
          direction: tradeRecord.direction,
          quantity: tradeRecord.quantity,
          entry_price: tradeRecord.entry_price,
          broker_deal_id: tradeRecord.broker_deal_id,
          broker_order_id: tradeRecord.broker_order_id,
          status: tradeRecord.status,
          tracking_metadata: `BOT_${tradeRecord.bot_id}_${tradeRecord.symbol}`,
        })}`
      );

      // Create a position ownership record for enhanced tracking
      await this.createPositionOwnershipRecord(tradeRecord);

      const { data, error } = await supabase.from("trades").insert([tradeRecord]).select().single();

      if (error) {
        this.logger.error(`Error creating trade record: ${error.message}`);
        this.logger.error(`Trade record data: ${JSON.stringify(tradeRecord, null, 2)}`);
        throw new Error(`Failed to create trade record: ${error.message}`);
      }

      this.logger.info(`Trade record created successfully: ${data.id} for bot ${tradeRecord.bot_id}, symbol ${tradeRecord.symbol}, quantity ${tradeRecord.quantity}`);
      return data;
    } catch (error) {
      this.logger.error(`Error creating trade record: ${error instanceof Error ? error.message : "Unknown error"}`);
      this.logger.error(`Trade data provided: ${JSON.stringify(tradeData, null, 2)}`);
      throw error;
    }
  }

  /**
   * Update a trade record in the database
   */
  async updateTradeRecord(tradeId: string, updates: any): Promise<any> {
    try {
      const { data, error } = await supabase
        .from("trades")
        .update({
          ...updates,
          updated_at: new Date(),
        })
        .eq("id", tradeId)
        .select()
        .single();

      if (error) {
        this.logger.error(`Error updating trade record ${tradeId}: ${error.message}`);
        throw new Error(`Failed to update trade record: ${error.message}`);
      }

      this.logger.info(`Trade record ${tradeId} updated successfully`);
      return data;
    } catch (error) {
      this.logger.error(`Error updating trade record: ${error instanceof Error ? error.message : "Unknown error"}`);
      throw error;
    }
  }

  /**
   * Get active trades for a bot
   */
  async getActiveTrades(botId: string): Promise<any[]> {
    return await prisma.trade.findMany({
      where: {
        botId,
        status: "OPEN",
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  /**
   * Get trade history for a bot
   */
  async getTradeHistory(botId: string, limit: number = 50): Promise<any[]> {
    return await prisma.trade.findMany({
      where: {
        botId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });
  }

  /**
   * Get a specific trade by ID
   */
  async getTradeById(tradeId: string): Promise<any | null> {
    try {
      const trade = await prisma.trade.findUnique({
        where: {
          id: tradeId,
        },
      });
      return trade;
    } catch (error) {
      this.logger.error(`Error fetching trade ${tradeId}: ${error instanceof Error ? error.message : "Unknown error"}`);
      throw error;
    }
  }

  /**
   * Create a position ownership record for enhanced tracking
   */
  private async createPositionOwnershipRecord(tradeRecord: any): Promise<void> {
    try {
      // Log position ownership for enhanced tracking - this helps with multi-bot scenarios
      this.logger.info(`[POSITION OWNERSHIP] Registering ownership: Bot ${tradeRecord.bot_id} owns position ${tradeRecord.broker_deal_id} for symbol ${tradeRecord.symbol}`);

      // Additional validation that this bot should be creating this position
      const bot = await prisma.bot.findUnique({
        where: { id: tradeRecord.bot_id },
        select: { tradingPairSymbol: true, maxSimultaneousTrades: true },
      });

      if (bot && bot.tradingPairSymbol !== tradeRecord.symbol) {
        this.logger.warn(`[POSITION OWNERSHIP] WARNING: Bot ${tradeRecord.bot_id} is creating position for ${tradeRecord.symbol} but is configured for ${bot.tradingPairSymbol}`);
      }
    } catch (error) {
      this.logger.error(`Error creating position ownership record: ${error instanceof Error ? error.message : "Unknown error"}`);
      // Don't throw - this is just for enhanced tracking
    }
  }

  /**
   * Mark a trade as closed in the database
   */
  async markTradeAsClosed(dbTrade: any, closingDetails: any): Promise<void> {
    try {
      const updates: any = {
        status: "CLOSED",
        closed_at: new Date(), // Use snake_case for database column
        updated_at: new Date(),
      };

      if (closingDetails?.level) {
        updates.current_price = closingDetails.level;
      }

      if (closingDetails?.profitLoss !== undefined) {
        updates.profit_loss = closingDetails.profitLoss;
      }

      if (closingDetails?.profitLossPercent !== undefined) {
        updates.profit_loss_percent = closingDetails.profitLossPercent;
      }

      this.logger.info(`Marking trade ${dbTrade.id} as closed with updates:`, updates);

      const { error } = await supabase.from("trades").update(updates).eq("id", dbTrade.id);

      if (error) {
        throw new Error(`Failed to update trade record: ${error.message}`);
      }

      this.logger.info(`Successfully marked trade ${dbTrade.id} as closed`);
    } catch (error: any) {
      this.logger.error(`Error updating trade record ${dbTrade.id}: ${error.message}`);
      throw new Error(`Failed to update trade record: ${error.message}`);
    }
  }

  /**
   * Update database trade with current broker position data
   */
  async updateTradeFromBrokerPosition(dbTrade: any, brokerPosition: any): Promise<void> {
    try {
      const updates = {
        current_price: brokerPosition.level || brokerPosition.openLevel,
        profit_loss: brokerPosition.unrealisedPL || brokerPosition.profitAndLoss,
        profit_loss_percent: brokerPosition.unrealisedPLPC,
        updated_at: new Date(),
      };

      await this.updateTradeRecord(dbTrade.id, updates);
      this.logger.info(`Updated trade ${dbTrade.id} with broker data`);
    } catch (error) {
      this.logger.error(`Error updating trade ${dbTrade.id}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Update bot performance after trade execution
   */
  async updateBotPerformance(botId: string): Promise<void> {
    try {
      // This method would typically calculate daily performance, win rate, etc.
      // For now, we'll just log that it was called
      this.logger.info(`Updating bot performance for bot ${botId}`);

      // Get recent trades for performance calculation
      const { data: trades, error } = await supabase
        .from("trades")
        .select("*")
        .eq("bot_id", botId)
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false });

      if (error) {
        this.logger.warn(`Could not fetch trades for performance update: ${error.message}`);
        return;
      }

      const totalTrades = trades.length;
      const closedTrades = trades.filter((trade) => trade.status === "CLOSED");
      const profitableTrades = closedTrades.filter((trade) => (trade.profit_loss || 0) > 0);
      const totalPnL = closedTrades.reduce((sum, trade) => sum + (trade.profit_loss || 0), 0);
      const winRate = closedTrades.length > 0 ? (profitableTrades.length / closedTrades.length) * 100 : 0;

      this.logger.info(`Bot ${botId} performance: ${totalTrades} trades, ${totalPnL.toFixed(2)} P&L, ${winRate.toFixed(1)}% win rate`);
    } catch (error) {
      this.logger.warn(`Error updating bot performance: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Determine trade status based on broker status
   */
  determineTradStatus(brokerStatus?: string): string {
    switch (brokerStatus?.toUpperCase()) {
      case "OPEN":
      case "LIVE":
      case "ACTIVE":
        return "OPEN";
      case "CLOSED":
      case "FILLED":
      case "COMPLETED":
        return "CLOSED";
      case "CANCELLED":
      case "CANCELED":
        return "CANCELLED";
      case "PENDING":
      case "WORKING":
        return "PENDING";
      case "REJECTED":
        return "REJECTED";
      default:
        return "UNKNOWN";
    }
  }
}
