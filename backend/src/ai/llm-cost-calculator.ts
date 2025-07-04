import { logger } from "../logger";

/**
 * 💰 LLM COST CALCULATOR
 * Tracks token usage and calculates costs for Professional Trading Committee
 */
export class LLMCostCalculator {
  // Current Gemini 2.0 Flash pricing (when it becomes GA) - CORRECTED FROM OFFICIAL TABLE
  private static readonly GEMINI_2_0_FLASH_PRICING = {
    input: 0.1 / 1_000_000, // $0.10 per million tokens (text/image/video)
    output: 0.4 / 1_000_000, // $0.40 per million tokens
    image: 0, // No additional charge - images are included in input token pricing
    imageGeneration: 0.039, // $0.039 per generated image (not used in our case)
  };

  // Estimated token usage per agent - UPDATED WITH MULTIMODAL CONSIDERATION
  private static readonly AGENT_TOKEN_ESTIMATES = {
    technicalAnalysis: {
      input: 1158, // Technical analysis prompt + candle data + chart image (258 tokens)
      output: 600, // Technical analysis response
    },
    portfolioRisk: {
      input: 700, // Portfolio risk assessment prompt (no image)
      output: 400, // Risk assessment response
    },
    marketIntelligence: {
      input: 600, // Market intelligence prompt (no image)
      output: 350, // Market intelligence response
    },
    temporalReasoning: {
      input: 750, // Temporal reasoning prompt (no image)
      output: 450, // Temporal reasoning response
    },
    tradingDecisionCoordinator: {
      input: 1200, // Decision coordinator prompt (includes all agent outputs)
      output: 800, // Final decision response
    },
  };

  // Image processing cost (images are included in input tokens)
  private static readonly IMAGE_TOKEN_COST = 258; // Typical tokens per image

  private static tokenUsageLog: {
    timestamp: Date;
    agent: string;
    inputTokens: number;
    outputTokens: number;
    hasImage: boolean;
    cost: number;
  }[] = [];

  /**
   * 🧮 Calculate estimated cost for a full Professional Trading Committee analysis
   */
  static calculateFullAnalysisCost(includeImage: boolean = true): {
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCost: number;
    breakdown: any;
    isCurrentlyFree: boolean;
  } {
    const agents = Object.keys(this.AGENT_TOKEN_ESTIMATES);
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCost = 0;
    const breakdown: any = {};

    // Calculate cost for each agent
    agents.forEach((agent) => {
      const agentKey = agent as keyof typeof this.AGENT_TOKEN_ESTIMATES;
      const estimate = this.AGENT_TOKEN_ESTIMATES[agentKey];

      const inputCost = estimate.input * this.GEMINI_2_0_FLASH_PRICING.input;
      const outputCost = estimate.output * this.GEMINI_2_0_FLASH_PRICING.output;
      const agentCost = inputCost + outputCost;

      totalInputTokens += estimate.input;
      totalOutputTokens += estimate.output;
      totalCost += agentCost;

      breakdown[agent] = {
        inputTokens: estimate.input,
        outputTokens: estimate.output,
        cost: agentCost,
        costFormatted: `$${agentCost.toFixed(6)}`,
      };
    });

    // Note: Image cost is now included in input token pricing
    if (includeImage) {
      breakdown.chartImage = {
        tokens: this.IMAGE_TOKEN_COST,
        cost: 0, // Already included in Technical Analysis Agent input tokens
        costFormatted: "$0.000000 (included in input tokens)",
        note: "Chart image tokens are included in Technical Analysis Agent input cost",
      };
    }

    return {
      totalInputTokens,
      totalOutputTokens,
      totalCost,
      breakdown,
      isCurrentlyFree: true, // Gemini 2.0 Flash is currently free
    };
  }

  /**
   * 📊 Log actual token usage for an agent
   */
  static logAgentTokenUsage(
    agent: string,
    inputTokens: number,
    outputTokens: number,
    hasImage: boolean = false,
  ): void {
    const inputCost = inputTokens * this.GEMINI_2_0_FLASH_PRICING.input;
    const outputCost = outputTokens * this.GEMINI_2_0_FLASH_PRICING.output;
    // Note: Image cost is now included in input token pricing
    const totalCost = inputCost + outputCost;

    this.tokenUsageLog.push({
      timestamp: new Date(),
      agent,
      inputTokens,
      outputTokens,
      hasImage,
      cost: totalCost,
    });

    const imageNote = hasImage ? " (includes image)" : "";
    logger.info(
      `💰 ${agent} - Tokens: ${inputTokens}in/${outputTokens}out${imageNote}, Cost: $${totalCost.toFixed(6)}`,
    );
  }

