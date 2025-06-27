import { z } from "zod";
import { router, publicProcedure, protectedProcedure, debugProcedure } from "../trpc";
import { prisma } from "../prisma";
import { botEvaluationService } from "../services/bot-evaluation.service";
import { brokerIntegrationService } from "../services/broker-integration.service";
import { logger } from "../logger";
import { credentialsEncryption } from "../services/credentials-encryption.service";

// Enhanced validation schemas
const createBotSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  tradingPairSymbol: z.string().min(1),
  timeframe: z.enum(["M1", "M5", "M15", "M30", "H1", "H4", "D1"]).default("M1"),
  maxPositionSize: z.number().positive().default(100),
  riskPercentage: z.number().min(0.1).max(10).default(2),
  strategyId: z.string().optional(),
  brokerCredentialId: z.string().optional(),
  isAiTradingActive: z.boolean().default(false),
});

const updateBotSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  tradingPairSymbol: z.string().min(1).optional(),
  timeframe: z.enum(["M1", "M5", "M15", "M30", "H1", "H4", "D1"]).optional(),
  maxPositionSize: z.number().positive().optional(),
  riskPercentage: z.number().min(0.1).max(10).optional(),
  isActive: z.boolean().optional(),
  isAiTradingActive: z.boolean().optional(),
  strategyId: z.string().optional(),
  brokerCredentialId: z.string().optional(),
});

const botEvaluationSchema = z.object({
  botId: z.string(),
  chartData: z
    .object({
      chartUrl: z.string().optional(),
      analysis: z.any().optional(),
    })
    .optional(),
});

const brokerCredentialSchema = z.object({
  name: z.string().min(1),
  broker: z.string().min(1),
  isDemo: z.boolean().default(true),
  credentials: z.object({
    apiKey: z.string().min(1),
    identifier: z.string().min(1),
    password: z.string().min(1),
  }),
});

