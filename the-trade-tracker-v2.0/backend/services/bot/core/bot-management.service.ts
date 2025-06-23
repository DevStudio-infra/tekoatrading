import { prisma } from "../../../utils/prisma";
import { loggerService } from "../../logger.service";
import {
  Bot,
  CreateBotRequest,
  UpdateBotRequest,
  BotWithStats,
  ValidationResult,
  BotAccessResult,
  IBotManagementService,
  BotServiceError,
  BotErrorCode,
} from "../interfaces/bot.interfaces";

export class BotManagementService implements IBotManagementService {
  /**
   * Helper method to get a real UUID for a user from the database
   * This handles numeric IDs from the API and converts them to proper UUIDs
   */
  private async getRealUserUuid(userId: string): Promise<string> {
    if (process.env.NODE_ENV === "development") {
      // In development, try to find a user - any user will do for testing
      console.log("[DEV] Looking up a valid user UUID from the database");
      const anyUser = await prisma.user.findFirst();

      if (!anyUser) {
        // If no users exist, create a temporary development user
        console.log("[DEV] No users found, creating a temporary development user");
        const tempUser = await prisma.user.create({
          data: {
            clerkId: "dev-user-" + Date.now(),
            email: "dev@example.com",
          },
        });
        return tempUser.id;
      }

      console.log(`[DEV] Using user with UUID: ${anyUser.id}`);
      return anyUser.id;
    } else {
      // In production, get the user by their numeric ID or convert from JWT
      // This assumes user IDs map correctly between systems
      const user = await prisma.user.findFirst({
        where: {
          // Try to find by clerkId if that's what we're using
          clerkId: userId,
        },
      });

      if (!user) {
        throw new BotServiceError(`User with ID ${userId} not found`, BotErrorCode.ACCESS_DENIED);
      }

      return user.id;
    }
  }

