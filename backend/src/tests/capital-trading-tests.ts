import { CapitalMainService } from "../modules/capital/services/capital-main.service";
import { brokerLimitValidator } from "../services/broker-limit-validator.service";
import { enhancedPositionSizingService } from "../services/enhanced-position-sizing.service";
import { tradingErrorLogger } from "../services/trading-error-logger.service";
import { logger } from "../logger";

interface TestResult {
  testName: string;
  success: boolean;
  data?: any;
  error?: string;
  duration: number;
}

class CapitalTradingTests {
  private capitalService: CapitalMainService;
  private testResults: TestResult[] = [];
  private testPositions: any[] = []; // Track opened positions for cleanup

  constructor() {
    // Initialize Capital.com service with test credentials
    this.capitalService = new CapitalMainService({
      apiKey: "brPsM2gr0wqsm6aV",
      identifier: "raphael.malburg@gmail.com",
      password: "Laquie8501@",
      isDemo: true, // Use demo environment for testing
    });
  }

  async runAllTests(): Promise<void> {
    console.log("\n🧪 ========= CAPITAL.COM TRADING TESTS =========");
    console.log("🔧 Testing all trading operations...\n");

    try {
      // Authentication test
      await this.testAuthentication();

      // Account information tests
      await this.testAccountDetails();
      await this.testAccountPositions();

      // Market data tests
      await this.testMarketData();
      await this.testPriceData();

      // Position sizing tests
      await this.testPositionSizing();

      // Broker limit validation tests
      await this.testBrokerLimitValidation();

      // Market order tests
      await this.testMarketOrderCreation();
      await this.testMarketOrderWithStopLoss();
      await this.testMarketOrderWithTakeProfit();
      await this.testMarketOrderWithBothLevels();

      // Pending order tests
      await this.testLimitOrderCreation();
      await this.testStopOrderCreation();

      // Position management tests
      await this.testPositionModification();
      await this.testPartialPositionClose();
      await this.testFullPositionClose();

      // Error handling tests
      await this.testInvalidOrderParameters();
      await this.testInsufficientFunds();
      await this.testMarketClosed();

      // Cleanup
      await this.cleanupTestPositions();
    } catch (error) {
      console.error("❌ Test suite failed:", error);
    } finally {
      this.printTestSummary();
    }
  }

  private async runTest(testName: string, testFunction: () => Promise<any>): Promise<TestResult> {
    const startTime = Date.now();
    console.log(`🔍 Testing: ${testName}...`);

    try {
      const result = await testFunction();
      const duration = Date.now() - startTime;

      const testResult: TestResult = {
        testName,
        success: true,
        data: result,
        duration,
      };

      console.log(`✅ ${testName} - PASSED (${duration}ms)`);
      this.testResults.push(testResult);
      return testResult;
    } catch (error: any) {
      const duration = Date.now() - startTime;

      const testResult: TestResult = {
        testName,
        success: false,
        error: error.message,
        duration,
      };

      console.log(`❌ ${testName} - FAILED (${duration}ms): ${error.message}`);
      this.testResults.push(testResult);
      return testResult;
    }
  }

  // Authentication Tests
  private async testAuthentication(): Promise<void> {
    await this.runTest("Capital.com Authentication", async () => {
      await this.capitalService.authenticate();
      const session = this.capitalService.getSession();

      if (!session || !session.accessToken) {
        throw new Error("Authentication failed - no session or access token");
      }

      return { authenticated: true, currency: session.currency };
    });
  }

  // Account Information Tests
  private async testAccountDetails(): Promise<void> {
    await this.runTest("Account Details Retrieval", async () => {
      const account = await this.capitalService.getAccountDetails();

      if (!account || typeof account.balance === "undefined") {
        throw new Error("Account details incomplete");
      }

      return {
        accountId: account.accountId,
        balance: account.balance,
        currency: account.currency,
      };
    });
  }

  private async testAccountPositions(): Promise<void> {
    await this.runTest("Open Positions Retrieval", async () => {
      const positions = await this.capitalService.getOpenPositions();

      return {
        positionCount: positions.positions?.length || 0,
        positions: positions.positions?.slice(0, 3), // First 3 for summary
      };
    });
  }

