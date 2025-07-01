import "dotenv/config";
import { botEvaluationService } from "./src/services/bot-evaluation.service";

async function testBotEvaluationDirect() {
  console.log("🧪 Testing Bot Evaluation with TypeScript directly");

  try {
    const botId = "cmcgcp77k0001yke8wd2y9nqk";
    console.log(`Testing direct evaluation of bot: ${botId}`);

    const result = await botEvaluationService.evaluateBot(botId);
    console.log("Direct evaluation result:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("❌ Test error:", error);
  }
}

testBotEvaluationDirect().catch(console.error);
