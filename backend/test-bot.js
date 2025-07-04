require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function testBotEvaluation() {
  console.log("🧪 Testing Bot Evaluation");

  try {
    // Get the first active bot
    const bot = await prisma.bot.findFirst({
      where: {
        isActive: true,
      },
      include: {
        user: true,
        strategy: true,
        brokerCredential: true,
      },
    });

    if (!bot) {
      console.log("❌ No active bots found");
      return;
    }

    console.log(`Found bot: ${bot.name} (${bot.id})`);
    console.log(`Symbol: ${bot.tradingPairSymbol}`);
    console.log(`Timeframe: ${bot.timeframe}`);
    console.log(`AI Trading Active: ${bot.isAiTradingActive}`);

    if (!bot.brokerCredential) {
      console.log("❌ Bot has no broker credentials");
      return;
    }

    console.log(`Broker: ${bot.brokerCredential.broker}`);
    console.log(`Demo: ${bot.brokerCredential.isDemo}`);

    // Make a request to the evaluation endpoint
    const fetch = require("node-fetch");

    const response = await fetch(`http://localhost:3001/api/trpc/bots.evaluateBot`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        0: {
          botId: bot.id,
        },
      }),
    });

    const result = await response.text();
    console.log("Response status:", response.status);
    console.log("Response:", result);

    if (response.ok) {
      console.log("✅ Bot evaluation test completed successfully");
    } else {
      console.log("❌ Bot evaluation test failed");
    }
  } catch (error) {
    console.error("❌ Test error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Alternative: Direct service test
async function testBotServiceDirectly() {
  console.log("\n🔧 Testing Bot Service Directly");

  try {
    // Import the Enhanced service dynamically
    const {
      EnhancedBotEvaluationService,
    } = require("./dist/services/enhanced-bot-evaluation.service.js");

    const botService = new EnhancedBotEvaluationService();

    // Get a bot ID
    const bot = await prisma.bot.findFirst({
      where: { isActive: true },
    });

    if (!bot) {
      console.log("❌ No active bots found");
      return;
    }

    console.log(`Testing direct evaluation of bot: ${bot.id}`);

    const result = await botService.evaluateBot(bot.id);

    console.log("Direct evaluation result:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("❌ Direct service test error:", error.message);
    console.error("Stack:", error.stack);
  }
}

console.log("Starting bot evaluation tests...");
console.log("Make sure the backend server is running on localhost:3001");

testBotEvaluation()
  .then(() => testBotServiceDirectly())
  .catch(console.error);
