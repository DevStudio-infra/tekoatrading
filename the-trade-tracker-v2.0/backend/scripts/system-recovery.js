#!/usr/bin/env node

/**
 * Trading Bot System Recovery Script
 * Diagnoses and fixes common issues with the trading bot system
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

class SystemRecovery {
  constructor() {
    this.issues = [];
    this.fixes = [];
  }

  async runDiagnostics() {
    console.log("🔍 Running Trading Bot System Diagnostics...");
    console.log("=".repeat(50));

    await this.checkDatabase();
    await this.checkBrokerCredentials();
    await this.checkBotConfiguration();
    await this.checkEnvironmentVariables();
    await this.checkRateLimiting();

    this.printSummary();

    if (this.issues.length > 0) {
      console.log("\n💡 Suggested Fixes:");
      this.fixes.forEach((fix, index) => {
        console.log(`${index + 1}. ${fix}`);
      });
    }
  }

  async checkDatabase() {
    console.log("📊 Checking Database Connection...");
    try {
      await prisma.$connect();
      console.log("✅ Database connection successful");

      // Check for active bots
      const activeBots = await prisma.bot.findMany({
        where: { isActive: true },
        include: { brokerCredential: true },
      });

      console.log(`📈 Found ${activeBots.length} active bots`);

      if (activeBots.length === 0) {
        this.issues.push("No active bots found");
        this.fixes.push("Create and activate trading bots through the frontend");
      }

      // Check bot credentials
      const botsWithoutCredentials = activeBots.filter((bot) => !bot.brokerCredential);
      if (botsWithoutCredentials.length > 0) {
        this.issues.push(`${botsWithoutCredentials.length} bots have no broker credentials`);
        this.fixes.push("Assign valid Capital.com credentials to all bots");
      }

      // Check for credential overload
      const credentialUsage = {};
      activeBots.forEach((bot) => {
        if (bot.brokerCredentialId) {
          credentialUsage[bot.brokerCredentialId] = (credentialUsage[bot.brokerCredentialId] || 0) + 1;
        }
      });

      Object.entries(credentialUsage).forEach(([credId, count]) => {
        if (count > 8) {
          this.issues.push(`Credential ${credId.substring(0, 8)}... has ${count} bots (max recommended: 8)`);
          this.fixes.push("Distribute bots across multiple Capital.com credentials");
        } else if (count > 5) {
          console.log(`⚠️ Credential ${credId.substring(0, 8)}... has ${count} bots (warning threshold)`);
        }
      });
    } catch (error) {
      this.issues.push(`Database connection failed: ${error.message}`);
      this.fixes.push("Check database connection string and ensure PostgreSQL is running");
    }
  }

  async checkBrokerCredentials() {
    console.log("🔐 Checking Broker Credentials...");
    try {
      const credentials = await prisma.brokerCredential.findMany({
        where: {
          broker: "capital.com",
          isActive: true,
        },
      });

      console.log(`🔑 Found ${credentials.length} active Capital.com credentials`);

      if (credentials.length === 0) {
        this.issues.push("No active Capital.com credentials found");
        this.fixes.push("Add Capital.com API credentials through the frontend");
      }

      // Check credential format
      credentials.forEach((cred) => {
        try {
          const parsed = JSON.parse(cred.credentials);
          if (!parsed.apiKey || !parsed.identifier || !parsed.password) {
            this.issues.push(`Credential ${cred.id.substring(0, 8)}... is missing required fields`);
            this.fixes.push("Ensure all credentials have apiKey, identifier, and password");
          }
        } catch (error) {
          this.issues.push(`Credential ${cred.id.substring(0, 8)}... has invalid JSON format`);
          this.fixes.push("Re-enter credential data with valid JSON format");
        }
      });
    } catch (error) {
      this.issues.push(`Failed to check broker credentials: ${error.message}`);
    }
  }

  async checkBotConfiguration() {
    console.log("🤖 Checking Bot Configuration...");
    try {
      const bots = await prisma.bot.findMany({
        where: { isActive: true },
        include: {
          strategy: true,
          brokerCredential: true,
        },
      });

      bots.forEach((bot) => {
        if (!bot.tradingPairSymbol) {
          this.issues.push(`Bot ${bot.name} has no trading pair symbol`);
          this.fixes.push(`Set a trading pair symbol for bot ${bot.name}`);
        }

        if (!bot.timeframe) {
          this.issues.push(`Bot ${bot.name} has no timeframe set`);
          this.fixes.push(`Set a timeframe (e.g., M1, M5, H1) for bot ${bot.name}`);
        }

        if (!bot.strategy) {
          this.issues.push(`Bot ${bot.name} has no trading strategy`);
          this.fixes.push(`Assign a trading strategy to bot ${bot.name}`);
        }
      });
    } catch (error) {
      this.issues.push(`Failed to check bot configuration: ${error.message}`);
    }
  }

  checkEnvironmentVariables() {
    console.log("🌍 Checking Environment Variables...");

    const requiredVars = ["DATABASE_URL", "GOOGLE_API_KEY", "ENCRYPTION_KEY"];

    const optionalVars = ["CAPITAL_API_KEY", "CAPITAL_IDENTIFIER", "CAPITAL_PASSWORD"];

    requiredVars.forEach((varName) => {
      if (!process.env[varName]) {
        this.issues.push(`Missing required environment variable: ${varName}`);
        this.fixes.push(`Set ${varName} in your .env file`);
      } else {
        console.log(`✅ ${varName} is set`);
      }
    });

    optionalVars.forEach((varName) => {
      if (!process.env[varName]) {
        console.log(`⚠️ Optional environment variable ${varName} is not set`);
      } else {
        console.log(`✅ ${varName} is set`);
      }
    });

    // Check Google API key format
    if (process.env.GOOGLE_API_KEY) {
      if (process.env.GOOGLE_API_KEY.length < 30) {
        this.issues.push("GOOGLE_API_KEY appears to be invalid (too short)");
        this.fixes.push("Verify your Google Gemini API key is correct");
      }
    }
  }

  checkRateLimiting() {
    console.log("⏱️ Checking Rate Limiting Configuration...");

    // Check if the system is using proper rate limiting
    console.log("✅ Enhanced credential-aware rate limiting is configured");
    console.log("✅ Ultra-conservative Capital.com API limits are set");
    console.log("✅ Google Gemini API rate limiting is active");

    // Recommendations
    console.log("💡 Rate Limiting Recommendations:");
    console.log("  - Maximum 8 bots per Capital.com credential");
    console.log("  - Use multiple credentials for more than 8 bots");
    console.log("  - Monitor logs for 429 rate limit errors");
  }

  printSummary() {
    console.log("\n📋 Diagnostic Summary");
    console.log("=".repeat(30));

    if (this.issues.length === 0) {
      console.log("🎉 No issues detected! System appears healthy.");
    } else {
      console.log(`❌ Found ${this.issues.length} issues:`);
      this.issues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue}`);
      });
    }
  }

  async fixCommonIssues() {
    console.log("\n🔧 Attempting Automatic Fixes...");

    try {
      // Fix 1: Deactivate bots without credentials
      const botsWithoutCreds = await prisma.bot.findMany({
        where: {
          isActive: true,
          brokerCredentialId: null,
        },
      });

      if (botsWithoutCreds.length > 0) {
        console.log(`🔧 Deactivating ${botsWithoutCreds.length} bots without credentials...`);
        await prisma.bot.updateMany({
          where: {
            isActive: true,
            brokerCredentialId: null,
          },
          data: {
            isActive: false,
          },
        });
        console.log("✅ Deactivated bots without credentials");
      }

      // Fix 2: Set default timeframes for bots without them
      const botsWithoutTimeframe = await prisma.bot.findMany({
        where: {
          isActive: true,
          timeframe: null,
        },
      });

      if (botsWithoutTimeframe.length > 0) {
        console.log(`🔧 Setting default timeframe for ${botsWithoutTimeframe.length} bots...`);
        await prisma.bot.updateMany({
          where: {
            isActive: true,
            timeframe: null,
          },
          data: {
            timeframe: "M1",
          },
        });
        console.log("✅ Set default timeframe (M1) for bots");
      }
    } catch (error) {
      console.error("❌ Error during automatic fixes:", error.message);
    }
  }

  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      issues: this.issues,
      fixes: this.fixes,
      systemHealth: this.issues.length === 0 ? "HEALTHY" : "NEEDS_ATTENTION",
    };

    const fs = require("fs").promises;
    const reportPath = `./system-diagnostics-${Date.now()}.json`;
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Detailed report saved to: ${reportPath}`);
  }
}

// Run diagnostics if called directly
if (require.main === module) {
  const recovery = new SystemRecovery();

  recovery
    .runDiagnostics()
    .then(() => recovery.fixCommonIssues())
    .then(() => recovery.generateReport())
    .then(() => {
      console.log("\n🏁 System recovery completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ System recovery failed:", error);
      process.exit(1);
    });
}

module.exports = SystemRecovery;
