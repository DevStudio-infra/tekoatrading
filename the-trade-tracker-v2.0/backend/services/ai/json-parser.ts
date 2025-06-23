import { loggerService } from "../logger.service";
import * as JSON5 from "json5";

/**
 * Robust JSON parser for AI responses
 * Enhanced to handle common LLM response issues that cause JSON parse failures
 */
export class RobustJSONParser {
  static parseAIResponse(aiResponse: string, context?: { symbol?: string; currentPrice?: number }): any {
    loggerService.info("Starting robust JSON parsing of AI response");

    // Check for empty response
    if (!aiResponse || aiResponse.trim().length === 0) {
      loggerService.error("Cannot parse empty AI response");
      throw new Error("Empty AI response received");
    }

    loggerService.info(`Raw AI response length: ${aiResponse.length}`);
    loggerService.info(`First 100 chars: ${aiResponse.substring(0, 100)}`);

    // Step 1: Clean the response
    const cleanedResponse = this.cleanResponse(aiResponse);
    loggerService.info(`Cleaned response length: ${cleanedResponse.length}`);

    // Step 2: Try multiple extraction methods
    const extractedJSON = this.extractJSON(cleanedResponse);

    if (!extractedJSON) {
      loggerService.error("No valid JSON found in AI response");
      loggerService.error(`Response preview: ${aiResponse.substring(0, 200)}...`);
      throw new Error("No valid JSON found in AI response");
    }

    loggerService.info(`Extracted JSON length: ${extractedJSON.length}`);

    // Step 3: Apply AI-specific repairs before parsing
    const repairedJSON = this.repairAIJSON(extractedJSON, context);
    loggerService.info(`Applied AI-specific repairs`);

    // Step 4: Parse and validate
    return this.parseAndValidate(repairedJSON);
  }

  private static cleanResponse(response: string): string {
    // Remove markdown code blocks
    let cleaned = response.replace(/```json\s*/gi, "").replace(/```\s*/g, "");

    // Remove extra whitespace and newlines
    cleaned = cleaned.trim();

    // CRITICAL FIX: Handle double brackets FIRST before any other processing
    // This is the main issue causing JSON parsing failures
    loggerService.info("Applying double bracket fixes...");
    cleaned = cleaned.replace(/\{\{/g, "{").replace(/\}\}/g, "}");

    // Also fix any nested double brackets that might occur
    // Keep applying until no more double brackets are found
    let previousLength = 0;
    while (cleaned.length !== previousLength) {
      previousLength = cleaned.length;
      cleaned = cleaned.replace(/\{\{/g, "{").replace(/\}\}/g, "}");
    }

    loggerService.info("Double bracket fixes applied");

    // Remove any text before the first {
    const firstBrace = cleaned.indexOf("{");
    if (firstBrace > 0) {
      loggerService.info(`Removing ${firstBrace} characters before first brace`);
      cleaned = cleaned.substring(firstBrace);
    }

    // Remove any text after the last }
    const lastBrace = cleaned.lastIndexOf("}");
    if (lastBrace >= 0) {
      const originalLength = cleaned.length;
      cleaned = cleaned.substring(0, lastBrace + 1);
      if (originalLength > cleaned.length) {
        loggerService.info(`Removed ${originalLength - cleaned.length} characters after last brace`);
      }
    }

    return cleaned;
  }

