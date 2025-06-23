import { loggerService } from "../../../services/logger.service";
import { CapitalBaseService } from "./capital-base.service";
import { CapitalAuthConfig } from "../interfaces/capital-session.interface";
import { CapitalPosition, PositionsResponse, CreatePositionRequest, ClosePositionRequest, PositionResponse } from "../interfaces/capital-position.interface";

/**
 * Service for managing Capital.com trading positions
 */
export class CapitalPositionService extends CapitalBaseService {
  constructor(config: CapitalAuthConfig) {
    super(config);
  }

  /**
   * Get all open positions for the account
   *
   * @returns List of open positions
   */
  async getOpenPositions(): Promise<PositionsResponse> {
    try {
      await this.ensureAuthenticated();

      loggerService.info("Getting open positions");

      const response = await this.apiClient.get("api/v1/positions");

      loggerService.info(`Retrieved ${response.data.positions?.length || 0} open positions`);

      return response.data as PositionsResponse;
    } catch (error) {
      loggerService.error(`Failed to get open positions: ${error instanceof Error ? error.message : "Unknown error"}`);
      throw error;
    }
  }

  /**
   * Get details for a specific position
   *
   * @param dealId Deal ID of the position
   * @returns Position details
   */
  async getPositionById(dealId: string): Promise<CapitalPosition> {
    try {
      await this.ensureAuthenticated();

      loggerService.info(`Getting position details for deal ID: ${dealId}`);

      const response = await this.apiClient.get(`api/v1/positions/${dealId}`);

      return response.data as CapitalPosition;
    } catch (error) {
      loggerService.error(`Failed to get position for deal ID ${dealId}: ${error instanceof Error ? error.message : "Unknown error"}`);
      throw error;
    }
  }

