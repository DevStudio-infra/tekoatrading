/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Create demo users
  const demoUser = await prisma.user.upsert({
    where: { email: "demo@tekoatrading.com" },
    update: {},
    create: {
      email: "demo@tekoatrading.com",
      name: "Demo User",
    },
  });

  const traderUser = await prisma.user.upsert({
    where: { email: "trader@tekoatrading.com" },
    update: {},
    create: {
      email: "trader@tekoatrading.com",
      name: "Professional Trader",
    },
  });

  console.log("✅ Created demo users");

  // Create broker credentials
  const demoCredential = await prisma.brokerCredential.create({
    data: {
      userId: demoUser.id,
      name: "Capital.com Demo",
      broker: "capital.com",
      isDemo: true,
      credentials: {
        apiKey: "demo_api_key_123",
        identifier: "demo_user",
        password: "demo_password",
      },
    },
  });

  const liveCredential = await prisma.brokerCredential.create({
    data: {
      userId: traderUser.id,
      name: "Capital.com Live",
      broker: "capital.com",
      isDemo: false,
      credentials: {
        apiKey: "live_api_key_456",
        identifier: "live_user",
        password: "live_password",
      },
    },
  });

  console.log("✅ Created broker credentials");

  // Create trading strategies
  const scalping = await prisma.strategy.create({
    data: {
      userId: demoUser.id,
      name: "Scalping Strategy",
      description: "High-frequency trading with quick profits",
      indicators: ["sma_20", "rsi", "macd"],
      parameters: {
        riskPercentage: 1,
        stopLoss: 0.5,
        takeProfit: 1.0,
        maxPositionSize: 50,
      },
      isTemplate: true,
    },
  });

  const swingTrading = await prisma.strategy.create({
    data: {
      userId: traderUser.id,
      name: "Swing Trading",
      description: "Medium-term trading with trend following",
      indicators: ["sma_50", "sma_200", "bollinger", "rsi"],
      parameters: {
        riskPercentage: 2,
        stopLoss: 2.0,
        takeProfit: 4.0,
        maxPositionSize: 100,
      },
      isTemplate: true,
    },
  });

  const aiStrategy = await prisma.strategy.create({
    data: {
      userId: demoUser.id,
      name: "AI Multi-Timeframe",
      description: "Advanced AI strategy with multiple timeframe analysis",
      indicators: ["sma_20", "sma_50", "sma_200", "rsi", "macd", "bollinger", "stochastic"],
      parameters: {
        riskPercentage: 1.5,
        stopLoss: 1.5,
        takeProfit: 3.0,
        maxPositionSize: 75,
        confidence_threshold: 70,
        multi_timeframe: true,
      },
      isTemplate: false,
    },
  });

  console.log("✅ Created trading strategies");

  // Create trading bots
  const btcBot = await prisma.bot.create({
    data: {
      userId: demoUser.id,
      name: "BTC Scalper",
      description: "Bitcoin scalping bot using AI analysis",
      tradingPairSymbol: "BTC/USD",
      timeframe: "M5",
      isActive: true,
      isAiTradingActive: true,
      maxPositionSize: 0.01,
      riskPercentage: 1.5,
      strategyId: scalping.id,
      brokerCredentialId: demoCredential.id,
      totalTrades: 45,
      winningTrades: 32,
      totalProfit: 1250.75,
      maxDrawdown: -180.5,
      lastEvaluationAt: new Date(),
    },
  });

  const ethBot = await prisma.bot.create({
    data: {
      userId: demoUser.id,
      name: "ETH Swing Trader",
      description: "Ethereum swing trading with trend analysis",
      tradingPairSymbol: "ETH/USD",
      timeframe: "H1",
      isActive: true,
      isAiTradingActive: false,
      maxPositionSize: 0.5,
      riskPercentage: 2.0,
      strategyId: swingTrading.id,
      brokerCredentialId: demoCredential.id,
      totalTrades: 23,
      winningTrades: 16,
      totalProfit: 890.25,
      maxDrawdown: -120.0,
      lastEvaluationAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    },
  });

  const forexBot = await prisma.bot.create({
    data: {
      userId: traderUser.id,
      name: "EUR/USD AI Trader",
      description: "Professional forex trading with AI decision making",
      tradingPairSymbol: "EUR/USD",
      timeframe: "M15",
      isActive: true,
      isAiTradingActive: true,
      maxPositionSize: 1000,
      riskPercentage: 1.0,
      strategyId: aiStrategy.id,
      brokerCredentialId: liveCredential.id,
      totalTrades: 67,
      winningTrades: 48,
      totalProfit: 2340.8,
      maxDrawdown: -285.2,
      lastEvaluationAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
    },
  });

  console.log("✅ Created trading bots");

  // Create portfolios
  const demoPortfolio = await prisma.portfolio.create({
    data: {
      userId: demoUser.id,
      name: "Demo Trading Portfolio",
      balance: 10000.0,
      currency: "USD",
      totalValue: 12140.75,
      totalPnL: 2140.75,
      totalPnLPercent: 21.41,
      dayPnL: 125.3,
      dayPnLPercent: 1.25,
    },
  });

  const livePortfolio = await prisma.portfolio.create({
    data: {
      userId: traderUser.id,
      name: "Live Trading Portfolio",
      balance: 25000.0,
      currency: "USD",
      totalValue: 27340.8,
      totalPnL: 2340.8,
      totalPnLPercent: 9.36,
      dayPnL: 180.5,
      dayPnLPercent: 0.72,
    },
  });

  console.log("✅ Created portfolios");

  // Create evaluations
  const btcEvaluation1 = await prisma.evaluation.create({
    data: {
      userId: demoUser.id,
      botId: btcBot.id,
      symbol: "BTC/USD",
      timeframe: "M5",
      chartUrl: "/charts/btc-usd-m5-latest.png",
      decision: "EXECUTE_TRADE",
      confidence: 85.5,
      reasoning: "Strong bullish momentum with RSI oversold bounce and MACD crossover",
      chartAnalysis:
        "Price broke above 20-period SMA with strong volume. RSI showing bullish divergence.",
      riskScore: 3.2,
      positionSize: 0.01,
      stopLoss: 42500.0,
      takeProfit: 44200.0,
      marketPrice: 43000.0,
      aiResponse: {
        technicalAnalysis: { trend: "bullish", strength: 8.5 },
        riskAssessment: { risk: "medium", confidence: 85.5 },
      },
      portfolioData: { balance: 10000, totalPnL: 2140.75 },
      startDate: new Date(),
      endDate: new Date(Date.now() + 5 * 60 * 1000),
      duration: 300000,
      success: true,
    },
  });

  const ethEvaluation1 = await prisma.evaluation.create({
    data: {
      userId: demoUser.id,
      botId: ethBot.id,
      symbol: "ETH/USD",
      timeframe: "H1",
      chartUrl: "/charts/eth-usd-h1-latest.png",
      decision: "HOLD",
      confidence: 65.2,
      reasoning: "Mixed signals - price in consolidation range, waiting for clear breakout",
      chartAnalysis: "Price trading between support and resistance. Volume declining.",
      riskScore: 4.8,
      positionSize: 0.5,
      marketPrice: 2450.0,
      aiResponse: {
        technicalAnalysis: { trend: "sideways", strength: 6.5 },
        riskAssessment: { risk: "medium-high", confidence: 65.2 },
      },
      portfolioData: { balance: 10000, totalPnL: 890.25 },
      startDate: new Date(Date.now() - 2 * 60 * 60 * 1000),
      endDate: new Date(Date.now() - 2 * 60 * 60 * 1000 + 3 * 60 * 1000),
      duration: 180000,
      success: true,
    },
  });

  console.log("✅ Created evaluations");

  // Create trades
  const btcTrade1 = await prisma.trade.create({
    data: {
      userId: demoUser.id,
      botId: btcBot.id,
      symbol: "BTC/USD",
      side: "BUY",
      type: "MARKET",
      size: 0.01,
      entryPrice: 43000.0,
      exitPrice: 43650.0,
      stopLoss: 42500.0,
      takeProfit: 44200.0,
      status: "CLOSED",
      profitLoss: 6.5,
      profitLossUsd: 6.5,
      commission: 0.15,
      brokerOrderId: "CAP_ORD_001",
      brokerTradeId: "CAP_TRD_001",
      reason: "AI detected bullish momentum with high confidence",
      confidence: 85.5,
      evaluationId: btcEvaluation1.id,
      openedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
      closedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    },
  });

  const btcTrade2 = await prisma.trade.create({
    data: {
      userId: demoUser.id,
      botId: btcBot.id,
      symbol: "BTC/USD",
      side: "SELL",
      type: "MARKET",
      size: 0.01,
      entryPrice: 42800.0,
      exitPrice: 42200.0,
      stopLoss: 43300.0,
      takeProfit: 41800.0,
      status: "CLOSED",
      profitLoss: 6.0,
      profitLossUsd: 6.0,
      commission: 0.15,
      brokerOrderId: "CAP_ORD_002",
      brokerTradeId: "CAP_TRD_002",
      reason: "AI detected bearish reversal pattern",
      confidence: 78.2,
      openedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
      closedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    },
  });

  const ethTrade1 = await prisma.trade.create({
    data: {
      userId: demoUser.id,
      botId: ethBot.id,
      symbol: "ETH/USD",
      side: "BUY",
      type: "LIMIT",
      size: 0.5,
      entryPrice: 2400.0,
      exitPrice: 2520.0,
      stopLoss: 2350.0,
      takeProfit: 2550.0,
      status: "CLOSED",
      profitLoss: 60.0,
      profitLossUsd: 60.0,
      commission: 1.2,
      brokerOrderId: "CAP_ORD_003",
      brokerTradeId: "CAP_TRD_003",
      reason: "Manual swing trade execution",
      openedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      closedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    },
  });

  console.log("✅ Created trades");

  // Create active positions
  const btcPosition = await prisma.position.create({
    data: {
      botId: btcBot.id,
      symbol: "BTC/USD",
      side: "BUY",
      size: 0.01,
      entryPrice: 43100.0,
      currentPrice: 43250.0,
      stopLoss: 42600.0,
      takeProfit: 44300.0,
      unrealizedPnL: 1.5,
      unrealizedPnLUsd: 1.5,
      brokerPositionId: "CAP_POS_001",
      openedAt: new Date(Date.now() - 30 * 60 * 1000),
    },
  });

  const forexPosition = await prisma.position.create({
    data: {
      botId: forexBot.id,
      symbol: "EUR/USD",
      side: "SELL",
      size: 1000,
      entryPrice: 1.085,
      currentPrice: 1.0835,
      stopLoss: 1.088,
      takeProfit: 1.08,
      unrealizedPnL: 15.0,
      unrealizedPnLUsd: 15.0,
      brokerPositionId: "CAP_POS_002",
      openedAt: new Date(Date.now() - 45 * 60 * 1000),
    },
  });

  console.log("✅ Created positions");

  // Create market data samples
  const btcMarketData = await prisma.marketData.createMany({
    data: [
      {
        userId: demoUser.id,
        symbol: "BTC/USD",
        timeframe: "M5",
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        open: 43000,
        high: 43150,
        low: 42950,
        close: 43100,
        volume: 1250000,
      },
      {
        userId: demoUser.id,
        symbol: "BTC/USD",
        timeframe: "M5",
        timestamp: new Date(Date.now() - 10 * 60 * 1000),
        open: 42950,
        high: 43050,
        low: 42900,
        close: 43000,
        volume: 980000,
      },
    ],
  });

  console.log("✅ Created market data");

  // Create notifications
  const notifications = await prisma.notification.createMany({
    data: [
      {
        userId: demoUser.id,
        type: "TRADE",
        title: "Trade Executed",
        message: "BTC Scalper executed a BUY order for 0.01 BTC at $43,100",
        data: { botId: btcBot.id, tradeId: btcTrade1.id },
      },
      {
        userId: demoUser.id,
        type: "ALERT",
        title: "Bot Evaluation Complete",
        message: "BTC Scalper completed analysis with 85.5% confidence",
        data: { botId: btcBot.id, evaluationId: btcEvaluation1.id },
      },
      {
        userId: traderUser.id,
        type: "SYSTEM",
        title: "Welcome to Tekoa Trading",
        message: "Your account has been set up successfully",
        data: {},
      },
    ],
  });

  console.log("✅ Created notifications");

  // Create chart images metadata
  const chartImages = await prisma.chartImage.createMany({
    data: [
      {
        filename: "btc-usd-m5-latest.png",
        symbol: "BTC/USD",
        timeframe: "M5",
        url: "/charts/btc-usd-m5-latest.png",
        metadata: {
          indicators: ["sma_20", "rsi", "macd"],
          generated_at: new Date().toISOString(),
          bot_id: btcBot.id,
        },
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
      {
        filename: "eth-usd-h1-latest.png",
        symbol: "ETH/USD",
        timeframe: "H1",
        url: "/charts/eth-usd-h1-latest.png",
        metadata: {
          indicators: ["sma_50", "bollinger", "rsi"],
          generated_at: new Date().toISOString(),
          bot_id: ethBot.id,
        },
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    ],
  });

  console.log("✅ Created chart images metadata");

  console.log("🎉 Database seeded successfully!");
  console.log("\n📊 Created data summary:");
  console.log(`👥 Users: 2 (Demo User, Professional Trader)`);
  console.log(`🔑 Broker Credentials: 2 (Demo & Live)`);
  console.log(`📈 Strategies: 3 (Scalping, Swing Trading, AI Multi-Timeframe)`);
  console.log(`🤖 Bots: 3 (BTC Scalper, ETH Swing Trader, EUR/USD AI Trader)`);
  console.log(`💼 Portfolios: 2 (Demo: $12,140.75, Live: $27,340.80)`);
  console.log(`📋 Evaluations: 2 (Recent AI analysis results)`);
  console.log(`💹 Trades: 3 (Mixed profitable trades)`);
  console.log(`📍 Positions: 2 (Active BTC and EUR/USD positions)`);
  console.log(`📊 Market Data: Sample OHLCV data`);
  console.log(`🔔 Notifications: 3 (Trade alerts and system messages)`);
  console.log(`📈 Chart Images: 2 (BTC and ETH chart metadata)`);
  console.log("\n✨ Ready for sophisticated trading platform testing!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
