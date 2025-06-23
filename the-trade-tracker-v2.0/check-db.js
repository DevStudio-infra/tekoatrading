const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log("Checking database...");

    // Check users
    const users = await prisma.user.findMany();
    console.log(
      `Found ${users.length} users:`,
      users.map((u) => ({ id: u.id, email: u.email }))
    );

    // Check bots
    const bots = await prisma.bot.findMany({
      include: {
        user: true,
        evaluations: true,
      },
    });
    console.log(
      `Found ${bots.length} bots:`,
      bots.map((b) => ({
        id: b.id,
        name: b.name,
        userId: b.userId,
        userEmail: b.user?.email,
        evaluationsCount: b.evaluations?.length || 0,
      }))
    );

    // Check evaluations
    const evaluations = await prisma.evaluation.findMany();
    console.log(
      `Found ${evaluations.length} evaluations:`,
      evaluations.map((e) => ({
        id: e.id,
        botId: e.botId,
        createdAt: e.createdAt,
      }))
    );

    // If no users, create a development user
    if (users.length === 0) {
      console.log("Creating development user...");
      const devUser = await prisma.user.create({
        data: {
          clerkId: "dev-user-" + Date.now(),
          email: "dev@example.com",
        },
      });
      console.log("Created dev user:", devUser);

      // Create a sample bot
      console.log("Creating sample bot...");
      const sampleBot = await prisma.bot.create({
        data: {
          name: "Sample Trading Bot",
          tradingPairSymbol: "BTCUSD",
          timeframe: "M5",
          maxSimultaneousTrades: 3,
          isActive: true,
          isAiTradingActive: false,
          userId: devUser.id,
          strategyId: "sample-strategy",
          brokerCredentialId: "sample-broker",
          aiConfig: {
            riskPercentage: 2,
            stopLossPercentage: 1,
            takeProfitPercentage: 3,
          },
        },
      });
      console.log("Created sample bot:", sampleBot);

      // Create a sample evaluation
      console.log("Creating sample evaluation...");
      const sampleEvaluation = await prisma.evaluation.create({
        data: {
          botId: sampleBot.id,
          tradingSignal: "BUY",
          confidenceScore: 85,
          profitLoss: 2.5,
          startDate: new Date(),
          endDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours later
          chartUrl: "/sample-chart.png",
          aiAnalysis: "Strong bullish signal detected with high confidence. RSI indicates oversold conditions and MACD shows positive divergence.",
        },
      });
      console.log("Created sample evaluation:", sampleEvaluation);
    }
  } catch (error) {
    console.error("Database check failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
