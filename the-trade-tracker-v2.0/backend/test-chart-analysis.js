require("dotenv").config({ path: require("path").join(__dirname, ".env") });

async function testChartAnalysis() {
  console.log("=== CHART ANALYSIS TEST ===");

  try {
    // Test Google API key
    console.log("GOOGLE_API_KEY exists:", !!process.env.GOOGLE_API_KEY);
    console.log("GOOGLE_API_KEY length:", process.env.GOOGLE_API_KEY ? process.env.GOOGLE_API_KEY.length : 0);

    // Test LangChain Google AI
    const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
    const { HumanMessage } = require("@langchain/core/messages");

    const llm = new ChatGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_API_KEY,
      model: "gemini-2.0-flash-exp",
      temperature: 0.3,
    });

    console.log("✅ LLM created successfully");

    // Create a simple test base64 image (1x1 red pixel PNG)
    const testImageBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";

    console.log("Test image base64 length:", testImageBase64.length);

    // Test multimodal message
    const message = new HumanMessage({
      content: [
        {
          type: "text",
          text: 'This is a test image. Please describe what you see and respond with a simple JSON: {"status": "success", "description": "your description"}',
        },
        {
          type: "image_url",
          image_url: {
            url: testImageBase64,
          },
        },
      ],
    });

    console.log("Sending test message to Gemini...");
    const result = await llm.invoke([message]);
    console.log("✅ Gemini response:", result.content);

    // Test with a real chart image from public folder if available
    const fs = require("fs");
    const path = require("path");
    const chartDir = path.join(__dirname, "public", "charts");

    if (fs.existsSync(chartDir)) {
      const files = fs.readdirSync(chartDir).filter((f) => f.endsWith(".png"));
      if (files.length > 0) {
        const chartPath = path.join(chartDir, files[0]);
        const imageBuffer = fs.readFileSync(chartPath);
        const realChartBase64 = `data:image/png;base64,${imageBuffer.toString("base64")}`;

        console.log(`\nTesting with real chart: ${files[0]}`);
        console.log("Real chart base64 length:", realChartBase64.length);

        const chartMessage = new HumanMessage({
          content: [
            {
              type: "text",
              text: 'Analyze this trading chart. What patterns do you see? Respond with JSON: {"analysis": "your analysis", "trend": "bullish/bearish/neutral"}',
            },
            {
              type: "image_url",
              image_url: {
                url: realChartBase64,
              },
            },
          ],
        });

        const chartResult = await llm.invoke([chartMessage]);
        console.log("✅ Chart analysis response:", chartResult.content);
      }
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error("Full error:", error);
  }
}

testChartAnalysis();
