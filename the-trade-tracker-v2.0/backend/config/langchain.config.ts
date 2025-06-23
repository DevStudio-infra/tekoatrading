import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

export const langchainConfig = {
  llm: {
    modelName: "gemini-2.0-flash-exp",
    temperature: 0,
    maxOutputTokens: 2000,
    googleApiKey: process.env.GOOGLE_API_KEY,
  },
  agents: {
    verbose: process.env.NODE_ENV === "development",
    maxIterations: 5,
    earlyStoppingMethod: "generate" as const,
    returnIntermediateSteps: true,
  },
  tools: {
    timeout: 30000,
    retryAttempts: 3,
    maxConcurrentCalls: 5,
  },
  memory: {
    maxTokenLimit: 4000,
    returnMessages: true,
    memoryKey: "chat_history",
  },
};

export const createLLM = () => {
  const apiKey = langchainConfig.llm.googleApiKey;

  // Enhanced debugging
  console.log("🔍 LangChain LLM Creation Debug:");
  console.log("- NODE_ENV:", process.env.NODE_ENV);
  console.log("- GOOGLE_API_KEY exists:", !!process.env.GOOGLE_API_KEY);
  console.log("- GOOGLE_API_KEY from process.env:", process.env.GOOGLE_API_KEY ? `${process.env.GOOGLE_API_KEY.substring(0, 15)}...` : "undefined");
  console.log("- apiKey from config:", apiKey ? `${apiKey.substring(0, 15)}...` : "undefined");
  console.log(
    "- All env keys containing 'GOOGLE':",
    Object.keys(process.env).filter((key) => key.includes("GOOGLE"))
  );

  if (!apiKey) {
    console.warn("⚠️  GOOGLE_API_KEY not found in environment variables. LangChain agents will not work properly.");
    console.warn("Please add GOOGLE_API_KEY to your .env file to enable AI trading features.");
    console.warn("Current working directory:", process.cwd());
    console.warn("All environment variables:", Object.keys(process.env).sort());
    // Return a mock LLM that will fail gracefully
    throw new Error("GOOGLE_API_KEY is required for LangChain agents");
  }

  console.log("✅ Creating LLM with valid API key");
  return new ChatGoogleGenerativeAI({
    model: langchainConfig.llm.modelName,
    temperature: langchainConfig.llm.temperature,
    maxOutputTokens: langchainConfig.llm.maxOutputTokens,
    apiKey: apiKey,
  });
};

export default langchainConfig;