  /**
   * Create a new position
   */
  async createPosition(epic: string, direction: "BUY" | "SELL", size: number, stopLevel?: number, profitLevel?: number): Promise<any> {
    try {
      await this.ensureAuthenticated();

      loggerService.info(`Creating ${direction} position for ${epic} with size ${size}`);

      // Get current market price for validation
      let currentPrice = 105000; // Default fallback price for BTC
      try {
        const marketDetails = await this.getMarketDetails(epic);
        currentPrice = direction === "BUY" ? marketDetails.snapshot.offer : marketDetails.snapshot.bid;
        loggerService.info(`💰 Current market price for ${epic}: bid=${marketDetails.snapshot.bid}, ask/offer=${marketDetails.snapshot.offer}, using=${currentPrice}`);
      } catch (marketError: any) {
        loggerService.warn(`⚠️ Could not get market price, using fallback: ${currentPrice}`);
      }

      // Validate and adjust stop loss and take profit levels
      let validatedStopLevel = stopLevel;
      let validatedProfitLevel = profitLevel;

      if (stopLevel) {
        const minStopDistance = currentPrice * 0.01; // 1% minimum distance

        if (direction === "BUY") {
          const stopDistance = currentPrice - stopLevel;
          if (stopDistance < minStopDistance) {
            validatedStopLevel = Math.round(currentPrice - minStopDistance);
            loggerService.warn(`🔧 Stop loss too close to market price. Adjusted from ${stopLevel} to ${validatedStopLevel} (min distance: ${minStopDistance})`);
          }
        } else {
          const stopDistance = stopLevel - currentPrice;
          if (stopDistance < minStopDistance) {
            validatedStopLevel = Math.round(currentPrice + minStopDistance);
            loggerService.warn(`🔧 Stop loss too close to market price. Adjusted from ${stopLevel} to ${validatedStopLevel} (min distance: ${minStopDistance})`);
          }
        }
      }

      if (profitLevel) {
        const minProfitDistance = currentPrice * 0.01; // 1% minimum distance

        if (direction === "BUY") {
          const profitDistance = profitLevel - currentPrice;
          if (profitDistance < minProfitDistance) {
            validatedProfitLevel = Math.round(currentPrice + minProfitDistance);
            loggerService.warn(`🔧 Take profit too close to market price. Adjusted from ${profitLevel} to ${validatedProfitLevel}`);
          }
        } else {
          const profitDistance = currentPrice - profitLevel;
          if (profitDistance < minProfitDistance) {
            validatedProfitLevel = Math.round(currentPrice - minProfitDistance);
            loggerService.warn(`🔧 Take profit too close to market price. Adjusted from ${profitLevel} to ${validatedProfitLevel}`);
          }
        }
      }

      // CHECK ACCOUNT BALANCE
      try {
        const accountDetails = await this.getAccountDetails();
        loggerService.info(`🔍 ACCOUNT DETAILS: ${JSON.stringify(accountDetails)}`);

        if (accountDetails.accounts && accountDetails.accounts.length > 0) {
          const primaryAccount = accountDetails.accounts[0];
          const availableFunds = primaryAccount.balance?.available || 0;
          const totalBalance = primaryAccount.balance?.balance || 0;

          loggerService.info(`💰 ACTUAL ACCOUNT BALANCE: ${totalBalance} ${primaryAccount.currency}`);
          loggerService.info(`💰 AVAILABLE FUNDS: ${availableFunds} ${primaryAccount.currency}`);

          // Calculate position value using current market price
          const positionValue = size * currentPrice;
          loggerService.info(`📊 POSITION VALUE: ${positionValue} vs Available: ${availableFunds}`);

          if (availableFunds < 0) {
            loggerService.error(`❌ NEGATIVE AVAILABLE BALANCE: ${availableFunds} ${primaryAccount.currency} - This explains the RISK_CHECK failures!`);
            loggerService.error(`❌ Account is over-leveraged or has insufficient margin`);
          }

          if (positionValue > Math.abs(availableFunds)) {
            loggerService.error(`❌ INSUFFICIENT FUNDS: Position value ${positionValue} exceeds available ${Math.abs(availableFunds)}`);
          }
        }
      } catch (accountError: any) {
        loggerService.error(`❌ FAILED TO GET ACCOUNT DETAILS: ${accountError.message}`);
      }

      const requestBody = {
        epic,
        direction,
        size,
        orderType: "MARKET",
        timeInForce: "FILL_OR_KILL",
        guaranteedStop: false,
        ...(validatedStopLevel && { stopLevel: validatedStopLevel }),
        ...(validatedProfitLevel && { profitLevel: validatedProfitLevel }),
      };

      loggerService.info(`🔍 REQUEST BODY: ${JSON.stringify(requestBody)}`);
      loggerService.info(`🔍 API BASE URL: ${this.apiClient.defaults.baseURL}`);

      const response = await this.makeAuthenticatedRequest("api/v1/positions", {
        method: "POST",
        data: requestBody,
      });

      loggerService.info(`Position created successfully: ${JSON.stringify(response.data)}`);

      // VERIFY: Check deal confirmation if we got a deal reference
      if (response.data.dealReference) {
        try {
          loggerService.info(`🔍 VERIFYING deal confirmation for: ${response.data.dealReference}`);

          // Wait a moment for the deal to process
          await new Promise((resolve) => setTimeout(resolve, 2000));

          const dealConfirmation = await this.getDealConfirmation(response.data.dealReference);
          loggerService.info(`🔍 DEAL CONFIRMATION: ${JSON.stringify(dealConfirmation)}`);

          // Check deal status
          if (dealConfirmation.dealStatus === "REJECTED") {
            loggerService.error(`❌ TRADE REJECTED: ${dealConfirmation.rejectReason}`);
            loggerService.error(`❌ Rejection details: ${JSON.stringify(dealConfirmation)}`);
          }

          // Check if position actually exists in open positions
          loggerService.info(`🔍 CHECKING if position appears in open positions...`);
          const openPositions = await this.getOpenPositions();
          const foundPosition = openPositions.positions?.find((pos) => pos.position.dealReference === response.data.dealReference);

          if (foundPosition) {
            loggerService.info(`✅ POSITION VERIFIED: Found in open positions: ${JSON.stringify(foundPosition)}`);
          } else {
            loggerService.error(`❌ POSITION NOT FOUND: Deal reference ${response.data.dealReference} not in open positions`);
            loggerService.error(`❌ Open positions count: ${openPositions.positions?.length || 0}`);
            loggerService.error(`❌ This suggests the trade was rejected or failed despite getting a deal reference`);
          }
        } catch (verifyError: any) {
          loggerService.error(`❌ VERIFICATION FAILED: ${verifyError.message}`);
        }
      }

      return response.data;
    } catch (error: any) {
      loggerService.error(`Failed to create position: ${error.message}`);

      // Extract error details for better debugging
      const errorCode = error?.response?.data?.errorCode || "Unknown error code";
      const errorMessage = error?.response?.data?.message || error.message;

      loggerService.error(`API error code: ${errorCode}, message: ${errorMessage}`);

      // Log full error response for debugging
      if (error?.response?.data) {
        loggerService.error(`Full error response: ${JSON.stringify(error.response.data)}`);
      }

      throw new Error(`${errorCode}: ${errorMessage}`);
    }
  }

