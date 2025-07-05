import { CapitalMainService } from "../modules/capital/services/capital-main.service";
import { brokerLimitValidator } from "../services/broker-limit-validator.service";

async function testSequentialValidation() {
  console.log("🧪 Testing Sequential Validation - Cache Update Prevention");
  console.log("====================================================\n");

  const capitalService = new CapitalMainService({
    apiKey: "brPsM2gr0wqsm6aV",
    identifier: "raphael.malburg@gmail.com",
    password: "Laquie8501@",
    isDemo: true,
  });

  try {
    await capitalService.authenticate();
    console.log("✅ Authentication successful\n");

    const currentPrice = await capitalService.getLatestPrice("BTCUSD");
    console.log(`📊 Current price: Bid=${currentPrice.bid}, Ask=${currentPrice.ask}\n`);

    // Test 1: Create first order with invalid stop loss
    console.log("🚫 Test 1: First order with invalid stop loss...");
    const invalidStopLoss1 = currentPrice.ask + 150; // Intentionally invalid

    try {
      const result1 = await capitalService.createPosition("BTCUSD", "BUY", 0.001, invalidStopLoss1);
      console.log(`✅ First order auto-corrected: ${result1.dealReference}\n`);
    } catch (error: any) {
      console.log(`❌ First order failed: ${error.message}\n`);
    }

    // Wait 2 seconds for cache to settle
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Test 2: Check if broker limits were updated in cache
    console.log("🔍 Test 2: Checking updated broker limits in cache...");
    const limits = await brokerLimitValidator.getBrokerLimits("BTCUSD", capitalService);
    console.log(`📊 Cached Broker Limits:`);
    console.log(`   Max Stop Price: ${limits.maxStopPrice}`);
    console.log(`   Min Stop Price: ${limits.minStopPrice}`);
    console.log(`   Current Price: ${limits.currentPrice}\n`);

    // Test 3: Create second order with similar invalid stop loss
    console.log("🚫 Test 3: Second order with similar invalid stop loss...");
    console.log("⚠️ This should be caught by validator BEFORE going to Capital.com API!");

    const invalidStopLoss2 = currentPrice.ask + 140; // Similar invalid level

    // Validate BEFORE sending to Capital.com
    const validation = await brokerLimitValidator.validateOrder(
      {
        epic: "BTCUSD",
        direction: "BUY",
        size: 0.001,
        entryPrice: currentPrice.ask,
        stopLevel: invalidStopLoss2,
      },
      capitalService,
      "test-sequential",
    );

    if (validation.adjustedStopLoss) {
      console.log(
        `✅ VALIDATOR CAUGHT THE ERROR! Adjusted: ${invalidStopLoss2} → ${validation.adjustedStopLoss}`,
      );
      console.log(`🎉 SUCCESS: Cache update prevented repeated Capital.com API error!`);

      // Try creating position with corrected values
      try {
        const result2 = await capitalService.createPosition(
          "BTCUSD",
          "BUY",
          0.001,
          validation.adjustedStopLoss,
        );
        console.log(`✅ Second order succeeded without API error: ${result2.dealReference}`);
      } catch (error: any) {
        console.log(`⚠️ Second order failed despite validation: ${error.message}`);
      }
    } else {
      console.log(`❌ VALIDATOR FAILED to catch the error - cache update not working`);

      // Try the order anyway to see if Capital.com still rejects it
      try {
        const result2 = await capitalService.createPosition(
          "BTCUSD",
          "BUY",
          0.001,
          invalidStopLoss2,
        );
        console.log(`⚠️ Order somehow succeeded: ${result2.dealReference}`);
      } catch (error: any) {
        console.log(`❌ Capital.com still rejected: ${error.message}`);
        console.log(`❌ CACHE UPDATE NOT WORKING - repeated API errors!`);
      }
    }

    console.log("\n🎯 Test Summary:");
    console.log("✅ Cache updates should prevent repeated broker validation errors");
    console.log("✅ Validator should catch invalid levels BEFORE sending to Capital.com API");
  } catch (error: any) {
    console.error("❌ Sequential validation test failed:", error);
  }
}

testSequentialValidation().catch(console.error);
