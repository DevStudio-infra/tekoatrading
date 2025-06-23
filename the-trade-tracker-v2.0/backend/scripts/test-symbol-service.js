const { CapitalSymbolService } = require("../modules/capital/services/capital-symbol.service");

async function testSymbolService() {
  try {
    console.log("🧪 Testing Dynamic Capital.com Symbol Service...\n");

    // Create service instance (you'd need proper credentials in a real test)
    const config = {
      identifier: process.env.CAPITAL_USERNAME || "test",
      password: process.env.CAPITAL_PASSWORD || "test",
      apiKey: process.env.CAPITAL_API_KEY || "test",
      isDemo: true,
    };

    const symbolService = new CapitalSymbolService(config);

    console.log("📊 Initializing service and fetching all markets...");
    await symbolService.initialize();

    console.log("✅ Service initialized successfully!\n");

    // Get cache statistics
    const stats = symbolService.getCacheStats();
    console.log("📈 Cache Statistics:");
    console.log(`  - Initialized: ${stats.initialized}`);
    console.log(`  - Last Update: ${stats.lastUpdate}`);
    console.log(`  - Total Symbol Mappings: ${stats.symbolMappings}`);
    console.log(`  - Instrument Types: ${stats.instrumentTypes.join(", ")}`);
    console.log("  - Markets by Type:");
    for (const [type, count] of Object.entries(stats.marketsByType)) {
      console.log(`    • ${type}: ${count} instruments`);
    }
    console.log("");

    // Test symbol lookups
    console.log("🔍 Testing Symbol Lookups:");

    const testSymbols = ["USD/CAD", "USDCAD", "EUR/USD", "EURUSD", "GBP/USD", "BTC/USD", "ETH/USD", "US500"];

    for (const symbol of testSymbols) {
      try {
        const epic = await symbolService.getEpicForSymbol(symbol);
        console.log(`  ✅ ${symbol} → ${epic || "NOT FOUND"}`);
      } catch (error) {
        console.log(`  ❌ ${symbol} → ERROR: ${error.message}`);
      }
    }

    console.log("\n🎯 Test completed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    if (error.response?.data) {
      console.error("API Response:", error.response.data);
    }
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testSymbolService();
}

module.exports = { testSymbolService };
