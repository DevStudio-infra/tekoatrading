const { getCapitalApiInstance } = require("../modules/capital");

async function testBitcoinEpics() {
  try {
    console.log("Testing Bitcoin epic availability on Capital.com...\n");

    // Get Capital.com API instance
    const capitalApi = getCapitalApiInstance();

    // Initialize the API
    await capitalApi.initialize();

    console.log("✅ Capital.com API initialized successfully\n");

    // Test common Bitcoin epic formats
    const bitcoinFormats = [
      "BTCUSD",
      "BTC/USD",
      "CS.D.BITCOIN.CFD.IP",
      "CS.D.BTCUSD.CFD.IP",
      "CS.D.BTCUSD.MINI.IP",
      "BITCOIN",
      "BTC",
      "BTCEUR",
      "BTC/EUR",
      "BTCGBP",
      "BTC/GBP",
      "CRYPTO:BTC/USD",
      "CRYPTO:BTCUSD",
    ];

    console.log("Testing Bitcoin epic formats:\n");

    for (const epic of bitcoinFormats) {
      try {
        console.log(`Testing epic: ${epic}`);

        // Try to get market details
        const marketDetails = await capitalApi.getMarketDetails(epic);
        console.log(`✅ ${epic} - FOUND! Name: ${marketDetails.instrument?.displayName || marketDetails.instrumentName || "Unknown"}`);

        // Try to get price
        try {
          const price = await capitalApi.getLatestPrice(epic);
          console.log(`   💰 Price available: ${price.bid || "N/A"} / ${price.ask || "N/A"}`);
        } catch (priceError) {
          console.log(`   ⚠️  Price not available: ${priceError.message}`);
        }

        console.log("");
      } catch (error) {
        console.log(`❌ ${epic} - Not found (${error.response?.status || error.message})`);
      }
    }

    // Search for Bitcoin markets
    console.log("\n🔍 Searching for Bitcoin markets...\n");
    try {
      const searchResults = await capitalApi.searchMarkets("bitcoin");
      if (searchResults && searchResults.markets) {
        console.log(`Found ${searchResults.markets.length} Bitcoin markets:`);
        searchResults.markets.forEach((market, index) => {
          console.log(`${index + 1}. Epic: ${market.epic}, Name: ${market.instrumentName}`);
        });
      } else {
        console.log("No Bitcoin markets found in search results");
      }
    } catch (searchError) {
      console.log(`Search failed: ${searchError.message}`);
    }

    // Also try BTC search
    console.log("\n🔍 Searching for BTC markets...\n");
    try {
      const btcResults = await capitalApi.searchMarkets("BTC");
      if (btcResults && btcResults.markets) {
        console.log(`Found ${btcResults.markets.length} BTC markets:`);
        btcResults.markets.forEach((market, index) => {
          console.log(`${index + 1}. Epic: ${market.epic}, Name: ${market.instrumentName}`);
        });
      } else {
        console.log("No BTC markets found in search results");
      }
    } catch (searchError) {
      console.log(`BTC search failed: ${searchError.message}`);
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    if (error.response?.data) {
      console.error("API Error:", error.response.data);
    }
  }
}

// Run the test
testBitcoinEpics()
  .then(() => {
    console.log("\n✅ Test completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  });
