import { Request, Response } from "express";
import { botService } from "../../services/bot.service";
import { evaluationService } from "../../services/evaluation.service";
import { TradingService } from "../../services/trading.service";
import { PositionManagementService } from "../../services/position-management.service";
import { aiTradingEngine } from "../../services/adapters/ai-trading-engine.adapter";
import { tradeManagementAI } from "../../services/trade-management-ai.service";
import { riskManagementService } from "../../services/adapters/risk-management.adapter";
import { MarketValidationService } from "../../services/trading/market-validation.service";
import { SymbolMappingService } from "../../services/trading/symbol-mapping.service";
import { marketDataService } from "../../services/market-data.service";
import { performanceMonitoringService } from "../../services/performance-monitoring.service";
import { loggerService } from "../../services/logger.service";
import { PrismaClient } from "@prisma/client";

// Import the new refactored services
import { botManagementService } from "../../services/bot/factories/bot-service.factory";
import { BotServiceError } from "../../services/bot/interfaces/bot.interfaces";

// Create instances
const tradingService = new TradingService();
const positionManagementService = new PositionManagementService();
const symbolMappingService = new SymbolMappingService();
const marketValidationServiceInstance = new MarketValidationService(symbolMappingService);
const riskManagementServiceInstance = riskManagementService;
const prisma = new PrismaClient();

/**
 * Create a new bot
 */