  /**
   * Validate bot access for a user
   */
  async validateBotAccess(botId: string, userId: string): Promise<BotAccessResult> {
    try {
      const realUserId = await this.getRealUserUuid(userId);

      const bot = await prisma.bot.findFirst({
        where: {
          id: botId,
          userId: realUserId,
        },
      });

      if (!bot) {
        return {
          hasAccess: false,
          error: "Bot not found or access denied",
        };
      }

      return {
        hasAccess: true,
        bot,
      };
    } catch (error) {
      loggerService.error("Error validating bot access:", error);
      return {
        hasAccess: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Validate create bot request
   */
  validateCreateBotRequest(data: CreateBotRequest): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!data.name || typeof data.name !== "string" || data.name.trim().length === 0) {
      errors.push("Bot name is required and must be a non-empty string");
    }

    if (!data.tradingPairSymbol || typeof data.tradingPairSymbol !== "string") {
      errors.push("Trading pair symbol is required");
    }

    if (!data.timeframe || typeof data.timeframe !== "string") {
      errors.push("Timeframe is required");
    }

    // Accept either strategyId or strategy
    if (!data.strategyId && !data.strategy) {
      errors.push("Strategy is required");
    }

    // Numeric validations with defaults
    if (typeof data.maxSimultaneousTrades !== "number" || data.maxSimultaneousTrades < 1 || data.maxSimultaneousTrades > 10) {
      errors.push("Max simultaneous trades must be a number between 1 and 10");
    }

    if (typeof data.riskPercentage !== "number" || data.riskPercentage <= 0 || data.riskPercentage > 100) {
      data.riskPercentage = 1;
      // errors.push("Risk percentage must be a number between 0 and 100");
    }

    if (typeof data.stopLossPercentage !== "number" || data.stopLossPercentage <= 0) {
      data.stopLossPercentage = 1;
      // errors.push("Stop loss percentage must be a positive number");
    }

    if (typeof data.takeProfitPercentage !== "number" || data.takeProfitPercentage <= 0) {
      data.takeProfitPercentage = 2;
      // errors.push("Take profit percentage must be a positive number");
    }

    // Warnings for potentially risky settings
    if (data.riskPercentage > 5) {
      warnings.push("Risk percentage above 5% is considered high risk");
    }

    if (data.maxSimultaneousTrades > 5) {
      warnings.push("More than 5 simultaneous trades may be difficult to manage");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Create a new trading bot
   */
  async createBot(userId: string, data: CreateBotRequest): Promise<Bot> {
    try {
      // Validate the request
      const validation = this.validateCreateBotRequest(data);
      if (!validation.isValid) {
        throw new BotServiceError(`Validation failed: ${validation.errors.join(", ")}`, BotErrorCode.VALIDATION_FAILED, validation.errors);
      }

      // Get real user UUID for database
      const realUserId = await this.getRealUserUuid(userId);

      // Use provided strategyId or fallback to a temp value
      const strategyId = data.strategyId || "temp-strategy-id";
      const brokerCredentialId = data.brokerCredentialId || "temp-broker-id";

      const bot = await prisma.bot.create({
        data: {
          name: data.name,
          tradingPairSymbol: data.tradingPairSymbol,
          timeframe: data.timeframe,
          maxSimultaneousTrades: data.maxSimultaneousTrades,
          isActive: data.isActive || false,
          isAiTradingActive: data.aiTradingEnabled || false,
          userId: realUserId,
          strategyId,
          brokerCredentialId,
          aiConfig: {
            riskPercentage: data.riskPercentage,
            stopLossPercentage: data.stopLossPercentage,
            takeProfitPercentage: data.takeProfitPercentage,
          },
        },
      });

      loggerService.info(`Bot created successfully: ${bot.id} for user: ${userId}`);
      return bot;
    } catch (error) {
      if (error instanceof BotServiceError) {
        throw error;
      }
      loggerService.error("Error creating bot:", error);
      throw new BotServiceError("Failed to create bot", BotErrorCode.DATABASE_ERROR, error);
    }
  }

  /**
   * Get a bot by ID
   */
  async getBotById(id: string, userId: string): Promise<Bot | null> {
    try {
      // Convert numeric userId to real user UUID
      const realUserId = await this.getRealUserUuid(userId);

      const bot = await prisma.bot.findFirst({
        where: {
          id: id,
          userId: realUserId,
        },
      });

      return bot;
    } catch (error) {
      loggerService.error("Error fetching bot by ID:", error);
      throw new BotServiceError("Failed to fetch bot", BotErrorCode.DATABASE_ERROR, error);
    }
  }

  /**
   * Get all bots for a user with statistics
   */
  async getUserBots(userId: string): Promise<BotWithStats[]> {
    try {
      // Convert numeric userId to real user UUID
      const realUserId = await this.getRealUserUuid(userId);

      const bots = await prisma.bot.findMany({
        where: {
          userId: realUserId,
        },
        include: {
          _count: {
            select: {
              trades: true,
              evaluations: true,
            },
          },
          trades: {
            select: {
              id: true,
              status: true,
              profitLoss: true,
            },
          },
        },
      });

      // Calculate statistics for each bot
      const botsWithStats: BotWithStats[] = bots.map((bot: any) => {
        const closedTrades = bot.trades.filter((t: any) => t.status === "CLOSED");
        const activeTrades = bot.trades.filter((t: any) => t.status === "OPEN");

        const totalPnL = bot.trades.reduce((sum: number, trade: any) => {
          return sum + (trade.profitLoss || 0);
        }, 0);

        const winningTrades = closedTrades.filter((t: any) => (t.profitLoss || 0) > 0);
        const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0;

        const { trades, _count, ...botData } = bot;

        return {
          ...botData,
          tradesCount: _count.trades,
          evaluationsCount: _count.evaluations,
          activeTradesCount: activeTrades.length,
          totalPnL,
          winRate,
        };
      });

      return botsWithStats;
    } catch (error) {
      loggerService.error("Error fetching bots by user:", error);
      throw new BotServiceError("Failed to fetch user bots", BotErrorCode.DATABASE_ERROR, error);
    }
  }

  /**
   * Update a bot
   */
  async updateBot(id: string, userId: string, data: UpdateBotRequest): Promise<Bot> {
    try {
      // Validate bot access
      const accessResult = await this.validateBotAccess(id, userId);
      if (!accessResult.hasAccess) {
        throw new BotServiceError(accessResult.error || "Bot not found or access denied", BotErrorCode.ACCESS_DENIED);
      }

      // Only update the fields that exist in the Bot model
      const updateData: any = {};

      // Update simple fields that exist in the model
      if (data.name !== undefined) updateData.name = data.name;
      if (data.maxSimultaneousTrades !== undefined) updateData.maxSimultaneousTrades = data.maxSimultaneousTrades;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;
      if (data.aiTradingEnabled !== undefined) updateData.isAiTradingActive = data.aiTradingEnabled;

      // Update aiConfig with strategy and risk parameters if provided
      if (data.strategy || data.riskPercentage !== undefined || data.stopLossPercentage !== undefined || data.takeProfitPercentage !== undefined) {
        const currentBot = accessResult.bot;
        const currentAiConfig = (currentBot?.aiConfig as any) || {};

        updateData.aiConfig = {
          ...currentAiConfig,
          ...(data.strategy && { strategy: data.strategy }),
          ...(data.riskPercentage !== undefined && { riskPercentage: data.riskPercentage }),
          ...(data.stopLossPercentage !== undefined && { stopLossPercentage: data.stopLossPercentage }),
          ...(data.takeProfitPercentage !== undefined && { takeProfitPercentage: data.takeProfitPercentage }),
        };
      }

      const updatedBot = await prisma.bot.update({
        where: { id },
        data: updateData,
      });

      loggerService.info(`Bot updated successfully: ${id}`);
      return updatedBot;
    } catch (error) {
      if (error instanceof BotServiceError) {
        throw error;
      }
      loggerService.error("Error updating bot:", error);
      throw new BotServiceError("Failed to update bot", BotErrorCode.DATABASE_ERROR, error);
    }
  }

  /**
   * Delete a bot
   */
  async deleteBot(id: string, userId: string): Promise<void> {
    try {
      // Validate bot access
      const accessResult = await this.validateBotAccess(id, userId);
      if (!accessResult.hasAccess) {
        throw new BotServiceError(accessResult.error || "Bot not found or access denied", BotErrorCode.ACCESS_DENIED);
      }

      // Check if bot has active trades
      const activeTrades = await prisma.trade.findMany({
        where: {
          botId: id,
          status: "OPEN",
        },
      });

      if (activeTrades.length > 0) {
        throw new BotServiceError("Cannot delete bot with active trades. Please close all trades first.", BotErrorCode.INVALID_REQUEST, { activeTradesCount: activeTrades.length });
      }

      await prisma.bot.delete({
        where: { id },
      });

      loggerService.info(`Bot deleted successfully: ${id}`);
    } catch (error) {
      if (error instanceof BotServiceError) {
        throw error;
      }
      loggerService.error("Error deleting bot:", error);
      throw new BotServiceError("Failed to delete bot", BotErrorCode.DATABASE_ERROR, error);
    }
  }

  /**
   * Start a bot
   */
  async startBot(id: string, userId: string): Promise<Bot> {
    try {
      // Validate bot access
      const accessResult = await this.validateBotAccess(id, userId);
      if (!accessResult.hasAccess) {
        throw new BotServiceError(accessResult.error || "Bot not found or access denied", BotErrorCode.ACCESS_DENIED);
      }

      // Update bot status
      const updatedBot = await prisma.bot.update({
        where: { id },
        data: {
          isActive: true,
        },
      });

      loggerService.info(`Bot started successfully: ${id}`);
      return updatedBot;
    } catch (error) {
      loggerService.error(`Error starting bot: ${error}`);
      throw new BotServiceError("Failed to start bot", BotErrorCode.DATABASE_ERROR, error);
    }
  }

  /**
   * Stop a bot
   */
  async stopBot(id: string, userId: string): Promise<Bot> {
    try {
      // Validate bot access
      const accessResult = await this.validateBotAccess(id, userId);
      if (!accessResult.hasAccess) {
        throw new BotServiceError(accessResult.error || "Bot not found or access denied", BotErrorCode.ACCESS_DENIED);
      }

      // Update bot status
      const updatedBot = await prisma.bot.update({
        where: { id },
        data: {
          isActive: false,
        },
      });

      loggerService.info(`Bot stopped successfully: ${id}`);
      return updatedBot;
    } catch (error) {
      loggerService.error(`Error stopping bot: ${error}`);
      throw new BotServiceError("Failed to stop bot", BotErrorCode.DATABASE_ERROR, error);
    }
  }

  /**
   * Toggle bot active status
   */
  async toggleBotActive(id: string, userId: string): Promise<Bot> {
    try {
      // Validate bot access
      const accessResult = await this.validateBotAccess(id, userId);
      if (!accessResult.hasAccess || !accessResult.bot) {
        throw new BotServiceError(accessResult.error || "Bot not found or access denied", BotErrorCode.ACCESS_DENIED);
      }

      // Update bot status
      const updatedBot = await prisma.bot.update({
        where: { id },
        data: {
          isActive: !accessResult.bot.isActive,
        },
      });

      loggerService.info(`Bot active status toggled successfully: ${id}`);
      return updatedBot;
    } catch (error) {
      loggerService.error(`Error toggling bot active status: ${error}`);
      throw new BotServiceError("Failed to toggle bot active status", BotErrorCode.DATABASE_ERROR, error);
    }
  }

  /**
   * Toggle AI trading for a bot
   */
  async toggleAiTrading(id: string, userId: string): Promise<Bot> {
    try {
      // Validate bot access
      const accessResult = await this.validateBotAccess(id, userId);
      if (!accessResult.hasAccess || !accessResult.bot) {
        throw new BotServiceError(accessResult.error || "Bot not found or access denied", BotErrorCode.ACCESS_DENIED);
      }

      // Update bot status
      const updatedBot = await prisma.bot.update({
        where: { id },
        data: {
          isAiTradingActive: !accessResult.bot.isAiTradingActive,
        },
      });

      loggerService.info(`Bot AI trading status toggled successfully: ${id}`);
      return updatedBot;
    } catch (error) {
      loggerService.error(`Error toggling bot AI trading status: ${error}`);
      throw new BotServiceError("Failed to toggle bot AI trading status", BotErrorCode.DATABASE_ERROR, error);
    }
  }
}
