import { Tool } from "langchain/tools";
import { loggerService } from "../../services/logger.service";
import { getCapitalApiInstance } from "../../modules/capital";
import type { CapitalMainService } from "../../modules/capital/services/capital-main.service";

/**
 * Capital.com API Tool for LangChain agents
 * Provides access to Capital.com trading functionality within agent workflows
 */
export class CapitalApiTool extends Tool {
  name = "capital-api";
  description = `Access Capital.com trading API. Can perform market data queries, search instruments, get account info, etc.
    Input should be a JSON string with properties:
    - action: string (required) - The action to perform (e.g., 'searchMarkets', 'getAccountDetails', 'getMarketDetails')
    - params: object (optional) - Parameters for the action
    - symbol: string (optional) - Trading symbol for market-related actions`;

  private capitalApi: CapitalMainService | null = null;

  constructor(credentials?: { apiKey: string; identifier: string; password: string; isDemo?: boolean }) {
    super();

    if (credentials) {
      this.capitalApi = getCapitalApiInstance({
        apiKey: credentials.apiKey,
        identifier: credentials.identifier,
        password: credentials.password,
        isDemo: credentials.isDemo,
        instanceId: `agent-tool-${Date.now()}`,
      });
    }
  }

  /**
   * Set credentials for the Capital.com API
   */
  setCredentials(credentials: { apiKey: string; identifier: string; password: string; isDemo?: boolean }): void {
    this.capitalApi = getCapitalApiInstance({
      apiKey: credentials.apiKey,
      identifier: credentials.identifier,
      password: credentials.password,
      isDemo: credentials.isDemo,
      instanceId: `agent-tool-${Date.now()}`,
    });
  }

  async _call(input: string): Promise<string> {
    try {
      if (!this.capitalApi) {
        return JSON.stringify({
          error: "Capital.com API not initialized. Please provide credentials first.",
          success: false,
        });
      }

      // Parse the input JSON
      let requestData;
      try {
        requestData = JSON.parse(input);
      } catch (parseError) {
        return JSON.stringify({
          error: "Invalid JSON input. Please provide a valid JSON string.",
          success: false,
        });
      }

      const { action, params = {}, symbol } = requestData;

      if (!action) {
        return JSON.stringify({
          error: "Action is required. Please specify the action to perform.",
          success: false,
        });
      }

      loggerService.info(`Capital API Tool executing action: ${action}`);

      let result;

      switch (action.toLowerCase()) {
        case "searchmarkets":
          if (!params.searchTerm && !symbol) {
            return JSON.stringify({
              error: "searchTerm or symbol is required for searchMarkets action",
              success: false,
            });
          }
          result = await this.capitalApi.searchMarkets(params.searchTerm || symbol);
          break;

        case "getaccountdetails":
          result = await this.capitalApi.getAccountDetails();
          break;

        case "getmarketdetails":
          if (!params.epic && !symbol) {
            return JSON.stringify({
              error: "epic or symbol is required for getMarketDetails action",
              success: false,
            });
          }
          result = await this.capitalApi.getMarketDetails(params.epic || symbol);
          break;

        case "getlatestprice":
          if (!params.epic && !symbol) {
            return JSON.stringify({
              error: "epic or symbol is required for getLatestPrice action",
              success: false,
            });
          }
          result = await this.capitalApi.getLatestPrice(params.epic || symbol);
          break;

        case "gethistoricalprices":
          if (!params.epic && !symbol) {
            return JSON.stringify({
              error: "epic or symbol is required for getHistoricalPrices action",
              success: false,
            });
          }
          result = await this.capitalApi.getHistoricalPrices(params.epic || symbol, params.resolution, params.from, params.to, params.max);
          break;

        case "getopenpositions":
          result = await this.capitalApi.getOpenPositions();
          break;

        case "getworkingorders":
          result = await this.capitalApi.getWorkingOrders();
          break;

        case "getepicforsymbol":
          if (!symbol && !params.symbol) {
            return JSON.stringify({
              error: "symbol is required for getEpicForSymbol action",
              success: false,
            });
          }
          result = await this.capitalApi.getEpicForSymbol(symbol || params.symbol);
          break;

        case "getsymbolformarket":
          if (!params.symbol && !symbol) {
            return JSON.stringify({
              error: "symbol is required for getSymbolMarketDetails action",
              success: false,
            });
          }
          result = await this.capitalApi.getSymbolMarketDetails(symbol || params.symbol);
          break;

        default:
          return JSON.stringify({
            error: `Unknown action: ${action}. Available actions: searchMarkets, getAccountDetails, getMarketDetails, getLatestPrice, getHistoricalPrices, getOpenPositions, getWorkingOrders, getEpicForSymbol, getSymbolMarketDetails`,
            success: false,
          });
      }

      return JSON.stringify({
        success: true,
        action,
        data: result,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      loggerService.error(`Capital API Tool error: ${errorMessage}`);

      return JSON.stringify({
        error: errorMessage,
        success: false,
      });
    }
  }
}