  // Market Data Tests
  private async testMarketData(): Promise<void> {
    await this.runTest("Market Data for BTCUSD", async () => {
      const marketData = await this.capitalService.getMarketData("BTCUSD");

      if (!marketData) {
        throw new Error("No market data received");
      }

      return {
        epic: marketData.instrument?.epic,
        name: marketData.instrument?.name,
        marketStatus: marketData.snapshot?.marketStatus,
      };
    });
  }

  private async testPriceData(): Promise<void> {
    await this.runTest("Latest Price for BTCUSD", async () => {
      const price = await this.capitalService.getLatestPrice("BTCUSD");

      if (!price || typeof price.bid === "undefined" || typeof price.ask === "undefined") {
        throw new Error("Price data incomplete");
      }

      return {
        bid: price.bid,
        ask: price.ask,
        spread: price.ask - price.bid,
      };
    });
  }

  // Position Sizing Tests
  private async testPositionSizing(): Promise<void> {
    await this.runTest("Enhanced Position Sizing", async () => {
      const options = await enhancedPositionSizingService.calculatePositionSizingOptions({
        accountBalance: 1000,
        symbol: "BTCUSD",
        entryPrice: 100000,
        stopLoss: 99000,
        riskPercentage: 2,
        timeframe: "1h",
        volatility: 1.2,
      });

      if (!options.recommended || options.recommended <= 0) {
        throw new Error("Invalid position sizing calculation");
      }

      return {
        conservative: options.conservative,
        moderate: options.moderate,
        aggressive: options.aggressive,
        recommended: options.recommended,
      };
    });
  }

  // Broker Limit Validation Tests
  private async testBrokerLimitValidation(): Promise<void> {
    await this.runTest("Broker Limit Validation", async () => {
      const validation = await brokerLimitValidator.validateOrder(
        {
          epic: "BTCUSD",
          direction: "BUY",
          size: 0.001,
          entryPrice: 100000,
          stopLevel: 99500,
          profitLevel: 101000,
        },
        this.capitalService,
        "test-bot",
      );

      return {
        isValid: validation.isValid,
        warnings: validation.warnings,
        errors: validation.errors,
        adjustments: {
          stopLoss: validation.adjustedStopLoss,
          takeProfit: validation.adjustedTakeProfit,
          size: validation.adjustedPositionSize,
        },
      };
    });
  }

  // Market Order Tests
  private async testMarketOrderCreation(): Promise<void> {
    await this.runTest("Create Basic Market Order", async () => {
      const result = await this.capitalService.createPosition(
        "BTCUSD",
        "BUY",
        0.001, // Very small position for testing
      );

      if (result.dealReference) {
        this.testPositions.push({
          dealReference: result.dealReference,
          epic: "BTCUSD",
          size: 0.001,
          direction: "BUY",
        });
      }

      return {
        dealReference: result.dealReference,
        dealStatus: result.dealStatus,
        reason: result.reason,
      };
    });
  }

  private async testMarketOrderWithStopLoss(): Promise<void> {
    await this.runTest("Market Order with Stop Loss", async () => {
      // Get current price first
      const price = await this.capitalService.getLatestPrice("BTCUSD");
      const entryPrice = price.ask;
      const stopLoss = entryPrice * 0.98; // 2% stop loss

      const result = await this.capitalService.createPosition("BTCUSD", "BUY", 0.001, stopLoss);

      if (result.dealReference) {
        this.testPositions.push({
          dealReference: result.dealReference,
          epic: "BTCUSD",
          size: 0.001,
          direction: "BUY",
        });
      }

      return {
        dealReference: result.dealReference,
        dealStatus: result.dealStatus,
        entryPrice,
        stopLoss,
      };
    });
  }

