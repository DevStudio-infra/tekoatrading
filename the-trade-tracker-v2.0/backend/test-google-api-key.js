require("dotenv").config({ path: require("path").join(__dirname, ".env") });

console.log("=== GOOGLE API KEY TEST ===");
console.log("Environment check:");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("GOOGLE_API_KEY exists:", !!process.env.GOOGLE_API_KEY);
console.log("GOOGLE_API_KEY length:", process.env.GOOGLE_API_KEY ? process.env.GOOGLE_API_KEY.length : 0);
console.log("GOOGLE_API_KEY (first 10 chars):", process.env.GOOGLE_API_KEY ? process.env.GOOGLE_API_KEY.substring(0, 10) + "..." : "undefined");

// Test LangChain config
try {
  const { createLLM } = require("./config/langchain.config.ts");
  console.log("\n=== LANGCHAIN CONFIG TEST ===");

  try {
    const llm = createLLM();
    console.log("✅ LLM created successfully");
    console.log("LLM model:", llm.model);
  } catch (llmError) {
    console.log("❌ LLM creation failed:", llmError.message);
  }
} catch (configError) {
  console.log("❌ Could not load LangChain config:", configError.message);

  // Try alternative path
  try {
    console.log("Trying alternative path...");
    // Since we're in development, let's just test the Google API key directly
    const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
    const llm = new ChatGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_API_KEY,
      model: "gemini-2.0-flash-exp",
      temperature: 0.3,
    });
    console.log("✅ Direct LLM creation successful");
  } catch (directError) {
    console.log("❌ Direct LLM creation failed:", directError.message);
  }
}

// Test Trading Chain
try {
  console.log("\n=== TRADING CHAIN TEST ===");
  const { TradingChain } = require("./agents/chains/trading-chain.ts");
  const tradingChain = new TradingChain();

  tradingChain
    .initialize()
    .then(() => {
      console.log("✅ Trading Chain initialized successfully");
    })
    .catch((error) => {
      console.log("❌ Trading Chain initialization failed:", error.message);
    });
} catch (chainError) {
  console.log("❌ Could not load Trading Chain:", chainError.message);
  console.log("This is expected in development mode without compilation");
}

console.log("=== TEST COMPLETE ===");