  /**
   * Create a limit order (working order)
   *
   * @param epic Market epic to trade
   * @param direction Buy or sell direction
   * @param size Position size
   * @param limitPrice Price level for the limit order
   * @param stopLevel Optional stop loss level
   * @param profitLevel Optional take profit level
   * @param goodTillDate Optional order expiration date
   * @returns Working order creation result
   */
  async createLimitOrder(epic: string, direction: "BUY" | "SELL", size: number, limitPrice: number, stopLevel?: number, profitLevel?: number, goodTillDate?: string): Promise<any> {
    return this.createWorkingOrder(epic, direction, size, limitPrice, "LIMIT", stopLevel, profitLevel, goodTillDate);
  }

  /**
   * Create a stop order (working order)
   *
   * @param epic Market epic to trade
   * @param direction Buy or sell direction
   * @param size Position size
   * @param stopPrice Price level for the stop order
   * @param stopLevel Optional stop loss level
   * @param profitLevel Optional take profit level
   * @param goodTillDate Optional order expiration date
   * @returns Working order creation result
   */
  async createStopOrder(epic: string, direction: "BUY" | "SELL", size: number, stopPrice: number, stopLevel?: number, profitLevel?: number, goodTillDate?: string): Promise<any> {
    return this.createWorkingOrder(epic, direction, size, stopPrice, "STOP", stopLevel, profitLevel, goodTillDate);
  }

  /**
   * Create a working order (limit or stop order)
   *
   * @param epic Market epic to trade
   * @param direction Buy or sell direction
   * @param size Position size
   * @param level Price level for the order
   * @param type Order type (LIMIT or STOP)
   * @param stopLevel Optional stop loss level
   * @param profitLevel Optional take profit level
   * @param goodTillDate Optional order expiration date
   * @returns Working order creation result
   */
  async createWorkingOrder(
    epic: string,
    direction: "BUY" | "SELL",
    size: number,
    level: number,
    type: "LIMIT" | "STOP",
    stopLevel?: number,
    profitLevel?: number,
    goodTillDate?: string
  ): Promise<any> {
    try {
      await this.ensureAuthenticated();

      loggerService.info(`Creating ${type} ${direction} working order for ${epic} at level ${level} with size ${size}`);

      // Get current market price for validation
      let currentPrice: number | undefined;
      try {
        const marketDetails = await this.getMarketDetails(epic);
        currentPrice = direction === "BUY" ? marketDetails.snapshot.offer : marketDetails.snapshot.bid;
        loggerService.info(`💰 Current market price for ${epic}: bid=${marketDetails.snapshot.bid}, ask/offer=${marketDetails.snapshot.offer}, using=${currentPrice}`);
      } catch (marketError: any) {
        loggerService.warn(`⚠️ Could not get market price for validation: ${marketError.message}`);
      }

      // Validate order level vs current market price
      if (currentPrice) {
        const isBuyOrder = direction === "BUY";
        let isValidLevel = false;

        if (type === "LIMIT") {
          // Limit orders: BUY below market, SELL above market
          isValidLevel = isBuyOrder ? level < currentPrice : level > currentPrice;
        } else if (type === "STOP") {
          // Stop orders: BUY above market, SELL below market
          isValidLevel = isBuyOrder ? level > currentPrice : level < currentPrice;
        }

        if (!isValidLevel) {
          const expectation = type === "LIMIT" ? (isBuyOrder ? "below" : "above") : isBuyOrder ? "above" : "below";
          throw new Error(`Invalid ${type} ${direction} order: level ${level} should be ${expectation} current market price ${currentPrice}`);
        }
      }

      const requestBody: any = {
        epic,
        direction,
        size,
        level,
        type,
        guaranteedStop: false,
        trailingStop: false,
      };

      // Add optional parameters
      if (stopLevel) {
        requestBody.stopLevel = stopLevel;
      }
      if (profitLevel) {
        requestBody.profitLevel = profitLevel;
      }
      if (goodTillDate) {
        requestBody.goodTillDate = goodTillDate;
      }

      loggerService.info(`🔍 WORKING ORDER REQUEST BODY: ${JSON.stringify(requestBody)}`);

      const response = await this.makeAuthenticatedRequest("api/v1/workingorders", {
        method: "POST",
        data: requestBody,
      });

      loggerService.info(`${type} working order created successfully: ${JSON.stringify(response.data)}`);

      return response.data;
    } catch (error: any) {
      loggerService.error(`Failed to create ${type} working order: ${error.message}`);

      // Extract error details for better debugging
      const errorCode = error?.response?.data?.errorCode || "Unknown error code";
      const errorMessage = error?.response?.data?.message || error.message;

      loggerService.error(`API error code: ${errorCode}, message: ${errorMessage}`);

      // Log full error response for debugging
      if (error?.response?.data) {
        loggerService.error(`Full error response: ${JSON.stringify(error.response.data)}`);
      }

      throw new Error(`${errorCode}: ${errorMessage}`);
    }
  }