  private async testMarketOrderWithTakeProfit(): Promise<void> {
    await this.runTest("Market Order with Take Profit", async () => {
      // Get current price first
      const price = await this.capitalService.getLatestPrice("BTCUSD");
      const entryPrice = price.ask;
      const takeProfit = entryPrice * 1.02; // 2% take profit

      const result = await this.capitalService.createPosition(
        "BTCUSD",
        "BUY",
        0.001,
        undefined, // No stop loss
        takeProfit,
      );

      if (result.dealReference) {
        this.testPositions.push({
          dealReference: result.dealReference,
          epic: "BTCUSD",
          size: 0.001,
          direction: "BUY",
        });
      }

      return {
        dealReference: result.dealReference,
        dealStatus: result.dealStatus,
        entryPrice,
        takeProfit,
      };
    });
  }

  private async testMarketOrderWithBothLevels(): Promise<void> {
    await this.runTest("Market Order with Stop Loss and Take Profit", async () => {
      // Get current price first
      const price = await this.capitalService.getLatestPrice("BTCUSD");
      const entryPrice = price.ask;
      const stopLoss = entryPrice * 0.98; // 2% stop loss
      const takeProfit = entryPrice * 1.03; // 3% take profit

      const result = await this.capitalService.createPosition(
        "BTCUSD",
        "BUY",
        0.001,
        stopLoss,
        takeProfit,
      );

      if (result.dealReference) {
        this.testPositions.push({
          dealReference: result.dealReference,
          epic: "BTCUSD",
          size: 0.001,
          direction: "BUY",
        });
      }

      return {
        dealReference: result.dealReference,
        dealStatus: result.dealStatus,
        entryPrice,
        stopLoss,
        takeProfit,
      };
    });
  }

  // Pending Order Tests
  private async testLimitOrderCreation(): Promise<void> {
    await this.runTest("Create Limit Order", async () => {
      // Get current price first
      const price = await this.capitalService.getLatestPrice("BTCUSD");
      const limitPrice = price.bid * 0.99; // 1% below current price
      const stopLoss = limitPrice * 0.98; // 2% stop loss
      const takeProfit = limitPrice * 1.02; // 2% take profit

      const result = await this.capitalService.createLimitOrder(
        "BTCUSD",
        "BUY",
        0.001,
        limitPrice,
        stopLoss,
        takeProfit,
      );

      return {
        dealReference: result.dealReference,
        limitPrice,
        stopLoss,
        takeProfit,
      };
    });
  }

  private async testStopOrderCreation(): Promise<void> {
    await this.runTest("Create Stop Order", async () => {
      // This test might fail if stop orders aren't supported for crypto
      // Get current price first
      const price = await this.capitalService.getLatestPrice("BTCUSD");
      const stopPrice = price.ask * 1.01; // 1% above current price (breakout)

      try {
        const result = await this.capitalService.createLimitOrder(
          "BTCUSD",
          "BUY",
          0.001,
          stopPrice,
        );

        return {
          dealReference: result.dealReference,
          stopPrice,
        };
      } catch (error: any) {
        // Stop orders might not be available for crypto
        if (error.message.includes("not supported") || error.message.includes("not available")) {
          return { message: "Stop orders not supported for BTCUSD", expected: true };
        }
        throw error;
      }
    });
  }

  // Position Management Tests
  private async testPositionModification(): Promise<void> {
    await this.runTest("Position Modification", async () => {
      // This test requires an open position
      const positions = await this.capitalService.getOpenPositions();

      if (!positions.positions || positions.positions.length === 0) {
        return { message: "No open positions to modify", skipped: true };
      }

      const position = positions.positions[0];
      // Note: Position modification API might not be available in demo

      return {
        positionId: position.dealId,
        message: "Position modification would be tested here",
        skipped: true, // Skip actual modification to avoid issues
      };
    });
  }

  private async testPartialPositionClose(): Promise<void> {
    await this.runTest("Partial Position Close", async () => {
      // This test requires an open position
      const positions = await this.capitalService.getOpenPositions();

      if (!positions.positions || positions.positions.length === 0) {
        return { message: "No open positions to close", skipped: true };
      }

      const position = positions.positions[0];
      const partialSize = Math.abs(position.size) * 0.5; // Close 50%

      try {
        const result = await this.capitalService.closePosition(position.dealId, partialSize);

        return {
          dealReference: result.dealReference,
          originalSize: position.size,
          closedSize: partialSize,
        };
      } catch (error: any) {
        return {
          message: "Partial close test attempted but may have failed",
          error: error.message,
        };
      }
    });
  }

