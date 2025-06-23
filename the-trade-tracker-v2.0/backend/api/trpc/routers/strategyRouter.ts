import { z } from 'zod';
import { protectedProcedure, router } from '../index';
import { strategyService } from '../../../services/strategy.service';

export const strategyRouter = router({
  // Create a new strategy
  createStrategy: protectedProcedure
    .input(z.object({
      name: z.string(),
      description: z.string().optional(),
      timeframes: z.array(z.string()),
      indicators: z.array(
        z.object({
          type: z.string(),
          params: z.record(z.any()).optional(),
          color: z.string().optional(),
        })
      ).optional(),
      entryConditions: z.array(z.any()).optional(),
      exitConditions: z.array(z.any()).optional(),
      riskControls: z.object({
        maxDrawdown: z.number().optional(),
        trailingStopLoss: z.number().optional(),
        takeProfitLevel: z.number().optional(),
      }).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) {
        throw new Error('Unauthorized');
      }
      
      // Process indicators to ensure MACD components are properly split
      // This is important for chart rendering based on the memory about MACD
      const processedIndicators = input.indicators?.map(indicator => {
        if (indicator.type === 'macd') {
          // Split MACD into its component parts for better visualization
          return {
            ...indicator,
            components: [
              { type: 'macd_line', params: indicator.params },
              { type: 'macd_signal', params: indicator.params },
              { type: 'macd_histogram', params: indicator.params }
            ]
          };
        }
        return indicator;
      }) || [];
      
      // Call the service with properly typed parameters
      const strategy = await strategyService.createStrategy({
        userId: String(ctx.user.id), // Ensure userId is a string
        name: input.name,
        description: input.description || null,
        timeframes: input.timeframes,
        indicators: processedIndicators,
        entryConditions: input.entryConditions || [],
        exitConditions: input.exitConditions || [],
        riskControls: input.riskControls || { maxDrawdown: 5, trailingStopLoss: 2, takeProfitLevel: 3 },
      });
      
      return strategy;
    }),
  
  // Get all strategies for the current user
  getUserStrategies: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.user) {
        throw new Error('Unauthorized');
      }
      
      return await strategyService.getUserStrategies(String(ctx.user.id));
    }),
  
  // Get a strategy by ID
  getStrategyById: protectedProcedure
    .input(z.object({
      id: z.string()
    }))
    .query(async ({ input, ctx }) => {
      if (!ctx.user) {
        throw new Error('Unauthorized');
      }
      
      const strategy = await strategyService.getStrategyById(String(input.id), String(ctx.user.id));
      
      if (!strategy) {
        throw new Error('Strategy not found');
      }
      
      return strategy;
    }),
  
  // Update a strategy
  updateStrategy: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      description: z.string().nullable().optional(),
      timeframes: z.array(z.string()).optional(),
      indicators: z.array(
        z.object({
          type: z.string(),
          params: z.record(z.any()).optional(),
          color: z.string().optional(),
        })
      ).optional(),
      entryConditions: z.array(z.any()).optional(),
      exitConditions: z.array(z.any()).optional(),
      riskControls: z.object({
        maxDrawdown: z.number().optional(),
        trailingStopLoss: z.number().optional(),
        takeProfitLevel: z.number().optional(),
      }).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) {
        throw new Error('Unauthorized');
      }
      
      const { id, ...updates } = input;
      
      // Process indicators to ensure MACD components are properly split
      if (updates.indicators) {
        updates.indicators = updates.indicators.map(indicator => {
          if (indicator.type === 'macd') {
            // Split MACD into its component parts for better visualization
            return {
              ...indicator,
              components: [
                { type: 'macd_line', params: indicator.params },
                { type: 'macd_signal', params: indicator.params },
                { type: 'macd_histogram', params: indicator.params }
              ]
            };
          }
          return indicator;
        });
      }
      
      // Convert the updates to a format the strategy service expects
      // This fixes the type mismatch error with null vs undefined
      const processedUpdates = {
        ...updates,
        description: updates.description === null ? null : updates.description || undefined
      };
      
      const updatedStrategy = await strategyService.updateStrategy(String(id), String(ctx.user.id), processedUpdates);
      
      if (!updatedStrategy) {
        throw new Error('Strategy not found');
      }
      
      return updatedStrategy;
    }),
  
  // Delete a strategy
  deleteStrategy: protectedProcedure
    .input(z.object({
      id: z.string()
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) {
        throw new Error('Unauthorized');
      }
      
      const deleted = await strategyService.deleteStrategy(String(input.id), String(ctx.user.id));
      
      if (!deleted) {
        throw new Error('Strategy not found');
      }
      
      return { success: true };
    }),
  
  // Duplicate a strategy
  duplicateStrategy: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) {
        throw new Error('Unauthorized');
      }
      
      // Ensure we have a name for the duplicated strategy
      const newName = input.name || `Copy of Strategy ${input.id}`;
      
      const duplicatedStrategy = await strategyService.duplicateStrategy(
        String(input.id), 
        String(ctx.user.id),
        newName
      );
      
      if (!duplicatedStrategy) {
        throw new Error('Strategy not found');
      }
      
      return duplicatedStrategy;
    }),
});
