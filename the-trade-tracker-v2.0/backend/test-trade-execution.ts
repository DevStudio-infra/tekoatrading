/**
 * Test Trade Execution Fix
 * This script tests if the TradingService.executeTrade method is working properly
 */

import { tradingService } from "./services/trading.service";
import { botService } from "./services/bot.service";

async function testTradeExecution() {
  console.log("🧪 Testing Trade Execution Fix...");

  try {
    // Mock trade data similar to what BotService sends
    const mockTradeData = {
      botId: "19ac7d55-d9da-4efd-b1a2-7da52f55e1ad", // Use existing bot ID from logs
      evaluationId: "test-evaluation-id",
      userId: "test-user-id",
      symbol: "BTC/USD",
      direction: "BUY" as const,
      orderType: "MARKET" as const,
      quantity: 100,
      stopLoss: 104600,
      takeProfit: 105200,
      rationale: "Test trade execution fix",
      aiConfidence: 75,
      riskScore: 6,
    };

    console.log("📊 Mock trade data:", JSON.stringify(mockTradeData, null, 2));

    // Test the trade execution
    console.log("⚡ Calling TradingService.executeTrade...");
    const result = await tradingService.executeTrade(mockTradeData);

    console.log("✅ Trade execution result:", JSON.stringify(result, null, 2));

    if (result.success) {
      console.log("🎉 SUCCESS: Trade execution is working!");
      console.log(`Order ID: ${result.orderId}`);
      console.log(`Status: ${result.status}`);
      console.log(`Reasoning: ${result.reasoning}`);
    } else {
      console.log("❌ FAILED: Trade execution returned unsuccessful result");
    }
  } catch (error: any) {
    console.error("❌ ERROR: Trade execution failed with error:", error.message);
    console.error("Stack trace:", error.stack);
  }
}

// Run the test
testTradeExecution()
  .then(() => {
    console.log("🧪 Test completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("🚨 Test failed:", error);
    process.exit(1);
  });
