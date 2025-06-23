const { strategyRuleParserService } = require("../services/strategy-rule-parser.service");

function testStrategyParser() {
  console.log("🧪 Testing Strategy Rule Parser...\n");

  // Test cases for different strategy descriptions
  const testCases = [
    {
      name: "Close after 3 candles (user's case)",
      description: "Close the trade after 3 candles to test effectiveness",
      timeframe: "M1",
    },
    {
      name: "Multiple rules",
      description: `
        Close after 5 candles for quick exit
        Take profit at 2%
        Stop loss at 1.5%
        Use trailing stop for risk management
      `,
      timeframe: "M5",
    },
    {
      name: "Time-based rules",
      description: "Close after 30 minutes if no profit, take profit when reaches 3%",
      timeframe: "M1",
    },
    {
      name: "Complex strategy",
      description: `
        Entry: RSI below 30, price above SMA
        Exit: Close after 10 candles OR take profit at 5%
        Risk: Stop loss at 2%, max 1% risk per trade
      `,
      timeframe: "H1",
    },
  ];

  testCases.forEach((testCase, index) => {
    console.log(`📋 Test ${index + 1}: ${testCase.name}`);
    console.log(`📝 Description: "${testCase.description.trim()}"`);
    console.log(`⏱️  Timeframe: ${testCase.timeframe}`);

    try {
      const parsedStrategy = strategyRuleParserService.parseStrategyDescription(testCase.description, testCase.timeframe);

      console.log(`✅ Parsed ${parsedStrategy.rules.length} rules:`);

      parsedStrategy.rules.forEach((rule, ruleIndex) => {
        const timeInMinutes = rule.trigger.unit === "candles" ? rule.trigger.value * getTimeframeMinutes(testCase.timeframe) : rule.trigger.value;

        console.log(`   ${ruleIndex + 1}. ${rule.type}:`);
        console.log(`      - Trigger: ${rule.trigger.value} ${rule.trigger.unit}`);
        if (rule.trigger.unit === "candles") {
          console.log(`      - Time equivalent: ${timeInMinutes} minutes`);
        }
        console.log(`      - Action: ${rule.action}`);
        console.log(`      - Priority: ${rule.priority}`);
        console.log(`      - Enabled: ${rule.enabled}`);
      });

      if (parsedStrategy.riskManagement && Object.keys(parsedStrategy.riskManagement).length > 0) {
        console.log(`🛡️  Risk Management:`);
        Object.entries(parsedStrategy.riskManagement).forEach(([key, value]) => {
          console.log(`      - ${key}: ${value}`);
        });
      }

      // Validate rules
      const validation = strategyRuleParserService.validateRules(parsedStrategy.rules);
      if (!validation.valid) {
        console.log(`⚠️  Validation Warnings:`);
        validation.errors.forEach((error) => {
          console.log(`      - ${error}`);
        });
      }
    } catch (error) {
      console.log(`❌ Error parsing strategy: ${error.message}`);
    }

    console.log("\n" + "─".repeat(60) + "\n");
  });
}

function getTimeframeMinutes(timeframe) {
  const timeframeToMinutes = {
    M1: 1,
    M5: 5,
    M15: 15,
    M30: 30,
    H1: 60,
    H4: 240,
    D1: 1440,
  };
  return timeframeToMinutes[timeframe] || 1;
}

// Run the test
testStrategyParser();
