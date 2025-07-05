#!/usr/bin/env node

import { CapitalTradingTests } from "./capital-trading-tests";
import { logger } from "../logger";

async function runTests() {
  console.log("🚀 Starting Capital.com Trading Tests...");
  console.log("⚠️  Warning: This will create and close real test positions");
  console.log("💡 Using demo account for safety\n");

  const tests = new CapitalTradingTests();

  try {
    await tests.runAllTests();
    console.log("✅ All tests completed successfully!");
  } catch (error) {
    console.error("❌ Test suite failed:", error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

// Run the tests
runTests();