  /**
   * Get all working orders for the account
   *
   * @returns List of working orders
   */
  async getWorkingOrders(): Promise<any> {
    try {
      await this.ensureAuthenticated();

      loggerService.info("Getting working orders");

      const response = await this.apiClient.get("api/v1/workingorders");

      loggerService.info(`Retrieved ${response.data.workingOrders?.length || 0} working orders`);

      return response.data;
    } catch (error) {
      loggerService.error(`Failed to get working orders: ${error instanceof Error ? error.message : "Unknown error"}`);
      throw error;
    }
  }

  /**
   * Update a working order
   *
   * @param dealId Deal ID of the working order
   * @param level New price level
   * @param stopLevel New stop loss level
   * @param profitLevel New take profit level
   * @param goodTillDate New expiration date
   * @returns Update result
   */
  async updateWorkingOrder(dealId: string, level?: number, stopLevel?: number, profitLevel?: number, goodTillDate?: string): Promise<any> {
    try {
      await this.ensureAuthenticated();

      loggerService.info(`Updating working order ${dealId}`);

      const requestBody: any = {};

      if (level !== undefined) requestBody.level = level;
      if (stopLevel !== undefined) requestBody.stopLevel = stopLevel;
      if (profitLevel !== undefined) requestBody.profitLevel = profitLevel;
      if (goodTillDate) requestBody.goodTillDate = goodTillDate;

      const response = await this.makeAuthenticatedRequest(`api/v1/workingorders/${dealId}`, {
        method: "PUT",
        data: requestBody,
      });

      loggerService.info(`Working order updated successfully: ${JSON.stringify(response.data)}`);

      return response.data;
    } catch (error: any) {
      loggerService.error(`Failed to update working order ${dealId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cancel a working order
   *
   * @param dealId Deal ID of the working order to cancel
   * @returns Cancellation result
   */
  async cancelWorkingOrder(dealId: string): Promise<any> {
    try {
      await this.ensureAuthenticated();

      loggerService.info(`Cancelling working order ${dealId}`);

      const response = await this.makeAuthenticatedRequest(`api/v1/workingorders/${dealId}`, {
        method: "DELETE",
      });

      loggerService.info(`Working order cancelled successfully: ${JSON.stringify(response.data)}`);

      return response.data;
    } catch (error: any) {
      loggerService.error(`Failed to cancel working order ${dealId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Close an existing position
   */
  async closePosition(dealId: string, direction: "BUY" | "SELL", size: number): Promise<any> {
    try {
      loggerService.info(`Closing position with deal ID: ${dealId}`);

      const requestBody = {
        dealId,
        direction,
        size,
        orderType: "MARKET",
      };

      const response = await this.makeAuthenticatedRequest("api/v1/positions/close", {
        method: "POST",
        data: requestBody,
      });

      loggerService.info(`Position closed successfully: ${JSON.stringify(response.data)}`);
      return response.data;
    } catch (error: any) {
      loggerService.error(`Failed to close position: ${error.message}`);

      // Extract error details for better debugging
      const errorCode = error?.response?.data?.errorCode || "Unknown error code";
      const errorMessage = error?.response?.data?.message || error.message;

      loggerService.error(`API error code: ${errorCode}, message: ${errorMessage}`);
      throw new Error(`${errorCode}: ${errorMessage}`);
    }
  }

  /**
   * Update an existing position (modify stop or limit levels)
   *
   * @param dealId Deal ID of the position to update
   * @param stopLevel New stop loss level
   * @param profitLevel New take profit level
   * @returns Position update response
   */
  async updatePosition(dealId: string, stopLevel?: number, profitLevel?: number): Promise<PositionResponse> {
    try {
      await this.ensureAuthenticated();

      loggerService.info(`Updating position with deal ID: ${dealId}`);

      const requestBody: Record<string, any> = { dealId };

      if (stopLevel !== undefined) {
        requestBody.stopLevel = stopLevel;
      }

      if (profitLevel !== undefined) {
        requestBody.profitLevel = profitLevel;
      }

      const response = await this.apiClient.put(`api/v1/positions/${dealId}`, requestBody);

      loggerService.info(`Position updated with deal reference: ${response.data.dealReference}`);

      return response.data as PositionResponse;
    } catch (error) {
      loggerService.error(`Failed to update position: ${error instanceof Error ? error.message : "Unknown error"}`);
      throw error;
    }
  }

  /**
   * Get transaction history for the account
   *
   * @param from Start date (ISO string)
   * @param to End date (ISO string)
   * @param pageSize Number of transactions per page
   * @param pageNumber Page number
   * @returns Transaction history
   */
  async getTransactionHistory(from?: string, to?: string, pageSize: number = 20, pageNumber: number = 1): Promise<any> {
    try {
      await this.ensureAuthenticated();

      loggerService.info("Getting transaction history");

      const params: Record<string, any> = {
        pageSize,
        pageNumber,
      };

      if (from) {
        params.from = from;
      }

      if (to) {
        params.to = to;
      }

      const response = await this.apiClient.get("api/v1/history/transactions", { params });

      return response.data;
    } catch (error) {
      loggerService.error(`Failed to get transaction history: ${error instanceof Error ? error.message : "Unknown error"}`);
      throw error;
    }
  }

  /**
   * Get deal confirmation details
   *
   * @param dealReference Deal reference from position creation
   * @returns Deal confirmation details
   */
  async getDealConfirmation(dealReference: string): Promise<any> {
    try {
      await this.ensureAuthenticated();

      loggerService.info(`Getting deal confirmation for reference: ${dealReference}`);

      const response = await this.apiClient.get(`api/v1/confirms/${dealReference}`);

      loggerService.info(`Deal confirmation retrieved: ${JSON.stringify(response.data)}`);
      return response.data;
    } catch (error) {
      loggerService.error(`Failed to get deal confirmation for ${dealReference}: ${error instanceof Error ? error.message : "Unknown error"}`);
      throw error;
    }
  }

  /**
   * Get market details for a specific epic
   *
   * @param epic Market epic to get details for
   * @returns Market details including current prices
   */
  async getMarketDetails(epic: string): Promise<any> {
    try {
      await this.ensureAuthenticated();

      loggerService.info(`Getting market details for: ${epic}`);

      const response = await this.apiClient.get(`api/v1/markets/${epic}`);

      return response.data;
    } catch (error) {
      loggerService.error(`Failed to get market details for ${epic}: ${error instanceof Error ? error.message : "Unknown error"}`);
      throw error;
    }
  }
}
