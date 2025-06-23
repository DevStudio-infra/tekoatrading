/* eslint-disable no-console */
import { prisma } from "../src/prisma";

async function main() {
  // Create demo user
  const user = await prisma.user.create({
    data: {
      email: "demo@tekoa.ai",
      clerkId: "demo-clerk-id",
    },
  });

  // Create demo portfolio
  const portfolio = await prisma.portfolio.create({
    data: {
      name: "Main Trading Portfolio",
      balance: 50000,
      ownerId: user.id,
    },
  });

  // Create demo strategies
  const strategies = await Promise.all([
    prisma.strategy.create({
      data: {
        name: "Conservative Growth",
        description: "Low-risk strategy focusing on stable returns",
        rules: {
          maxRisk: 0.02,
          stopLoss: 0.05,
          takeProfit: 0.1,
          indicators: ["SMA", "RSI"],
        },
        ownerId: user.id,
      },
    }),
    prisma.strategy.create({
      data: {
        name: "Aggressive Momentum",
        description: "High-risk strategy for maximum returns",
        rules: {
          maxRisk: 0.05,
          stopLoss: 0.08,
          takeProfit: 0.2,
          indicators: ["MACD", "Bollinger"],
        },
        ownerId: user.id,
      },
    }),
  ]);

  // Create demo bots
  const bots = await Promise.all([
    prisma.bot.create({
      data: {
        name: "AAPL Trader Bot",
        isActive: true,
        ownerId: user.id,
        strategyId: strategies[0].id,
      },
    }),
    prisma.bot.create({
      data: {
        name: "Crypto Momentum Bot",
        isActive: false,
        ownerId: user.id,
        strategyId: strategies[1].id,
      },
    }),
  ]);

  // Create demo trades
  await Promise.all([
    prisma.trade.create({
      data: {
        symbol: "AAPL",
        side: "buy",
        quantity: 10,
        price: 150.25,
        status: "completed",
        botId: bots[0].id,
        closedAt: new Date(),
      },
    }),
    prisma.trade.create({
      data: {
        symbol: "TSLA",
        side: "sell",
        quantity: 5,
        price: 245.8,
        status: "pending",
        botId: bots[1].id,
      },
    }),
  ]);

  console.log("✅ Seed data created successfully");
  console.log(`👤 User: ${user.email}`);
  console.log(`💰 Portfolio: $${portfolio.balance}`);
  console.log(`🤖 Bots: ${bots.length}`);
  console.log(`📊 Strategies: ${strategies.length}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
