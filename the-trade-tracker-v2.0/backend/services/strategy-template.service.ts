import { prisma } from "../utils/prisma";
import { loggerService } from "./logger.service";
import fs from "fs";
import path from "path";

export interface StrategyTemplateData {
  name: string;
  category: string;
  description: string;
  shortDescription: string;
  indicators: any[];
  timeframes: string[];
  entryConditions: string[];
  exitConditions: string[];
  riskManagement: any;
  minRiskPerTrade: number;
  maxRiskPerTrade: number;
  confidenceThreshold: number;
  winRateExpected?: number;
  riskRewardRatio?: number;
  complexity: string;
  marketCondition: string;
}

export class StrategyTemplateService {
  /**
   * Load predefined strategies from JSON file and seed database
   */
  async seedPredefinedStrategies(): Promise<void> {
    try {
      loggerService.info("🌱 Seeding predefined strategy templates...");

      // Load strategies from JSON file
      const strategiesPath = path.join(__dirname, "../data/predefined-strategies.json");
      const strategiesData = JSON.parse(fs.readFileSync(strategiesPath, "utf-8"));

      for (const strategyData of strategiesData.strategies) {
        // Check if strategy template already exists
        const existing = await prisma.strategyTemplate.findFirst({
          where: { name: strategyData.name },
        });

        if (!existing) {
          await prisma.strategyTemplate.create({
            data: {
              name: strategyData.name,
              category: strategyData.category,
              description: strategyData.description,
              shortDescription: strategyData.shortDescription,
              indicators: strategyData.indicators,
              timeframes: strategyData.timeframes,
              entryConditions: strategyData.entryConditions,
              exitConditions: strategyData.exitConditions,
              riskManagement: strategyData.riskManagement,
              minRiskPerTrade: strategyData.minRiskPerTrade,
              maxRiskPerTrade: strategyData.maxRiskPerTrade,
              confidenceThreshold: strategyData.confidenceThreshold,
              winRateExpected: strategyData.winRateExpected,
              riskRewardRatio: strategyData.riskRewardRatio,
              complexity: strategyData.complexity,
              marketCondition: strategyData.marketCondition,
            },
          });

          loggerService.info(`✅ Created strategy template: ${strategyData.name}`);
        } else {
          loggerService.info(`⏭️ Strategy template already exists: ${strategyData.name}`);
        }
      }

      loggerService.info("🎉 Predefined strategy templates seeded successfully!");
    } catch (error) {
      loggerService.error("❌ Error seeding predefined strategies:", error);
      throw error;
    }
  }

  /**
   * Get all available strategy templates
   */
  async getAllTemplates(filters?: { category?: string; complexity?: string; marketCondition?: string }) {
    try {
      const where: any = { isActive: true };

      if (filters?.category) {
        where.category = filters.category;
      }
      if (filters?.complexity) {
        where.complexity = filters.complexity;
      }
      if (filters?.marketCondition) {
        where.marketCondition = filters.marketCondition;
      }

      const templates = await prisma.strategyTemplate.findMany({
        where,
        orderBy: [
          { usageCount: "desc" }, // Most popular first
          { name: "asc" },
        ],
      });

      return templates;
    } catch (error) {
      loggerService.error("Error fetching strategy templates:", error);
      throw error;
    }
  }

  /**
   * Get strategy template by ID
   */
  async getTemplateById(templateId: string) {
    try {
      const template = await prisma.strategyTemplate.findUnique({
        where: { id: templateId },
      });

      if (!template) {
        throw new Error("Strategy template not found");
      }

      return template;
    } catch (error) {
      loggerService.error(`Error fetching strategy template ${templateId}:`, error);
      throw error;
    }
  }

