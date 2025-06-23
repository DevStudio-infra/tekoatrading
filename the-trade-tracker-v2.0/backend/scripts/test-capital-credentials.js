#!/usr/bin/env node

const { BrokerVerificationService } = require("../services/broker-verification.service");
require("dotenv").config();

/**
 * CLI tool to test Capital.com credentials on both demo and live environments
 */
async function testCredentials() {
  console.log("🧪 CAPITAL.COM CREDENTIAL TESTER");
  console.log("=================================\n");

  // Get credentials from environment variables
  const credentials = {
    apiKey: process.env.CAPITAL_API_KEY,
    identifier: process.env.CAPITAL_USERNAME,
    password: process.env.CAPITAL_PASSWORD,
  };

  // Validate credentials are provided
  if (!credentials.apiKey || !credentials.identifier || !credentials.password) {
    console.error("❌ Missing credentials in .env file");
    console.error("Please set:");
    console.error("  CAPITAL_API_KEY=your-api-key");
    console.error("  CAPITAL_USERNAME=your-email-or-username");
    console.error("  CAPITAL_PASSWORD=your-api-password");
    console.error("\nFollow the setup guide in CAPITAL_SETUP_GUIDE.md");
    process.exit(1);
  }

  console.log("🔍 Testing credentials on both demo and live environments...");
  console.log("This may take a few moments...\n");

  try {
    // Test credentials
    const results = await BrokerVerificationService.testCapitalCredentials(credentials);

    // Generate and display report
    const report = BrokerVerificationService.generateVerificationReport(results);
    console.log(report);

    // Exit with appropriate code
    const anySuccess = results.demo.authSuccess || results.live.authSuccess;
    process.exit(anySuccess ? 0 : 1);
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error("\nPossible issues:");
    console.error("  - Invalid API credentials");
    console.error("  - Network connectivity problems");
    console.error("  - Capital.com API is down");
    console.error("\nCheck your credentials and try again.");
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`
🧪 CAPITAL.COM CREDENTIAL TESTER

Usage: node test-capital-credentials.js

This tool tests your Capital.com API credentials on both demo and live environments
to help you understand which one to use for trading.

Environment Variables Required:
  CAPITAL_API_KEY      Your Capital.com API key
  CAPITAL_USERNAME     Your Capital.com login email/username
  CAPITAL_PASSWORD     Your Capital.com API password (not account password)

Examples:
  node test-capital-credentials.js              # Test credentials
  node test-capital-credentials.js --help       # Show this help

The tool will:
  ✅ Test authentication on both demo and live environments
  ✅ Verify market access
  ✅ Check Bitcoin epic availability
  ✅ Provide recommendations for trading setup

For more information, see CAPITAL_SETUP_GUIDE.md
`);
  process.exit(0);
}

// Run the test
if (require.main === module) {
  testCredentials().catch((error) => {
    console.error("Unexpected error:", error);
    process.exit(1);
  });
}

module.exports = { testCredentials };
