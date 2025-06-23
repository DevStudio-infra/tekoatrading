const path = require("path");

// Set up the environment
process.env.NODE_ENV = "development";

async function testPriceFetching() {
  console.log("🧪 Testing price fetching with real broker credentials...");

  try {
    // Import required modules
    const { PrismaClient } = require(".prisma/client");
    const prisma = new PrismaClient();

    // Get a user and their broker credentials (same as the system does)
    const user = await prisma.users.findFirst();
    if (!user) {
      throw new Error("No users found in database");
    }

    console.log(`📋 Using user: ${user.id}`);

    // Get broker credentials for this user
    const credentials = await prisma.brokerCredentials.findMany({
      where: {
        userId: user.id,
        isActive: true,
      },
    });

    console.log(`🔑 Found ${credentials.length} active credentials`);

    const capitalCredential = credentials.find((cred) => {
      const brokerType = (cred.broker || "").toLowerCase();
      return brokerType.includes("capital");
    });

    if (!capitalCredential) {
      throw new Error("No Capital.com credentials found");
    }

    console.log(`✅ Using Capital.com credential: ${capitalCredential.id}`);

    // Import and use the factory service
    const { brokerFactoryService } = require("../services/broker-factory.service");

    // Get the broker API instance
    const capitalApi = await brokerFactoryService.getBrokerApi(capitalCredential.id, user.id);
    console.log("🚀 Created Capital.com API instance");

    // Test different price fetching methods and epic formats
    const testSymbols = ["BTC/USD", "BTCUSD"];
    const testEpics = ["BTCUSD", "BTC/USD", "CS.D.BTCUSD.CFD.IP", "CS.D.BTCUSD.MINI.IP", "CRYPTO:BTCUSD", "CRYPTO:BTC/USD"];

    console.log("\n📊 Testing epic conversion...");
    for (const symbol of testSymbols) {
      try {
        const epic = await capitalApi.getEpicForSymbol(symbol);
        console.log(`✅ ${symbol} → ${epic}`);
      } catch (error) {
        console.log(`❌ ${symbol} → Error: ${error.message}`);
      }
    }

    console.log("\n💰 Testing price fetching for different epics...");
    for (const epic of testEpics) {
      try {
        console.log(`\n🎯 Testing epic: ${epic}`);

        // Test market details
        try {
          const marketDetails = await capitalApi.getMarketDetails(epic);
          console.log(`  ✅ Market details: minDealSize=${marketDetails?.dealingRules?.minDealSize?.value || "unknown"}`);
        } catch (error) {
          console.log(`  ❌ Market details failed: ${error.response?.status || error.message}`);
        }

        // Test latest price
        try {
          const priceData = await capitalApi.getLatestPrice(epic);
          console.log(`  ✅ Price data: bid=${priceData?.bid}, ask=${priceData?.ask}`);
        } catch (error) {
          console.log(`  ❌ Price fetch failed: ${error.response?.status || error.message}`);
        }

        // Test direct market endpoint
        try {
          const response = await capitalApi.apiClient.get(`api/v1/markets/${encodeURIComponent(epic)}`);
          console.log(`  ✅ Market endpoint: status=${response.status}, hasSnapshot=${!!response.data?.snapshot}`);
        } catch (error) {
          console.log(`  ❌ Market endpoint failed: ${error.response?.status || error.message}`);
        }
      } catch (error) {
        console.log(`❌ Epic ${epic} failed: ${error.message}`);
      }
    }

    console.log("\n🔍 Testing position creation (dry run simulation)...");

    try {
      // Test if we can create a position with BTCUSD
      console.log("📋 Attempting to get position creation parameters...");

      const epic = await capitalApi.getEpicForSymbol("BTC/USD");
      console.log(`✅ Epic for BTC/USD: ${epic}`);

      // Don't actually create a position, just test the setup
      console.log("✅ Position creation setup would work with this epic");
    } catch (error) {
      console.log(`❌ Position creation setup failed: ${error.message}`);
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error("Stack:", error.stack);
  }
}

// Run the test
testPriceFetching()
  .then(() => console.log("\n✅ Price fetching test completed"))
  .catch((err) => console.error("❌ Test failed:", err));
