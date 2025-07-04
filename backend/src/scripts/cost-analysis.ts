#!/usr/bin/env node
import { LLMCostCalculator } from "../ai/llm-cost-calculator";

/**
 * 💰 LLM COST ANALYSIS CLI
 * Generate cost reports for the Professional Trading Committee
 */

function main() {
  console.log("🏛️ PROFESSIONAL TRADING COMMITTEE - COST ANALYSIS");
  console.log("=".repeat(60));

  // Generate and display the cost report
  const report = LLMCostCalculator.generateCostReport();
  console.log(report);

  // Generate additional analysis scenarios
  console.log("\n🎯 SCENARIO ANALYSIS");
  console.log("=".repeat(60));

  // Low frequency trading (5 analyses/day)
  const lowFreq = LLMCostCalculator.estimateMonthlyCost(5, true);
  console.log(`📊 LOW FREQUENCY (5 analyses/day):`);
  console.log(`   Monthly: ${lowFreq.breakdown.monthlyCostFormatted}`);
  console.log(`   Yearly: ${lowFreq.breakdown.yearlyCostFormatted}`);

  // Medium frequency trading (20 analyses/day)
  const mediumFreq = LLMCostCalculator.estimateMonthlyCost(20, true);
  console.log(`📊 MEDIUM FREQUENCY (20 analyses/day):`);
  console.log(`   Monthly: ${mediumFreq.breakdown.monthlyCostFormatted}`);
  console.log(`   Yearly: ${mediumFreq.breakdown.yearlyCostFormatted}`);

  // High frequency trading (100 analyses/day)
  const highFreq = LLMCostCalculator.estimateMonthlyCost(100, true);
  console.log(`📊 HIGH FREQUENCY (100 analyses/day):`);
  console.log(`   Monthly: ${highFreq.breakdown.monthlyCostFormatted}`);
  console.log(`   Yearly: ${highFreq.breakdown.yearlyCostFormatted}`);

  // Ultra high frequency trading (500 analyses/day)
  const ultraFreq = LLMCostCalculator.estimateMonthlyCost(500, true);
  console.log(`📊 ULTRA HIGH FREQUENCY (500 analyses/day):`);
  console.log(`   Monthly: ${ultraFreq.breakdown.monthlyCostFormatted}`);
  console.log(`   Yearly: ${ultraFreq.breakdown.yearlyCostFormatted}`);

  console.log("\n🔍 COST BREAKDOWN PER ANALYSIS");
  console.log("=".repeat(60));

  const singleAnalysis = LLMCostCalculator.calculateFullAnalysisCost(true);
  console.log(
    `Total Tokens: ${singleAnalysis.totalInputTokens + singleAnalysis.totalOutputTokens}`,
  );
  console.log(`Input Tokens: ${singleAnalysis.totalInputTokens}`);
  console.log(`Output Tokens: ${singleAnalysis.totalOutputTokens}`);
  console.log(`Cost per Analysis: $${singleAnalysis.totalCost.toFixed(6)}`);
  console.log(`Currently Free: ${singleAnalysis.isCurrentlyFree ? "YES" : "NO"}`);

  console.log("\n⚡ OPTIMIZATION OPPORTUNITIES");
  console.log("=".repeat(60));

  // Compare with other models
  console.log("📊 MODEL COMPARISON (when Gemini 2.0 Flash becomes paid):");
  console.log(`   Current Model (Gemini 2.0 Flash): $${singleAnalysis.totalCost.toFixed(6)}`);
  console.log(`   ⚠️  NOTE: Pricing updated to correct values from official Google table`);
  console.log(`   📸 Chart images are included in input token pricing (no extra cost)`);

  // Simulate Gemini 2.5 Flash-Lite pricing (estimated 50% cheaper)
  const flashLiteCost = singleAnalysis.totalCost * 0.5;
  console.log(`   Gemini 2.5 Flash-Lite (estimated): $${flashLiteCost.toFixed(6)}`);
  console.log(
    `   Potential Savings: $${(singleAnalysis.totalCost - flashLiteCost).toFixed(6)} (50%)`,
  );

  console.log("\n🎯 RECOMMENDED ACTIONS");
  console.log("=".repeat(60));
  console.log("1. Continue using Gemini 2.0 Flash while it's FREE");
  console.log("2. Monitor token usage patterns to optimize prompts");
  console.log("3. Consider switching to Gemini 2.5 Flash-Lite for cost savings");
  console.log("4. Implement token caching for repeated analyses");
  console.log("5. Set up cost alerts when usage exceeds budget thresholds");
  console.log("6. Chart images add ~258 tokens but provide significant analysis value");

  console.log("\n💡 NEXT STEPS");
  console.log("=".repeat(60));
  console.log("• Run this script regularly to monitor costs");
  console.log("• Set up automated cost alerts");
  console.log("• Implement budget controls in the trading system");
  console.log("• Consider cost-based trading frequency adjustments");

  console.log("\n✅ Analysis Complete!");
}

// Run the analysis
if (require.main === module) {
  main();
}

export { main as runCostAnalysis };
