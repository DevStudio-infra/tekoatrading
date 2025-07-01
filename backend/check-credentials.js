const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function checkCredentials() {
  try {
    console.log("🔍 Checking broker credentials in database...\n");

    // Get all broker credentials
    const credentials = await prisma.brokerCredential.findMany({
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    console.log(`Found ${credentials.length} broker credential(s):\n`);

    credentials.forEach((cred, index) => {
      console.log(`${index + 1}. ID: ${cred.id}`);
      console.log(`   User: ${cred.user?.name || "Unknown"} (${cred.user?.email || "No email"})`);
      console.log(`   Broker: ${cred.brokerType}`);
      console.log(`   Demo: ${cred.isDemo}`);
      console.log(`   Created: ${cred.createdAt}`);
      console.log(`   Credentials: ${cred.credentials ? "Encrypted data present" : "NO DATA"}`);
      console.log("");
    });

    // Get all bots and their credential associations
    const bots = await prisma.bot.findMany({
      include: {
        brokerCredential: true,
        user: {
          select: { id: true, name: true },
        },
      },
    });

    console.log(`Found ${bots.length} bot(s):\n`);

    bots.forEach((bot, index) => {
      console.log(`${index + 1}. Bot: ${bot.name} (${bot.id})`);
      console.log(`   User: ${bot.user?.name || "Unknown"}`);
      console.log(`   Trading Pair: ${bot.tradingPairSymbol}`);
      console.log(`   Active: ${bot.isActive}`);
      console.log(`   AI Trading: ${bot.isAiTradingActive}`);
      console.log(
        `   Broker Credential: ${bot.brokerCredential ? bot.brokerCredential.brokerType + " (" + (bot.brokerCredential.isDemo ? "Demo" : "Live") + ")" : "NONE CONFIGURED"}`,
      );
      console.log("");
    });
  } catch (error) {
    console.error("❌ Error checking credentials:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCredentials();
