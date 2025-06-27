import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import fsPromises from "fs/promises";

const prisma = new PrismaClient();

export class StrategyTemplateService {
  /**
   * Load predefined strategies from JSON file and seed database
   */
  async seedPredefinedStrategies(): Promise<void> {
    try {
      console.log("🌱 Seeding predefined strategy templates...");

      // Load strategies from JSON file
      const strategiesPath = path.join(__dirname, "../../data/predefined-strategies.json");
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

          console.log(`✅ Created strategy template: ${strategyData.name}`);
        } else {
          console.log(`⏭️ Strategy template already exists: ${strategyData.name}`);
        }
      }

      console.log("✅ Strategy template seeding completed!");
    } catch (error) {
      console.error("❌ Error seeding strategy templates:", error);
      throw error;
    }
  }

  /**
   * Get all strategy templates
   */
  async getAllTemplates() {
    return await prisma.strategyTemplate.findMany({
      where: { isActive: true },
      orderBy: [{ usageCount: "desc" }, { createdAt: "desc" }],
    });
  }

  /**
   * Get templates by category
   */
  async getTemplatesByCategory() {
    const templates = await this.getAllTemplates();

    return {
      scalping: templates.filter((t) => t.category === "scalping"),
      day_trade: templates.filter((t) => t.category === "day_trade"),
      swing_trade: templates.filter((t) => t.category === "swing_trade"),
    };
  }

  /**
   * Get template by ID
   */
  async getTemplateById(id: string) {
    return await prisma.strategyTemplate.findUnique({
      where: { id },
    });
  }

  /**
   * Create strategy from template
   */
  async createStrategyFromTemplate(templateId: string, customizations: any, userId: string) {
    const template = await this.getTemplateById(templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    // Update usage count
    await prisma.strategyTemplate.update({
      where: { id: templateId },
      data: { usageCount: { increment: 1 } },
    });

    // Apply indicator parameter customizations if provided
    let indicators = template.indicators;
    if (customizations.indicatorParams && Array.isArray(template.indicators)) {
      indicators = (template.indicators as any[]).map((indicator: any, index: number) => {
        const key = `${indicator.type}_${index}`;
        const customParams = customizations.indicatorParams[key];
        if (customParams) {
          return {
            ...indicator,
            params: { ...indicator.params, ...customParams },
          };
        }
        return indicator;
      });
    }

    // Create strategy with template data and customizations
    const strategyData = {
      name: customizations.name || template.name,
      description: customizations.description || template.description,
      indicators: JSON.stringify(indicators),
      parameters: JSON.stringify({
        riskManagement: template.riskManagement,
        minRiskPerTrade: customizations.minRiskPerTrade || template.minRiskPerTrade,
        maxRiskPerTrade: customizations.maxRiskPerTrade || template.maxRiskPerTrade,
        confidenceThreshold: customizations.confidenceThreshold || template.confidenceThreshold,
      }),
      isActive: true,
      userId,
    };

    // Create the strategy in the database
    const strategy = await prisma.strategy.create({
      data: strategyData,
    });

    return strategy;
  }

  /**
   * Get supported indicators from chart engine
   */
  async getSupportedIndicators() {
    try {
      // Try to fetch from chart engine if available
      const chartEngineUrl = process.env.CHART_ENGINE_URL || "http://localhost:8001";

      try {
        const response = await fetch(`${chartEngineUrl}/supported-indicators`);
        if (response.ok) {
          const data = (await response.json()) as { indicators: any[] };
          return data.indicators.map((ind: any) => ({
            name: ind.name,
            displayName: ind.display_name,
            params: ind.params,
            defaults: ind.defaults,
            panel: ind.panel,
          }));
        }
      } catch (fetchError) {
        console.warn("Could not fetch from chart engine, using fallback list");
      }

      // Fallback to hardcoded list if chart engine is not available
      return [
        {
          name: "sma",
          displayName: "Simple Moving Average",
          params: ["period", "color"],
          defaults: { period: 20, color: "blue" },
          panel: "main",
        },
        {
          name: "ema",
          displayName: "Exponential Moving Average",
          params: ["period", "color"],
          defaults: { period: 20, color: "red" },
          panel: "main",
        },
        {
          name: "wma",
          displayName: "Weighted Moving Average",
          params: ["period", "color"],
          defaults: { period: 20, color: "green" },
          panel: "main",
        },
        {
          name: "rsi",
          displayName: "Relative Strength Index",
          params: ["period", "color"],
          defaults: { period: 14, color: "purple" },
          panel: "oscillator",
        },
        {
          name: "macd",
          displayName: "MACD",
          params: ["fast", "slow", "signal"],
          defaults: { fast: 12, slow: 26, signal: 9 },
          panel: "oscillator",
        },
        {
          name: "bollinger",
          displayName: "Bollinger Bands",
          params: ["period", "std_dev"],
          defaults: { period: 20, std_dev: 2 },
          panel: "main",
        },
        {
          name: "atr",
          displayName: "Average True Range",
          params: ["period", "color"],
          defaults: { period: 14, color: "brown" },
          panel: "oscillator",
        },
        {
          name: "stochastic",
          displayName: "Stochastic Oscillator",
          params: ["k_period", "d_period"],
          defaults: { k_period: 14, d_period: 3 },
          panel: "oscillator",
        },
        {
          name: "vwap",
          displayName: "Volume Weighted Average Price",
          params: ["color"],
          defaults: { color: "orange" },
          panel: "main",
        },
        {
          name: "volume",
          displayName: "Volume",
          params: ["color"],
          defaults: { color: "lightblue" },
          panel: "main",
        },
        {
          name: "cci",
          displayName: "Commodity Channel Index",
          params: ["period", "color"],
          defaults: { period: 20, color: "cyan" },
          panel: "oscillator",
        },
        {
          name: "williams_r",
          displayName: "Williams %R",
          params: ["period", "color"],
          defaults: { period: 14, color: "magenta" },
          panel: "oscillator",
        },
        {
          name: "adx",
          displayName: "Average Directional Index",
          params: ["period", "color"],
          defaults: { period: 14, color: "darkred" },
          panel: "oscillator",
        },
        {
          name: "psar",
          displayName: "Parabolic SAR",
          params: ["af_initial", "af_max", "color"],
          defaults: { af_initial: 0.02, af_max: 0.2, color: "yellow" },
          panel: "main",
        },
      ];
    } catch (error) {
      console.error("Error getting supported indicators:", error);
      return [];
    }
  }

  /**
   * Validate template indicators against available chart indicators
   */
  async validateTemplateIndicators(template: any) {
    const supportedIndicators = await this.getSupportedIndicators();
    const supportedIndicatorNames = supportedIndicators.map((ind) => ind.name.toLowerCase());

    const templateIndicators =
      template.indicators?.map((ind: any) => ind.type?.toLowerCase()) || [];

    const missingIndicators = templateIndicators.filter(
      (ind: string) => !supportedIndicatorNames.includes(ind),
    );

    const availableIndicators = templateIndicators.filter((ind: string) =>
      supportedIndicatorNames.includes(ind),
    );

    return {
      valid: missingIndicators.length === 0,
      missingIndicators,
      availableIndicators,
      supportedIndicators,
    };
  }
}

export const strategyTemplateService = new StrategyTemplateService();
