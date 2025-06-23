const { brokerFactoryService } = require("./services/broker-factory.service.ts");
const { prisma } = require("./utils/prisma.ts");

async function testAccountBalance() {
  try {
    console.log("🔍 Testing Capital.com account balance...");

    // Get the first active Capital.com credential
    const credentials = await prisma.brokerCredential.findMany({
      where: {
        isActive: true,
        brokerName: { contains: "capital", mode: "insensitive" },
      },
    });

    if (credentials.length === 0) {
      console.error("❌ No active Capital.com credentials found");
      return;
    }

    const credential = credentials[0];
    console.log(`🔍 Using credential: ${credential.id} for user: ${credential.userId}`);

    // Get broker API instance
    const capitalApi = await brokerFactoryService.getBrokerApi(credential.id, credential.userId);

    // Get account details
    console.log("🔍 Fetching account details...");
    const accountDetails = await capitalApi.getAccountDetails();

    console.log("📊 Account Details:", JSON.stringify(accountDetails, null, 2));

    // Get positions
    console.log("🔍 Fetching open positions...");
    const positions = await capitalApi.getOpenPositions();

    console.log("📊 Open Positions:", JSON.stringify(positions, null, 2));
  } catch (error) {
    console.error("❌ Error testing account balance:", error.message);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

testAccountBalance();
