import { loggerService } from "./logger.service";
import { getCapitalApiInstance } from "../modules/capital/services/capital-main.service";

export interface BrokerCredentialTest {
  isDemo: boolean;
  environment: string;
  baseURL: string;
  authSuccess: boolean;
  marketAccess: boolean;
  btcEpicFound: string | null;
  error?: string;
}

export class BrokerVerificationService {
  /**
   * Test broker credentials on both demo and live environments
   */
  static async testCapitalCredentials(credentials: { apiKey: string; identifier: string; password: string }): Promise<{
    demo: BrokerCredentialTest;
    live: BrokerCredentialTest;
  }> {
    loggerService.info("Testing Capital.com credentials on both demo and live environments");

    const demoTest = await this.testSingleEnvironment(credentials, true);
    const liveTest = await this.testSingleEnvironment(credentials, false);

    return { demo: demoTest, live: liveTest };
  }

  /**
   * Test credentials on a single environment (demo or live)
   */
  private static async testSingleEnvironment(
    credentials: {
      apiKey: string;
      identifier: string;
      password: string;
    },
    isDemo: boolean
  ): Promise<BrokerCredentialTest> {
    const environment = isDemo ? "DEMO" : "LIVE";
    const baseURL = isDemo ? "https://demo-api-capital.backend-capital.com/" : "https://api-capital.backend-capital.com/";

    const result: BrokerCredentialTest = {
      isDemo,
      environment,
      baseURL,
      authSuccess: false,
      marketAccess: false,
      btcEpicFound: null,
    };

    try {
      loggerService.info(`Testing ${environment} environment at ${baseURL}`);

      // Create API instance for this environment
      const uniqueId = `verification-${environment.toLowerCase()}-${Date.now()}`;
      const capitalApi = getCapitalApiInstance({
        apiKey: credentials.apiKey,
        identifier: credentials.identifier,
        password: credentials.password,
        isDemo,
        instanceId: uniqueId,
      });

      // Test authentication
      try {
        await capitalApi.initialize();
        result.authSuccess = true;
        loggerService.info(`✅ ${environment}: Authentication successful`);
      } catch (authError) {
        result.error = `Authentication failed: ${authError instanceof Error ? authError.message : "Unknown error"}`;
        loggerService.error(`❌ ${environment}: ${result.error}`);
        return result;
      }

      // Test market access
      try {
        const accountDetails = await capitalApi.getAccountDetails();
        if (accountDetails) {
          result.marketAccess = true;
          loggerService.info(`✅ ${environment}: Market access confirmed`);
        }
      } catch (marketError) {
        result.error = `Market access failed: ${marketError instanceof Error ? marketError.message : "Unknown error"}`;
        loggerService.warn(`⚠️ ${environment}: ${result.error}`);
      }

      // Test Bitcoin epic availability
      const bitcoinFormats = ["BTC/USD", "BTC-USD", "BTCUSD", "CS.D.BITCOIN.CFD.IP", "BITCOIN"];

      for (const format of bitcoinFormats) {
        try {
          const marketDetails = await capitalApi.getMarketDetails(format);
          if (marketDetails) {
            result.btcEpicFound = format;
            loggerService.info(`✅ ${environment}: Found Bitcoin epic: ${format}`);
            break;
          }
        } catch (error) {
          loggerService.debug(`❌ ${environment}: Bitcoin epic ${format} not found`);
        }
      }

      if (!result.btcEpicFound) {
        loggerService.warn(`⚠️ ${environment}: No Bitcoin epic found in any format`);
      }
    } catch (error) {
      result.error = `Test failed: ${error instanceof Error ? error.message : "Unknown error"}`;
      loggerService.error(`❌ ${environment}: ${result.error}`);
    }

    return result;
  }

  /**
   * Generate a verification report for display to users
   */
  static generateVerificationReport(results: { demo: BrokerCredentialTest; live: BrokerCredentialTest }): string {
    const report = [
      `
🔍 CAPITAL.COM CREDENTIAL VERIFICATION REPORT
============================================

📋 DEMO ENVIRONMENT TEST:
  URL: ${results.demo.baseURL}
  🔐 Authentication: ${results.demo.authSuccess ? "✅ SUCCESS" : "❌ FAILED"}
  📊 Market Access: ${results.demo.marketAccess ? "✅ SUCCESS" : "❌ FAILED"}
  ₿ Bitcoin Epic: ${results.demo.btcEpicFound ? `✅ FOUND (${results.demo.btcEpicFound})` : "❌ NOT FOUND"}
  ${results.demo.error ? `❌ Error: ${results.demo.error}` : ""}

📋 LIVE ENVIRONMENT TEST:
  URL: ${results.live.baseURL}
  🔐 Authentication: ${results.live.authSuccess ? "✅ SUCCESS" : "❌ FAILED"}
  📊 Market Access: ${results.live.marketAccess ? "✅ SUCCESS" : "❌ FAILED"}
  ₿ Bitcoin Epic: ${results.live.btcEpicFound ? `✅ FOUND (${results.live.btcEpicFound})` : "❌ NOT FOUND"}
  ${results.live.error ? `❌ Error: ${results.live.error}` : ""}

📝 RECOMMENDATIONS:
`,
    ];

    // Add recommendations based on results
    if (results.demo.authSuccess && results.live.authSuccess) {
      report.push("✅ Your credentials work on both demo and live environments");
    } else if (results.demo.authSuccess && !results.live.authSuccess) {
      report.push("⚠️ Demo works but live fails - check if your credentials are for demo only");
    } else if (!results.demo.authSuccess && results.live.authSuccess) {
      report.push("⚠️ Live works but demo fails - unusual, verify demo environment access");
    } else {
      report.push("❌ Both environments failed - check your API credentials");
    }

    if (results.demo.btcEpicFound || results.live.btcEpicFound) {
      const workingFormat = results.demo.btcEpicFound || results.live.btcEpicFound;
      report.push(`ℹ️ Use "${workingFormat}" as the Bitcoin epic format`);
    } else {
      report.push("⚠️ Bitcoin trading may not be available with your account type");
    }

    report.push(`
🛠️ TO USE THESE CREDENTIALS:
  1. Update your broker credentials with isDemo: ${results.demo.authSuccess ? "true" : "false"} for testing
  2. Use isDemo: false for live trading (when ready)
  3. The system will automatically connect to the right environment
`);

    return report.join("\n");
  }
}

export const brokerVerificationService = new BrokerVerificationService();
