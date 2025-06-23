const { RobustJSONParser } = require("./backend/services/ai/json-parser.ts");

// Test cases that were causing the "undefined decision" issue
const testCases = [
  // Case 1: Double brackets (the main issue)
  `{
    "decision": "HOLD",
    "confidence": 65,
    "reasoning": "Market analysis shows mixed signals",
    "tradeParams": {{
      "symbol": "BTC/USD",
      "direction": "BUY",
      "quantity": 0.001
    }}
  }`,

  // Case 2: Missing decision field
  `{
    "confidence": 75,
    "reasoning": "Strong bullish signal detected"
  }`,

  // Case 3: Invalid confidence value
  `{
    "decision": "EXECUTE_TRADE",
    "confidence": "high",
    "reasoning": "Technical indicators align"
  }`,

  // Case 4: Completely malformed JSON
  `This is not JSON at all but contains decision: "HOLD" and confidence: 80`,

  // Case 5: Valid JSON (should work normally)
  `{
    "decision": "EXECUTE_TRADE",
    "confidence": 85,
    "reasoning": "Strong technical signals with good market conditions",
    "tradeParams": {
      "symbol": "BTC/USD",
      "direction": "BUY",
      "quantity": 0.001
    }
  }`,
];

console.log("🧪 Testing JSON Parser Fixes...\n");

testCases.forEach((testCase, index) => {
  console.log(`Test Case ${index + 1}:`);
  console.log(`Input: ${testCase.substring(0, 100)}...`);

  try {
    const result = RobustJSONParser.parseWithFallback(testCase, {
      symbol: "BTC/USD",
      currentPrice: 45000,
    });

    console.log(`✅ Result: ${result.decision} (${result.confidence}% confidence)`);
    console.log(`   Reasoning: ${result.reasoning.substring(0, 50)}...`);
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }

  console.log("---\n");
});

console.log("🎯 JSON Parser test completed!");
