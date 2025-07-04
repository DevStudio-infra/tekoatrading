import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { logger } from "../logger";
import { LLMCostCalculator } from "./llm-cost-calculator";

export abstract class BaseAgent {
  protected llm: ChatGoogleGenerativeAI;
  protected name: string;

  constructor(name: string) {
    this.name = name;
    this.llm = new ChatGoogleGenerativeAI({
      modelName: "gemini-2.0-flash",
      temperature: 0.1,
      apiKey: process.env.GOOGLE_API_KEY,
    });
  }

  protected async callLLM(prompt: string): Promise<string> {
    try {
      logger.info(`${this.name} - Making LLM call`);
      const startTime = Date.now();

      // Estimate token usage (rough calculation: ~4 chars per token)
      const estimatedInputTokens = Math.ceil(prompt.length / 4);

      const response = await this.llm.invoke(prompt);
      const responseContent = response.content as string;

      // Estimate output tokens
      const estimatedOutputTokens = Math.ceil(responseContent.length / 4);

      // Log token usage and cost
      LLMCostCalculator.logAgentTokenUsage(
        this.name,
        estimatedInputTokens,
        estimatedOutputTokens,
        false,
      );

      const duration = Date.now() - startTime;
      logger.info(`${this.name} - LLM call completed in ${duration}ms`);

      return responseContent;
    } catch (error) {
      logger.error(`${this.name} - LLM call failed:`, error);
      throw error;
    }
  }

  // Professional Trading Committee method - supports options parameter
  protected async queryLLM(
    prompt: string,
    options?: { temperature?: number; maxTokens?: number; hasImage?: boolean },
  ): Promise<string> {
    try {
      logger.info(`${this.name} - Making professional LLM query`);
      const startTime = Date.now();

      // Create a new LLM instance with custom parameters if provided
      let llmInstance = this.llm;
      if (options?.temperature !== undefined) {
        llmInstance = new ChatGoogleGenerativeAI({
          modelName: "gemini-2.0-flash",
          temperature: options.temperature,
          maxOutputTokens: options.maxTokens,
          apiKey: process.env.GOOGLE_API_KEY,
        });
      }

      // Estimate token usage (rough calculation: ~4 chars per token)
      const estimatedInputTokens = Math.ceil(prompt.length / 4);

      const response = await llmInstance.invoke(prompt);
      const responseContent = response.content as string;

      // Estimate output tokens
      const estimatedOutputTokens = Math.ceil(responseContent.length / 4);

      // Log token usage and cost (including image if multimodal)
      LLMCostCalculator.logAgentTokenUsage(
        this.name,
        estimatedInputTokens,
        estimatedOutputTokens,
        options?.hasImage || false,
      );

      const duration = Date.now() - startTime;
      logger.info(`${this.name} - Professional LLM query completed in ${duration}ms`);

      return responseContent;
    } catch (error) {
      logger.error(`${this.name} - Professional LLM query failed:`, error);
      throw error;
    }
  }

  abstract analyze(data: any): Promise<any>;
}
