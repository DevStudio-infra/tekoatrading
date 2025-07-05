import { CapitalMainService } from "../modules/capital/services/capital-main.service";
import { EnhancedTradingDecisionAgent } from "../ai/enhanced-trading-decision-agent";
import { OrderManagementService } from "../services/order-management.service";

async function testOrderIntelligenceSystem() {
  console.log("🧪 Testing Order Intelligence System Integration");
  console.log("===============================================\n");

  const capitalService = new CapitalMainService({
    apiKey: "brPsM2gr0wqsm6aV",
    identifier: "raphael.malburg@gmail.com",
    password: "Laquie8501@",
    isDemo: true,
  });

  const tradingAgent = new EnhancedTradingDecisionAgent();
  const orderManagementService = new OrderManagementService();

  try {
    await capitalService.authenticate();
    console.log("✅ Authentication successful\n");

    // Test 1: Get current market data
    console.log("📊 Test 1: Getting current market data...");
    const currentPrice = await capitalService.getLatestPrice("BTCUSD");
    console.log(`   Current price: Bid=${currentPrice.bid}, Ask=${currentPrice.ask}\n`);

    // Test 2: Create some test orders to create a complex scenario
    console.log("📋 Test 2: Creating test orders to simulate complex scenario...");

    // Create a limit order that's far from market
    const farLimitOrder = {
      symbol: "BTCUSD",
      direction: "BUY",
      size: 0.001,
      orderType: "LIMIT",
      price: currentPrice.bid - 1000, // Far from market
      stopLoss: currentPrice.bid - 1200,
    };

    try {
      const testOrder1 = await capitalService.createWorkingOrder(
        farLimitOrder.symbol,
        farLimitOrder.direction,
        farLimitOrder.size,
        farLimitOrder.price,
        farLimitOrder.stopLoss,
      );
      console.log(
        `   ✅ Created test limit order: ${testOrder1.dealReference} at ${farLimitOrder.price}`,
      );
    } catch (error: any) {
      console.log(`   ⚠️ Test order creation failed (expected): ${error.message}`);
    }

    // Test 3: Run Enhanced Trading Decision with Order Intelligence
    console.log("\n🎯 Test 3: Running Enhanced Trading Decision with Order Intelligence...");

    const tradingData = {
      symbol: "BTCUSD",
      timeframe: "M1",
      strategy: "scalping",
      strategyConfig: {
        name: "scalping",
        description: "High-frequency scalping strategy",
        rules: "Enter on momentum, exit quickly",
        parameters: { riskPerTrade: 1 },
        confidenceThreshold: 60,
        riskManagement: { maxRiskPerTrade: 1, stopLossRequired: true },
      },
      botConfig: {
        id: "test-order-intelligence",
        name: "Order Intelligence Test Bot",
        description: "Testing order intelligence system",
        maxOpenTrades: 3,
        maxRiskPercentage: 2,
        minRiskPercentage: 0.5,
        tradingPairSymbol: "BTCUSD",
        timeframe: "M1",
        isActive: true,
        maxOpenOrders: 10,
        maxOrdersPerSymbol: 3,
        orderTimeoutMinutes: 30,
      },
      marketData: {
        price: currentPrice.ask,
        currentPrice: currentPrice.ask,
        bid: currentPrice.bid,
        ask: currentPrice.ask,
        spread: currentPrice.ask - currentPrice.bid,
        volume: 1000000,
        high24h: currentPrice.ask * 1.02,
        low24h: currentPrice.bid * 0.98,
        change24h: 0.5,
      },
      riskData: {
        portfolioBalance: 1000,
        riskTolerance: "moderate",
      },
      accountBalance: 1000,
      capitalApi: capitalService, // KEY: Include Capital.com API for order intelligence
      openPositions: [],
    };

    console.log("   🤖 Running Enhanced Trading Decision Agent...");
    const tradingDecision = await tradingAgent.analyze(tradingData);

    console.log("\n📋 Enhanced Trading Decision Results:");
    console.log(`   Action: ${tradingDecision.action}`);
    console.log(`   Confidence: ${tradingDecision.confidence}%`);
    console.log(`   Order Type: ${tradingDecision.orderType}`);
    console.log(`   Stop Loss: ${tradingDecision.stopLoss}`);
    console.log(`   Take Profit: ${tradingDecision.takeProfit}`);
    console.log(`   Validated: ${tradingDecision.validated}`);

    if (tradingDecision.reasoning && tradingDecision.reasoning.length > 0) {
      console.log("\n🔍 Reasoning:");
      tradingDecision.reasoning.forEach((reason, index) => {
        console.log(`   ${index + 1}. ${reason}`);
      });
    }

    if (tradingDecision.warnings && tradingDecision.warnings.length > 0) {
      console.log("\n⚠️ Warnings:");
      tradingDecision.warnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. ${warning}`);
      });
    }

    if (tradingDecision.recommendations && tradingDecision.recommendations.length > 0) {
      console.log("\n💡 Recommendations:");
      tradingDecision.recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
    }

    // Test 4: Order Intelligence Analysis
    if (tradingDecision.orderIntelligence) {
      console.log("\n🎯 Order Intelligence Analysis:");
      console.log(`   Order Decision: ${tradingDecision.orderIntelligence.orderDecision}`);
      console.log(
        `   Overall Risk: ${tradingDecision.orderIntelligence.riskAssessment.overallRisk}`,
      );
      console.log(`   Order Risk: ${tradingDecision.orderIntelligence.riskAssessment.orderRisk}`);
      console.log(
        `   Conflict Risk: ${tradingDecision.orderIntelligence.riskAssessment.conflictRisk}`,
      );
      console.log(
        `   Exposure Risk: ${tradingDecision.orderIntelligence.riskAssessment.exposureRisk}`,
      );
      console.log(
        `   Optimal Timing: ${tradingDecision.orderIntelligence.marketTiming.isOptimalTiming}`,
      );
      console.log(
        `   Timing Reason: ${tradingDecision.orderIntelligence.marketTiming.timingReason}`,
      );

      if (tradingDecision.orderIntelligence.orderManagementActions.cancelOrders.length > 0) {
        console.log(
          `   Orders to Cancel: ${tradingDecision.orderIntelligence.orderManagementActions.cancelOrders.length}`,
        );
      }

      if (tradingDecision.orderIntelligence.orderManagementActions.modifyOrders.length > 0) {
        console.log(
          `   Orders to Modify: ${tradingDecision.orderIntelligence.orderManagementActions.modifyOrders.length}`,
        );
      }
    }

    // Test 5: Order Management Service
    if (
      tradingDecision.orderIntelligence &&
      (tradingDecision.orderIntelligence.orderManagementActions.cancelOrders.length > 0 ||
        tradingDecision.orderIntelligence.orderManagementActions.modifyOrders.length > 0)
    ) {
      console.log("\n🔧 Test 5: Order Management Service (DRY RUN)...");

      const orderManagementResult = await orderManagementService.executeOrderManagementActions(
        capitalService,
        tradingData.botConfig,
        tradingDecision.orderIntelligence,
        true, // DRY RUN
      );

      console.log("\n📊 Order Management Results:");
      console.log(`   Success: ${orderManagementResult.success}`);
      console.log(`   Total Actions: ${orderManagementResult.summary.totalActions}`);
      console.log(`   Successful Actions: ${orderManagementResult.summary.successfulActions}`);
      console.log(`   Failed Actions: ${orderManagementResult.summary.failedActions}`);
      console.log(`   Orders Changed: ${orderManagementResult.summary.ordersChanged}`);

      if (orderManagementResult.actionsPerformed.length > 0) {
        console.log("\n✅ Actions Performed:");
        orderManagementResult.actionsPerformed.forEach((action, index) => {
          console.log(`   ${index + 1}. ${action.type} ${action.orderId} - ${action.reason}`);
        });
      }

      if (orderManagementResult.errors.length > 0) {
        console.log("\n❌ Errors:");
        orderManagementResult.errors.forEach((error, index) => {
          console.log(`   ${index + 1}. ${error}`);
        });
      }
    }

    // Test 6: Order Management Recommendations
    console.log("\n💡 Test 6: Getting Order Management Recommendations...");

    const recommendations = await orderManagementService.getOrderManagementRecommendations(
      capitalService,
      tradingData.botConfig,
      "BTCUSD",
      "BUY",
      currentPrice.ask,
    );

    console.log("\n📋 Order Management Recommendations:");
    console.log(`   Should Proceed: ${recommendations.shouldProceed}`);
    console.log(`   Priority: ${recommendations.priority}`);
    console.log(`   Actions Count: ${recommendations.actions.length}`);

    if (recommendations.recommendations.length > 0) {
      console.log("\n💡 Recommendations:");
      recommendations.recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
    }

    // Test 7: Cleanup old orders
    console.log("\n🧹 Test 7: Cleanup Old Orders (DRY RUN)...");

    const cleanupResult = await orderManagementService.cleanupOldOrders(
      capitalService,
      tradingData.botConfig,
      30, // 30 minutes max age
      3, // 3% max distance
      true, // DRY RUN
    );

    console.log("\n📊 Cleanup Results:");
    console.log(`   Success: ${cleanupResult.success}`);
    console.log(`   Orders Cleaned: ${cleanupResult.summary.ordersChanged}`);
    console.log(`   Total Actions: ${cleanupResult.summary.totalActions}`);

    console.log("\n🎉 Order Intelligence System Test Complete!");
    console.log("✅ System now provides:");
    console.log("   - Order awareness and conflict detection");
    console.log("   - Intelligent order management recommendations");
    console.log("   - Automated order cleanup capabilities");
    console.log("   - Integration with trading committee decisions");
    console.log("   - Risk assessment including pending orders");
    console.log("   - Market timing optimization");
  } catch (error: any) {
    console.error("❌ Order Intelligence System test failed:", error);
    console.error("Stack:", error.stack);
  }
}

testOrderIntelligenceSystem().catch(console.error);
