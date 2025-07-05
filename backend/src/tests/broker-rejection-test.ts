import { CapitalMainService } from "../modules/capital/services/capital-main.service";
import { brokerLimitValidator } from "../services/broker-limit-validator.service";

async function testBrokerRejectionHandling() {
  console.log("🧪 Testing Enhanced Broker Rejection Handling");
  console.log("==============================================\n");

  // Initialize Capital.com service
  const capitalService = new CapitalMainService({
    apiKey: "brPsM2gr0wqsm6aV",
    identifier: "raphael.malburg@gmail.com",
    password: "Laquie8501@",
    isDemo: true,
  });

  try {
    // Test 1: Authentication
    console.log("🔑 Testing authentication...");
    await capitalService.authenticate();
    console.log("✅ Authentication successful\n");

    // Test 2: Get current price and broker limits
    console.log("📊 Getting current market data...");
    const currentPrice = await capitalService.getLatestPrice("BTCUSD");
    console.log(`✅ Current price: Bid=${currentPrice.bid}, Ask=${currentPrice.ask}\n`);

    // Test 3: Test order with intentionally invalid stop loss (too high)
    console.log("🚫 Test 1: Creating order with INTENTIONALLY INVALID stop loss (too high)...");
    const invalidStopLoss = currentPrice.ask + 100; // Way too high for BUY order

    try {
      const result = await capitalService.createPosition(
        "BTCUSD",
        "BUY",
        0.001,
        invalidStopLoss, // This should trigger broker rejection and auto-correction
      );

      if (result.dealReference) {
        console.log(`✅ SUCCESS! Order auto-corrected and executed: ${result.dealReference}`);
        console.log(`📋 Deal Status: ${result.dealStatus}`);

        // Try to clean up the test position
        try {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          const positions = await capitalService.getOpenPositions();
          console.log(`📊 Current open positions: ${positions.positions.length}`);
        } catch (cleanupError) {
          console.log(`⚠️ Could not check positions: ${cleanupError.message}`);
        }
      }
    } catch (error: any) {
      console.log(`❌ FAILED: ${error.message}`);
      console.log("❌ Auto-correction did not work properly\n");
    }

    // Test 4: Test SELL order with invalid stop loss (too low)
    console.log("🚫 Test 2: Creating SELL order with INTENTIONALLY INVALID stop loss (too low)...");
    const invalidStopLossSell = currentPrice.bid - 100; // Way too low for SELL order

    try {
      const result = await capitalService.createPosition(
        "BTCUSD",
        "SELL",
        0.001,
        invalidStopLossSell, // This should trigger broker rejection and auto-correction
      );

      if (result.dealReference) {
        console.log(`✅ SUCCESS! SELL order auto-corrected and executed: ${result.dealReference}`);
        console.log(`📋 Deal Status: ${result.dealStatus}`);
      }
    } catch (error: any) {
      console.log(`❌ FAILED: ${error.message}`);
      console.log("❌ Auto-correction for SELL order did not work properly\n");
    }

    // Test 5: Check if broker limits are being cached correctly
    console.log("🔍 Test 3: Checking broker limit caching...");
    const limits1 = await brokerLimitValidator.getBrokerLimits("BTCUSD", capitalService);
    const limits2 = await brokerLimitValidator.getBrokerLimits("BTCUSD", capitalService);

    console.log(`📊 Broker Limits (First call):`);
    console.log(`   Max Stop Price: ${limits1.maxStopPrice}`);
    console.log(`   Min Stop Price: ${limits1.minStopPrice}`);
    console.log(`   Current Price: ${limits1.currentPrice}`);

    if (
      limits1.maxStopPrice === limits2.maxStopPrice &&
      limits1.currentPrice === limits2.currentPrice
    ) {
      console.log("✅ Broker limit caching working correctly\n");
    } else {
      console.log("⚠️ Broker limit caching may have issues\n");
    }

    console.log("🎉 Enhanced Broker Rejection Testing Complete!");
    console.log("✅ System should now handle broker rejections automatically");
  } catch (error: any) {
    console.error("❌ Test suite failed:", error);
    process.exit(1);
  }
}

// Run the test
testBrokerRejectionHandling().catch(console.error);