  private static extractJSON(response: string): string | null {
    // Method 1: Try to find complete JSON object using balanced brace counting
    // This is more robust than regex for deeply nested objects
    let braceCount = 0;
    let start = -1;
    let end = -1;
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < response.length; i++) {
      const char = response[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === "\\") {
        escapeNext = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === "{") {
          if (start === -1) start = i;
          braceCount++;
        } else if (char === "}") {
          braceCount--;
          if (braceCount === 0 && start !== -1) {
            end = i;
            break;
          }
        }
      }
    }

    if (start !== -1 && end !== -1) {
      const extractedJSON = response.substring(start, end + 1);
      loggerService.info(`Extracted complete JSON object (${extractedJSON.length} chars) using brace counting`);
      return extractedJSON;
    }

    // Method 2: Fallback to regex patterns for simpler cases
    const jsonMatches = response.match(/\{(?:[^{}]|{[^{}]*})*\}/g);
    if (jsonMatches && jsonMatches.length > 0) {
      const largestJSON = jsonMatches.reduce((largest, current) => (current.length > largest.length ? current : largest));
      loggerService.info(`Found ${jsonMatches.length} JSON objects via regex, using largest (${largestJSON.length} chars)`);
      return largestJSON;
    }

    // Method 3: Try to extract based on known structure with decision
    const decisionMatch = response.match(/\{\s*"decision"\s*:\s*"[^"]*"[\s\S]*?\}/);
    if (decisionMatch) {
      loggerService.info("Found JSON with decision structure");
      return decisionMatch[0];
    }

    // Method 4: Try to find any object with trading-related keys
    const tradingMatch = response.match(/\{\s*"[^"]*"\s*:[\s\S]*\}/);
    if (tradingMatch) {
      loggerService.info("Found JSON with trading structure");
      return tradingMatch[0];
    }

    loggerService.error("Could not extract JSON from response");
    return null;
  }

  /**
   * Apply AI-specific JSON repairs before attempting to parse
   */
  private static repairAIJSON(jsonString: string, context?: { symbol?: string; currentPrice?: number }): string {
    let repaired = jsonString;

    // 1. Fix double braces issue (the main problem causing failures)
    repaired = repaired.replace(/\{\{/g, "{").replace(/\}\}/g, "}");

    // 2. Replace template variables if context is provided
    if (context) {
      if (context.symbol) {
        repaired = repaired.replace(/\{symbol\}/g, `"${context.symbol}"`);
      }
      if (context.currentPrice !== undefined) {
        // Handle simple price replacements
        repaired = repaired.replace(/\{currentPrice\}/g, context.currentPrice.toString());

        // Handle price calculations like {currentPrice} * 0.995
        repaired = repaired.replace(/\{currentPrice\}\s*\*\s*([\d.]+)/g, (match, multiplier) => {
          return (context.currentPrice! * parseFloat(multiplier)).toString();
        });

        // Handle price additions/subtractions like {currentPrice} + 15
        repaired = repaired.replace(/\{currentPrice\}\s*([-+])\s*([\d.]+)/g, (match, operator, operand) => {
          const num = parseFloat(operand);
          const result = operator === "+" ? context.currentPrice! + num : context.currentPrice! - num;
          return result.toString();
        });
      }
    }

    // 3. Fix common JSON issues
    repaired = repaired
      // Remove trailing commas
      .replace(/,(\s*[}\]])/g, "$1")
      // Fix unescaped quotes in strings (basic case)
      .replace(/([{,]\s*"[^"]*)"([^"]*")(\s*:)/g, '$1\\"$2\\"$3')
      // Add missing quotes around unquoted keys
      .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
      // Fix multiple consecutive commas
      .replace(/,+/g, ",")
      // Remove commas before closing braces/brackets
      .replace(/,(\s*[}\]])/g, "$1");

    // 4. Fix common AI response patterns
    repaired = repaired
      // Fix undefined/null values that might be unquoted
      .replace(/:\s*undefined/g, ": null")
      .replace(/:\s*None/g, ": null")
      // Fix boolean values that might be capitalized
      .replace(/:\s*True/g, ": true")
      .replace(/:\s*False/g, ": false");

    return repaired;
  }

  private static parseAndValidate(jsonString: string): any {
    try {
      const parsed = JSON.parse(jsonString);
      loggerService.info("Successfully parsed JSON with standard parser");
      return parsed;
    } catch (parseError: unknown) {
      loggerService.warn("Standard JSON parse failed, trying JSON5");

      try {
        const parsed = JSON5.parse(jsonString);
        loggerService.info("Successfully parsed JSON with JSON5 parser");
        return parsed;
      } catch (json5Error: unknown) {
        loggerService.warn("JSON5 parse failed, attempting additional repair");

        // Try to fix additional common JSON issues
        const repairedJSON = this.repairJSON(jsonString);

        try {
          const parsed = JSON.parse(repairedJSON);
          loggerService.info("Successfully parsed repaired JSON with standard parser");
          return parsed;
        } catch (secondError: unknown) {
          try {
            const parsed = JSON5.parse(repairedJSON);
            loggerService.info("Successfully parsed repaired JSON with JSON5 parser");
            return parsed;
          } catch (finalError: unknown) {
            loggerService.error("All JSON parsing attempts failed", finalError);
            const errorMessage = parseError instanceof Error ? parseError.message : "Unknown parsing error";
            throw new Error(`JSON parsing failed: ${errorMessage}`);
          }
        }
      }
    }
  }

  private static repairJSON(jsonString: string): string {
    let repaired = jsonString;

    // Advanced repair techniques
    repaired = repaired
      // Remove trailing commas more aggressively
      .replace(/,(\s*[}\]])/g, "$1")
      // Fix single quotes to double quotes
      .replace(/'/g, '"')
      // Fix missing commas between object properties
      .replace(/("\s*)\s*\n\s*"/g, '$1,\n"')
      // Fix missing commas between array elements
      .replace(/("\s*)\s*\n\s*"/g, '$1,\n"')
      // Remove extra commas
      .replace(/,+/g, ",")
      // Fix spacing around colons
      .replace(/"\s*:\s*/g, '": ')
      // Remove comments (basic /* */ and //)
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "")
      // Fix object key spacing issues
      .replace(/([{,])\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
      // Fix array/object bracket spacing
      .replace(/\[\s*,/g, "[")
      .replace(/,\s*\]/g, "]")
      .replace(/\{\s*,/g, "{")
      .replace(/,\s*\}/g, "}");

    return repaired;
  }

  /**
   * Try to parse with fallback to JSON5-like parsing
   */
  static parseWithFallback(jsonString: string, context?: { symbol?: string; currentPrice?: number }): any {
    try {
      const result = this.parseAIResponse(jsonString, context);

      // CRITICAL FIX: Validate the parsed result has required fields
      if (!result || typeof result !== "object") {
        loggerService.warn("Parsed result is not a valid object, using manual extraction");
        return this.manualExtraction(jsonString);
      }

      // Check for required fields and fix missing ones
      if (!result.hasOwnProperty("decision") || !result.decision) {
        loggerService.warn("Missing decision field, using manual extraction");
        return this.manualExtraction(jsonString);
      }

      if (!result.hasOwnProperty("confidence") || typeof result.confidence !== "number") {
        loggerService.warn("Missing or invalid confidence field, using manual extraction");
        return this.manualExtraction(jsonString);
      }

      // NORMALIZE DIRECTION FIELD - Convert LONG/SHORT to BUY/SELL
      if (result.tradeParams && result.tradeParams.direction) {
        const direction = result.tradeParams.direction.toUpperCase();
        if (direction === "LONG") {
          result.tradeParams.direction = "BUY";
          loggerService.info("Normalized direction: LONG → BUY");
        } else if (direction === "SHORT") {
          result.tradeParams.direction = "SELL";
          loggerService.info("Normalized direction: SHORT → SELL");
        }
      }

      // NORMALIZE STOP LOSS AND TAKE PROFIT - Handle template strings
      if (result.tradeParams) {
        const currentPrice = context?.currentPrice || 100000;

        // Handle stop loss template strings like "{currentPrice * 0.995}"
        if (result.tradeParams.stopLoss && typeof result.tradeParams.stopLoss === "string") {
          const stopLossStr = result.tradeParams.stopLoss;
          if (stopLossStr.includes("currentPrice")) {
            try {
              // Replace template variables and evaluate
              const expression = stopLossStr.replace(/[{}]/g, "").replace(/currentPrice/g, currentPrice.toString());
              result.tradeParams.stopLoss = eval(expression);
              loggerService.info(`Evaluated stop loss: ${stopLossStr} → ${result.tradeParams.stopLoss}`);
            } catch (error) {
              loggerService.warn(`Failed to evaluate stop loss template: ${stopLossStr}, using fallback`);
              result.tradeParams.stopLoss = currentPrice * 0.995; // 0.5% default
            }
          }
        }

        // Handle take profit template strings like "{currentPrice * 1.01}"
        if (result.tradeParams.takeProfit && typeof result.tradeParams.takeProfit === "string") {
          const takeProfitStr = result.tradeParams.takeProfit;
          if (takeProfitStr.includes("currentPrice")) {
            try {
              // Replace template variables and evaluate
              const expression = takeProfitStr.replace(/[{}]/g, "").replace(/currentPrice/g, currentPrice.toString());
              result.tradeParams.takeProfit = eval(expression);
              loggerService.info(`Evaluated take profit: ${takeProfitStr} → ${result.tradeParams.takeProfit}`);
            } catch (error) {
              loggerService.warn(`Failed to evaluate take profit template: ${takeProfitStr}, using fallback`);
              result.tradeParams.takeProfit = currentPrice * 1.015; // 1.5% default
            }
          }
        }
      }

      loggerService.info(`Successfully validated and normalized parsed result: ${result.decision} (${result.confidence}% confidence)`);
      return result;
    } catch (error) {
      loggerService.warn(`Primary parsing failed: ${error instanceof Error ? error.message : "Unknown error"}, falling back to manual extraction`);
      return this.manualExtraction(jsonString);
    }
  }

  /**
   * Manual extraction of key trading decision values when JSON parsing completely fails
   */
  private static manualExtraction(text: string): any {
    loggerService.info("Starting manual extraction of trading decision");

    const extracted: any = {
      decision: "REJECT",
      confidence: 50,
      reasoning: "Failed to parse AI response, using fallback decision",
      tradeParams: null,
      chartAnalysis: "Analysis unavailable due to parsing error",
      riskFactors: ["AI response parsing failed"],
      executionStrategy: { priority: "LOW", timeframe: "IMMEDIATE", conditions: [] },
    };

    // Try to extract decision with multiple patterns
    let decisionMatch = text.match(/"decision"\s*:\s*"(EXECUTE_TRADE|HOLD|REJECT)"/i);
    if (!decisionMatch) {
      // Try without quotes
      decisionMatch = text.match(/"decision"\s*:\s*(EXECUTE_TRADE|HOLD|REJECT)/i);
    }
    if (!decisionMatch) {
      // Try with different spacing
      decisionMatch = text.match(/decision["\s]*:\s*["]?(EXECUTE_TRADE|HOLD|REJECT)/i);
    }
    if (decisionMatch) {
      extracted.decision = decisionMatch[1].toUpperCase();
      loggerService.info(`Extracted decision: ${extracted.decision}`);
    }

    // Try to extract confidence with multiple patterns
    let confidenceMatch = text.match(/"confidence"\s*:\s*(\d+)/);
    if (!confidenceMatch) {
      // Try with different patterns
      confidenceMatch = text.match(/confidence["\s]*:\s*(\d+)/i);
    }
    if (!confidenceMatch) {
      // Try to find percentage patterns
      confidenceMatch = text.match(/(\d+)%?\s*confidence/i);
    }
    if (confidenceMatch) {
      const confidence = parseInt(confidenceMatch[1]);
      if (confidence >= 0 && confidence <= 100) {
        extracted.confidence = confidence;
        loggerService.info(`Extracted confidence: ${extracted.confidence}%`);
      }
    }

    // Try to extract reasoning with multiple patterns
    let reasoningMatch = text.match(/"reasoning"\s*:\s*"([^"]+)"/);
    if (!reasoningMatch) {
      // Try with single quotes
      reasoningMatch = text.match(/"reasoning"\s*:\s*'([^']+)'/);
    }
    if (!reasoningMatch) {
      // Try without quotes but with common endings
      reasoningMatch = text.match(/reasoning["\s]*:\s*([^,}\n]+)/i);
    }
    if (reasoningMatch) {
      extracted.reasoning = reasoningMatch[1].trim();
      loggerService.info(`Extracted reasoning: ${extracted.reasoning.substring(0, 50)}...`);
    }

    // Try to extract chart analysis
    let chartAnalysisMatch = text.match(/"chartAnalysis"\s*:\s*"([^"]+)"/);
    if (!chartAnalysisMatch) {
      chartAnalysisMatch = text.match(/chartAnalysis["\s]*:\s*([^,}\n]+)/i);
    }
    if (chartAnalysisMatch) {
      extracted.chartAnalysis = chartAnalysisMatch[1].trim();
      loggerService.info(`Extracted chart analysis: ${extracted.chartAnalysis.substring(0, 50)}...`);
    }

    // Try to extract trade direction for tradeParams
    const directionMatch = text.match(/"direction"\s*:\s*"(BUY|SELL)"/i);
    if (directionMatch && extracted.decision === "EXECUTE_TRADE") {
      extracted.tradeParams = {
        symbol: "Unknown",
        direction: directionMatch[1].toUpperCase(),
        quantity: 1000,
        orderType: "MARKET",
        stopLoss: null,
        takeProfit: null,
      };
      loggerService.info(`Extracted trade direction: ${extracted.tradeParams.direction}`);
    }

    loggerService.info(`Manual extraction completed: ${extracted.decision} (${extracted.confidence}%)`);
    return extracted;
  }

  /**
   * Validate that the parsed decision has all required fields
   */
  static validateDecisionStructure(decision: any): boolean {
    const requiredFields = ["decision", "confidence", "reasoning"];
    const missingFields = requiredFields.filter((field) => !decision.hasOwnProperty(field));

    if (missingFields.length > 0) {
      loggerService.warn(`Decision missing required fields: ${missingFields.join(", ")}`);
      return false;
    }

    if (!["EXECUTE_TRADE", "HOLD", "REJECT"].includes(decision.decision)) {
      loggerService.warn(`Invalid decision value: ${decision.decision}`);
      return false;
    }

    if (typeof decision.confidence !== "number" || decision.confidence < 0 || decision.confidence > 100) {
      loggerService.warn(`Invalid confidence value: ${decision.confidence}`);
      return false;
    }

    return true;
  }

  /**
   * Apply AI-specific JSON repairs
   */
  private static applyAISpecificRepairs(text: string): string {
    let repaired = text;

    // 1. Fix double brackets (most common AI issue)
    // Replace {{ with { and }} with } but be careful not to replace template literals
    repaired = repaired.replace(/\{\{(?!\s*[a-zA-Z_$])/g, "{");
    repaired = repaired.replace(/(?<![a-zA-Z_$]\s*)\}\}/g, "}");

    // 2. More aggressive double bracket fix for nested objects
    repaired = repaired.replace(/\{\{\s*"/g, '{"');
    repaired = repaired.replace(/"\s*\}\}/g, '"}');

    // 3. Fix common AI response patterns
    repaired = repaired.replace(/\{\{\s*(\w+)/g, '{"$1');
    repaired = repaired.replace(/(\w+)\s*\}\}/g, '$1"}');

    // 4. Fix template variable placeholders that AI might generate
    repaired = repaired.replace(/\{symbol\}/g, '"symbol"');
    repaired = repaired.replace(/\{currentPrice\}/g, '"currentPrice"');
    repaired = repaired.replace(/\{price\}/g, '"price"');

    // 5. Fix trailing commas before closing braces/brackets
    repaired = repaired.replace(/,(\s*[}\]])/g, "$1");

    // 6. Fix missing quotes around property names
    repaired = repaired.replace(/(\{|\,)\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

    // 7. Fix unescaped quotes in strings
    repaired = repaired.replace(/"([^"]*)"([^"]*)"([^"]*)":/g, '"$1\\"$2\\"$3":');

    // 8. Fix boolean and null values in quotes
    repaired = repaired.replace(/"(true|false|null)"/g, "$1");

    // 9. Fix numbers in quotes (but preserve string numbers if they look like IDs)
    repaired = repaired.replace(/"(\d+\.?\d*)"(?=\s*[,}\]])/g, (match, number) => {
      // Keep as string if it looks like an ID (long number)
      if (number.length > 10) return match;
      return number;
    });

    return repaired;
  }
}
