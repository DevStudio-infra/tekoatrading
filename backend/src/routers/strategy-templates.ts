import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc";
import { StrategyTemplateService } from "../services/strategy-template.service";

const strategyTemplateService = new StrategyTemplateService();

export const strategyTemplatesRouter = router({
  getAll: publicProcedure.query(async () => {
    return await strategyTemplateService.getAllTemplates();
  }),

  getByCategory: publicProcedure.query(async () => {
    return await strategyTemplateService.getTemplatesByCategory();
  }),

  getById: publicProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    return await strategyTemplateService.getTemplateById(input.id);
  }),

  createFromTemplate: protectedProcedure
    .input(
      z.object({
        templateId: z.string(),
        customizations: z.object({
          name: z.string().optional(),
          description: z.string().optional(),
          minRiskPerTrade: z.number().optional(),
          maxRiskPerTrade: z.number().optional(),
          confidenceThreshold: z.number().optional(),
          indicatorParams: z.record(z.record(z.any())).optional(),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await strategyTemplateService.createStrategyFromTemplate(
        input.templateId,
        input.customizations,
        ctx.user.id, // Get user ID from authenticated context
      );
    }),

  seedTemplates: publicProcedure.mutation(async () => {
    return await strategyTemplateService.seedPredefinedStrategies();
  }),

  getSupportedIndicators: publicProcedure.query(async () => {
    return await strategyTemplateService.getSupportedIndicators();
  }),

  validateTemplate: publicProcedure
    .input(z.object({ templateId: z.string() }))
    .query(async ({ input }) => {
      const template = await strategyTemplateService.getTemplateById(input.templateId);
      if (!template) {
        throw new Error("Template not found");
      }
      return await strategyTemplateService.validateTemplateIndicators(template);
    }),
});
