const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

async function seedStrategyTemplates() {
  try {
    console.log("🌱 Starting strategy templates seeding...");

    // Load strategy templates from JSON file
    const strategiesPath = path.join(__dirname, "../data/predefined-strategies.json");
    const strategiesData = JSON.parse(fs.readFileSync(strategiesPath, "utf-8"));

    console.log(`📦 Found ${strategiesData.strategies.length} strategy templates to seed`);

    // Clear existing templates first (optional - comment out if you want to keep existing)
    // await prisma.strategyTemplate.deleteMany({});
    // console.log('🗑️ Cleared existing strategy templates');

    // Seed strategy templates
    for (const strategyData of strategiesData.strategies) {
      console.log(`🔍 Processing strategy: ${strategyData.name}`);

      // Check if template already exists
      const existingTemplate = await prisma.strategyTemplate.findFirst({
        where: { name: strategyData.name },
      });

      if (existingTemplate) {
        console.log(`⏭️ Strategy template already exists: ${strategyData.name}`);
        continue;
      }

      // Create new template
      await prisma.strategyTemplate.create({
        data: {
          name: strategyData.name,
          category: strategyData.category,
          description: strategyData.description,
          shortDescription: strategyData.shortDescription,
          indicators: strategyData.indicators,
          timeframes: strategyData.timeframes,
          entryConditions: strategyData.entryConditions,
          exitConditions: strategyData.exitConditions,
          riskManagement: strategyData.riskManagement,
          minRiskPerTrade: strategyData.minRiskPerTrade,
          maxRiskPerTrade: strategyData.maxRiskPerTrade,
          confidenceThreshold: strategyData.confidenceThreshold,
          winRateExpected: strategyData.winRateExpected,
          riskRewardRatio: strategyData.riskRewardRatio,
          complexity: strategyData.complexity,
          marketCondition: strategyData.marketCondition,
        },
      });

      console.log(`✅ Created strategy template: ${strategyData.name}`);
    }

    console.log("✅ Strategy templates seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding strategy templates:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding
seedStrategyTemplates().catch((error) => {
  console.error("Failed to seed strategy templates:", error);
  process.exit(1);
});
