// DEMO: Professional AI Trading Agent Usage Examples
// This file demonstrates how to use the new professional trading system

import { EnhancedTradingDecisionAgent } from "./enhanced-trading-decision-agent";

// Example 1: Basic Professional Trading Decision
async function basicTradingExample() {
  const agent = new EnhancedTradingDecisionAgent();

  const decision = await agent.analyze({
    symbol: "EURUSD",
    timeframe: "1h",
    strategy: "trend_following",
    marketData: {
      price: 1.095,
      high24h: 1.098,
      low24h: 1.092,
      change24h: 0.15,
      volume: 1500000,
    },
    riskData: {
      portfolioBalance: 10000,
      currentPositions: 2,
      proposedTradeSize: 1000,
      marketVolatility: 2.5,
    },
    accountBalance: 10000,
    openPositions: [],
  });

  console.log("🤖 PROFESSIONAL TRADING DECISION:");
  console.log(`Action: ${decision.action.toUpperCase()}`);
  console.log(`Order Type: ${decision.orderType}`);
  console.log(`Quantity: ${decision.quantity}`);
  console.log(`Stop Loss: ${decision.stopLoss}`);
  console.log(`Take Profit: ${decision.takeProfit}`);
  console.log(`Risk-Reward Ratio: ${decision.riskRewardRatio}:1`);
  console.log(`Confidence: ${Math.round(decision.confidence * 100)}%`);
  console.log(`Market Conditions: ${decision.marketConditions}`);
  console.log(`Strategy Alignment: ${decision.strategyAlignment}%`);
  console.log(`Validated: ${decision.validated ? "✅" : "❌"}`);

  if (decision.warnings.length > 0) {
    console.log(`⚠️ Warnings: ${decision.warnings.join(", ")}`);
  }

  if (decision.recommendations.length > 0) {
    console.log(`💡 Recommendations: ${decision.recommendations.join(", ")}`);
  }
}

// Example 2: Full Professional Trading Recommendation
async function fullRecommendationExample() {
  const agent = new EnhancedTradingDecisionAgent();

  const fullRecommendation = await agent.getFullTradingRecommendation({
    symbol: "BTCUSD",
    timeframe: "4h",
    strategy: "breakout",
    marketData: {
      price: 45000,
      high24h: 46500,
      low24h: 43800,
      change24h: 2.1,
      volume: 2500000,
    },
    accountData: {
      balance: 50000,
      openPositions: [
        { symbol: "ETHUSD", direction: "BUY", quantity: 10, unrealizedPnL: 250 },
        { symbol: "ADAUSD", direction: "SELL", quantity: 1000, unrealizedPnL: -150 },
      ],
      riskTolerance: "moderate",
    },
  });

  console.log("\n📊 FULL PROFESSIONAL RECOMMENDATION:");
  console.log("Decision:", fullRecommendation.decision.action);
  console.log("Execution Plan:");
  console.log("  Immediate:", fullRecommendation.executionPlan.immediate);
  console.log("  Monitoring:", fullRecommendation.executionPlan.monitoring);
  console.log("  Risk Management:", fullRecommendation.executionPlan.riskManagement);
  console.log("Market Analysis:");
  console.log("  Technical:", fullRecommendation.marketAnalysis.technicalSummary);
  console.log("  Risk:", fullRecommendation.marketAnalysis.riskSummary);
  console.log("  Portfolio:", fullRecommendation.marketAnalysis.portfolioSummary);
}

// Example 3: Position Management
async function positionManagementExample() {
  const agent = new EnhancedTradingDecisionAgent();

  const managementAction = await agent.managePosition({
    id: "pos_123",
    symbol: "GBPUSD",
    direction: "BUY",
    entryPrice: 1.25,
    currentPrice: 1.258, // 80 pips profit
    quantity: 10000,
    stopLoss: 1.245,
    takeProfit: 1.26,
    openedAt: new Date(Date.now() - 3600000), // 1 hour ago
    strategy: "swing_trading",
    timeframe: "4h",
  });

  console.log("\n🔄 POSITION MANAGEMENT:");
  console.log(`Action: ${managementAction.action}`);
  console.log(`Priority: ${managementAction.priority}`);
  console.log(`Confidence: ${Math.round(managementAction.confidence * 100)}%`);
  console.log(`Reasoning: ${managementAction.reasoning.join(", ")}`);

  if (managementAction.newStopLoss) {
    console.log(`New Stop Loss: ${managementAction.newStopLoss}`);
  }

  if (managementAction.newTakeProfit) {
    console.log(`New Take Profit: ${managementAction.newTakeProfit}`);
  }

  if (managementAction.closeQuantity) {
    console.log(`Close Quantity: ${managementAction.closeQuantity}`);
  }
}

