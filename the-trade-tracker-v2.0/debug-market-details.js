const { CapitalMainService } = require("./services/capital-main.service");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function checkMarketDetails() {
  try {
    console.log("=== CHECKING CAPITAL.COM MARKET DETAILS FOR BTCUSD ===\n");

    // Get a user's credentials
    const user = await prisma.user.findFirst({
      include: {
        brokerCredentials: {
          where: { broker: "capital.com" },
        },
      },
    });

    if (!user || !user.brokerCredentials[0]) {
      console.error("No Capital.com credentials found");
      return;
    }

    const credentials = user.brokerCredentials[0];
    console.log(`Using credentials for user: ${user.email}`);

    // Initialize Capital API
    const capitalApi = new CapitalMainService();
    await capitalApi.initialize(credentials.apiKey, credentials.password, credentials.isDemo);

    console.log("Capital API initialized successfully\n");

    // Get market details for BTCUSD
    console.log("=== BTCUSD MARKET DETAILS ===");
    const marketDetails = await capitalApi.getMarketDetails("BTCUSD");

    if (marketDetails) {
      console.log("Market Details:", JSON.stringify(marketDetails, null, 2));

      if (marketDetails.dealingRules) {
        console.log("\n=== DEALING RULES ===");
        console.log("Min Deal Size:", marketDetails.dealingRules.minDealSize);
        console.log("Max Deal Size:", marketDetails.dealingRules.maxDealSize);
        console.log("Min Stop/Limit Distance:", marketDetails.dealingRules.minStopOrLimitDistance);
        console.log("Min Normal Stop/Limit Distance:", marketDetails.dealingRules.minNormalStopOrLimitDistance);
        console.log("Min Guaranteed Stop Distance:", marketDetails.dealingRules.minGuaranteedStopDistance);
      }

      if (marketDetails.instrument) {
        console.log("\n=== INSTRUMENT INFO ===");
        console.log("Epic:", marketDetails.instrument.epic);
        console.log("Name:", marketDetails.instrument.name);
        console.log("Type:", marketDetails.instrument.type);
        console.log("Unit:", marketDetails.instrument.unit);
        console.log("Currency:", marketDetails.instrument.currencies);
        console.log("Lot Size:", marketDetails.instrument.lotSize);
        console.log("One Pip Means:", marketDetails.instrument.onePipMeans);
        console.log("Value of One Pip:", marketDetails.instrument.valueOfOnePip);
      }

      if (marketDetails.snapshot) {
        console.log("\n=== CURRENT SNAPSHOT ===");
        console.log("Market Status:", marketDetails.snapshot.marketStatus);
        console.log("Bid:", marketDetails.snapshot.bid);
        console.log("Ask:", marketDetails.snapshot.offer);
        console.log("Net Change:", marketDetails.snapshot.netChange);
        console.log("Percentage Change:", marketDetails.snapshot.percentageChange);
      }
    } else {
      console.log("No market details found for BTCUSD");
    }

    // Also check current price
    console.log("\n=== CURRENT PRICE ===");
    const priceData = await capitalApi.getLatestPrice("BTCUSD");
    console.log("Price Data:", JSON.stringify(priceData, null, 2));
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMarketDetails();
