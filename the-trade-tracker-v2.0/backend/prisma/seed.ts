import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");

  // Load strategy templates from JSON file
  const strategiesPath = path.join(__dirname, "../data/predefined-strategies.json");
  const strategiesData = JSON.parse(fs.readFileSync(strategiesPath, "utf-8"));

  console.log(`📦 Found ${strategiesData.strategies.length} strategy templates to seed`);

  // Seed strategy templates
  for (const strategyData of strategiesData.strategies) {
    console.log(`🔍 Processing strategy: ${strategyData.name}`);

    // Check if template already exists
    const existingTemplate = await prisma.strategyTemplate.findFirst({
      where: { name: strategyData.name },
    });

    if (existingTemplate) {
      // Update existing template
      await prisma.strategyTemplate.update({
        where: { id: existingTemplate.id },
        data: {
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
          isActive: true,
          updatedAt: new Date(),
        },
      });
      console.log(`🔄 Updated existing strategy template "${strategyData.name}"`);
    } else {
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
          isActive: true,
          usageCount: 0,
        },
      });
      console.log(`✅ Created new strategy template "${strategyData.name}"`);
    }
  }

  // Get seeding statistics
  const totalTemplates = await prisma.strategyTemplate.count();
  const templatesByCategory = await prisma.strategyTemplate.groupBy({
    by: ["category"],
    _count: {
      id: true,
    },
  });

  console.log("\n📊 Seeding Statistics:");
  console.log(`📈 Total strategy templates: ${totalTemplates}`);
  console.log("📂 Templates by category:");

  for (const category of templatesByCategory) {
    console.log(`   - ${category.category}: ${category._count.id} templates`);
  }

  console.log("\n🎉 Database seeded successfully! 🌱");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    console.log("🔌 Disconnecting from database...");
    await prisma.$disconnect();
  });
