const { PrismaClient } = require("@prisma/client");
const { CapitalMainService } = require("./backend/modules/capital");

async function testCapitalPositionCreation() {
  const prisma = new PrismaClient();

  try {
    console.log("🔍 Testing Capital.com position creation...\n");

    // Get bot credentials
    const bot = await prisma.bot.findFirst({
      where: { name: "bot 1" },
      include: {
        user: {
          include: {
            brokerCredentials: {
              where: { brokerName: "capital.com" },
            },
          },
        },
      },
    });

    if (!bot || !bot.user.brokerCredentials[0]) {
      console.log("❌ No Capital.com credentials found");
      return;
    }

    const credentials = bot.user.brokerCredentials[0].credentials;
    console.log("✅ Found credentials:", {
      isDemo: credentials.isDemo,
      hasApiKey: !!credentials.apiKey,
      hasIdentifier: !!credentials.identifier,
      hasPassword: !!credentials.password,
    });

    // Create Capital API instance
    const capitalApi = new CapitalMainService(credentials);

    // Test 1: Check session
    console.log("\n📡 Testing session creation...");
    try {
      await capitalApi.createSession();
      console.log("✅ Session created successfully");
    } catch (error) {
      console.log("❌ Session creation failed:", error.message);
      return;
    }

    // Test 2: Get account info
    console.log("\n💰 Testing account info...");
    try {
      const accounts = await capitalApi.getAccounts();
      console.log("✅ Account info retrieved:", accounts.length, "accounts");
    } catch (error) {
      console.log("❌ Account info failed:", error.message);
    }

    // Test 3: Get market info
    console.log("\n📊 Testing market info for BTCUSD...");
    try {
      const market = await capitalApi.getMarketDetails("BTCUSD");
      console.log("✅ Market info retrieved:", {
        epic: market.instrument?.epic,
        name: market.instrument?.name,
        status: market.snapshot?.marketStatus,
      });
    } catch (error) {
      console.log("❌ Market info failed:", error.message);
    }

    // Test 4: Get current positions
    console.log("\n🔍 Testing current positions...");
    try {
      const positions = await capitalApi.getPositions();
      console.log("✅ Current positions:", positions.length);
      positions.forEach((pos, i) => {
        console.log(`  ${i + 1}. ${pos.market?.epic} | ${pos.position?.direction} | Size: ${pos.position?.size} | Deal: ${pos.position?.dealId}`);
      });
    } catch (error) {
      console.log("❌ Get positions failed:", error.message);
    }

    // Test 5: Try to create a very small position (if no positions exist)
    console.log("\n🎯 Testing position creation (small test position)...");
    try {
      const result = await capitalApi.createPosition("BTCUSD", "BUY", 0.001);
      console.log("✅ Position creation result:", result);

      // If successful, immediately close it
      if (result.dealReference) {
        console.log("🔄 Checking position confirmation...");
        setTimeout(async () => {
          try {
            const confirmation = await capitalApi.getConfirmation(result.dealReference);
            console.log("✅ Position confirmation:", confirmation);

            if (confirmation.dealId) {
              console.log("🔄 Closing test position...");
              const closeResult = await capitalApi.closePosition(confirmation.dealId);
              console.log("✅ Position closed:", closeResult);
            }
          } catch (error) {
            console.log("❌ Position confirmation/close failed:", error.message);
          }
        }, 2000);
      }
    } catch (error) {
      console.log("❌ Position creation failed:", error.message);
      console.log("Error details:", error.response?.data || error);
    }
  } catch (error) {
    console.log("❌ Test failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testCapitalPositionCreation();
