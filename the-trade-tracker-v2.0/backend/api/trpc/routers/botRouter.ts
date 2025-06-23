import { z } from 'zod';
import { protectedProcedure, router } from '../index';
import { botService } from '../../../services/bot.service';
import { loggerService } from '../../../services/logger.service';

export const botRouter = router({
  createBot: protectedProcedure
    .input(
      z.object({
        strategyId: z.number(),
        brokerCredentialId: z.number(),
        name: z.string().optional(),
        symbol: z.string().optional(),
        timeframe: z.string().optional(),
        isActive: z.boolean().optional().default(false),
        isPaperTrading: z.boolean().optional().default(true),
        aiEnabled: z.boolean().optional().default(false),
        // TODO: Add other relevant fields like maxSimultaneousTrades, riskControls etc.
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const bot = await botService.createBot({
          ...input,
          userId: ctx.user.id, // Use string ID from Clerk
        });
        return bot;
      } catch (error: any) {
        loggerService.error('Error in createBot endpoint:', error.message);
        throw new Error(`Failed to create bot: ${error.message}`);
      }
    }),

  getUserBots: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await botService.getUserBots(ctx.user.id); // Use string ID
    } catch (error: any) {
      loggerService.error('Error fetching user bots:', error.message);
      throw new Error(`Failed to fetch user bots: ${error.message}`);
    }
  }),

  getBotById: protectedProcedure
    .input(z.object({ id: z.string() })) // Bot ID is a string
    .query(async ({ ctx, input }) => {
      try {
        const bot = await botService.getBotById(input.id, ctx.user.id); // Use string ID
        if (!bot) {
          loggerService.warn(`Bot not found with ID: ${input.id} for user ${ctx.user.id}`);
          throw new Error('Bot not found');
        }
        return bot;
      } catch (error: any) {
        loggerService.error(`Error fetching bot ${input.id}:`, error.message);
        throw new Error(`Failed to fetch bot: ${error.message}`);
      }
    }),

  updateBot: protectedProcedure
    .input(
      z.object({
        id: z.string(), // Bot ID is a string
        name: z.string().optional(),
        symbol: z.string().optional(),
        timeframe: z.string().optional(),
        strategyId: z.number().optional(),
        brokerCredentialId: z.number().optional(),
        isActive: z.boolean().optional(),
        isPaperTrading: z.boolean().optional(),
        aiEnabled: z.boolean().optional(),
        // TODO: Add other updatable fields
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, ...updateData } = input;
        const bot = await botService.updateBot(id, ctx.user.id, updateData); // Use string ID
        return bot;
      } catch (error: any) {
        loggerService.error(`Error updating bot ${input.id}:`, error.message);
        throw new Error(`Failed to update bot: ${error.message}`);
      }
    }),

  deleteBot: protectedProcedure
    .input(z.object({ id: z.string() })) // Bot ID is a string
    .mutation(async ({ ctx, input }) => {
      try {
        const success = await botService.deleteBot(input.id, ctx.user.id); // Use string ID
        if (!success) {
            loggerService.warn(`Failed to delete bot ${input.id} or bot not found for user ${ctx.user.id}`);
            throw new Error('Failed to delete bot or bot not found');
        }
        return { success: true, message: 'Bot deleted successfully' };
      } catch (error: any) {
        loggerService.error(`Error deleting bot ${input.id}:`, error.message);
        throw new Error(`Failed to delete bot: ${error.message}`);
      }
    }),

  toggleBotActive: protectedProcedure
    .input(z.object({ id: z.string() })) // Bot ID is a string
    .mutation(async ({ ctx, input }) => {
      try {
        const bot = await botService.toggleBotActive(input.id, ctx.user.id); // Use string ID
        return bot;
      } catch (error: any) {
        loggerService.error(
          `Error toggling active status for bot ${input.id}:`,
          error.message,
        );
        throw new Error(
          `Failed to toggle active status for bot: ${error.message}`,
        );
      }
    }),

  toggleAiTrading: protectedProcedure
    .input(z.object({ id: z.string() })) // Bot ID is a string
    .mutation(async ({ ctx, input }) => {
      try {
        const bot = await botService.toggleAiTrading(input.id, ctx.user.id); // Use string ID
        return bot;
      } catch (error: any) {
        loggerService.error(
          `Error toggling AI trading for bot ${input.id}:`,
          error.message,
        );
        throw new Error(`Failed to toggle AI trading for bot: ${error.message}`);
      }
    }),

  runBotEvaluation: protectedProcedure
    .input(
      z.object({
        botId: z.string(), // Bot ID is string, named botId in input schema
        chartData: z.any().optional(), // Or a more specific schema if available
        positionData: z.any().optional(), // Or a more specific schema
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // The botService.createEvaluation method handles the logic
        const evaluation = await botService.createEvaluation(
          input.botId, // Use input.botId as defined in schema
          ctx.user.id, // Pass the string user ID from Clerk
          input.chartData,
          input.positionData,
        );
        return evaluation;
      } catch (error: any) {
        loggerService.error(
          `Error running evaluation for bot ${input.botId}:`,
          error.message,
        );
        throw new Error(
          `Failed to run evaluation for bot: ${error.message}`,
        );
      }
    }),

  getBotEvaluations: protectedProcedure
    .input(
      z.object({
        botId: z.string(), // Bot ID is string, named botId in input schema
        limit: z.number().optional().default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const evaluations = await botService.getBotEvaluations(
          input.botId, // Use input.botId as defined in schema
          ctx.user.id, // Pass the string user ID from Clerk
          input.limit,
        );
        return evaluations;
      } catch (error: any) {
        loggerService.error(
          `Error fetching evaluations for bot ${input.botId}:`,
          error.message,
        );
        throw new Error(
          `Failed to fetch evaluations for bot: ${error.message}`,
        );
      }
    }),
});
