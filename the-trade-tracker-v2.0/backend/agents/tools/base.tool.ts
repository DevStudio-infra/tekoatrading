/**
 * Base Tool for LangChain.js Agents
 * Provides common functionality for all trading tools
 */

import { StructuredTool } from "langchain/tools";
import { z } from "zod";

export abstract class BaseTradingTool extends StructuredTool {
  abstract name: string;
  abstract description: string;
  abstract schema: z.ZodSchema<any>;

  protected async _call(input: string): Promise<string> {
    try {
      // Parse the input string as JSON
      const parsedInput = JSON.parse(input);

      // Validate the input against the schema
      const validatedInput = this.schema.parse(parsedInput);

      // Call the tool-specific implementation
      return await this.execute(validatedInput);
    } catch (parseError) {
      if (parseError instanceof SyntaxError) {
        return JSON.stringify({
          success: false,
          error: "Invalid JSON input",
          message: "Input must be valid JSON",
        });
      }

      return JSON.stringify({
        success: false,
        error: "Tool execution failed",
        message: parseError instanceof Error ? parseError.message : String(parseError),
      });
    }
  }

  // Abstract method that child classes must implement
  protected abstract execute(input: any): Promise<string>;

  // Helper method for consistent error responses
  protected createErrorResponse(message: string, details?: any): string {
    return JSON.stringify({
      success: false,
      error: message,
      details,
    });
  }

  // Helper method for consistent success responses
  protected createSuccessResponse(data: any, message?: string): string {
    return JSON.stringify({
      success: true,
      data,
      message,
    });
  }
}
