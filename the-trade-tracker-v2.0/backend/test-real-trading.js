/**
 * Test Real Trading Execution
 * This script tests if the real Capital.com API integration is working properly
 */

const { botService } = require("./services/bot.service");

async function testRealTrading() {
  console.log("🧪 Testing Real Capital.com API Trading...");

  try {
    // Test bot ID from the logs
    const botId = "19ac7d55-d9da-4efd-b1a2-7da52f55e1ad";

    console.log(`🔍 Testing bot: ${botId}`);

    // Try to trigger a bot evaluation which should lead to trading
    const result = await botService.evaluateBot(botId);

    console.log("✅ Bot evaluation completed:", result);
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error("Stack:", error.stack);
  }
}

// Run the test
testRealTrading()
  .then(() => {
    console.log("🏁 Test completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Test crashed:", error);
    process.exit(1);
  });
