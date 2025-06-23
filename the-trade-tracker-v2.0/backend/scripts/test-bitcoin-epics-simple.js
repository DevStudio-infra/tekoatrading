const axios = require("axios");
require("dotenv").config();

async function testBitcoinEpics() {
  try {
    console.log("🧪 Testing Bitcoin epic availability on Capital.com...\n");

    // Test both demo and live environments
    const environments = [
      { name: "DEMO", baseURL: "https://demo-api-capital.backend-capital.com/" },
      { name: "LIVE", baseURL: "https://api-capital.backend-capital.com/" },
    ];

    for (const env of environments) {
      console.log(`\n🔍 Testing ${env.name} Environment: ${env.baseURL}`);
      console.log("=".repeat(60));

      try {
        // Create API client
        const apiClient = axios.create({
          baseURL: env.baseURL,
          headers: {
            "X-CAP-API-KEY": process.env.CAPITAL_API_KEY || "test-key",
            "Content-Type": "application/json",
          },
        });

        // Try to authenticate first
        console.log("🔐 Attempting authentication...");
        const authResponse = await apiClient.post("api/v1/session", {
          identifier: process.env.CAPITAL_USERNAME || "test@example.com",
          password: process.env.CAPITAL_PASSWORD || "test-password",
        });

        const cst = authResponse.headers["cst"];
        const securityToken = authResponse.headers["x-security-token"];

        if (!cst || !securityToken) {
          console.log("❌ Authentication failed - no security tokens");
          continue;
        }

        console.log(`✅ Authentication successful`);

        // Update headers with auth tokens
        apiClient.defaults.headers.common["CST"] = cst;
        apiClient.defaults.headers.common["X-SECURITY-TOKEN"] = securityToken;

        // Test various Bitcoin epic formats
        const bitcoinFormats = ["BTCUSD", "BTC/USD", "CS.D.BITCOIN.CFD.IP", "CS.D.BTCUSD.CFD.IP", "CS.D.BTCUSD.MINI.IP", "BITCOIN", "BTC", "BTCEUR", "BTC/EUR", "BTCGBP"];

        console.log("\n📊 Testing Bitcoin epic formats:");

        for (const epic of bitcoinFormats) {
          try {
            const response = await apiClient.get(`api/v1/markets/${epic}`);
            console.log(`✅ ${epic} - FOUND! ${response.data.instrument?.displayName || "Name not available"}`);
          } catch (error) {
            const status = error.response?.status || "no response";
            console.log(`❌ ${epic} - ${status === 404 ? "Not found" : `Error ${status}`}`);
          }
        }

        // Try to search for Bitcoin markets
        console.log("\n🔍 Searching for Bitcoin markets...");
        try {
          const searchResponse = await apiClient.get("api/v1/markets?searchTerm=bitcoin");
          if (searchResponse.data && searchResponse.data.markets) {
            console.log(`Found ${searchResponse.data.markets.length} Bitcoin markets:`);
            searchResponse.data.markets.slice(0, 5).forEach((market, index) => {
              console.log(`${index + 1}. Epic: ${market.epic}, Name: ${market.instrumentName}`);
            });
          } else {
            console.log("No search results returned");
          }
        } catch (searchError) {
          console.log(`Search failed: ${searchError.response?.status || searchError.message}`);
        }
      } catch (envError) {
        console.log(`❌ ${env.name} environment test failed: ${envError.response?.status || envError.message}`);
        if (envError.response?.data) {
          console.log(`   Error details: ${JSON.stringify(envError.response.data)}`);
        }
      }
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

// Run the test
testBitcoinEpics()
  .then(() => {
    console.log("\n✅ Test completed");
  })
  .catch((error) => {
    console.error("\n❌ Test failed:", error);
  });