// Example 4: Different Strategy Examples
async function strategyExamples() {
  const agent = new EnhancedTradingDecisionAgent();

  const strategies = [
    { name: "Scalping", timeframe: "1m", strategy: "scalping" },
    { name: "Breakout", timeframe: "15m", strategy: "breakout" },
    { name: "Mean Reversion", timeframe: "1h", strategy: "mean_reversion" },
    { name: "Swing Trading", timeframe: "4h", strategy: "swing_trading" },
    { name: "Position Trading", timeframe: "1d", strategy: "trend_following" },
  ];

  console.log("\n📋 STRATEGY COMPARISON:");

  for (const strat of strategies) {
    const decision = await agent.analyze({
      symbol: "EURUSD",
      timeframe: strat.timeframe,
      strategy: strat.strategy,
      marketData: {
        price: 1.095,
        high24h: 1.098,
        low24h: 1.092,
        change24h: 0.15,
        volume: 1500000,
      },
      riskData: { portfolioBalance: 10000 },
      accountBalance: 10000,
      openPositions: [],
    });

    console.log(`\n${strat.name} (${strat.timeframe}):`);
    console.log(`  Order Type: ${decision.orderType}`);
    console.log(
      `  SL: ${((Math.abs(decision.stopLoss - decision.technicalAnalysis?.currentPrice || 1.095) / 1.095) * 100).toFixed(2)}%`,
    );
    console.log(
      `  TP: ${((Math.abs(decision.takeProfit - decision.technicalAnalysis?.currentPrice || 1.095) / 1.095) * 100).toFixed(2)}%`,
    );
    console.log(`  R:R: ${decision.riskRewardRatio}:1`);
    console.log(`  Strategy Fit: ${decision.strategyAlignment}%`);
  }
}

// Example 5: Risk Scenarios
async function riskScenarioExamples() {
  const agent = new EnhancedTradingDecisionAgent();

  const scenarios = [
    {
      name: "Conservative Portfolio",
      balance: 10000,
      openPositions: [],
      riskTolerance: "conservative" as const,
    },
    {
      name: "Aggressive Portfolio",
      balance: 50000,
      openPositions: [
        { symbol: "EURUSD", unrealizedPnL: 150 },
        { symbol: "GBPUSD", unrealizedPnL: -50 },
      ],
      riskTolerance: "aggressive" as const,
    },
    {
      name: "Moderate Portfolio",
      balance: 25000,
      openPositions: [{ symbol: "AUDUSD", unrealizedPnL: 75 }],
      riskTolerance: "moderate" as const,
    },
  ];

  console.log("\n⚖️ RISK SCENARIO ANALYSIS:");

  for (const scenario of scenarios) {
    const recommendation = await agent.getFullTradingRecommendation({
      symbol: "EURUSD",
      timeframe: "1h",
      strategy: "trend_following",
      marketData: {
        price: 1.095,
        high24h: 1.098,
        low24h: 1.092,
        change24h: 0.15,
        volume: 1500000,
      },
      accountData: scenario,
    });

    console.log(`\n${scenario.name}:`);
    console.log(`  Can Trade: ${recommendation.decision.portfolioImpact?.canTrade ? "✅" : "❌"}`);
    console.log(`  Max Position: ${recommendation.decision.quantity}`);
    console.log(`  Risk Level: ${recommendation.decision.portfolioImpact?.riskLevel}`);
    console.log(
      `  Portfolio Heat: ${recommendation.decision.portfolioImpact?.portfolioHeatLevel}%`,
    );
    console.log(`  Warnings: ${recommendation.decision.warnings.length}`);
  }
}

// Run all examples
export async function runProfessionalTradingDemo() {
  console.log("🚀 PROFESSIONAL AI TRADING AGENT DEMONSTRATION\n");

  try {
    await basicTradingExample();
    await fullRecommendationExample();
    await positionManagementExample();
    await strategyExamples();
    await riskScenarioExamples();

    console.log("\n✅ Demo completed successfully!");
    console.log("\n📚 See PROFESSIONAL_AI_TRADING_GUIDE.md for full documentation");
  } catch (error) {
    console.error("❌ Demo error:", error);
  }
}

// Uncomment to run demo
// runProfessionalTradingDemo();
