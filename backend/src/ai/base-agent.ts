import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { logger } from "../logger";

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
      const response = await this.llm.invoke(prompt);
      return response.content as string;
    } catch (error) {
      logger.error(`${this.name} - LLM call failed:`, error);
      throw error;
    }
  }

  abstract analyze(data: any): Promise<any>;
}