  /**
   * Create user strategy from template
   */
  async createStrategyFromTemplate(
    templateId: string,
    userId: string,
    customizations?: {
      name?: string;
      description?: string;
      minRiskPerTrade?: number;
      maxRiskPerTrade?: number;
      confidenceThreshold?: number;
    }
  ) {
    try {
      // Get the template
      const template = await this.getTemplateById(templateId);

      // Create user strategy based on template
      const strategy = await prisma.strategy.create({
        data: {
          userId,
          templateId: templateId,
          name: customizations?.name || `${template.name} (Custom)`,
          type: "template",
          category: template.category,
          description: customizations?.description || template.description,
          timeframes: template.timeframes as any,
          indicators: template.indicators as any,
          entryConditions: template.entryConditions as any,
          exitConditions: template.exitConditions as any,
          riskManagement: template.riskManagement as any,
          parameters: {
            // Legacy parameters field for backward compatibility
            indicators: template.indicators,
            entryConditions: template.entryConditions,
            exitConditions: template.exitConditions,
            riskManagement: template.riskManagement,
          } as any,
          minRiskPerTrade: customizations?.minRiskPerTrade || template.minRiskPerTrade,
          maxRiskPerTrade: customizations?.maxRiskPerTrade || template.maxRiskPerTrade,
          confidenceThreshold: customizations?.confidenceThreshold || template.confidenceThreshold,
        },
        include: {
          user: true,
        },
      });

      // Increment template usage count
      await prisma.strategyTemplate.update({
        where: { id: templateId },
        data: { usageCount: { increment: 1 } },
      });

      loggerService.info(`✅ Created strategy from template for user ${userId}: ${strategy.name}`);
      return strategy;
    } catch (error) {
      loggerService.error("Error creating strategy from template:", error);
      throw error;
    }
  }

  /**
   * Get strategy templates grouped by category
   */
  async getTemplatesByCategory() {
    try {
      const templates = await this.getAllTemplates();

      const grouped = templates.reduce((acc, template) => {
        if (!acc[template.category]) {
          acc[template.category] = [];
        }
        acc[template.category].push(template);
        return acc;
      }, {} as Record<string, any[]>);

      return {
        scalping: grouped.scalping || [],
        day_trade: grouped.day_trade || [],
        swing_trade: grouped.swing_trade || [],
      };
    } catch (error) {
      loggerService.error("Error grouping strategy templates:", error);
      throw error;
    }
  }

  /**
   * Search strategy templates
   */
  async searchTemplates(query: string) {
    try {
      const templates = await prisma.strategyTemplate.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
            { shortDescription: { contains: query, mode: "insensitive" } },
          ],
        },
        orderBy: [{ usageCount: "desc" }, { name: "asc" }],
      });

      return templates;
    } catch (error) {
      loggerService.error("Error searching strategy templates:", error);
      throw error;
    }
  }

  /**
   * Get template statistics
   */
  async getTemplateStats() {
    try {
      const stats = await prisma.strategyTemplate.groupBy({
        by: ["category", "complexity", "marketCondition"],
        _count: {
          id: true,
        },
        _sum: {
          usageCount: true,
        },
        where: {
          isActive: true,
        },
      });

      const totalTemplates = await prisma.strategyTemplate.count({
        where: { isActive: true },
      });

      const mostPopular = await prisma.strategyTemplate.findFirst({
        where: { isActive: true },
        orderBy: { usageCount: "desc" },
        select: { name: true, usageCount: true },
      });

      return {
        totalTemplates,
        mostPopular,
        categoryStats: stats,
      };
    } catch (error) {
      loggerService.error("Error getting template stats:", error);
      throw error;
    }
  }

  /**
   * Validate template indicators against available chart indicators
   */
  validateTemplateIndicators(template: any): {
    valid: boolean;
    missingIndicators: string[];
    supportedIndicators: string[];
  } {
    // List of supported indicators in our chart engine
    const supportedIndicators = [
      "sma",
      "ema",
      "wma",
      "bb",
      "bollingerbands",
      "macd",
      "rsi",
      "atr",
      "stochastic",
      "stoch",
      "vwap",
      "williams_r",
      "williamsr",
      "cci",
      "adx",
      "volume",
      "psar",
      "parabolicsar",
    ];

    const templateIndicators = template.indicators?.map((ind: any) => ind.type?.toLowerCase()) || [];

    const missingIndicators = templateIndicators.filter(
      (ind: string) =>
        !supportedIndicators.includes(ind) &&
        ind !== "fibonacci" && // Special handling needed
        ind !== "donchian" && // Needs implementation
        ind !== "heikin_ashi" && // Needs implementation
        ind !== "ichimoku" && // Has basic support
        ind !== "volume_profile" // Advanced feature
    );

    return {
      valid: missingIndicators.length === 0,
      missingIndicators,
      supportedIndicators: templateIndicators.filter((ind: string) => supportedIndicators.includes(ind)),
    };
  }
}

export const strategyTemplateService = new StrategyTemplateService();
