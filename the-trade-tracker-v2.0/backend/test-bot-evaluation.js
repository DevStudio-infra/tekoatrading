require("dotenv").config({ path: require("path").join(__dirname, ".env") });

async function testBotEvaluation() {
  console.log("=== BOT EVALUATION TEST ===");

  try {
    // You'll need to replace these with actual values from your database
    const botId = "test-bot-id"; // Replace with a real bot ID
    const testData = {
      symbol: "BTCUSD",
      timeframe: "M5",
      // You can add other test data here
    };

    console.log("Testing bot evaluation with:");
    console.log("Bot ID:", botId);
    console.log("Symbol:", testData.symbol);
    console.log("Timeframe:", testData.timeframe);

    // Make HTTP request to the bot evaluation endpoint
    const fetch = require("node-fetch");

    const response = await fetch(`http://localhost:3001/api/bots/${botId}/evaluate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // You'll need to add proper authorization headers here
        // "Authorization": "Bearer your-token"
      },
      body: JSON.stringify(testData),
    });

    if (response.ok) {
      const result = await response.json();
      console.log("✅ Bot evaluation successful:");
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log("❌ Bot evaluation failed:");
      console.log("Status:", response.status);
      console.log("Response:", await response.text());
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

// Alternative: Test the bot service directly if we can load it
async function testBotServiceDirect() {
  console.log("\n=== DIRECT BOT SERVICE TEST ===");

  try {
    // Since we can't directly require TypeScript, let's just log what we would test
    console.log("Direct bot service testing would require:");
    console.log("1. A valid bot ID from the database");
    console.log("2. Proper database connection");
    console.log("3. All services initialized");
    console.log("");
    console.log("Instead, monitor the server logs when a bot evaluation runs.");
    console.log("Look for these debug messages:");
    console.log("- [CHART CONVERSION DEBUG] Starting conversion for URL:");
    console.log("- [CHART CONVERSION DEBUG] Response status:");
    console.log("- [CHART CONVERSION DEBUG] PNG signature valid:");
    console.log("- [CHART CONVERSION DEBUG] Base64 conversion complete:");
    console.log("- 🔍 Chart image base64 length:");
    console.log("- 🔍 Actual base64 data length:");
  } catch (error) {
    console.error("❌ Direct test failed:", error.message);
  }
}

console.log("This test requires:");
console.log("1. Server running on localhost:3001");
console.log("2. Valid bot ID from database");
console.log("3. Proper authentication");
console.log("");
console.log("For now, check the server logs for debugging output when bots run automatically.");

testBotServiceDirect();
