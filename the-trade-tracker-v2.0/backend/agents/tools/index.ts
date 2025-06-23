import { DatabaseTool } from "./database.tool";
import { RiskCalculationTool } from "./risk-calculation.tool";
import { CapitalApiTool } from "./capital-api.tool";
import { ChartAnalysisTool } from "./chart-analysis.tool";

/**
 * Tool Factory for LangChain.js Agents
 * Centralized tool creation and management
 */
export class ToolFactory {
  static createTool(toolName: string): any {
    switch (toolName) {
      case "capital_api":
        return new CapitalApiTool();
      case "database":
        return new DatabaseTool();
      case "risk_calculation":
        return new RiskCalculationTool();
      case "chart_analysis":
        return new ChartAnalysisTool();
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }
}

/**
 * Get all available tools for agent initialization
 */
export function getAllTools(): any[] {
  return [new CapitalApiTool(), new DatabaseTool(), new RiskCalculationTool(), new ChartAnalysisTool()];
}

// Export individual tools
export { DatabaseTool, RiskCalculationTool, CapitalApiTool, ChartAnalysisTool };