export const botsRouter = router({
  // Debug endpoint to test authentication
  debugAuth: debugProcedure.query(async ({ ctx }) => {
    return {
      hasUser: !!ctx.user,
      userId: ctx.user?.id,
      clerkId: ctx.user?.clerkId,
      message: "Debug endpoint reached successfully",
    };
  }),

  // Simple test endpoint that logs everything
  testConnection: publicProcedure.query(async ({ ctx }) => {
    logger.info("TEST ENDPOINT: Request received!");
    logger.info("TEST ENDPOINT: User found:", !!ctx.user);
    logger.info("TEST ENDPOINT: Context keys:", Object.keys(ctx));

    return {
      success: true,
      hasUser: !!ctx.user,
      timestamp: new Date().toISOString(),
      message: "Test endpoint reached successfully",
    };
  }),

  // Get all bots for a user
  getAll: protectedProcedure.query(async ({ ctx }) => {
    try {
      const bots = await prisma.bot.findMany({
        where: { userId: ctx.user.id },
        include: {
          strategy: true,
          brokerCredential: {
            select: {
              id: true,
              name: true,
              broker: true,
              isDemo: true,
              isActive: true,
            },
          },
          _count: {
            select: {
              trades: true,
              evaluations: true,
              positions: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // Calculate additional metrics for each bot
      const botsWithMetrics = await Promise.all(
        bots.map(async (bot) => {
          const recentTrades = await prisma.trade.findMany({
            where: { botId: bot.id },
            orderBy: { createdAt: "desc" },
            take: 10,
          });

          const totalPnL = recentTrades.reduce((sum, trade) => sum + (trade.profitLoss || 0), 0);
          const winningTrades = recentTrades.filter((trade) => (trade.profitLoss || 0) > 0).length;
          const winRate = recentTrades.length > 0 ? (winningTrades / recentTrades.length) * 100 : 0;

          return {
            ...bot,
            metrics: {
              totalPnL,
              winRate: Math.round(winRate * 100) / 100,
              totalTrades: recentTrades.length,
              winningTrades,
            },
          };
        }),
      );

      return botsWithMetrics;
    } catch (error) {
      logger.error("Error fetching bots:", error);
      throw new Error("Failed to fetch bots");
    }
  }),

  // Get a specific bot by ID
  getById: publicProcedure
    .input(z.object({ id: z.string(), userId: z.string() }))
    .query(async ({ input }) => {
      try {
        const bot = await prisma.bot.findFirst({
          where: {
            id: input.id,
            userId: input.userId,
          },
          include: {
            strategy: true,
            brokerCredential: {
              select: {
                id: true,
                name: true,
                broker: true,
                isDemo: true,
                isActive: true,
              },
            },
            trades: {
              orderBy: { createdAt: "desc" },
              take: 20,
            },
            evaluations: {
              orderBy: { startDate: "desc" },
              take: 10,
            },
            positions: true,
          },
        });

        if (!bot) {
          throw new Error("Bot not found");
        }

        // Calculate detailed metrics
        const totalPnL = bot.trades.reduce((sum, trade) => sum + (trade.profitLoss || 0), 0);
        const winningTrades = bot.trades.filter((trade) => (trade.profitLoss || 0) > 0).length;
        const winRate = bot.trades.length > 0 ? (winningTrades / bot.trades.length) * 100 : 0;
        const avgTradeSize =
          bot.trades.length > 0
            ? bot.trades.reduce((sum, trade) => sum + trade.size, 0) / bot.trades.length
            : 0;

        return {
          ...bot,
          metrics: {
            totalPnL,
            winRate: Math.round(winRate * 100) / 100,
            totalTrades: bot.trades.length,
            winningTrades,
            avgTradeSize: Math.round(avgTradeSize * 100) / 100,
            activePositions: bot.positions.length,
          },
        };
      } catch (error) {
        logger.error("Error fetching bot:", error);
        throw new Error("Failed to fetch bot");
      }
    }),

  // Create a new bot
  create: publicProcedure
    .input(createBotSchema.extend({ userId: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const bot = await prisma.bot.create({
          data: {
            userId: input.userId,
            name: input.name,
            description: input.description,
            tradingPairSymbol: input.tradingPairSymbol,
            timeframe: input.timeframe,
            maxPositionSize: input.maxPositionSize,
            riskPercentage: input.riskPercentage,
            strategyId: input.strategyId,
            brokerCredentialId: input.brokerCredentialId,
            isAiTradingActive: input.isAiTradingActive,
          },
          include: {
            strategy: true,
            brokerCredential: {
              select: {
                id: true,
                name: true,
                broker: true,
                isDemo: true,
              },
            },
          },
        });

        logger.info(`Created new bot: ${bot.id} (${bot.name})`);
        return bot;
      } catch (error) {
        logger.error("Error creating bot:", error);
        throw new Error("Failed to create bot");
      }
    }),

  // Update a bot
  update: protectedProcedure.input(updateBotSchema).mutation(async ({ input, ctx }) => {
    try {
      const { id, ...updateData } = input;

      // Verify bot belongs to user
      const existingBot = await prisma.bot.findFirst({
        where: { id, userId: ctx.user.id },
      });

      if (!existingBot) {
        throw new Error("Bot not found or access denied");
      }

      const bot = await prisma.bot.update({
        where: { id },
        data: updateData,
        include: {
          strategy: true,
          brokerCredential: {
            select: {
              id: true,
              name: true,
              broker: true,
              isDemo: true,
            },
          },
        },
      });

      logger.info(`Updated bot: ${bot.id} (${bot.name})`);
      return bot;
    } catch (error) {
      logger.error("Error updating bot:", error);
      throw new Error("Failed to update bot");
    }
  }),

  // Delete a bot
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        await prisma.bot.delete({
          where: {
            id: input.id,
            userId: ctx.user.id, // Ensure the bot belongs to the user
          },
        });

        return { success: true };
      } catch (error) {
        logger.error("Error deleting bot:", error);
        throw new Error("Failed to delete bot");
      }
    }),

  // Toggle bot active status
  toggleActive: publicProcedure
    .input(z.object({ userId: z.string(), botId: z.string(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      try {
        const bot = await prisma.bot.update({
          where: {
            id: input.botId,
            userId: input.userId, // Ensure the bot belongs to the user
          },
          data: {
            isActive: input.isActive,
          },
        });

        return bot;
      } catch (error) {
        logger.error("Error toggling bot status:", error);
        throw new Error("Failed to toggle bot status");
      }
    }),

  // Toggle AI trading status
  toggleAiTrading: publicProcedure
    .input(z.object({ id: z.string(), userId: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const bot = await prisma.bot.findFirst({
          where: { id: input.id, userId: input.userId },
        });

        if (!bot) {
          throw new Error("Bot not found or access denied");
        }

        const updatedBot = await prisma.bot.update({
          where: { id: input.id },
          data: { isAiTradingActive: !bot.isAiTradingActive },
        });

        logger.info(`Toggled bot ${input.id} AI trading status to ${updatedBot.isAiTradingActive}`);
        return updatedBot;
      } catch (error) {
        logger.error("Error toggling AI trading status:", error);
        throw new Error("Failed to toggle AI trading status");
      }
    }),

  // Run bot evaluation
  evaluate: publicProcedure
    .input(z.object({ botId: z.string(), userId: z.string() }))
    .mutation(async ({ input }) => {
      try {
        // Verify bot belongs to user
        const bot = await prisma.bot.findFirst({
          where: { id: input.botId, userId: input.userId },
        });

        if (!bot) {
          throw new Error("Bot not found or access denied");
        }

        const result = await botEvaluationService.evaluateBot(input.botId);

        logger.info(
          `Bot evaluation completed for ${input.botId}: ${result.success ? "Success" : "Failed"}`,
        );
        return result;
      } catch (error) {
        logger.error("Error running bot evaluation:", error);
        throw new Error("Failed to run bot evaluation");
      }
    }),

  // Create manual evaluation
  createEvaluation: publicProcedure
    .input(botEvaluationSchema.extend({ userId: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const evaluation = await botEvaluationService.createEvaluation(
          input.botId,
          input.userId,
          input.chartData || {},
        );

        logger.info(`Created manual evaluation for bot ${input.botId}: ${evaluation.id}`);
        return evaluation;
      } catch (error) {
        logger.error("Error creating evaluation:", error);
        throw new Error("Failed to create evaluation");
      }
    }),

  // Get bot evaluations
  getEvaluations: publicProcedure
    .input(
      z.object({
        botId: z.string(),
        userId: z.string(),
        limit: z.number().min(1).max(100).default(10),
      }),
    )
    .query(async ({ input }) => {
      try {
        // Verify bot belongs to user
        const bot = await prisma.bot.findFirst({
          where: { id: input.botId, userId: input.userId },
        });

        if (!bot) {
          throw new Error("Bot not found or access denied");
        }

        const evaluations = await botEvaluationService.getBotEvaluations(input.botId, input.limit);

        return evaluations;
      } catch (error) {
        logger.error("Error fetching evaluations:", error);
        throw new Error("Failed to fetch evaluations");
      }
    }),

  // Get bot trades
  getTrades: publicProcedure
    .input(
      z.object({
        botId: z.string(),
        userId: z.string(),
        limit: z.number().min(1).max(100).default(20),
      }),
    )
    .query(async ({ input }) => {
      try {
        // Verify bot belongs to user
        const bot = await prisma.bot.findFirst({
          where: { id: input.botId, userId: input.userId },
        });

        if (!bot) {
          throw new Error("Bot not found or access denied");
        }

        const trades = await prisma.trade.findMany({
          where: { botId: input.botId },
          orderBy: { createdAt: "desc" },
          take: input.limit,
          include: {
            evaluation: {
              select: {
                id: true,
                decision: true,
                confidence: true,
                reasoning: true,
              },
            },
          },
        });

        return trades;
      } catch (error) {
        logger.error("Error fetching bot trades:", error);
        throw new Error("Failed to fetch bot trades");
      }
    }),

  // Get bot positions
  getPositions: publicProcedure
    .input(z.object({ botId: z.string(), userId: z.string() }))
    .query(async ({ input }) => {
      try {
        // Verify bot belongs to user
        const bot = await prisma.bot.findFirst({
          where: { id: input.botId, userId: input.userId },
          include: {
            brokerCredential: true,
          },
        });

        if (!bot) {
          throw new Error("Bot not found or access denied");
        }

        // Get positions from database
        const dbPositions = await prisma.position.findMany({
          where: { botId: input.botId },
        });

        // If broker credentials are available, get live positions
        let livePositions: any[] = [];
        if (bot.brokerCredential && bot.brokerCredential.credentials) {
          try {
            const credentials = credentialsEncryption.decryptCredentials(
              bot.brokerCredential.credentials,
            );
            livePositions = await brokerIntegrationService.getOpenPositions({
              apiKey: credentials.apiKey,
              identifier: credentials.identifier,
              password: credentials.password,
              isDemo: bot.brokerCredential.isDemo,
            });
          } catch (error) {
            logger.warn("Failed to fetch live positions:", error);
          }
        }

        return {
          dbPositions,
          livePositions,
        };
      } catch (error) {
        logger.error("Error fetching bot positions:", error);
        throw new Error("Failed to fetch bot positions");
      }
    }),

  // Create broker credential
  createBrokerCredential: protectedProcedure
    .input(brokerCredentialSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        // Test connection first
        const connectionTest = await brokerIntegrationService.testConnection({
          apiKey: input.credentials.apiKey,
          identifier: input.credentials.identifier,
          password: input.credentials.password,
          isDemo: input.isDemo,
        });

        if (!connectionTest.success) {
          throw new Error(`Broker connection failed: ${connectionTest.error}`);
        }

        const credential = await prisma.brokerCredential.create({
          data: {
            userId: ctx.user.id,
            name: input.name,
            broker: input.broker,
            isDemo: input.isDemo,
            credentials: credentialsEncryption.encryptCredentials(input.credentials), // Encrypt credentials
          },
        });

        logger.info(`Created broker credential: ${credential.id} (${credential.name})`);
        return {
          ...credential,
          credentials: undefined, // Don't return credentials in response
          connectionTest: connectionTest.accountInfo,
        };
      } catch (error) {
        logger.error("Error creating broker credential:", error);
        throw new Error("Failed to create broker credential");
      }
    }),

  // Get broker credentials
  getBrokerCredentials: protectedProcedure.query(async ({ ctx }) => {
    try {
      const credentials = await prisma.brokerCredential.findMany({
        where: { userId: ctx.user.id },
        select: {
          id: true,
          name: true,
          broker: true,
          isDemo: true,
          isActive: true,
          lastUsed: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return credentials;
    } catch (error) {
      logger.error("Error fetching broker credentials:", error);
      throw new Error("Failed to fetch broker credentials");
    }
  }),

  // Test broker connection
  testBrokerConnection: protectedProcedure
    .input(
      z.object({
        credentialId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const credential = await prisma.brokerCredential.findFirst({
          where: {
            id: input.credentialId,
            userId: ctx.user.id,
          },
        });

        if (!credential) {
          throw new Error("Broker credential not found");
        }

        const credentials = credentialsEncryption.decryptCredentials(credential.credentials);
        const result = await brokerIntegrationService.testConnection({
          apiKey: credentials.apiKey,
          identifier: credentials.identifier,
          password: credentials.password,
          isDemo: credential.isDemo,
        });

        if (result.success) {
          // Update last used timestamp
          await prisma.brokerCredential.update({
            where: { id: credential.id },
            data: { lastUsed: new Date() },
          });
        }

        return result;
      } catch (error) {
        logger.error("Error testing broker connection:", error);
        throw new Error("Failed to test broker connection");
      }
    }),
});