export const createBot = async (req: Request, res: Response) => {
  try {
    const userId = String(req.user?.id || "1"); // Ensure it's always a string
    const botData = req.body;

    loggerService.info(`Creating bot for user ${userId}:`, botData);

    // Validate bot limits per credential BEFORE creating the bot
    if (botData.brokerCredentialId) {
      try {
        // Count current active bots for this credential
        const currentBotCount = await prisma.bot.count({
          where: {
            brokerCredentialId: botData.brokerCredentialId,
            userId: userId,
            isActive: true,
            isAiTradingActive: true,
          },
        });

        const MAX_BOTS_PER_CREDENTIAL = 8;
        const WARNING_THRESHOLD = 5;

        // Hard limit enforcement
        if (currentBotCount >= MAX_BOTS_PER_CREDENTIAL) {
          return res.status(400).json({
            success: false,
            error: `Maximum bot limit reached (${currentBotCount}/${MAX_BOTS_PER_CREDENTIAL}) for this credential.`,
            code: "BOT_LIMIT_EXCEEDED",
            details: {
              currentCount: currentBotCount,
              maxAllowed: MAX_BOTS_PER_CREDENTIAL,
              recommendation: "Use a different Capital.com credential or delete existing bots to create new ones.",
            },
          });
        }

        // Warning for approaching limit
        if (currentBotCount >= WARNING_THRESHOLD) {
          loggerService.warn(`User ${userId} approaching bot limit: ${currentBotCount}/${MAX_BOTS_PER_CREDENTIAL} for credential ${botData.brokerCredentialId}`);
        }
      } catch (validationError) {
        loggerService.error("Error validating bot limits:", validationError);
        // Continue with creation if validation fails (don't block user)
      }
    }

    // Use the new BotManagementService
    const bot = await botManagementService.createBot(userId, botData);

    res.status(201).json({
      success: true,
      data: bot,
      message: "Bot created successfully",
    });
  } catch (error) {
    loggerService.error("Error creating bot:", error);

    if (error instanceof BotServiceError) {
      return res.status(400).json({
        success: false,
        error: error.message,
        code: error.code,
        details: error.details,
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to create bot",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Get all bots for current user
 */
export const getUserBots = async (req: Request, res: Response) => {
  try {
    // User ID from auth middleware
    const userId = String(req.user?.id || req.user?.userId || "1"); // Handle both possible fields

    loggerService.info(`Getting bots for user ${userId}`);

    // Use the new BotManagementService
    const bots = await botManagementService.getUserBots(userId);

    res.status(200).json({
      success: true,
      data: bots,
      message: "Bots retrieved successfully",
    });
  } catch (error) {
    loggerService.error("Error retrieving bots:", error);

    if (error instanceof BotServiceError) {
      return res.status(400).json({
        success: false,
        error: error.message,
        code: error.code,
        details: error.details,
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to retrieve bots",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Get a specific bot by ID
 */
export const getBotById = async (req: Request, res: Response) => {
  try {
    const botId = req.params.id;
    const userId = String(req.user?.id || req.user?.userId || "1");

    // Validate input
    if (!botId) {
      return res.status(400).json({
        success: false,
        error: "Invalid bot ID",
      });
    }

    loggerService.info(`Getting bot ${botId} for user ${userId}`);

    // Use the new BotManagementService
    const bot = await botManagementService.getBotById(botId, userId);

    if (!bot) {
      return res.status(404).json({
        success: false,
        error: "Bot not found",
      });
    }

    res.status(200).json({
      success: true,
      data: bot,
      message: "Bot retrieved successfully",
    });
  } catch (error) {
    loggerService.error("Error retrieving bot:", error);

    if (error instanceof BotServiceError) {
      return res.status(400).json({
        success: false,
        error: error.message,
        code: error.code,
        details: error.details,
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to retrieve bot",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Update a bot
 */
export const updateBot = async (req: Request, res: Response) => {
  try {
    const botId = req.params.id;

    // Validate input
    if (!botId) {
      return res.status(400).json({ message: "Invalid bot ID" });
    }

    const { strategyId, brokerCredentialId, timeframe, maxSimultaneousTrades, isActive, isAiTradingActive } = req.body;

    // User ID from auth middleware
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Prepare updates
    const updates: any = {};

    if (strategyId !== undefined) updates.strategyId = strategyId;
    if (brokerCredentialId !== undefined) updates.brokerCredentialId = brokerCredentialId;
    if (timeframe !== undefined) updates.timeframe = timeframe;
    if (maxSimultaneousTrades !== undefined) updates.maxSimultaneousTrades = maxSimultaneousTrades;
    if (isActive !== undefined) updates.isActive = isActive;
    if (isAiTradingActive !== undefined) updates.isAiTradingActive = isAiTradingActive;

    // Update bot
    const updatedBot = await botService.updateBot(botId, String(req.user.userId), updates);

    if (!updatedBot) {
      return res.status(404).json({ message: "Bot not found" });
    }

    return res.status(200).json({
      message: "Bot updated successfully",
      bot: updatedBot,
    });
  } catch (error) {
    console.error("Error updating bot:", error);
    return res.status(500).json({ message: "Error updating bot" });
  }
};

/**
 * Delete a bot
 */
export const deleteBot = async (req: Request, res: Response) => {
  try {
    const botId = req.params.id;

    // Validate input
    if (!botId) {
      return res.status(400).json({ message: "Invalid bot ID" });
    }

    // User ID from auth middleware
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Delete bot
    const deleted = await botService.deleteBot(botId, String(req.user.userId));

    if (!deleted) {
      return res.status(404).json({ message: "Bot not found" });
    }

    return res.status(200).json({
      message: "Bot deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting bot:", error);
    return res.status(500).json({ message: "Error deleting bot" });
  }
};

/**
 * Toggle bot active status
 */
export const toggleBotActive = async (req: Request, res: Response) => {
  try {
    const botId = req.params.id;

    // Validate input
    if (!botId) {
      return res.status(400).json({ message: "Invalid bot ID" });
    }

    // User ID from auth middleware
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Toggle bot active status
    const updatedBot = await botService.toggleBotActive(botId, String(req.user.userId));

    if (!updatedBot) {
      return res.status(404).json({ message: "Bot not found" });
    }

    return res.status(200).json({
      message: `Bot ${updatedBot.isActive ? "activated" : "deactivated"} successfully`,
      bot: updatedBot,
    });
  } catch (error) {
    console.error("Error toggling bot active status:", error);
    return res.status(500).json({ message: "Error toggling bot active status" });
  }
};

/**
 * Toggle bot AI trading status
 */
export const toggleAiTrading = async (req: Request, res: Response) => {
  try {
    const botId = req.params.id;

    // Validate input
    if (!botId) {
      return res.status(400).json({ message: "Invalid bot ID" });
    }

    // User ID from auth middleware
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Toggle bot AI trading status
    const updatedBot = await botService.toggleAiTrading(botId, String(req.user.userId));

    if (!updatedBot) {
      return res.status(404).json({ message: "Bot not found" });
    }

    return res.status(200).json({
      message: `Bot AI trading ${updatedBot.isAiTradingActive ? "enabled" : "disabled"} successfully`,
      bot: updatedBot,
    });
  } catch (error) {
    console.error("Error toggling bot AI trading status:", error);
    return res.status(500).json({ message: "Error toggling bot AI trading status" });
  }
};

/**
 * Run bot evaluation
 */
export const runBotEvaluation = async (req: Request, res: Response) => {
  try {
    const botId = req.params.id;

    // Validate input
    if (!botId) {
      return res.status(400).json({ message: "Invalid bot ID" });
    }

    // User ID from auth middleware
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Optional parameters from request body
    const evalParams = req.body;

    // Run evaluation
    // Use createEvaluation instead of runBotEvaluation which doesn't exist
    const result = await botService.createEvaluation(botId, String(req.user.userId), evalParams);

    return res.status(200).json({
      message: "Bot evaluation started successfully",
      status: "processing",
      evaluationId: result.evaluationId,
    });
  } catch (error: any) {
    console.error("Error running bot evaluation:", error);

    if (error.message?.includes("Bot not found")) {
      return res.status(404).json({ message: "Bot not found" });
    }

    return res.status(500).json({ message: "Error running bot evaluation" });
  }
};

/**
 * Get bot evaluations
 */
export const getBotEvaluations = async (req: Request, res: Response) => {
  try {
    const botId = req.params.id;

    // Validate input
    if (!botId) {
      return res.status(400).json({ message: "Invalid bot ID" });
    }

    // User ID from auth middleware
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Parse limit query parameter
    const limit = parseInt(req.query.limit as string) || 10;

    // Get bot evaluations
    // Ensure userId is passed as a string
    const evaluations = await botService.getBotEvaluations(botId, String(req.user.userId), limit);

    return res.status(200).json({
      message: "Bot evaluations retrieved successfully",
      evaluations,
    });
  } catch (error: any) {
    console.error("Error retrieving bot evaluations:", error);

    if (error.message?.includes("Bot not found")) {
      return res.status(404).json({ message: "Bot not found" });
    }

    return res.status(500).json({ message: "Error retrieving bot evaluations" });
  }
};

/**
 * Run AI-enhanced bot evaluation
 */
export const runAIEvaluation = async (req: Request, res: Response) => {
  try {
    const botId = req.params.id;
    const { chartImageBase64, symbol, timeframe } = req.body;

    // Validate input
    if (!botId) {
      return res.status(400).json({ message: "Invalid bot ID" });
    }

    if (!chartImageBase64 || !symbol || !timeframe) {
      return res.status(400).json({
        message: "Chart image, symbol, and timeframe are required",
      });
    }

    // User ID from auth middleware
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Get bot details to access strategy
    const bot = await botService.getBotById(botId, String(req.user.userId));

    if (!bot) {
      return res.status(404).json({ message: "Bot not found" });
    }

    // Get current positions for this symbol (if any)
    const currentPositions = await botService.getCurrentPositions(botId, symbol);

    // Run AI evaluation
    const result = await evaluationService.createEvaluationWithAI(botId, chartImageBase64, bot.strategy.description, symbol, timeframe, currentPositions);

    return res.status(200).json({
      message: "AI evaluation completed successfully",
      evaluation: result.evaluation,
      aiAnalysis: result.aiAnalysis,
      tradingDecision: result.aiAnalysis.tradingDecision,
    });
  } catch (error: any) {
    console.error("Error running AI evaluation:", error);

    if (error.message?.includes("Bot not found")) {
      return res.status(404).json({ message: "Bot not found" });
    }

    if (error.message?.includes("AI analysis failed")) {
      return res.status(503).json({ message: "AI analysis service temporarily unavailable" });
    }

    return res.status(500).json({ message: "Error running AI evaluation" });
  }
};

/**
 * Get AI performance metrics for a bot
 */
export const getAIPerformanceMetrics = async (req: Request, res: Response) => {
  try {
    const botId = req.params.id;

    // Validate input
    if (!botId) {
      return res.status(400).json({ message: "Invalid bot ID" });
    }

    // User ID from auth middleware
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Verify bot ownership
    const bot = await botService.getBotById(botId, String(req.user.userId));

    if (!bot) {
      return res.status(404).json({ message: "Bot not found" });
    }

    // Get AI performance metrics
    const metrics = await evaluationService.getAIPerformanceMetrics(botId);

    return res.status(200).json({
      message: "AI performance metrics retrieved successfully",
      metrics,
    });
  } catch (error: any) {
    console.error("Error retrieving AI performance metrics:", error);

    if (error.message?.includes("Bot not found")) {
      return res.status(404).json({ message: "Bot not found" });
    }

    return res.status(500).json({ message: "Error retrieving AI performance metrics" });
  }
};

/**
 * Execute a trade for a bot
 */
export const executeTrade = async (req: Request, res: Response) => {
  try {
    const botId = req.params.id;
    const { symbol, direction, orderType, quantity, limitPrice, stopLoss, takeProfit, rationale, aiConfidence, riskScore, evaluationId } = req.body;

    // Validate input
    if (!botId || !symbol || !direction || !orderType || !quantity) {
      return res.status(400).json({
        message: "Bot ID, symbol, direction, order type, and quantity are required",
      });
    }

    // User ID from auth middleware
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Verify bot ownership
    const bot = await botService.getBotById(botId, String(req.user.userId));
    if (!bot) {
      return res.status(404).json({ message: "Bot not found" });
    }

    // Execute trade
    const trade = await tradingService.executeTrade({
      botId,
      evaluationId,
      userId: String(req.user.userId),
      symbol,
      direction,
      orderType,
      quantity,
      limitPrice,
      stopLoss,
      takeProfit,
      rationale,
      aiConfidence,
      riskScore,
    });

    return res.status(201).json({
      message: "Trade executed successfully",
      trade,
    });
  } catch (error: any) {
    console.error("Error executing trade:", error);

    if (error.message?.includes("Cannot open new position")) {
      return res.status(400).json({ message: error.message });
    }

    if (error.message?.includes("Bot not found")) {
      return res.status(404).json({ message: "Bot not found" });
    }

    return res.status(500).json({ message: "Error executing trade" });
  }
};

/**
 * Close a trade
 */
export const closeTrade = async (req: Request, res: Response) => {
  try {
    const { tradeId } = req.params;
    const { reason } = req.body;

    // Validate input
    if (!tradeId) {
      return res.status(400).json({ message: "Trade ID is required" });
    }

    // User ID from auth middleware
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Close trade
    const trade = await tradingService.closeTrade(tradeId, reason);

    return res.status(200).json({
      message: "Trade closed successfully",
      trade,
    });
  } catch (error: any) {
    console.error("Error closing trade:", error);

    if (error.message?.includes("Trade not found")) {
      return res.status(404).json({ message: "Trade not found" });
    }

    if (error.message?.includes("Cannot close trade")) {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: "Error closing trade" });
  }
};

/**
 * Update trade parameters
 */
export const updateTrade = async (req: Request, res: Response) => {
  try {
    const { tradeId } = req.params;
    const { stopLoss, takeProfit, quantity } = req.body;

    // Validate input
    if (!tradeId) {
      return res.status(400).json({ message: "Trade ID is required" });
    }

    // User ID from auth middleware
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Update trade
    const trade = await tradingService.updateTrade(tradeId, {
      stopLoss,
      takeProfit,
      quantity,
    });

    return res.status(200).json({
      message: "Trade updated successfully",
      trade,
    });
  } catch (error: any) {
    console.error("Error updating trade:", error);

    if (error.message?.includes("Trade not found")) {
      return res.status(404).json({ message: "Trade not found" });
    }

    if (error.message?.includes("Cannot update trade")) {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: "Error updating trade" });
  }
};

/**
 * Get active trades for a bot
 */
export const getActiveTrades = async (req: Request, res: Response) => {
  try {
    const botId = req.params.id;

    // Validate input
    if (!botId) {
      return res.status(400).json({ message: "Invalid bot ID" });
    }

    // User ID from auth middleware
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Verify bot ownership
    const bot = await botService.getBotById(botId, String(req.user.userId));
    if (!bot) {
      return res.status(404).json({ message: "Bot not found" });
    }

    // Get active trades
    const trades = await tradingService.getActiveTrades(botId);

    return res.status(200).json({
      message: "Active trades retrieved successfully",
      trades,
    });
  } catch (error: any) {
    console.error("Error retrieving active trades:", error);
    return res.status(500).json({ message: "Error retrieving active trades" });
  }
};

/**
 * Get trade history for a bot
 */
export const getTradeHistory = async (req: Request, res: Response) => {
  try {
    const botId = req.params.id;
    const limit = parseInt(req.query.limit as string) || 50;

    // Validate input
    if (!botId) {
      return res.status(400).json({ message: "Invalid bot ID" });
    }

    // User ID from auth middleware
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Verify bot ownership
    const bot = await botService.getBotById(botId, String(req.user.userId));
    if (!bot) {
      return res.status(404).json({ message: "Bot not found" });
    }

    // Get trade history
    const trades = await tradingService.getTradeHistory(botId, limit);

    return res.status(200).json({
      message: "Trade history retrieved successfully",
      trades,
    });
  } catch (error: any) {
    console.error("Error retrieving trade history:", error);
    return res.status(500).json({ message: "Error retrieving trade history" });
  }
};

/**
 * Get position summary for a bot
 */
export const getPositionSummary = async (req: Request, res: Response) => {
  try {
    const botId = req.params.id;

    // Validate input
    if (!botId) {
      return res.status(400).json({ message: "Invalid bot ID" });
    }

    // User ID from auth middleware
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Verify bot ownership
    const bot = await botService.getBotById(botId, String(req.user.userId));
    if (!bot) {
      return res.status(404).json({ message: "Bot not found" });
    }

    // Get position summary
    const summary = await positionManagementService.getPositionSummary(botId);

    return res.status(200).json({
      message: "Position summary retrieved successfully",
      summary,
    });
  } catch (error: any) {
    console.error("Error retrieving position summary:", error);
    return res.status(500).json({ message: "Error retrieving position summary" });
  }
};

/**
 * Get detailed position metrics for a trade
 */
export const getPositionMetrics = async (req: Request, res: Response) => {
  try {
    const { tradeId } = req.params;

    // Validate input
    if (!tradeId) {
      return res.status(400).json({ message: "Trade ID is required" });
    }

    // User ID from auth middleware
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Get position metrics
    const metrics = await positionManagementService.getPositionMetrics(tradeId);

    return res.status(200).json({
      message: "Position metrics retrieved successfully",
      metrics,
    });
  } catch (error: any) {
    console.error("Error retrieving position metrics:", error);

    if (error.message?.includes("Trade not found")) {
      return res.status(404).json({ message: "Trade not found" });
    }

    return res.status(500).json({ message: "Error retrieving position metrics" });
  }
};

/**
 * Close all positions for a bot
 */
export const closeAllPositions = async (req: Request, res: Response) => {
  try {
    const botId = req.params.id;
    const { reason } = req.body;

    // Validate input
    if (!botId) {
      return res.status(400).json({ message: "Invalid bot ID" });
    }

    // User ID from auth middleware
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Verify bot ownership
    const bot = await botService.getBotById(botId, String(req.user.userId));
    if (!bot) {
      return res.status(404).json({ message: "Bot not found" });
    }

    // Close all positions
    await positionManagementService.closeAllPositions(botId, reason);

    return res.status(200).json({
      message: "All positions closed successfully",
    });
  } catch (error: any) {
    console.error("Error closing all positions:", error);
    return res.status(500).json({ message: "Error closing all positions" });
  }
};

/**
 * Generate enhanced AI trading decision (Phase 3)
 */
export const generateEnhancedDecision = async (req: Request, res: Response) => {
  try {
    const botId = req.params.id;
    const { symbol, chartImageBase64, strategyDescription, timeframe } = req.body;

    // Validate input
    if (!botId || !symbol || !chartImageBase64 || !strategyDescription || !timeframe) {
      return res.status(400).json({
        message: "Bot ID, symbol, chart image, strategy description, and timeframe are required",
      });
    }

    // User ID from auth middleware
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Verify bot ownership
    const bot = await botService.getBotById(botId, String(req.user.userId));
    if (!bot) {
      return res.status(404).json({ message: "Bot not found" });
    }

    // Generate enhanced trading decision
    const enhancedDecision = await aiTradingEngine.generateEnhancedDecision({
      symbol,
      context: {
        botId,
        accountBalance: 10000, // Default value, should be fetched from bot
        currentPositions: [],
        marketConditions: "normal",
        riskProfile: "medium",
        strategy: strategyDescription || "default",
      },
      marketData: { chartImageBase64 },
      technicalIndicators: { strategyDescription },
    });

    return res.status(200).json({
      message: "Enhanced trading decision generated successfully",
      decision: enhancedDecision,
    });
  } catch (error: any) {
    console.error("Error generating enhanced decision:", error);
    return res.status(500).json({
      message: "Error generating enhanced decision",
      error: error.message,
    });
  }
};

/**
 * Get portfolio correlations (Phase 3)
 */
export const getPortfolioCorrelations = async (req: Request, res: Response) => {
  try {
    const botId = req.params.id;

    // Validate input
    if (!botId) {
      return res.status(400).json({ message: "Bot ID is required" });
    }

    // User ID from auth middleware
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Verify bot ownership
    const bot = await botService.getBotById(botId, String(req.user.userId));
    if (!bot) {
      return res.status(404).json({ message: "Bot not found" });
    }

    // Get portfolio correlations
    const correlations = await aiTradingEngine.getPortfolioCorrelations({
      botId,
      accountBalance: 10000, // Default value, should be fetched from bot
      currentPositions: [],
      marketConditions: "normal",
      riskProfile: "medium",
      strategy: "default",
    });

    return res.status(200).json({
      message: "Portfolio correlations retrieved successfully",
      correlations,
    });
  } catch (error: any) {
    console.error("Error getting portfolio correlations:", error);
    return res.status(500).json({
      message: "Error getting portfolio correlations",
      error: error.message,
    });
  }
};

/**
 * Analyze trade management (Phase 3)
 */
export const analyzeTradeManagement = async (req: Request, res: Response) => {
  try {
    const { tradeId } = req.params;
    const { chartImageBase64, strategyDescription } = req.body;

    // Validate input
    if (!tradeId) {
      return res.status(400).json({ message: "Trade ID is required" });
    }

    // User ID from auth middleware
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Analyze trade management
    const managementDecision = await tradeManagementAI.analyzeTradeManagement(tradeId, chartImageBase64, strategyDescription);

    return res.status(200).json({
      message: "Trade management analysis completed",
      decision: managementDecision,
    });
  } catch (error: any) {
    console.error("Error analyzing trade management:", error);
    return res.status(500).json({
      message: "Error analyzing trade management",
      error: error.message,
    });
  }
};

/**
 * Implement trailing stop (Phase 3)
 */
export const implementTrailingStop = async (req: Request, res: Response) => {
  try {
    const { tradeId } = req.params;
    const { trailDistance, minProfit, stepSize } = req.body;

    // Validate input
    if (!tradeId || !trailDistance || minProfit === undefined) {
      return res.status(400).json({
        message: "Trade ID, trail distance, and minimum profit are required",
      });
    }

    // User ID from auth middleware
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const config = {
      enabled: true,
      trailDistance: Number(trailDistance),
      minProfit: Number(minProfit),
      stepSize: Number(stepSize) || 1,
    };

    // Implement trailing stop
    const result = await tradeManagementAI.implementTrailingStop(tradeId, config);

    return res.status(200).json({
      message: "Trailing stop implementation completed",
      result,
    });
  } catch (error: any) {
    console.error("Error implementing trailing stop:", error);
    return res.status(500).json({
      message: "Error implementing trailing stop",
      error: error.message,
    });
  }
};

/**
 * Execute dynamic profit taking (Phase 3)
 */
export const executeDynamicProfitTaking = async (req: Request, res: Response) => {
  try {
    const { tradeId } = req.params;
    const { strategy } = req.body;

    // Validate input
    if (!tradeId || !strategy) {
      return res.status(400).json({
        message: "Trade ID and profit taking strategy are required",
      });
    }

    // User ID from auth middleware
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Execute dynamic profit taking
    const result = await tradeManagementAI.executeDynamicProfitTaking(tradeId, strategy);

    return res.status(200).json({
      message: "Dynamic profit taking executed",
      result,
    });
  } catch (error: any) {
    console.error("Error executing dynamic profit taking:", error);
    return res.status(500).json({
      message: "Error executing dynamic profit taking",
      error: error.message,
    });
  }
};

/**
 * Analyze position scaling (Phase 3)
 */
export const analyzePositionScaling = async (req: Request, res: Response) => {
  try {
    const { tradeId } = req.params;
    const { strategy, chartImageBase64 } = req.body;

    // Validate input
    if (!tradeId || !strategy) {
      return res.status(400).json({
        message: "Trade ID and scaling strategy are required",
      });
    }

    // User ID from auth middleware
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Analyze position scaling
    const result = await tradeManagementAI.analyzePositionScaling(tradeId, strategy, chartImageBase64);

    return res.status(200).json({
      message: "Position scaling analysis completed",
      result,
    });
  } catch (error: any) {
    console.error("Error analyzing position scaling:", error);
    return res.status(500).json({
      message: "Error analyzing position scaling",
      error: error.message,
    });
  }
};

/**
 * Detect exit signals (Phase 3)
 */
export const detectExitSignals = async (req: Request, res: Response) => {
  try {
    const { tradeId } = req.params;
    const { chartImageBase64, strategyDescription } = req.body;

    // Validate input
    if (!tradeId || !chartImageBase64 || !strategyDescription) {
      return res.status(400).json({
        message: "Trade ID, chart image, and strategy description are required",
      });
    }

    // User ID from auth middleware
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Detect exit signals
    const result = await tradeManagementAI.detectExitSignals(tradeId, chartImageBase64, strategyDescription);

    return res.status(200).json({
      message: "Exit signal detection completed",
      result,
    });
  } catch (error: any) {
    console.error("Error detecting exit signals:", error);
    return res.status(500).json({
      message: "Error detecting exit signals",
      error: error.message,
    });
  }
};

/**
 * Assess portfolio risk (Phase 3)
 */
export const assessPortfolioRisk = async (req: Request, res: Response) => {
  try {
    const botId = req.params.id;
    const { customLimits } = req.body;

    // Validate input
    if (!botId) {
      return res.status(400).json({ message: "Bot ID is required" });
    }

    // User ID from auth middleware
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Verify bot ownership
    const bot = await botService.getBotById(botId, String(req.user.userId));
    if (!bot) {
      return res.status(404).json({ message: "Bot not found" });
    }

    // Assess portfolio risk
    const assessment = await riskManagementService.assessPortfolioRisk(botId, customLimits);

    return res.status(200).json({
      message: "Portfolio risk assessment completed",
      assessment,
    });
  } catch (error: any) {
    console.error("Error assessing portfolio risk:", error);
    return res.status(500).json({
      message: "Error assessing portfolio risk",
      error: error.message,
    });
  }
};

/**
 * Validate trade risk (Phase 3)
 */
export const validateTradeRisk = async (req: Request, res: Response) => {
  try {
    const botId = req.params.id;
    const { tradeParams, customLimits } = req.body;

    // Validate input
    if (!botId || !tradeParams) {
      return res.status(400).json({ message: "Bot ID and trade parameters are required" });
    }

    // User ID from auth middleware
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Verify bot ownership
    const bot = await botService.getBotById(botId, String(req.user.userId));
    if (!bot) {
      return res.status(404).json({ message: "Bot not found" });
    }

    // Validate trade risk
    const validation = await riskManagementService.validateTradeRisk(botId, tradeParams, customLimits);

    return res.status(200).json({
      message: "Trade risk validation completed",
      validation,
    });
  } catch (error: any) {
    console.error("Error validating trade risk:", error);
    return res.status(500).json({
      message: "Error validating trade risk",
      error: error.message,
    });
  }
};

/**
 * Monitor risk limits (Phase 3)
 */
export const monitorRiskLimits = async (req: Request, res: Response) => {
  try {
    const botId = req.params.id;

    // Validate input
    if (!botId) {
      return res.status(400).json({ message: "Bot ID is required" });
    }

    // User ID from auth middleware
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Verify bot ownership
    const bot = await botService.getBotById(botId, String(req.user.userId));
    if (!bot) {
      return res.status(404).json({ message: "Bot not found" });
    }

    // Monitor risk limits
    const monitoring = await riskManagementService.monitorRiskLimits(botId);

    return res.status(200).json({
      message: "Risk limits monitoring completed",
      monitoring,
    });
  } catch (error: any) {
    console.error("Error monitoring risk limits:", error);
    return res.status(500).json({
      message: "Error monitoring risk limits",
      error: error.message,
    });
  }
};

/**
 * Set risk limits (Phase 3)
 */
export const setRiskLimits = async (req: Request, res: Response) => {
  try {
    const botId = req.params.id;
    const { limits } = req.body;

    // Validate input
    if (!botId || !limits) {
      return res.status(400).json({ message: "Bot ID and risk limits are required" });
    }

    // User ID from auth middleware
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Verify bot ownership
    const bot = await botService.getBotById(botId, String(req.user.userId));
    if (!bot) {
      return res.status(404).json({ message: "Bot not found" });
    }

    // Set risk limits
    await riskManagementService.setRiskLimits(botId, limits);

    return res.status(200).json({
      message: "Risk limits set successfully",
    });
  } catch (error: any) {
    console.error("Error setting risk limits:", error);
    return res.status(500).json({
      message: "Error setting risk limits",
      error: error.message,
    });
  }
};

/**
 * Get risk limits (Phase 3)
 */
export const getRiskLimits = async (req: Request, res: Response) => {
  try {
    const botId = req.params.id;

    // Validate input
    if (!botId) {
      return res.status(400).json({ message: "Bot ID is required" });
    }

    // User ID from auth middleware
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Verify bot ownership
    const bot = await botService.getBotById(botId, String(req.user.userId));
    if (!bot) {
      return res.status(404).json({ message: "Bot not found" });
    }

    // Get risk limits
    const limits = await riskManagementService.getRiskLimits(botId);

    return res.status(200).json({
      message: "Risk limits retrieved successfully",
      limits,
    });
  } catch (error: any) {
    console.error("Error getting risk limits:", error);
    return res.status(500).json({
      message: "Error getting risk limits",
      error: error.message,
    });
  }
};

// Phase 4: Real-time Monitoring & Optimization endpoints

/**
 * Get real-time market data for a symbol
 */
export const getMarketData = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: botId, symbol } = req.params;

    // User ID from auth middleware
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    // Verify bot ownership
    const bot = await botService.getBotById(botId, String(req.user.userId));
    if (!bot) {
      res.status(404).json({ error: "Bot not found" });
      return;
    }

    const marketData = await marketDataService.getLivePrice(symbol);

    res.json({
      success: true,
      data: marketData,
    });
  } catch (error) {
    loggerService.error("Error getting market data:", error);
    res.status(500).json({
      error: "Failed to get market data",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Get technical indicators for a symbol
 */
export const getTechnicalIndicators = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: botId, symbol } = req.params;
    const { timeframe = "1H" } = req.query;

    // User ID from auth middleware
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    // Verify bot ownership
    const bot = await botService.getBotById(botId, String(req.user.userId));
    if (!bot) {
      res.status(404).json({ error: "Bot not found" });
      return;
    }

    const indicators = await marketDataService.getTechnicalIndicators(symbol, timeframe as string);

    res.json({
      success: true,
      data: indicators,
    });
  } catch (error) {
    loggerService.error("Error getting technical indicators:", error);
    res.status(500).json({
      error: "Failed to get technical indicators",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Get recent market events
 */
export const getMarketEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: botId } = req.params;
    const { symbol, hours = "24" } = req.query;

    // User ID from auth middleware
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    // Verify bot ownership
    const bot = await botService.getBotById(botId, String(req.user.userId));
    if (!bot) {
      res.status(404).json({ error: "Bot not found" });
      return;
    }

    const events = await marketDataService.getRecentMarketEvents(symbol as string, parseInt(hours as string));

    res.json({
      success: true,
      data: events,
    });
  } catch (error) {
    loggerService.error("Error getting market events:", error);
    res.status(500).json({
      error: "Failed to get market events",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Get data quality metrics
 */
export const getDataQualityMetrics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: botId } = req.params;

    // User ID from auth middleware
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    // Verify bot ownership
    const bot = await botService.getBotById(botId, String(req.user.userId));
    if (!bot) {
      res.status(404).json({ error: "Bot not found" });
      return;
    }

    const metrics = await marketDataService.getAllDataQualityMetrics();

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    loggerService.error("Error getting data quality metrics:", error);
    res.status(500).json({
      error: "Failed to get data quality metrics",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Get real-time P&L for a bot
 */
export const getRealTimePnL = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: botId } = req.params;

    // User ID from auth middleware
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    // Verify bot ownership
    const bot = await botService.getBotById(botId, String(req.user.userId));
    if (!bot) {
      res.status(404).json({ error: "Bot not found" });
      return;
    }

    const pnl = await performanceMonitoringService.getRealTimePnL(botId);

    res.json({
      success: true,
      data: pnl,
    });
  } catch (error) {
    loggerService.error("Error getting real-time P&L:", error);
    res.status(500).json({
      error: "Failed to get real-time P&L",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Get comprehensive performance metrics
 */
export const getPerformanceMetrics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: botId } = req.params;
    const { timeframe = "ALL_TIME" } = req.query;

    // User ID from auth middleware
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    // Verify bot ownership
    const bot = await botService.getBotById(botId, String(req.user.userId));
    if (!bot) {
      res.status(404).json({ error: "Bot not found" });
      return;
    }

    const metrics = await performanceMonitoringService.getPerformanceMetrics(botId, timeframe as "DAILY" | "WEEKLY" | "MONTHLY" | "ALL_TIME");

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    loggerService.error("Error getting performance metrics:", error);
    res.status(500).json({
      error: "Failed to get performance metrics",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Get active alerts for a bot
 */
export const getActiveAlerts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: botId } = req.params;

    // User ID from auth middleware
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    // Verify bot ownership
    const bot = await botService.getBotById(botId, String(req.user.userId));
    if (!bot) {
      res.status(404).json({ error: "Bot not found" });
      return;
    }

    const alerts = await performanceMonitoringService.getActiveAlerts(botId);

    res.json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    loggerService.error("Error getting active alerts:", error);
    res.status(500).json({
      error: "Failed to get active alerts",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Create a new performance alert
 */
export const createAlert = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: botId } = req.params;
    const { type, threshold, title, message } = req.body;

    // User ID from auth middleware
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    // Verify bot ownership
    const bot = await botService.getBotById(botId, String(req.user.userId));
    if (!bot) {
      res.status(404).json({ error: "Bot not found" });
      return;
    }

    // Validate required fields
    if (!type || !threshold || !title || !message) {
      res.status(400).json({ error: "Missing required fields: type, threshold, title, message" });
      return;
    }

    const alert = await performanceMonitoringService.createAlert(botId, {
      type,
      threshold: parseFloat(threshold),
      title,
      message,
    });

    res.json({
      success: true,
      data: alert,
    });
  } catch (error) {
    loggerService.error("Error creating alert:", error);
    res.status(500).json({
      error: "Failed to create alert",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Acknowledge an alert
 */
export const acknowledgeAlert = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: botId, alertId } = req.params;

    // User ID from auth middleware
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    // Verify bot ownership
    const bot = await botService.getBotById(botId, String(req.user.userId));
    if (!bot) {
      res.status(404).json({ error: "Bot not found" });
      return;
    }

    await performanceMonitoringService.acknowledgeAlert(alertId);

    res.json({
      success: true,
      message: "Alert acknowledged successfully",
    });
  } catch (error) {
    loggerService.error("Error acknowledging alert:", error);
    res.status(500).json({
      error: "Failed to acknowledge alert",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Generate comprehensive performance report
 */
export const generatePerformanceReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: botId } = req.params;
    const { reportType = "MONTHLY", startDate, endDate } = req.query;

    // User ID from auth middleware
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    // Verify bot ownership
    const bot = await botService.getBotById(botId, String(req.user.userId));
    if (!bot) {
      res.status(404).json({ error: "Bot not found" });
      return;
    }

    const report = await performanceMonitoringService.generatePerformanceReport(
      botId,
      reportType as "DAILY" | "WEEKLY" | "MONTHLY" | "CUSTOM",
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    loggerService.error("Error generating performance report:", error);
    res.status(500).json({
      error: "Failed to generate performance report",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getAdvancedSettings = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get bot and verify ownership - use string IDs
    const bot = await prisma.bot.findFirst({
      where: {
        id: id, // Keep as string
        userId: String(userId), // Convert to string
      },
    });

    if (!bot) {
      return res.status(404).json({ error: "Bot not found" });
    }

    // Get advanced settings from bot configuration
    const settings = {
      aiConfig: bot.aiConfig || {
        model: "ensemble",
        confidence_threshold: 0.7,
        risk_tolerance: 0.5,
        learning_rate: 0.001,
        lookback_period: 100,
        prediction_horizon: 24,
        ensemble_size: 5,
        feature_selection: ["price", "volume", "volatility"],
        market_regime_detection: true,
        sentiment_analysis: true,
        technical_indicators: ["RSI", "MACD", "BB"],
      },
      riskParams: bot.riskParams || {
        max_position_size: 0.1,
        max_daily_loss: 0.02,
        max_drawdown: 0.1,
        correlation_limit: 0.7,
        volatility_threshold: 0.3,
        stop_loss_percentage: 0.02,
        take_profit_percentage: 0.04,
        position_sizing_method: "kelly",
        risk_per_trade: 0.01,
        max_concurrent_trades: 5,
      },
      tradingConstraints: bot.tradingConstraints || {
        allowed_symbols: ["EURUSD", "GBPUSD", "USDJPY"],
        forbidden_symbols: [],
        trading_hours: {
          start: "09:00",
          end: "17:00",
          timezone: "UTC",
        },
        max_trades_per_day: 10,
        min_trade_interval: 30,
        blackout_periods: [],
        news_filter: true,
        economic_calendar_filter: true,
      },
      perfOptimization: bot.perfOptimization || {
        rebalancing_frequency: "daily",
        performance_threshold: 0.05,
        adaptation_speed: 0.1,
        model_retrain_frequency: 7,
        feature_importance_threshold: 0.05,
        outlier_detection: true,
        regime_adaptation: true,
        dynamic_position_sizing: true,
      },
    };

    res.json({ settings });
  } catch (error) {
    console.error("Error getting advanced settings:", error);
    res.status(500).json({ error: "Failed to get advanced settings" });
  }
};

export const updateAdvancedSettings = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const { aiConfig, riskParams, tradingConstraints, perfOptimization } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get bot and verify ownership - use string IDs
    const bot = await prisma.bot.findFirst({
      where: {
        id: id, // Keep as string
        userId: String(userId), // Convert to string
      },
    });

    if (!bot) {
      return res.status(404).json({ error: "Bot not found" });
    }

    // Update bot with new settings - use string ID
    const updatedBot = await prisma.bot.update({
      where: { id: id }, // Keep as string
      data: {
        aiConfig: aiConfig || bot.aiConfig,
        riskParams: riskParams || bot.riskParams,
        tradingConstraints: tradingConstraints || bot.tradingConstraints,
        perfOptimization: perfOptimization || bot.perfOptimization,
      },
    });

    res.json({
      message: "Advanced settings updated successfully",
      bot: updatedBot,
    });
  } catch (error) {
    console.error("Error updating advanced settings:", error);
    res.status(500).json({ error: "Failed to update advanced settings" });
  }
};

/**
 * Clean up stale trades for a bot
 */
export const cleanupStaleTrades = async (req: Request, res: Response) => {
  try {
    const botId = req.params.id;
    const { maxAgeHours = 24, dryRun = false } = req.body;

    // Validate input
    if (!botId) {
      return res.status(400).json({ message: "Invalid bot ID" });
    }

    // User ID from auth middleware
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Verify bot ownership
    const bot = await botService.getBotById(botId, String(req.user.userId));
    if (!bot) {
      return res.status(404).json({ message: "Bot not found" });
    }

    // Clean up stale trades
    const result = await riskManagementServiceInstance.cleanupStaleTrades(botId);

    return res.status(200).json({
      message: "Stale trades cleanup completed",
      success: result.success,
      tradesRemoved: result.tradesRemoved,
      details: result.message,
    });
  } catch (error: any) {
    console.error("Error cleaning up stale trades:", error);
    return res.status(500).json({ message: "Error cleaning up stale trades" });
  }
};