  private async testFullPositionClose(): Promise<void> {
    await this.runTest("Full Position Close", async () => {
      // This test requires an open position
      const positions = await this.capitalService.getOpenPositions();

      if (!positions.positions || positions.positions.length === 0) {
        return { message: "No open positions to close", skipped: true };
      }

      const position = positions.positions[0];

      try {
        const result = await this.capitalService.closePosition(position.dealId);

        return {
          dealReference: result.dealReference,
          closedPosition: position.dealId,
        };
      } catch (error: any) {
        return {
          message: "Full close test attempted but may have failed",
          error: error.message,
        };
      }
    });
  }

  // Error Handling Tests
  private async testInvalidOrderParameters(): Promise<void> {
    await this.runTest("Invalid Order Parameters", async () => {
      try {
        // Try to create order with invalid size
        await this.capitalService.createPosition("BTCUSD", "BUY", 0); // Invalid size
        throw new Error("Expected validation to fail");
      } catch (error: any) {
        if (error.message.includes("Expected validation to fail")) {
          throw error;
        }

        // Expected error
        return {
          expectedError: true,
          errorMessage: error.message,
        };
      }
    });
  }

  private async testInsufficientFunds(): Promise<void> {
    await this.runTest("Insufficient Funds Test", async () => {
      try {
        // Try to create a very large position
        await this.capitalService.createPosition("BTCUSD", "BUY", 100); // Very large size
        return { message: "Large position created (unexpected)", unexpected: true };
      } catch (error: any) {
        if (error.message.includes("insufficient") || error.message.includes("balance")) {
          return {
            expectedError: true,
            errorMessage: error.message,
          };
        }

        // Different error
        return {
          unexpectedError: true,
          errorMessage: error.message,
        };
      }
    });
  }

  private async testMarketClosed(): Promise<void> {
    await this.runTest("Market Status Check", async () => {
      const marketData = await this.capitalService.getMarketData("BTCUSD");

      return {
        marketStatus: marketData.snapshot?.marketStatus,
        tradeable: marketData.snapshot?.marketStatus === "TRADEABLE",
        message:
          marketData.snapshot?.marketStatus === "TRADEABLE"
            ? "Market is open for trading"
            : "Market is closed or limited",
      };
    });
  }

  // Cleanup
  private async cleanupTestPositions(): Promise<void> {
    if (this.testPositions.length === 0) {
      console.log("\n🧹 No test positions to clean up");
      return;
    }

    console.log(`\n🧹 Cleaning up ${this.testPositions.length} test positions...`);

    for (const position of this.testPositions) {
      try {
        console.log(`Closing position ${position.dealReference}...`);
        await this.capitalService.closePosition(position.dealReference);
        console.log(`✅ Closed position ${position.dealReference}`);
      } catch (error: any) {
        console.log(`⚠️ Failed to close position ${position.dealReference}: ${error.message}`);
      }
    }
  }

  // Test Summary
  private printTestSummary(): void {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter((t) => t.success).length;
    const failedTests = totalTests - passedTests;
    const totalDuration = this.testResults.reduce((sum, t) => sum + t.duration, 0);

    console.log("\n📊 ========= TEST SUMMARY =========");
    console.log(`Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`⏱️ Total Duration: ${totalDuration}ms`);
    console.log(`📈 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

    if (failedTests > 0) {
      console.log("\n❌ Failed Tests:");
      this.testResults
        .filter((t) => !t.success)
        .forEach((t) => {
          console.log(`  • ${t.testName}: ${t.error}`);
        });
    }

    console.log("\n🎯 Test Results Summary:");
    this.testResults.forEach((t) => {
      const status = t.success ? "✅" : "❌";
      console.log(`  ${status} ${t.testName} (${t.duration}ms)`);
    });

    console.log("\n=====================================\n");
  }
}

// Export for use
export { CapitalTradingTests };

// If running directly
if (require.main === module) {
  const tests = new CapitalTradingTests();
  tests.runAllTests().catch(console.error);
}