  /**
   * 📈 Get cost statistics for a time period
   */
  static getCostStatistics(hours: number = 24): {
    totalCost: number;
    totalAnalyses: number;
    avgCostPerAnalysis: number;
    totalTokens: number;
    breakdown: any;
  } {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    const recentLogs = this.tokenUsageLog.filter((log) => log.timestamp >= cutoffTime);

    const totalCost = recentLogs.reduce((sum, log) => sum + log.cost, 0);
    const totalTokens = recentLogs.reduce(
      (sum, log) => sum + log.inputTokens + log.outputTokens,
      0,
    );

    // Group by analysis (assuming 5 agents per analysis)
    const analysisGroups = Math.ceil(recentLogs.length / 5);
    const avgCostPerAnalysis = analysisGroups > 0 ? totalCost / analysisGroups : 0;

    // Agent breakdown
    const breakdown = recentLogs.reduce((acc, log) => {
      if (!acc[log.agent]) {
        acc[log.agent] = { calls: 0, cost: 0, tokens: 0 };
      }
      acc[log.agent].calls++;
      acc[log.agent].cost += log.cost;
      acc[log.agent].tokens += log.inputTokens + log.outputTokens;
      return acc;
    }, {} as any);

    return {
      totalCost,
      totalAnalyses: analysisGroups,
      avgCostPerAnalysis,
      totalTokens,
      breakdown,
    };
  }

  /**
   * 🎯 Estimate monthly cost based on trading frequency
   */
  static estimateMonthlyCost(
    analysesPerDay: number,
    includeImage: boolean = true,
  ): {
    dailyCost: number;
    monthlyCost: number;
    yearlyCost: number;
    breakdown: any;
  } {
    const singleAnalysisCost = this.calculateFullAnalysisCost(includeImage);
    const dailyCost = singleAnalysisCost.totalCost * analysesPerDay;
    const monthlyCost = dailyCost * 30;
    const yearlyCost = monthlyCost * 12;

    return {
      dailyCost,
      monthlyCost,
      yearlyCost,
      breakdown: {
        costPerAnalysis: singleAnalysisCost.totalCost,
        analysesPerDay,
        costPerAnalysisFormatted: `$${singleAnalysisCost.totalCost.toFixed(6)}`,
        dailyCostFormatted: `$${dailyCost.toFixed(4)}`,
        monthlyCostFormatted: `$${monthlyCost.toFixed(2)}`,
        yearlyCostFormatted: `$${yearlyCost.toFixed(2)}`,
        currentlyFree: singleAnalysisCost.isCurrentlyFree,
      },
    };
  }

  /**
   * 🔍 Analyze cost efficiency and provide optimization recommendations
   */
  static analyzeCostEfficiency(): {
    recommendations: string[];
    potentialSavings: number;
    optimizationTips: string[];
  } {
    const recommendations = [
      "Consider using Gemini 2.5 Flash-Lite for less critical analyses (50% cost savings)",
      "Implement token caching for repeated technical analysis prompts",
      "Optimize prompt length while maintaining analysis quality",
      "Consider batching multiple symbol analyses in single requests",
      "Monitor token usage patterns to identify optimization opportunities",
    ];

    const optimizationTips = [
      "Use more concise prompts without losing context",
      "Implement smart prompt templates with variable substitution",
      "Cache frequently used market data contexts",
      "Consider using different models for different agent types",
      "Implement cost-based circuit breakers for high-frequency trading",
    ];

    return {
      recommendations,
      potentialSavings: 0.5, // 50% potential savings with optimization
      optimizationTips,
    };
  }

  /**
   * 📋 Generate cost report
   */
  static generateCostReport(): string {
    const estimate = this.calculateFullAnalysisCost(true);
    const monthly = this.estimateMonthlyCost(10, true); // 10 analyses per day
    const efficiency = this.analyzeCostEfficiency();
    const stats = this.getCostStatistics(24);

    return `
🏛️ PROFESSIONAL TRADING COMMITTEE - COST ANALYSIS REPORT
=======================================================

 📊 CURRENT STATUS:
 • Model: Gemini 2.0 Flash
 • Status: FREE (Experimental Stage)
 • Future Input Cost: $0.10 per 1M tokens (text/image/video)
 • Future Output Cost: $0.40 per 1M tokens

💰 COST BREAKDOWN PER ANALYSIS:
• Technical Analysis Agent: $${estimate.breakdown.technicalAnalysis.costFormatted}
• Portfolio Risk Agent: $${estimate.breakdown.portfolioRisk.costFormatted}
• Market Intelligence Agent: $${estimate.breakdown.marketIntelligence.costFormatted}
• Temporal Reasoning Agent: $${estimate.breakdown.temporalReasoning.costFormatted}
• Trading Decision Coordinator: $${estimate.breakdown.tradingDecisionCoordinator.costFormatted}
• Chart Image Analysis: $${estimate.breakdown.chartImage.costFormatted}
• TOTAL PER ANALYSIS: $${estimate.totalCost.toFixed(6)}

📈 PROJECTED COSTS (10 analyses/day):
• Daily: ${monthly.breakdown.dailyCostFormatted}
• Monthly: ${monthly.breakdown.monthlyCostFormatted}
• Yearly: ${monthly.breakdown.yearlyCostFormatted}

🎯 OPTIMIZATION RECOMMENDATIONS:
${efficiency.recommendations.map((rec) => `• ${rec}`).join("\n")}

📊 RECENT USAGE (24h):
• Total Cost: $${stats.totalCost.toFixed(6)}
• Total Analyses: ${stats.totalAnalyses}
• Average Cost per Analysis: $${stats.avgCostPerAnalysis.toFixed(6)}
• Total Tokens: ${stats.totalTokens.toLocaleString()}

⚡ OPTIMIZATION TIPS:
${efficiency.optimizationTips.map((tip) => `• ${tip}`).join("\n")}
`;
  }
}
