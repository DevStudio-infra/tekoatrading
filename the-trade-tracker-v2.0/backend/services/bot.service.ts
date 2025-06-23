import { prisma } from "../utils/prisma";
import { PrismaClient, Prisma } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { brokerFactoryService } from "./broker-factory.service";
import { loggerService } from "./logger.service";
import { chartAdapter } from "../modules/chart";
import { schedulerService } from "./scheduler.service";
import { TradingService } from "./trading.service";

// Import specialized bot services for refactoring
import { botManagementService, botEvaluationService, botTradingService, botPositionService, botMarketService } from "./bot/factories/bot-service.factory";

const execAsync = promisify(exec);

export class BotService {
  private tradingService: TradingService;
  private marketStatusCache: Map<string, { status: string; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 30000; // 30 seconds cache

  constructor() {
    this.tradingService = new TradingService();
  }

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
        throw new Error(`User with ID ${userId} not found`);
      }

      return user.id;
    }
  }

  /**
   * Get a broker API instance for a bot
   * This is a helper method to get the appropriate broker API instance based on the bot's broker credential
   */
  async getBrokerApiForBot(botId: string, userId: string) {
    try {
      // Get the bot
      const bot = await this.getBotById(botId, userId);

      if (!bot) {
        throw new Error("Bot not found or does not belong to user");
      }

      // Get the broker API instance through the factory
      return await brokerFactoryService.getBrokerApi(bot.brokerCredentialId, userId);
    } catch (error) {
      loggerService.error(`Error getting broker API for bot ${botId}:`, error);
      throw error;
    }
  }

  /**
   * Get a bot by ID for system access (bypasses user authorization)
   * This is used by services that need to access bot data for trading operations
   */
  async getBotByIdSystem(botId: string): Promise<any | null> {
    try {
      const result = await prisma.bot.findUnique({
        where: {
          id: botId,
        },
      });

      return result;
    } catch (error) {
      loggerService.error("Error fetching bot by ID (system access):", error);
      throw error;
    }
  }

  /**
   * Get a broker API instance for a bot using system access
   * This is used by the trading service and other system components
   */
  async getBrokerApiForBotSystem(botId: string): Promise<any> {
    try {
      // Get the bot using system access
      const bot = await this.getBotByIdSystem(botId);

      if (!bot) {
        throw new Error(`Bot not found: ${botId}`);
      }

      // Verify the bot has a broker credential ID
      if (!bot.brokerCredentialId) {
        throw new Error(`Bot ${botId} has no broker credential configured`);
      }

      // Get the broker API instance through the factory using the bot's actual user ID
      return await brokerFactoryService.getBrokerApi(bot.brokerCredentialId, bot.userId);
    } catch (error) {
      loggerService.error(`Error getting broker API for bot ${botId} (system access):`, error);
      throw error;
    }
  }

  /**
   * Create a new trading bot
   */
  async createBot(botData: any): Promise<any> {
    try {
      // Get real user UUID for database
      const realUserId = await this.getRealUserUuid(botData.userId);

      // Validate that strategy exists
      const strategy = await prisma.strategy.findUnique({
        where: { id: botData.strategyId },
      });

      if (!strategy) {
        throw new Error("Strategy not found");
      }

      // Validate that broker credential exists
      const brokerCredential = await prisma.brokerCredential.findUnique({
        where: { id: botData.brokerCredentialId },
      });

      if (!brokerCredential) {
        throw new Error("Broker credential not found");
      }

      // Create bot with the converted UUID
      const bot = await prisma.bot.create({
        data: {
          ...botData,
          userId: realUserId, // Use the real UUID
          isActive: botData.isActive || false,
        },
      });

      return bot;
    } catch (error) {
      loggerService.error("Error creating bot:", error);
      throw error;
    }
  }

  /**
   * Get a bot by ID
   */
  async getBotById(botId: string, userId: string): Promise<any | null> {
    try {
      // Convert numeric userId to real user UUID
      const realUserId = await this.getRealUserUuid(userId);

      const result = await prisma.bot.findFirst({
        where: {
          id: botId,
          userId: realUserId,
        },
      });

      return result;
    } catch (error) {
      loggerService.error("Error fetching bot by ID:", error);
      throw error;
    }
  }

  /**
   * Get all bots for a user
   */
  async getUserBots(userId: string): Promise<any[]> {
    try {
      // Convert numeric userId to real user UUID
      const realUserId = await this.getRealUserUuid(userId);

      return await prisma.bot.findMany({
        where: {
          userId: realUserId,
        },
      });
    } catch (error) {
      loggerService.error("Error fetching bots by user:", error);
      throw error;
    }
  }

  /**
   * Update a bot
   */
  async updateBot(botId: string, userId: string, updateData: Partial<any>): Promise<any> {
    try {
      // Convert numeric userId to real user UUID
      const realUserId = await this.getRealUserUuid(userId);

      // Make sure the bot exists and belongs to the user
      const existingBot = await prisma.bot.findFirst({
        where: {
          id: botId,
          userId: realUserId,
        },
      });

      if (!existingBot) {
        throw new Error("Bot not found or does not belong to the user");
      }

      const updatedBot = await prisma.bot.update({
        where: { id: botId },
        data: updateData,
      });

      return updatedBot;
    } catch (error) {
      loggerService.error("Error updating bot:", error);
      throw error;
    }
  }

  /**
   * Delete a bot
   */
  async deleteBot(botId: string, userId: string): Promise<boolean> {
    try {
      // Convert numeric userId to real user UUID
      const realUserId = await this.getRealUserUuid(userId);

      // Ensure bot exists and belongs to user
      const bot = await prisma.bot.findFirst({
        where: {
          id: botId,
          userId: realUserId,
        },
      });

      if (!bot) {
        loggerService.warn(`Bot ${botId} not found or does not belong to user ${realUserId} during delete attempt.`);
        return false;
      }

      // First, delete related evaluations
      await prisma.evaluation.deleteMany({
        where: { botId: botId },
      });

      // Then, delete the bot itself
      const deleteResult = await prisma.bot.deleteMany({
        where: {
          id: botId,
          userId: realUserId,
        },
      });

      loggerService.info(`Bot ${botId} deleted successfully for user ${realUserId}`);
      return deleteResult.count > 0;
    } catch (error) {
      loggerService.error(`Error deleting bot ${botId}:`, error);
      throw error;
    }
  }

  /**
   * Start a bot
   */
  async startBot(botId: string, userId: string): Promise<any> {
    try {
      // Get bot details - using getBotById will already convert the userId
      const bot = await this.getBotById(botId, userId);

      if (!bot) {
        throw new Error("Bot not found or does not belong to user");
      }

      // Update bot status to active
      const updatedBot = await prisma.bot.update({
        where: { id: botId },
        data: { isActive: true },
      });

      loggerService.info(`Bot ${botId} started by user ${userId}`);
      return updatedBot;
    } catch (error) {
      loggerService.error(`Error starting bot ${botId}:`, error);
      throw error;
    }
  }

  /**
   * Stop a bot
   */
  async stopBot(botId: string, userId: string): Promise<any> {
    try {
      // Get bot details - using getBotById will already convert the userId
      const bot = await this.getBotById(botId, userId);

      if (!bot) {
        throw new Error("Bot not found or does not belong to user");
      }

      // Update bot status to inactive
      const updatedBot = await prisma.bot.update({
        where: { id: botId },
        data: { isActive: false },
      });

      loggerService.info(`Bot ${botId} stopped by user ${userId}`);
      return updatedBot;
    } catch (error) {
      loggerService.error(`Error stopping bot ${botId}:`, error);
      throw error;
    }
  }

  /**
   * Toggle bot active status
   */
  async toggleBotActive(botId: string, userId: string): Promise<any> {
    try {
      console.log(`[BOT TOGGLE DEBUG] ===== TOGGLE BOT ACTIVE =====`);
      console.log(`[BOT TOGGLE DEBUG] Bot ID: ${botId}`);
      console.log(`[BOT TOGGLE DEBUG] User ID: ${userId}`);

      // Convert numeric userId to real user UUID
      const realUserId = await this.getRealUserUuid(userId);
      console.log(`[BOT TOGGLE DEBUG] Real User ID: ${realUserId}`);

      // Get bot details
      const bot = await prisma.bot.findFirst({
        where: {
          id: botId,
          userId: realUserId,
        },
      });

      if (!bot) {
        console.log(`[BOT TOGGLE DEBUG] ❌ Bot not found or does not belong to user`);
        throw new Error("Bot not found or does not belong to user");
      }

      console.log(`[BOT TOGGLE DEBUG] Current bot state - Active: ${bot.isActive}, AI Trading: ${bot.isAiTradingActive}`);

      // Toggle isActive status
      const updatedBot = await prisma.bot.update({
        where: { id: botId },
        data: { isActive: !bot.isActive },
      });

      const action = updatedBot.isActive ? "activated" : "deactivated";
      console.log(`[BOT TOGGLE DEBUG] ✅ Bot ${action} successfully`);
      console.log(`[BOT TOGGLE DEBUG] New bot state - Active: ${updatedBot.isActive}, AI Trading: ${updatedBot.isAiTradingActive}`);

      loggerService.info(`Bot ${botId} ${action} by user ${userId}`);

      // Emit event for the scheduler to pick up
      console.log(`[BOT TOGGLE DEBUG] Emitting botToggleActive event for scheduler`);
      loggerService.info(`Emitting botToggleActive event for bot ${botId}`);
      schedulerService.emit("botToggleActive", botId, updatedBot.isActive, updatedBot.isAiTradingActive, updatedBot.timeframe);

      return updatedBot;
    } catch (error) {
      console.log(`[BOT TOGGLE DEBUG] ❌ Error toggling bot active status:`, error);
      loggerService.error(`Error toggling bot active status for ${botId}:`, error);
      throw error;
    }
  }

  /**
   * Toggle AI trading status for a bot
   */
  async toggleAiTrading(botId: string, userId: string): Promise<any> {
    try {
      console.log(`[AI TOGGLE DEBUG] ===== TOGGLE AI TRADING =====`);
      console.log(`[AI TOGGLE DEBUG] Bot ID: ${botId}`);
      console.log(`[AI TOGGLE DEBUG] User ID: ${userId}`);

      // Convert numeric userId to real user UUID
      const realUserId = await this.getRealUserUuid(userId);
      console.log(`[AI TOGGLE DEBUG] Real User ID: ${realUserId}`);

      // Get bot details
      const bot = await prisma.bot.findFirst({
        where: {
          id: botId,
          userId: realUserId,
        },
      });

      if (!bot) {
        console.log(`[AI TOGGLE DEBUG] ❌ Bot not found or does not belong to user`);
        throw new Error("Bot not found or does not belong to user");
      }

      console.log(`[AI TOGGLE DEBUG] Current bot state - Active: ${bot.isActive}, AI Trading: ${bot.isAiTradingActive}`);

      // Toggle AI trading status
      const updatedBot = await prisma.bot.update({
        where: { id: botId },
        data: { isAiTradingActive: !bot.isAiTradingActive },
      });

      const action = updatedBot.isAiTradingActive ? "enabled" : "disabled";
      console.log(`[AI TOGGLE DEBUG] ✅ AI trading ${action} successfully`);
      console.log(`[AI TOGGLE DEBUG] New bot state - Active: ${updatedBot.isActive}, AI Trading: ${updatedBot.isAiTradingActive}`);

      loggerService.info(`AI trading ${action} for bot ${botId} by user ${userId}`);

      // Emit event for the scheduler to pick up
      console.log(`[AI TOGGLE DEBUG] Emitting botToggleAiTrading event for scheduler`);
      loggerService.info(`Emitting botToggleAiTrading event for bot ${botId}`);
      schedulerService.emit("botToggleAiTrading", botId, updatedBot.isActive, updatedBot.isAiTradingActive, updatedBot.timeframe);

      return updatedBot;
    } catch (error) {
      console.log(`[AI TOGGLE DEBUG] ❌ Error toggling AI trading:`, error);
      loggerService.error(`Error toggling AI trading for bot ${botId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new evaluation for a bot
   * Delegated to BotEvaluationService for better separation of concerns
   */
  async createEvaluation(botId: string, userId: string, chartData: any, positionData?: any): Promise<any> {
    return await botEvaluationService.createEvaluation(botId, userId, chartData, positionData);
  }

  /**
   * Get current positions for a bot (with optional symbol filter)
   *
   * NOTE: This method is deprecated and should be replaced with Trade-based position management
   * The Position model is being phased out in favor of the Trade model for better consistency.
   *
   * Issues with this approach:
   * - Position model doesn't match our actual trading implementation
   * - Creates inconsistency in the codebase
   * - LLM gets portfolio context from Trade model, not Position model
   *
   * Now delegated to BotPositionService for better separation of concerns
   */
  async getCurrentPositions(botId: string, symbol?: string): Promise<any[]> {
    return await botPositionService.getCurrentPositions(botId, symbol);
  }

  /**
   * Get evaluations for a bot
   * Delegated to BotEvaluationService for better separation of concerns
   */
  async getBotEvaluations(botId: string, userId: string, limit: number = 10): Promise<any[]> {
    return await botEvaluationService.getBotEvaluations(botId, userId, limit);
  }

  /**
   * Helper method to get timeframe in minutes
   * @private
   */
  private getTimeframeInMinutes(timeframe: string): number {
    const timeframeMap: Record<string, number> = {
      M1: 1,
      M5: 5,
      M15: 15,
      M30: 30,
      H1: 60,
      H4: 240,
      D1: 1440,
      W1: 10080,
    };

    return timeframeMap[timeframe] || 1; // Default to 1 minute if not found
  }

  /**
   * Get OHLCV market data for a trading pair and timeframe
   * For demo purposes, generates realistic synthetic data with proper OHLC relationships
   * @private
   */
  private async fetchOHLCVData(symbol: string, timeframe: string, limit = 400): Promise<any[]> {
    // Generate more realistic synthetic data with proper candlestick patterns
    const candles = [];
    const now = new Date();

    // Get realistic starting price based on symbol (using silent method for chart generation)
    let price = this.getChartGenerationPrice(symbol);

    // Calculate timeframe minutes for proper timestamp spacing
    const timeframeMinutes = this.getTimeframeInMinutes(timeframe);

    // Generate candles with realistic OHLC relationships and some trend/pattern
    for (let i = 0; i < limit; i++) {
      // Calculate timestamp for candle
      const candleTime = new Date(now.getTime() - (limit - i) * timeframeMinutes * 60 * 1000);

      // Create trending movement with some noise
      const trendDirection = Math.sin(i / 20) * 0.5; // Slow wave for trend
      const randomNoise = (Math.random() - 0.5) * 0.02; // Random noise
      const priceChange = (trendDirection + randomNoise) * price * 0.005; // 0.5% max change per candle

      const open = price;
      price += priceChange;

      // Generate realistic high and low based on volatility
      const volatility = this.getSymbolVolatility(symbol, timeframe);
      const range = price * volatility * (0.5 + Math.random() * 0.5); // Variable range

      let high: number;
      let low: number;
      let close: number;

      // Determine if it's a bullish or bearish candle
      const isBullish = Math.random() > 0.5;

      if (isBullish) {
        // Bullish candle: close > open
        close = open + Math.abs(priceChange) + Math.random() * range * 0.3;
        high = Math.max(open, close) + Math.random() * range * 0.4;
        low = Math.min(open, close) - Math.random() * range * 0.2;
      } else {
        // Bearish candle: close < open
        close = open - Math.abs(priceChange) - Math.random() * range * 0.3;
        high = Math.max(open, close) + Math.random() * range * 0.2;
        low = Math.min(open, close) - Math.random() * range * 0.4;
      }

      // Ensure proper OHLC relationships
      high = Math.max(high, open, close);
      low = Math.min(low, open, close);

      // Generate realistic volume based on symbol type
      const baseVolume = this.getBaseVolume(symbol);
      const volume = baseVolume * (0.5 + Math.random() * 1.5); // Variable volume

      candles.push({
        datetime: candleTime.toISOString(),
        timestamp: candleTime.getTime(),
        open: Number(open.toFixed(8)),
        high: Number(high.toFixed(8)),
        low: Number(low.toFixed(8)),
        close: Number(close.toFixed(8)),
        volume: Math.floor(volume),
      });

      // Update price for next candle
      price = close;
    }

    return candles;
  }

  /**
   * Get symbol-specific volatility for realistic candle generation
   * @param symbol Trading symbol
   * @param timeframe Chart timeframe
   * @returns Volatility as decimal (0.02 = 2%)
   */
  private getSymbolVolatility(symbol: string, timeframe: string): number {
    const symbolUpper = symbol.toUpperCase();

    // Base volatility by asset class
    let baseVolatility = 0.01; // 1% default

    // Cryptocurrency - higher volatility
    if (symbolUpper.includes("BTC") || symbolUpper.includes("BITCOIN")) {
      baseVolatility = 0.03; // 3%
    } else if (symbolUpper.includes("ETH") || symbolUpper.includes("ETHEREUM")) {
      baseVolatility = 0.025; // 2.5%
    } else if (symbolUpper.includes("LTC") || symbolUpper.includes("XRP") || symbolUpper.includes("ADA")) {
      baseVolatility = 0.04; // 4% for smaller cryptos
    }
    // Forex - moderate volatility
    else if (symbolUpper.includes("USD") || symbolUpper.includes("EUR") || symbolUpper.includes("GBP")) {
      baseVolatility = 0.008; // 0.8%
    }
    // Indices - moderate volatility
    else if (symbolUpper.includes("SPX") || symbolUpper.includes("NAS") || symbolUpper.includes("DOW")) {
      baseVolatility = 0.015; // 1.5%
    }
    // Commodities - variable volatility
    else if (symbolUpper.includes("GOLD")) {
      baseVolatility = 0.012; // 1.2%
    } else if (symbolUpper.includes("OIL")) {
      baseVolatility = 0.025; // 2.5%
    }

    // Adjust by timeframe (shorter timeframes = lower volatility per candle)
    const timeframeMultipliers: Record<string, number> = {
      M1: 0.3, // 1-minute
      M5: 0.6, // 5-minute
      M15: 0.8, // 15-minute
      M30: 1.0, // 30-minute (base)
      H1: 1.3, // 1-hour
      H4: 2.0, // 4-hour
      D1: 3.0, // Daily
    };

    const multiplier = timeframeMultipliers[timeframe] || 1.0;
    return baseVolatility * multiplier;
  }

  /**
   * Get base volume for realistic volume generation
   * @param symbol Trading symbol
   * @returns Base volume units
   */
  private getBaseVolume(symbol: string): number {
    const symbolUpper = symbol.toUpperCase();

    // Volume varies by asset class
    if (symbolUpper.includes("BTC") || symbolUpper.includes("BITCOIN")) {
      return 50; // BTC volumes are typically smaller
    } else if (symbolUpper.includes("ETH") || symbolUpper.includes("ETHEREUM")) {
      return 200;
    } else if (symbolUpper.includes("USD") || symbolUpper.includes("EUR")) {
      return 100000; // Forex has large volumes
    } else if (symbolUpper.includes("SPX") || symbolUpper.includes("NAS")) {
      return 1000; // Index volumes
    } else if (symbolUpper.includes("GOLD")) {
      return 500;
    } else if (symbolUpper.includes("OIL")) {
      return 2000;
    }

    return 1000; // Default volume
  }

  /**
   * Evaluate a bot and potentially execute trades based on chart analysis
   * Delegated to BotEvaluationService for better separation of concerns
   */
  async evaluateBot(botId: string): Promise<any> {
    const result = await botEvaluationService.evaluateBot(botId);
    return result.data || result;
  }

  /**
   * Collect portfolio context for trading decisions
   * Delegated to BotPositionService for better separation of concerns
   */
  private async collectPortfolioContext(userId: string, botId?: string): Promise<any> {
    return await botPositionService.collectPortfolioContext(userId, botId);
  }

  /**
   * Convert chart URL to base64 for AI analysis
   */
  private async convertChartToBase64(chartUrl: string): Promise<string> {
    try {
      console.log(`[CHART CONVERSION DEBUG] Starting conversion for URL: ${chartUrl}`);

      // If it's a local file path, read it directly
      if (chartUrl.startsWith("./") || chartUrl.startsWith("../") || chartUrl.includes("public/")) {
        const path = require("path");
        const fs = require("fs");

        // Convert URL to file path
        let filePath = chartUrl;
        if (chartUrl.includes("public/")) {
          filePath = chartUrl.split("public/")[1];
          filePath = path.join("./public", filePath);
        }

        console.log(`[CHART CONVERSION DEBUG] Local file path: ${filePath}`);

        if (fs.existsSync(filePath)) {
          const imageBuffer = fs.readFileSync(filePath);
          const base64Data = `data:image/png;base64,${imageBuffer.toString("base64")}`;
          console.log(`[CHART CONVERSION DEBUG] Local file converted, size: ${Math.round(base64Data.length / 1024)}KB`);
          return base64Data;
        } else {
          console.log(`[CHART CONVERSION DEBUG] Local file not found: ${filePath}`);
        }
      }

      // If it's a URL, fetch it
      console.log(`[CHART CONVERSION DEBUG] Fetching from URL: ${chartUrl}`);
      const response = await fetch(chartUrl);
      console.log(`[CHART CONVERSION DEBUG] Response status: ${response.status}, OK: ${response.ok}`);

      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        console.log(`[CHART CONVERSION DEBUG] Buffer size: ${buffer.length} bytes`);

        // Validate PNG signature
        const isPngValid =
          buffer.length >= 8 &&
          buffer[0] === 137 &&
          buffer[1] === 80 &&
          buffer[2] === 78 &&
          buffer[3] === 71 &&
          buffer[4] === 13 &&
          buffer[5] === 10 &&
          buffer[6] === 26 &&
          buffer[7] === 10;

        console.log(`[CHART CONVERSION DEBUG] PNG signature valid: ${isPngValid}`);

        if (!isPngValid) {
          console.log(`[CHART CONVERSION DEBUG] First 16 bytes:`, Array.from(buffer.slice(0, 16)));
        }

        const base64Data = `data:image/png;base64,${buffer.toString("base64")}`;
        console.log(`[CHART CONVERSION DEBUG] Base64 conversion complete, total size: ${Math.round(base64Data.length / 1024)}KB`);
        console.log(`[CHART CONVERSION DEBUG] Base64 prefix: ${base64Data.substring(0, 50)}...`);

        return base64Data;
      }

      throw new Error(`Failed to fetch chart: ${response.status} ${response.statusText}`);
    } catch (error) {
      console.error(`[CHART CONVERSION DEBUG] Error converting chart to base64:`, error);
      loggerService.error(`Error converting chart to base64: ${error instanceof Error ? error.message : String(error)}`);

      // Return a minimal placeholder base64 image
      const placeholderBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
      console.log(`[CHART CONVERSION DEBUG] Returning placeholder image`);
      return placeholderBase64;
    }
  }

  /**
   * Get OHLCV market data for a trading pair and timeframe
   * @param botId Bot ID for tracking
   * @param symbol Trading pair symbol
   * @param timeframe Timeframe (e.g., M1, H1, D1)
   * @param limit Number of candles to fetch
   * @returns Array of OHLCV data
   */
  private async getOHLCVData(botId: string, symbol: string, timeframe: string, limit = 400): Promise<any[]> {
    try {
      // In a real implementation, this would call the broker API to get market data
      // For now, we'll generate sample data
      const candles = [];
      const now = new Date();
      let price = 100 + Math.random() * 900; // Random starting price

      // Generate synthetic price data
      for (let i = 0; i < limit; i++) {
        // Calculate timestamp for candle
        const candleTime = new Date(now.getTime() - (limit - i) * this.getTimeframeInMinutes(timeframe) * 60 * 1000);

        // Random price movement
        const change = price * 0.02 * (Math.random() - 0.5);
        price += change;

        // Generate OHLCV values
        const open = price;
        const high = price + price * 0.01 * Math.random();
        const low = price - price * 0.01 * Math.random();
        const close = price + price * 0.01 * (Math.random() - 0.5);
        const volume = 1000 + Math.random() * 9000;

        candles.push({
          timestamp: candleTime.toISOString(),
          open,
          high,
          low,
          close,
          volume,
        });
      }

      return candles;
    } catch (error) {
      console.error(`[BOT SERVICE] Error fetching OHLCV data for bot ${botId}:`, error);
      throw error;
    }
  }

  /**
   * Format trading pair symbol for Capital.com API
   * Delegated to BotMarketService for better separation of concerns
   */
  private formatTradingPairSymbol(symbol: string): string {
    return botMarketService.formatTradingPairSymbol(symbol);
  }

  /**
   * Get realistic price for chart generation (silent method without warnings)
   * Used only for generating demo charts - does not indicate broker API failure
   * @param symbol Trading pair symbol
   * @returns Realistic starting price for chart generation
   */
  private getChartGenerationPrice(symbol: string): number {
    const symbolUpper = symbol.toUpperCase();

    // Chart generation prices (silent - no error logging)
    if (symbolUpper.includes("BTC") || symbolUpper.includes("BITCOIN")) {
      return 105000; // Bitcoin ~$105,000
    }
    if (symbolUpper.includes("ETH") || symbolUpper.includes("ETHEREUM")) {
      return 4000; // Ethereum ~$4,000
    }
    if (symbolUpper.includes("USD") && symbolUpper.includes("CAD")) {
      return 1.35; // USD/CAD ~1.35
    }
    if (symbolUpper.includes("EUR") && symbolUpper.includes("USD")) {
      return 1.05; // EUR/USD ~1.05
    }
    if (symbolUpper.includes("SPX") || symbolUpper.includes("US500")) {
      return 6000; // S&P 500 ~6,000
    }
    if (symbolUpper.includes("GOLD") || symbolUpper.includes("XAU")) {
      return 2650; // Gold ~$2,650/oz
    }
    if (symbolUpper.includes("AAPL")) {
      return 220; // Apple ~$220
    }

    return 100; // Default fallback for chart generation
  }

  /**
   * Get realistic fallback price for a symbol
   * @param symbol Trading pair symbol
   * @param epic Optional epic for specific symbol
   * @returns Realistic fallback price
   */
  private getRealisticFallbackPrice(symbol: string, epic?: string): number {
    // 🚨 CRITICAL WARNING: This fallback should NEVER be used in production
    loggerService.error(`🚨 CRITICAL: Bot Service fallback price called for ${symbol}! Real broker price should be available!`);

    const symbolUpper = symbol.toUpperCase();
    const epicUpper = epic?.toUpperCase() || "";

    // EMERGENCY fallback prices - These should NEVER be used if broker API works
    loggerService.error(`🚨 Using Bot Service emergency fallback price for ${symbol} - indicates broker API failure!`);

    // Cryptocurrency prices
    if (symbolUpper.includes("BTC") || epicUpper.includes("BTC") || symbolUpper.includes("BITCOIN")) {
      return 105000; // Bitcoin ~$105,000
    }
    if (symbolUpper.includes("ETH") || epicUpper.includes("ETH") || symbolUpper.includes("ETHEREUM")) {
      return 4000; // Ethereum ~$4,000
    }
    if (symbolUpper.includes("LTC") || epicUpper.includes("LTC") || symbolUpper.includes("LITECOIN")) {
      return 100; // Litecoin ~$100
    }
    if (symbolUpper.includes("XRP") || epicUpper.includes("XRP") || symbolUpper.includes("RIPPLE")) {
      return 0.6; // XRP ~$0.60
    }
    if (symbolUpper.includes("BCH") || epicUpper.includes("BCH") || symbolUpper.includes("BITCOIN CASH")) {
      return 400; // Bitcoin Cash ~$400
    }
    if (symbolUpper.includes("ADA") || epicUpper.includes("ADA") || symbolUpper.includes("CARDANO")) {
      return 0.4; // Cardano ~$0.40
    }
    if (symbolUpper.includes("SOL") || epicUpper.includes("SOL") || symbolUpper.includes("SOLANA")) {
      return 200; // Solana ~$200
    }

    // Major forex pairs
    if (symbolUpper.includes("EUR/USD") || symbolUpper.includes("EURUSD")) {
      return 1.05; // EUR/USD ~1.05
    }
    if (symbolUpper.includes("GBP/USD") || symbolUpper.includes("GBPUSD")) {
      return 1.27; // GBP/USD ~1.27
    }
    if (symbolUpper.includes("USD/JPY") || symbolUpper.includes("USDJPY")) {
      return 150; // USD/JPY ~150
    }
    if (symbolUpper.includes("USD/CAD") || symbolUpper.includes("USDCAD")) {
      return 1.35; // USD/CAD ~1.35
    }
    if (symbolUpper.includes("AUD/USD") || symbolUpper.includes("AUDUSD")) {
      return 0.66; // AUD/USD ~0.66
    }
    if (symbolUpper.includes("USD/CHF") || symbolUpper.includes("USDCHF")) {
      return 0.88; // USD/CHF ~0.88
    }

    // Indices
    if (symbolUpper.includes("S&P") || symbolUpper.includes("SPX") || symbolUpper.includes("SPX500") || symbolUpper.includes("US500")) {
      return 6000; // S&P 500 ~6,000
    }
    if (symbolUpper.includes("NASDAQ") || symbolUpper.includes("NAS100") || symbolUpper.includes("US100")) {
      return 20000; // NASDAQ ~20,000
    }
    if (symbolUpper.includes("DOW") || symbolUpper.includes("DJI") || symbolUpper.includes("US30")) {
      return 44000; // Dow Jones ~44,000
    }
    if (symbolUpper.includes("FTSE") || symbolUpper.includes("UK100")) {
      return 7500; // FTSE 100 ~7,500
    }
    if (symbolUpper.includes("DAX") || symbolUpper.includes("GERMANY40")) {
      return 16000; // DAX ~16,000
    }

    // Commodities
    if (
      symbolUpper.includes("GOLD") ||
      symbolUpper.includes("SILVER") ||
      symbolUpper.includes("OIL") ||
      symbolUpper.includes("GAS") ||
      symbolUpper.includes("WHEAT") ||
      symbolUpper.includes("COFFEE") ||
      symbolUpper.includes("COPPER") ||
      symbolUpper.includes("CRUDE") ||
      symbolUpper.includes("XAU") ||
      symbolUpper.includes("XAG")
    ) {
      if (symbolUpper.includes("GOLD") || symbolUpper.includes("XAU")) {
        return 2650; // Gold ~$2,650/oz
      }
      if (symbolUpper.includes("SILVER") || symbolUpper.includes("XAG")) {
        return 30; // Silver ~$30/oz
      }
      if (symbolUpper.includes("OIL") || symbolUpper.includes("WTI") || symbolUpper.includes("CRUDE")) {
        return 70; // Oil ~$70/barrel
      }
      return 100; // Other commodities fallback
    }

    // Default fallback for unknown instruments
    return 100;
  }

  /**
   * Get market trading information for a symbol
   * Delegated to BotMarketService for better separation of concerns
   */
  private getMarketTradingInfo(symbol: string): { type: string; description: string; typical24_7: boolean } {
    return botMarketService.getMarketTradingInfo(symbol);
  }

  /**
   * Basic market hours validation that doesn't require broker API
   * Delegated to BotMarketService for better separation of concerns
   */
  private isBasicMarketTradingTime(symbol: string): { allowed: boolean; reason: string } {
    return botMarketService.isBasicMarketTradingTime(symbol);
  }

  /**
   * Get next trading time estimate based on market type
   * @param marketType Type of market (FOREX, STOCK, etc.)
   * @returns String with estimated next trading time
   */
  private getNextTradingTime(marketType: string): string {
    const now = new Date();
    const currentDay = now.getUTCDay(); // 0 = Sunday, 6 = Saturday

    switch (marketType) {
      case "CRYPTOCURRENCY":
        return "Available 24/7";

      case "FOREX":
        // Forex is typically closed from Friday 22:00 UTC to Sunday 22:00 UTC
        if (currentDay === 6) {
          // Saturday
          return "Sunday 22:00 UTC (Forex reopens)";
        } else if (currentDay === 0 && now.getUTCHours() < 22) {
          // Sunday before 22:00
          return "Sunday 22:00 UTC (Forex reopens)";
        } else {
          return "Check again in 15 minutes";
        }

      case "STOCK":
      case "INDEX":
        // Most stock markets are closed on weekends
        if (currentDay === 6 || currentDay === 0) {
          // Weekend
          return "Monday morning (market specific times)";
        } else {
          return "Next trading session (check exchange hours)";
        }

      case "COMMODITY":
        // Commodities have varying hours
        if (currentDay === 6 || currentDay === 0) {
          // Weekend
          return "Monday (commodity specific times)";
        } else {
          return "Check commodity trading hours";
        }

      default:
        return "Check market-specific trading hours";
    }
  }

  /**
   * Get pip value for a given symbol and price
   * Delegated to BotMarketService for better separation of concerns
   */
  private getPipValue(symbol: string, price: number): number {
    return botMarketService.getPipValue(symbol, price);
  }

  /**
   * Get appropriate default position size based on asset type and price
   * Delegated to BotPositionService for better separation of concerns
   */
  private getDefaultPositionSize(symbol: string, price: number): number {
    return botPositionService.getDefaultPositionSize(symbol, price);
  }

  /**
   * Get appropriate stop loss distance in pips based on asset volatility
   * @param symbol Trading pair symbol
   * @returns Stop loss distance in pips
   */
  private getDefaultStopLossDistance(symbol: string): number {
    const symbolUpper = symbol.toUpperCase();

    // Cryptocurrency - higher distances due to volatility
    if (symbolUpper.includes("BTC") || symbolUpper.includes("BITCOIN")) {
      return 80; // 80 pips = ~6.4% at 0.08% pip value
    }
    if (symbolUpper.includes("ETH") || symbolUpper.includes("ETHEREUM")) {
      return 60; // 60 pips = ~6% at 0.1% pip value
    }
    if (symbolUpper.includes("LTC") || symbolUpper.includes("XRP") || symbolUpper.includes("BCH") || symbolUpper.includes("ADA") || symbolUpper.includes("SOL")) {
      return 50; // 50 pips = ~10% at 0.2% pip value for other cryptos
    }

    // Major forex pairs - standard distances
    if (
      symbolUpper.includes("EUR/USD") ||
      symbolUpper.includes("GBP/USD") ||
      symbolUpper.includes("USD/CAD") ||
      symbolUpper.includes("AUD/USD") ||
      symbolUpper.includes("USD/CHF")
    ) {
      return 30; // 30 pips for major pairs
    }

    // JPY pairs - adjusted for different pip value
    if (symbolUpper.includes("JPY")) {
      return 300; // 300 pips for JPY pairs (equivalent to 30 pips for other pairs)
    }

    // Indices - moderate distances (including all SPX variants)
    if (
      symbolUpper.includes("S&P") ||
      symbolUpper.includes("SPX") ||
      symbolUpper.includes("SPX500") ||
      symbolUpper.includes("US500") ||
      symbolUpper.includes("NASDAQ") ||
      symbolUpper.includes("NAS100") ||
      symbolUpper.includes("US100")
    ) {
      return 100; // 100 pips = ~2% at 0.02% pip value
    }

    // Commodities
    if (symbolUpper.includes("GOLD") || symbolUpper.includes("XAU")) {
      return 50; // $5 for gold (50 * $0.10)
    }
    if (symbolUpper.includes("SILVER") || symbolUpper.includes("XAG")) {
      return 100; // $1 for silver (100 * $0.01)
    }
    if (symbolUpper.includes("OIL") || symbolUpper.includes("WTI") || symbolUpper.includes("CRUDE")) {
      return 200; // $2 for oil (200 * $0.01)
    }

    // Default fallback
    return 30;
  }

  /**
   * Get appropriate take profit distance in pips based on asset volatility
   * @param symbol Trading pair symbol
   * @returns Take profit distance in pips
   */
  private getDefaultTakeProfitDistance(symbol: string): number {
    const symbolUpper = symbol.toUpperCase();

    // For most assets, use 2:1 risk-reward ratio
    const stopLossDistance = this.getDefaultStopLossDistance(symbol);

    // Crypto gets slightly better ratios due to trend potential
    if (symbolUpper.includes("BTC") || symbolUpper.includes("ETH") || symbolUpper.includes("LTC") || symbolUpper.includes("BITCOIN") || symbolUpper.includes("ETHEREUM")) {
      return stopLossDistance * 2.5; // 2.5:1 ratio for major cryptos
    }

    // Other assets use 2:1 ratio
    return stopLossDistance * 2;
  }

  /**
   * Get maximum allowed stop distance as percentage of price based on asset volatility
   * @param symbol Trading pair symbol
   * @returns Maximum stop distance as percentage (0.05 = 5%)
   */
  private getMaxStopDistancePercent(symbol: string): number {
    const symbolUpper = symbol.toUpperCase();

    // Cryptocurrency - allow larger stops due to volatility
    if (symbolUpper.includes("BTC") || symbolUpper.includes("BITCOIN")) {
      return 0.1; // 10% max for Bitcoin
    }
    if (symbolUpper.includes("ETH") || symbolUpper.includes("ETHEREUM")) {
      return 0.08; // 8% max for Ethereum
    }
    if (symbolUpper.includes("LTC") || symbolUpper.includes("XRP") || symbolUpper.includes("BCH") || symbolUpper.includes("ADA") || symbolUpper.includes("SOL")) {
      return 0.15; // 15% max for other cryptos (more volatile)
    }

    // Forex pairs - tighter stops
    if (
      symbolUpper.includes("EUR/USD") ||
      symbolUpper.includes("GBP/USD") ||
      symbolUpper.includes("USD/CAD") ||
      symbolUpper.includes("AUD/USD") ||
      symbolUpper.includes("USD/CHF") ||
      symbolUpper.includes("USD/JPY")
    ) {
      return 0.05; // 5% max for major forex pairs
    }

    // Indices - moderate stops (including all SPX variants)
    if (
      symbolUpper.includes("S&P") ||
      symbolUpper.includes("SPX") ||
      symbolUpper.includes("SPX500") ||
      symbolUpper.includes("US500") ||
      symbolUpper.includes("NASDAQ") ||
      symbolUpper.includes("NAS100") ||
      symbolUpper.includes("US100")
    ) {
      return 0.06; // 6% max for major indices
    }

    // Commodities
    if (symbolUpper.includes("GOLD") || symbolUpper.includes("XAU")) {
      return 0.08; // 8% max for gold
    }
    if (symbolUpper.includes("SILVER") || symbolUpper.includes("XAG")) {
      return 0.1; // 10% max for silver (more volatile)
    }
    if (symbolUpper.includes("OIL") || symbolUpper.includes("WTI") || symbolUpper.includes("CRUDE")) {
      return 0.12; // 12% max for oil (very volatile)
    }

    // Default fallback
    return 0.05; // 5% default
  }

  /**
   * Check if a market is currently tradeable
   * @param symbol Trading pair symbol
   * @param capitalApi Capital.com API instance
   * @returns Promise<boolean> - true if market is open and tradeable
   */
  private async isMarketTradeable(symbol: string, capitalApi: any): Promise<boolean> {
    try {
      // Check cache first to reduce API calls
      const cached = this.marketStatusCache.get(symbol);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        console.log(`[BOT SERVICE] Using cached market status for ${symbol}: ${cached.status}`);
        return cached.status === "TRADEABLE";
      }

      console.log(`[BOT SERVICE] Checking market tradeable status for ${symbol}`);

      // Try to get the correct epic for the symbol using the capital API's method
      let epic: string | null = null;
      try {
        epic = await capitalApi.getEpicForSymbol(symbol);
        console.log(`[BOT SERVICE] Symbol ${symbol} mapped to epic: ${epic}`);
      } catch (error) {
        console.warn(`[BOT SERVICE] Could not get epic for symbol ${symbol}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }

      // If we couldn't get the epic, try different formats
      if (!epic) {
        const alternativeFormats = this.getAlternativeEpicFormats(symbol);
        console.log(`[BOT SERVICE] Trying alternative formats for ${symbol}: ${alternativeFormats.join(", ")}`);

        for (const format of alternativeFormats) {
          try {
            const testResult = await capitalApi.getMarketDetails(format);
            if (testResult) {
              epic = format;
              console.log(`[BOT SERVICE] Success with alternative epic: ${epic}`);
              break;
            }
          } catch (error: any) {
            console.debug(`[BOT SERVICE] Alternative epic ${format} failed: ${error.response?.status || error.message}`);
            continue;
          }
        }
      }

      // If we still don't have an epic, assume market is tradeable for crypto and some forex
      if (!epic) {
        console.warn(`[BOT SERVICE] Could not find working epic for ${symbol}, checking if we should assume tradeable`);

        // For 24/7 markets like crypto, assume tradeable
        const marketInfo = this.getMarketTradingInfo(symbol);
        if (marketInfo.typical24_7) {
          console.log(`[BOT SERVICE] Market ${symbol} is 24/7 (${marketInfo.type}), assuming tradeable despite epic issues`);
          return true;
        }

        console.warn(`[BOT SERVICE] Could not verify market status for ${symbol} - epic not found`);
        return false;
      }

      // Get market details including opening hours and status
      const marketDetails = await capitalApi.getMarketDetails(epic);

      if (!marketDetails) {
        console.warn(`[BOT SERVICE] Could not get market details for epic ${epic}`);
        // For crypto markets, be more lenient
        const marketInfo = this.getMarketTradingInfo(symbol);
        return marketInfo.typical24_7;
      }

      // Check if we have snapshot data with market status
      let marketStatus = "UNKNOWN";
      if (marketDetails.snapshot?.marketStatus) {
        marketStatus = marketDetails.snapshot.marketStatus;
        console.log(`[BOT SERVICE] Market ${symbol} (${epic}) status: ${marketStatus}`);
      } else if (marketDetails.instrument?.marketStatus) {
        marketStatus = marketDetails.instrument.marketStatus;
        console.log(`[BOT SERVICE] Market ${symbol} (${epic}) instrument status: ${marketStatus}`);
      } else {
        console.log(`[BOT SERVICE] No market status available for ${symbol} (${epic}), checking trading hours`);
        marketStatus = "TRADEABLE"; // Assume tradeable if no status available
      }

      // Cache the market status
      this.marketStatusCache.set(symbol, { status: marketStatus, timestamp: Date.now() });

      if (marketStatus !== "TRADEABLE") {
        console.log(`[BOT SERVICE] Market ${symbol} is not tradeable. Status: ${marketStatus}`);
        return false;
      }

      // If we have opening hours, check them
      if (marketDetails.instrument?.openingHours) {
        const isWithinHours = this.isWithinTradingHours(marketDetails.instrument.openingHours);
        if (!isWithinHours) {
          console.log(`[BOT SERVICE] Market ${symbol} is outside trading hours`);
          return false;
        }
      } else {
        // No opening hours info - for crypto, assume 24/7, for others check our internal logic
        const marketInfo = this.getMarketTradingInfo(symbol);
        if (marketInfo.typical24_7) {
          console.log(`[BOT SERVICE] Market ${symbol} is 24/7 (${marketInfo.type}), no opening hours check needed`);
        } else {
          console.log(`[BOT SERVICE] No opening hours data for ${symbol}, using market type heuristics`);
        }
      }

      console.log(`[BOT SERVICE] Market ${symbol} is tradeable`);
      return true;
    } catch (error: any) {
      console.error(`[BOT SERVICE] Error checking market status for ${symbol}:`, error);

      // Don't assume market is closed on API errors - could be epic format issues
      // Check if this is a 400 error which likely means wrong epic format
      if (error.response?.status === 400) {
        console.warn(`[BOT SERVICE] 400 error for ${symbol} - likely epic format issue, not market closure`);

        // For crypto markets that should be 24/7, assume tradeable
        const marketInfo = this.getMarketTradingInfo(symbol);
        if (marketInfo.typical24_7) {
          console.log(`[BOT SERVICE] Assuming ${symbol} is tradeable (24/7 market with epic format issue)`);
          return true;
        }
      }

      // For other errors, be conservative
      console.warn(`[BOT SERVICE] Assuming ${symbol} is not tradeable due to error: ${error.message}`);
      return false;
    }
  }

  /**
   * Get alternative epic formats to try for a symbol
   */
  private getAlternativeEpicFormats(symbol: string): string[] {
    const alternatives: string[] = [];
    const symbolUpper = symbol.toUpperCase();

    // For BTC/USD and crypto pairs
    if (symbolUpper.includes("BTC")) {
      alternatives.push("BTC/USD", "BTCUSD", "CS.D.BITCOIN.CFD.IP", "CS.D.BTCUSD.CFD.IP", "BITCOIN");
    }

    if (symbolUpper.includes("ETH")) {
      alternatives.push("ETH/USD", "ETHUSD", "CS.D.ETHEREUM.CFD.IP", "CS.D.ETHUSD.CFD.IP", "ETHEREUM");
    }

    // For USD/CAD and forex pairs
    if (symbolUpper.includes("USD") && symbolUpper.includes("CAD")) {
      alternatives.push("USD/CAD", "USDCAD", "CS.D.USDCAD.CFD.IP", "CS.D.USDCAD.MINI.IP");
    }

    if (symbolUpper.includes("EUR") && symbolUpper.includes("USD")) {
      alternatives.push("EUR/USD", "EURUSD", "CS.D.EURUSD.CFD.IP", "CS.D.EURUSD.MINI.IP");
    }

    if (symbolUpper.includes("GBP") && symbolUpper.includes("USD")) {
      alternatives.push("GBP/USD", "GBPUSD", "CS.D.GBPUSD.CFD.IP", "CS.D.GBPUSD.MINI.IP");
    }

    // For index symbols, use proper mappings instead of generic slash pattern
    if (symbolUpper.includes("SPX") || symbolUpper.includes("S&P") || symbolUpper === "SPX500") {
      alternatives.push("US500", "SPX500", "S&P 500", "CS.D.US500.CFD.IP");
    }

    if (symbolUpper.includes("NASDAQ") || symbolUpper === "NAS100" || symbolUpper === "US100") {
      alternatives.push("US100", "NASDAQ100", "NAS100", "CS.D.US100.CFD.IP");
    }

    if (symbolUpper.includes("DOW") || symbolUpper === "US30" || symbolUpper === "DJI") {
      alternatives.push("US30", "DOW", "DOWJONES", "CS.D.US30.CFD.IP");
    }

    if (symbolUpper.includes("FTSE") || symbolUpper === "UK100") {
      alternatives.push("UK100", "FTSE100", "CS.D.UK100.CFD.IP");
    }

    if (symbolUpper.includes("DAX") || symbolUpper === "GERMANY40") {
      alternatives.push("GERMANY40", "DAX40", "CS.D.GERMANY40.CFD.IP");
    }

    // Generic patterns - but exclude known index symbols to avoid invalid formats like SPX/500
    if (symbol.includes("/")) {
      const withoutSlash = symbol.replace("/", "");
      alternatives.push(withoutSlash);
      alternatives.push(`CS.D.${withoutSlash}.CFD.IP`);
      alternatives.push(`CS.D.${withoutSlash}.MINI.IP`);
    } else if (symbol.length === 6 && !this.isKnownIndexSymbol(symbolUpper)) {
      // Only add slash pattern for forex pairs, not for index symbols
      const withSlash = `${symbol.substring(0, 3)}/${symbol.substring(3)}`;
      alternatives.push(withSlash);
    }

    // Add the original symbol if not already included
    if (!alternatives.includes(symbol)) {
      alternatives.unshift(symbol);
    }

    return [...new Set(alternatives)]; // Remove duplicates
  }

  /**
   * Check if a symbol is a known index symbol to avoid incorrect slash formatting
   */
  private isKnownIndexSymbol(symbolUpper: string): boolean {
    const indexSymbols = [
      "SPX500",
      "US500",
      "NAS100",
      "US100",
      "US30",
      "UK100",
      "GERMANY40",
      "DAX40",
      "FRANCE40",
      "CAC40",
      "JAPAN225",
      "NIKKEI225",
      "HONGKONG50",
      "ASX200",
      "FTSE100",
    ];
    return indexSymbols.includes(symbolUpper);
  }

  /**
   * Check if current time is within trading hours
   * @param openingHours Opening hours object from Capital.com API
   * @returns boolean - true if within trading hours
   */
  private isWithinTradingHours(openingHours: any): boolean {
    try {
      if (!openingHours || !openingHours.zone) {
        return true; // If no hours specified, assume always open (like crypto)
      }

      const now = new Date();
      const dayNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
      const currentDay = dayNames[now.getUTCDay()]; // Use UTC day since API uses UTC

      const todayHours = openingHours[currentDay];

      if (!todayHours || todayHours.length === 0) {
        // No trading hours for today (e.g., weekend for forex)
        return false;
      }

      // Get current time in minutes since midnight UTC
      const currentMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();

      // Check each trading session for today
      for (const session of todayHours) {
        if (this.isTimeInSession(currentMinutes, session)) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error("[BOT SERVICE] Error checking trading hours:", error);
      return true; // Default to allowing trading if there's an error
    }
  }

  /**
   * Check if current time is within a specific trading session
   * @param currentMinutes Current time in minutes since midnight UTC
   * @param session Trading session string like "09:30 - 16:00"
   * @returns boolean - true if within session
   */
  private isTimeInSession(currentMinutes: number, session: string): boolean {
    try {
      // Parse session string like "09:30 - 16:00" or "23:05 - 00:00"
      const [startStr, endStr] = session.split(" - ");

      const [startHour, startMin] = startStr.split(":").map(Number);
      const [endHour, endMin] = endStr.split(":").map(Number);

      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      // Handle overnight sessions (like "23:05 - 00:00")
      if (endMinutes < startMinutes) {
        // Session crosses midnight
        return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
      } else {
        // Normal session within same day
        return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
      }
    } catch (error) {
      console.error("[BOT SERVICE] Error parsing trading session:", session, error);
      return false;
    }
  }

  /**
   * Determine optimal order type based on market conditions and AI confidence
   * Delegated to BotTradingService for better separation of concerns
   */
  private determineOptimalOrderType(
    confidence: number,
    prediction: string,
    currentPrice: number,
    symbolData: any[]
  ): { orderType: "MARKET" | "LIMIT" | "STOP"; limitPrice?: number; reasoning: string } {
    return botTradingService.determineOptimalOrderType(confidence, prediction, currentPrice, symbolData);
  }

  /**
   * Calculate volatility from recent candles
   * @param candles Array of OHLCV candles
   * @returns Volatility as decimal (0.02 = 2%)
   */
  private calculateVolatility(candles: any[]): number {
    if (candles.length < 2) return 0.02; // Default 2%

    const returns = candles.slice(1).map((candle, index) => {
      const prevClose = candles[index].close;
      const currentClose = candle.close;
      return (currentClose - prevClose) / prevClose;
    });

    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;

    return Math.sqrt(variance);
  }

  /**
   * Calculate basic support and resistance levels
   * @param candles Array of OHLCV candles
   * @returns Object with support and resistance levels
   */
  private calculateSupportResistance(candles: any[]): { support: number; resistance: number } {
    if (candles.length < 10) {
      const currentPrice = candles[candles.length - 1]?.close || 100;
      return {
        support: currentPrice * 0.99,
        resistance: currentPrice * 1.01,
      };
    }

    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);

    // Simple approach: highest high and lowest low of recent period
    const resistance = Math.max(...highs);
    const support = Math.min(...lows);

    return { support, resistance };
  }

  /**
   * Calculate technical stop loss and take profit levels
   * Delegated to BotTradingService for better separation of concerns
   */
  private calculateTechnicalStopLossTakeProfit(
    symbolData: any[],
    direction: "BUY" | "SELL",
    currentPrice: number,
    timeframe: string,
    symbol: string
  ): { stopLoss: number; takeProfit: number; reasoning: string; atr: number } {
    return botTradingService.calculateTechnicalStopLossTakeProfit(symbolData, direction, currentPrice, timeframe, symbol);
  }

  /**
   * Calculate Average True Range (ATR) for dynamic stop placement
   * @param candles OHLCV candle data
   * @param period ATR period (typically 14)
   * @returns ATR value
   */
  private calculateATR(candles: any[], period: number = 14): number {
    if (candles.length < period + 1) {
      // Fallback for insufficient data
      const avgRange = candles.reduce((sum, candle) => sum + (candle.high - candle.low), 0) / candles.length;
      return avgRange;
    }

    const trueRanges: number[] = [];

    for (let i = 1; i < candles.length; i++) {
      const current = candles[i];
      const previous = candles[i - 1];

      const tr1 = current.high - current.low;
      const tr2 = Math.abs(current.high - previous.close);
      const tr3 = Math.abs(current.low - previous.close);

      const trueRange = Math.max(tr1, tr2, tr3);
      trueRanges.push(trueRange);
    }

    // Calculate ATR as Simple Moving Average of True Ranges
    const recentTrueRanges = trueRanges.slice(-period);
    return recentTrueRanges.reduce((sum, tr) => sum + tr, 0) / recentTrueRanges.length;
  }

  /**
   * Find swing highs and lows in the price data
   * @param candles OHLCV candle data
   * @param lookback Number of candles to look back for swing confirmation
   * @returns Object with arrays of swing highs and lows
   */
  private findSwingHighsLows(candles: any[], lookback: number = 5): { swingHighs: number[]; swingLows: number[] } {
    const swingHighs: number[] = [];
    const swingLows: number[] = [];

    if (candles.length < lookback * 2 + 1) {
      return { swingHighs: [], swingLows: [] };
    }

    for (let i = lookback; i < candles.length - lookback; i++) {
      const current = candles[i];

      // Check for swing high
      let isSwingHigh = true;
      for (let j = i - lookback; j <= i + lookback; j++) {
        if (j !== i && candles[j].high >= current.high) {
          isSwingHigh = false;
          break;
        }
      }
      if (isSwingHigh) {
        swingHighs.push(current.high);
      }

      // Check for swing low
      let isSwingLow = true;
      for (let j = i - lookback; j <= i + lookback; j++) {
        if (j !== i && candles[j].low <= current.low) {
          isSwingLow = false;
          break;
        }
      }
      if (isSwingLow) {
        swingLows.push(current.low);
      }
    }

    return { swingHighs, swingLows };
  }

  /**
   * Calculate precise support and resistance levels using multiple timeframe analysis
   * @param candles OHLCV candle data
   * @returns Object with support and resistance levels
   */
  private calculatePreciseSupportResistance(candles: any[]): { support: number; resistance: number } {
    if (candles.length < 20) {
      const lastCandle = candles[candles.length - 1];
      return {
        support: lastCandle.low * 0.99,
        resistance: lastCandle.high * 1.01,
      };
    }

    // Collect all significant levels
    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);
    const closes = candles.map((c) => c.close);

    // Calculate pivot levels
    const recentCandles = candles.slice(-20);
    const recentHighs = recentCandles.map((c) => c.high);
    const recentLows = recentCandles.map((c) => c.low);

    // Support: strongest recent low or pivot support
    const lowestLow = Math.min(...recentLows);
    const avgLow = recentLows.reduce((sum, low) => sum + low, 0) / recentLows.length;
    const support = Math.max(lowestLow, avgLow * 0.999); // Slightly below average low

    // Resistance: strongest recent high or pivot resistance
    const highestHigh = Math.max(...recentHighs);
    const avgHigh = recentHighs.reduce((sum, high) => sum + high, 0) / recentHighs.length;
    const resistance = Math.min(highestHigh, avgHigh * 1.001); // Slightly above average high

    return { support, resistance };
  }

  /**
   * Get ATR multiplier based on timeframe and purpose
   * @param timeframe Chart timeframe
   * @param purpose "stop" or "profit"
   * @returns ATR multiplier
   */
  private getATRMultiplier(timeframe: string, purpose: "stop" | "profit"): number {
    const multipliers: Record<string, { stop: number; profit: number }> = {
      M1: { stop: 0.8, profit: 1.5 }, // 1-minute: Very tight for scalping
      M5: { stop: 1.0, profit: 2.0 }, // 5-minute: Tight scalping
      M15: { stop: 1.5, profit: 2.5 }, // 15-minute: Short-term swing
      M30: { stop: 2.0, profit: 3.5 }, // 30-minute: Moderate swing
      H1: { stop: 2.5, profit: 4.0 }, // 1-hour: Swing trading
      H4: { stop: 3.0, profit: 5.0 }, // 4-hour: Position trading
      D1: { stop: 4.0, profit: 6.0 }, // Daily: Long-term position
    };

    const config = multipliers[timeframe] || multipliers.M15; // Default to M15 instead of M1
    return config[purpose];
  }

  /**
   * Calculate position size adjusted for timeframe-specific risk
   * Delegated to BotPositionService for better separation of concerns
   */
  private calculateTimeframePositionSize(timeframe: string, basePositionSize: number, accountBalance: number, riskPercentage: number): number {
    return botPositionService.calculateTimeframePositionSize(timeframe, basePositionSize, accountBalance, riskPercentage);
  }

  /**
   * Get maximum allowed drawdown percentage for different timeframes
   * Delegated to BotPositionService for better separation of concerns
   */
  private getMaxDrawdownForTimeframe(timeframe: string): number {
    return botPositionService.getMaxDrawdownForTimeframe(timeframe);
  }

  /**
   * Get minimum broker distance for stop loss or take profit
   * Delegated to BotMarketService for better separation of concerns
   */
  private getMinimumBrokerDistance(symbol: string, type: "stopLoss" | "takeProfit"): number {
    return botMarketService.getMinimumBrokerDistance(symbol, type);
  }

  /**
   * Comprehensive trade management checks to prevent overtrading and ensure proper position management
   */
  private async performTradeManagementChecks(botId: string, symbol: string, prediction: string, portfolioContext: any): Promise<{ allowed: boolean; reason: string }> {
    try {
      loggerService.info(`🔍 [TRADE MANAGEMENT] Performing comprehensive checks for bot ${botId}, symbol ${symbol}, prediction ${prediction}`);

      // Get bot details
      const bot = await this.getBotByIdSystem(botId);
      if (!bot) {
        return { allowed: false, reason: "Bot not found" };
      }

      // 1. CHECK MAXIMUM SIMULTANEOUS TRADES LIMIT
      const currentOpenTrades = portfolioContext.openTrades || [];
      const maxTrades = bot.maxSimultaneousTrades || 3;

      loggerService.info(`🔍 [TRADE MANAGEMENT] Current open trades: ${currentOpenTrades.length}/${maxTrades}`);

      if (currentOpenTrades.length >= maxTrades) {
        return {
          allowed: false,
          reason: `Maximum simultaneous trades reached (${currentOpenTrades.length}/${maxTrades}). Close existing positions first.`,
        };
      }

      // 2. CHECK FOR EXISTING POSITION ON SAME SYMBOL
      const existingPositionsForSymbol = currentOpenTrades.filter((trade: any) => trade.symbol === symbol || trade.symbol === bot.tradingPairSymbol);

      loggerService.info(`🔍 [TRADE MANAGEMENT] Existing positions for ${symbol}: ${existingPositionsForSymbol.length}`);

      if (existingPositionsForSymbol.length > 0) {
        const existingDirection = existingPositionsForSymbol[0].direction;

        // Allow opposing trades for hedging if bot strategy allows it
        if (prediction.toUpperCase() !== existingDirection) {
          loggerService.info(`🔍 [TRADE MANAGEMENT] Found opposing position (existing: ${existingDirection}, new: ${prediction}). Checking if hedging is allowed...`);

          // For now, prevent opposing positions to avoid over-exposure
          return {
            allowed: false,
            reason: `Already have ${existingDirection} position on ${symbol}. Cannot open opposing ${prediction} position (risk management).`,
          };
        } else {
          // Same direction - prevent duplicate entries unless strategy specifically allows pyramiding
          return {
            allowed: false,
            reason: `Already have ${existingDirection} position on ${symbol}. Avoiding duplicate entries.`,
          };
        }
      }

      // 3. CHECK MINIMUM TIME BETWEEN TRADES (COOL-DOWN PERIOD)
      const lastTradeTime = await this.getLastTradeTime(botId, symbol);
      const now = new Date();
      const timeSinceLastTrade = lastTradeTime ? now.getTime() - lastTradeTime.getTime() : Infinity;

      // Use bot's timeframe to determine minimum cooldown
      const timeframeMinutes = this.getTimeframeInMinutes(bot.timeframe || "1m");
      const minimumCooldownMs = timeframeMinutes * 60 * 1000 * 3; // 3 candles minimum for proper confirmation

      loggerService.info(`🔍 [TRADE MANAGEMENT] Time since last trade: ${timeSinceLastTrade}ms, required cooldown: ${minimumCooldownMs}ms`);

      if (timeSinceLastTrade < minimumCooldownMs) {
        const remainingCooldown = Math.ceil((minimumCooldownMs - timeSinceLastTrade) / 1000 / 60);
        return {
          allowed: false,
          reason: `Minimum trade interval not met. Wait ${remainingCooldown} minutes before next trade on ${symbol}.`,
        };
      }

      // 4. CHECK DAILY TRADE LIMITS
      const tradesThisHour = await this.getTradeCountSince(botId, new Date(now.getTime() - 60 * 60 * 1000));
      const tradesThisDay = await this.getTradeCountSince(botId, new Date(now.getTime() - 24 * 60 * 60 * 1000));

      const maxTradesPerHour = 3; // Conservative limit for overtrading prevention
      const maxTradesPerDay = 10; // Conservative daily limit

      loggerService.info(`🔍 [TRADE MANAGEMENT] Trades this hour: ${tradesThisHour}/${maxTradesPerHour}, today: ${tradesThisDay}/${maxTradesPerDay}`);

      if (tradesThisHour >= maxTradesPerHour) {
        return {
          allowed: false,
          reason: `Hourly trade limit reached (${tradesThisHour}/${maxTradesPerHour}). This prevents overtrading.`,
        };
      }

      if (tradesThisDay >= maxTradesPerDay) {
        return {
          allowed: false,
          reason: `Daily trade limit reached (${tradesThisDay}/${maxTradesPerDay}). Resume trading tomorrow.`,
        };
      }

      // 5. CHECK ACCOUNT BALANCE AND RISK EXPOSURE
      const accountBalance = portfolioContext.accountBalance || 0;
      const totalExposure = portfolioContext.totalExposure || 0;
      const maxExposurePercent = 50; // Max 50% account exposure

      loggerService.info(`🔍 [TRADE MANAGEMENT] Account balance: ${accountBalance}, total exposure: ${totalExposure}%`);

      if (totalExposure >= maxExposurePercent) {
        return {
          allowed: false,
          reason: `Maximum portfolio exposure reached (${totalExposure}%/${maxExposurePercent}%). Reduce existing positions first.`,
        };
      }

      // 6. CHECK MARKET CONDITIONS
      const isMarketSuitable = await this.checkMarketConditions(symbol);
      if (!isMarketSuitable.suitable) {
        return {
          allowed: false,
          reason: `Market conditions not suitable: ${isMarketSuitable.reason}`,
        };
      }

      // ALL CHECKS PASSED ✅
      loggerService.info(`✅ [TRADE MANAGEMENT] All checks passed. Trade execution approved for ${prediction} on ${symbol}`);

      return {
        allowed: true,
        reason: "All trade management checks passed",
      };
    } catch (error) {
      loggerService.error(`❌ [TRADE MANAGEMENT] Error during checks: ${error}`);
      return {
        allowed: false,
        reason: `Trade management error: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Get the last trade time for a bot and symbol
   * Delegated to BotPositionService for better separation of concerns
   */
  private async getLastTradeTime(botId: string, symbol: string): Promise<Date | null> {
    return await botPositionService.getLastTradeTime(botId, symbol);
  }

  /**
   * Get trade count since a specific date
   * Delegated to BotPositionService for better separation of concerns
   */
  private async getTradeCountSince(botId: string, since: Date): Promise<number> {
    return await botPositionService.getTradeCountSince(botId, since);
  }

  /**
   * Check market conditions for trading suitability
   * Delegated to BotMarketService for better separation of concerns
   */
  private async checkMarketConditions(symbol: string): Promise<{ suitable: boolean; reason: string }> {
    return await botMarketService.checkMarketConditions(symbol);
  }

  /**
   * Validate and adjust stop loss/take profit levels based on timeframe
   * Delegated to BotTradingService for better separation of concerns
   */
  private validateTimeframeStopLossTakeProfit(
    originalStopLoss: number,
    originalTakeProfit: number,
    currentPrice: number,
    direction: "BUY" | "SELL",
    timeframe: string,
    symbol: string
  ): { stopLoss: number; takeProfit: number } {
    return botTradingService.validateTimeframeStopLossTakeProfit(originalStopLoss, originalTakeProfit, currentPrice, direction, timeframe, symbol);
  }
}

export const botService = new BotService();
