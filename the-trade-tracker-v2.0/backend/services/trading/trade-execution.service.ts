import { loggerService } from "../logger.service";
import { prisma } from "../../utils/prisma";
import { CapitalMainService } from "../../modules/capital";
import { TradeExecutionParams, TradeUpdateParams, BrokerExecutionResult } from "./types";
import { SymbolMappingService } from "./symbol-mapping.service";

/**
 * TradeExecutionService
 *
 * Handles all trade execution logic including market, limit, and stop orders.
 * Extracted from TradingService to improve maintainability.
 */
export class TradeExecutionService {
  private logger: typeof loggerService;
  private symbolMapping: SymbolMappingService;

  constructor(symbolMapping: SymbolMappingService) {
    this.logger = loggerService;
    this.symbolMapping = symbolMapping;
  }

  /**
   * Execute broker trade (actual Capital.com API call)
   */
  async executeBrokerTrade(tradeRequest: any, capitalApi: CapitalMainService): Promise<BrokerExecutionResult> {
    try {
      this.logger.info(`Attempting broker execution for trade ${tradeRequest.id || "new"}`);

      let result;
      switch (tradeRequest.orderType) {
        case "MARKET":
          result = await this.executeMarketOrder(tradeRequest, capitalApi);
          break;
        case "LIMIT":
          result = await this.executeLimitOrder(tradeRequest, tradeRequest.limitPrice, capitalApi);
          break;
        case "STOP":
          result = await this.executeStopOrder(tradeRequest, tradeRequest.stopPrice, capitalApi);
          break;
        default:
          throw new Error(`Unsupported order type: ${tradeRequest.orderType}`);
      }

      if (result && result.dealReference) {
        this.logger.info(`Broker execution successful for trade ${tradeRequest.id || "new"}: ${JSON.stringify(result)}`);
        return {
          success: true,
          dealReference: result.dealReference,
        };
      } else {
        this.logger.error(`Broker execution failed for trade ${tradeRequest.id || "new"}: No deal reference returned`);
        return {
          success: false,
          error: "No deal reference returned from broker",
        };
      }
    } catch (error: any) {
      this.logger.error(`Broker execution error for trade ${tradeRequest.id || "new"}: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Execute a market order
   */
  async executeMarketOrder(trade: any, capitalApi: CapitalMainService): Promise<any> {
    // Convert the trading symbol to Capital.com epic format using our mapping
    const mappingResult = await this.symbolMapping.getEpicForSymbol(trade.symbol, capitalApi);
    const epic = mappingResult.epic;

    if (!epic) {
      throw new Error(`Failed to find Capital.com epic for symbol: ${trade.symbol}`);
    }

    this.logger.info(`Converting symbol ${trade.symbol} → epic ${epic} for position creation`);

    // Get market details to check minimum deal size and pricing rules
    let adjustedSize = trade.quantity;
    let adjustedStopLoss = trade.stopLoss;
    let adjustedTakeProfit = trade.takeProfit;

    try {
      const marketDetails = await capitalApi.getMarketDetails(epic);
      const minDealSize = marketDetails?.dealingRules?.minDealSize?.value || 1.0;

      if (trade.quantity < minDealSize) {
        this.logger.warn(`Position size ${trade.quantity} is below minimum deal size ${minDealSize} for ${epic}. Adjusting to minimum.`);
        adjustedSize = minDealSize;
      }

      this.logger.info(`Market ${epic} - Min deal size: ${minDealSize}, Requested: ${trade.quantity}, Using: ${adjustedSize}`);

      // Get current market price for validation
      const priceData = await capitalApi.getLatestPrice(epic);
      if (priceData?.bid && priceData?.ask) {
        const currentPrice = (priceData.bid + priceData.ask) / 2;
        this.logger.info(`Current market price for ${epic}: ${currentPrice}`);

        // Improved validation using Capital.com's actual minimum distance requirements
        const minStopDistance = marketDetails?.dealingRules?.minStopOrLimitDistance?.value || 0.0001;

        // Risk management replaced with agent-based approach
        const stopDistanceMultiplier = this.getMinDistanceMultiplier(epic, currentPrice);
        const profitDistanceMultiplier = this.getMinDistanceMultiplier(epic, currentPrice);

        if (adjustedStopLoss) {
          // CRITICAL FIX: First validate stop loss is on correct side of current price
          const isStopLossOnCorrectSide = trade.direction === "BUY" ? adjustedStopLoss < currentPrice : adjustedStopLoss > currentPrice;

          if (!isStopLossOnCorrectSide) {
            // Stop loss is on wrong side - fix immediately
            const emergencyDistance = currentPrice * 0.01; // 1% emergency distance
            const correctedStopLoss = trade.direction === "BUY" ? currentPrice - emergencyDistance : currentPrice + emergencyDistance;

            this.logger.error(
              `CRITICAL: Stop loss ${adjustedStopLoss} is on WRONG SIDE for ${trade.direction} order (current: ${currentPrice}). Correcting to ${correctedStopLoss.toFixed(6)}`
            );
            adjustedStopLoss = parseFloat(correctedStopLoss.toFixed(this.getPricePrecision(epic, currentPrice)));
          } else {
            // Stop loss is on correct side, now check distance
            const stopDistance = trade.direction === "BUY" ? Math.abs(currentPrice - adjustedStopLoss) : Math.abs(adjustedStopLoss - currentPrice);

            const requiredStopDistance = Math.max(
              minStopDistance * stopDistanceMultiplier,
              currentPrice * 0.0001 // Minimum 0.01% of current price
            );

            if (stopDistance < requiredStopDistance) {
              const newStopLoss = trade.direction === "BUY" ? currentPrice - requiredStopDistance : currentPrice + requiredStopDistance;

              this.logger.warn(
                `Stop loss ${adjustedStopLoss} too close to current price ${currentPrice}. Required distance: ${requiredStopDistance.toFixed(
                  6
                )}, adjusting to ${newStopLoss.toFixed(6)}`
              );
              adjustedStopLoss = parseFloat(newStopLoss.toFixed(this.getPricePrecision(epic, currentPrice)));
            }
          }
        }

        if (adjustedTakeProfit) {
          // CRITICAL FIX: First validate take profit is on correct side of current price
          const isTakeProfitOnCorrectSide = trade.direction === "BUY" ? adjustedTakeProfit > currentPrice : adjustedTakeProfit < currentPrice;

          if (!isTakeProfitOnCorrectSide) {
            // Take profit is on wrong side - fix immediately
            const emergencyDistance = currentPrice * 0.01; // 1% emergency distance
            const correctedTakeProfit = trade.direction === "BUY" ? currentPrice + emergencyDistance : currentPrice - emergencyDistance;

            this.logger.error(
              `CRITICAL: Take profit ${adjustedTakeProfit} is on WRONG SIDE for ${trade.direction} order (current: ${currentPrice}). Correcting to ${correctedTakeProfit.toFixed(
                6
              )}`
            );
            adjustedTakeProfit = parseFloat(correctedTakeProfit.toFixed(this.getPricePrecision(epic, currentPrice)));
          } else {
            // Take profit is on correct side, now check distance
            const profitDistance = trade.direction === "BUY" ? Math.abs(adjustedTakeProfit - currentPrice) : Math.abs(currentPrice - adjustedTakeProfit);

            const requiredProfitDistance = Math.max(
              minStopDistance * profitDistanceMultiplier,
              currentPrice * 0.0001 // Minimum 0.01% of current price
            );

            if (profitDistance < requiredProfitDistance) {
              const newTakeProfit = trade.direction === "BUY" ? currentPrice + requiredProfitDistance : currentPrice - requiredProfitDistance;

              this.logger.warn(
                `Take profit ${adjustedTakeProfit} too close to current price ${currentPrice}. Required distance: ${requiredProfitDistance.toFixed(
                  6
                )}, adjusting to ${newTakeProfit.toFixed(6)}`
              );
              adjustedTakeProfit = parseFloat(newTakeProfit.toFixed(this.getPricePrecision(epic, currentPrice)));
            }
          }
        }

        // Final validation: check if our adjusted values are still reasonable
        if (adjustedTakeProfit && adjustedStopLoss) {
          const riskRewardRatio =
            trade.direction === "BUY"
              ? (adjustedTakeProfit - currentPrice) / (currentPrice - adjustedStopLoss)
              : (currentPrice - adjustedTakeProfit) / (adjustedStopLoss - currentPrice);

          this.logger.info(`Adjusted levels - SL: ${adjustedStopLoss}, TP: ${adjustedTakeProfit}, R/R: ${riskRewardRatio.toFixed(2)}`);
        }

        // Final validation before sending to broker (only if we have current price)
        if (trade.direction === "BUY") {
          if (adjustedStopLoss && adjustedStopLoss >= currentPrice) {
            this.logger.error(`CRITICAL: BUY order SL ${adjustedStopLoss} >= current price ${currentPrice}. This will be rejected by broker.`);
            adjustedStopLoss = currentPrice * 0.995; // 0.5% below current price as emergency fallback
            this.logger.warn(`Emergency SL adjustment for BUY: ${adjustedStopLoss}`);
          }
          if (adjustedTakeProfit && adjustedTakeProfit <= currentPrice) {
            this.logger.error(`CRITICAL: BUY order TP ${adjustedTakeProfit} <= current price ${currentPrice}. This will be rejected by broker.`);
            adjustedTakeProfit = currentPrice * 1.005; // 0.5% above current price as emergency fallback
            this.logger.warn(`Emergency TP adjustment for BUY: ${adjustedTakeProfit}`);
          }
        } else if (trade.direction === "SELL") {
          if (adjustedStopLoss && adjustedStopLoss <= currentPrice) {
            this.logger.error(`CRITICAL: SELL order SL ${adjustedStopLoss} <= current price ${currentPrice}. This will be rejected by broker.`);
            adjustedStopLoss = currentPrice * 1.005; // 0.5% above current price as emergency fallback
            this.logger.warn(`Emergency SL adjustment for SELL: ${adjustedStopLoss}`);
          }
          if (adjustedTakeProfit && adjustedTakeProfit >= currentPrice) {
            this.logger.error(`CRITICAL: SELL order TP ${adjustedTakeProfit} >= current price ${currentPrice}. This will be rejected by broker.`);
            adjustedTakeProfit = currentPrice * 0.995; // 0.5% below current price as emergency fallback
            this.logger.warn(`Emergency TP adjustment for SELL: ${adjustedTakeProfit}`);
          }
        }
      }
    } catch (error) {
      this.logger.warn(`Could not get market details for ${epic}, proceeding with original values: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    // Create position with adjusted values
    this.logger.info(`Creating ${trade.direction} position for ${epic} with size ${adjustedSize}`);
    const orderResult = await capitalApi.createPosition(epic, trade.direction, adjustedSize, adjustedStopLoss, adjustedTakeProfit);

    this.logger.info(`Position created successfully: ${JSON.stringify(orderResult)}`);

    return {
      dealReference: orderResult.dealReference,
      dealStatus: "ACCEPTED",
      adjustedSize: adjustedSize,
      epic: epic,
    };
  }

  /**
   * Execute a limit order (simulated with market order validation)
   */
  async executeLimitOrder(trade: any, limitPrice: number, capitalApi: CapitalMainService): Promise<any> {
    // Convert the trading symbol to Capital.com epic format using our mapping
    const mappingResult = await this.symbolMapping.getEpicForSymbol(trade.symbol, capitalApi);
    const epic = mappingResult.epic;

    if (!epic) {
      throw new Error(`Failed to find Capital.com epic for symbol: ${trade.symbol}`);
    }

    this.logger.info(`Converting symbol ${trade.symbol} → epic ${epic} for LIMIT order creation`);

    // Get current market price for validation
    let currentPrice: number | undefined;
    try {
      const priceData = await capitalApi.getLatestPrice(epic);

      // Capital.com API can return ask price as 'ask', 'offer', or 'ofr'
      const bid = priceData?.bid;
      const ask = priceData?.ask || priceData?.offer || priceData?.ofr;

      if (bid && ask) {
        currentPrice = (bid + ask) / 2;
        this.logger.info(`Current market price for ${epic}: ${currentPrice} (bid: ${bid}, ask: ${ask}), LIMIT price: ${limitPrice}`);
      }
    } catch (priceError) {
      this.logger.warn(`Could not get current price for limit order validation: ${priceError instanceof Error ? priceError.message : "Unknown error"}`);
    }

    // Validate limit price vs current market price
    if (currentPrice) {
      const isBuyOrder = trade.direction === "BUY";
      const isValidLimitPrice = isBuyOrder ? limitPrice < currentPrice : limitPrice > currentPrice;

      if (!isValidLimitPrice) {
        const directionText = isBuyOrder ? "below" : "above";
        throw new Error(`Invalid LIMIT ${trade.direction} price: ${limitPrice} should be ${directionText} current market price ${currentPrice}`);
      }
    }

    // Create real LIMIT working order using Capital.com API
    this.logger.info(`Creating REAL LIMIT working order for ${trade.direction} ${epic} at ${limitPrice}`);

    // Get market details to check minimum deal size
    let adjustedSize = trade.quantity;
    try {
      const marketDetails = await capitalApi.getMarketDetails(epic);
      const minDealSize = marketDetails?.dealingRules?.minDealSize?.value || 1.0;

      if (trade.quantity < minDealSize) {
        this.logger.warn(`Position size ${trade.quantity} is below minimum deal size ${minDealSize} for ${epic}. Adjusting to minimum.`);
        adjustedSize = minDealSize;
      }
    } catch (error) {
      this.logger.warn(`Could not get market details for ${epic}, proceeding with original size: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    // Create real limit working order
    const orderResult = await capitalApi.createLimitOrder(epic, trade.direction, adjustedSize, limitPrice, trade.stopLoss, trade.takeProfit);

    this.logger.info(`REAL LIMIT working order created: ${JSON.stringify(orderResult)}`);

    return {
      dealReference: orderResult.dealReference || `limit_${Date.now()}`,
      orderReference: orderResult.dealReference,
      dealStatus: "ACCEPTED",
      adjustedSize: adjustedSize,
      level: limitPrice,
      epic: epic,
      orderType: "LIMIT",
      requestedLimitPrice: limitPrice,
    };
  }

  /**
   * Execute a stop order (simulated with market order validation)
   */
  async executeStopOrder(trade: any, stopPrice: number, capitalApi: CapitalMainService): Promise<any> {
    // Convert the trading symbol to Capital.com epic format using our mapping
    const mappingResult = await this.symbolMapping.getEpicForSymbol(trade.symbol, capitalApi);
    const epic = mappingResult.epic;

    if (!epic) {
      throw new Error(`Failed to find Capital.com epic for symbol: ${trade.symbol}`);
    }

    this.logger.info(`Converting symbol ${trade.symbol} → epic ${epic} for STOP order creation`);

    // Get current market price for validation
    let currentPrice: number | undefined;
    try {
      const priceData = await capitalApi.getLatestPrice(epic);
      if (priceData?.bid && priceData?.ask) {
        currentPrice = (priceData.bid + priceData.ask) / 2;
        this.logger.info(`Current market price for ${epic}: ${currentPrice}, STOP price: ${stopPrice}`);
      }
    } catch (priceError) {
      this.logger.warn(`Could not get current price for stop order validation: ${priceError instanceof Error ? priceError.message : "Unknown error"}`);
    }

    // Validate stop price vs current market price
    if (currentPrice) {
      const isBuyOrder = trade.direction === "BUY";
      const isValidStopPrice = isBuyOrder ? stopPrice > currentPrice : stopPrice < currentPrice;

      if (!isValidStopPrice) {
        const directionText = isBuyOrder ? "above" : "below";
        throw new Error(`Invalid STOP ${trade.direction} price: ${stopPrice} should be ${directionText} current market price ${currentPrice}`);
      }
    }

    // Create real STOP working order using Capital.com API
    this.logger.info(`Creating REAL STOP working order for ${trade.direction} ${epic} at ${stopPrice}`);

    // Get market details to check minimum deal size
    let adjustedSize = trade.quantity;
    try {
      const marketDetails = await capitalApi.getMarketDetails(epic);
      const minDealSize = marketDetails?.dealingRules?.minDealSize?.value || 1.0;

      if (trade.quantity < minDealSize) {
        this.logger.warn(`Position size ${trade.quantity} is below minimum deal size ${minDealSize} for ${epic}. Adjusting to minimum.`);
        adjustedSize = minDealSize;
      }
    } catch (error) {
      this.logger.warn(`Could not get market details for ${epic}, proceeding with original size: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    // Create real stop working order
    const orderResult = await capitalApi.createStopOrder(epic, trade.direction, adjustedSize, stopPrice, trade.stopLoss, trade.takeProfit);

    this.logger.info(`REAL STOP working order created: ${JSON.stringify(orderResult)}`);

    return {
      dealReference: orderResult.dealReference || `stop_${Date.now()}`,
      orderReference: orderResult.dealReference,
      dealStatus: "ACCEPTED",
      adjustedSize: adjustedSize,
      level: stopPrice,
      epic: epic,
      orderType: "STOP",
      requestedStopPrice: stopPrice,
    };
  }

  /**
   * Close a trade
   */
  async closeTrade(tradeId: string, reason?: string, capitalApi?: CapitalMainService): Promise<any> {
    try {
      const trade = await prisma.trade.findUnique({
        where: { id: tradeId },
      });

      if (!trade) {
        throw new Error(`Trade not found: ${tradeId}`);
      }

      if (trade.status !== "OPEN") {
        throw new Error(`Cannot close trade with status: ${trade.status}`);
      }

      if (!capitalApi) {
        throw new Error("Capital API instance required for closing trades");
      }

      // Close position with broker
      const brokerResponse = await capitalApi.closePosition(trade.brokerDealId!, trade.direction === "BUY" ? "SELL" : "BUY", trade.quantity);

      // Calculate P&L with improved accuracy
      const currentPrice = brokerResponse.level || trade.currentPrice || 0;
      const entryPrice = trade.entryPrice || 0;

      // Calculate price difference based on trade direction
      const priceDiff = trade.direction === "BUY" ? currentPrice - entryPrice : entryPrice - currentPrice;

      // Calculate absolute P&L and percentage
      const profitLoss = priceDiff * trade.quantity;
      const profitLossPercent = entryPrice > 0 ? (priceDiff / entryPrice) * 100 : 0;

      // Get fees from broker response if available
      const fees = brokerResponse.fees || brokerResponse.commission || 0;

      this.logger.info(`Trade P&L calculation: Entry=${entryPrice}, Exit=${currentPrice}, Diff=${priceDiff}, P&L=${profitLoss} (${profitLossPercent.toFixed(2)}%), Fees=${fees}`);

      // Update trade record
      const updatedTrade = await prisma.trade.update({
        where: { id: tradeId },
        data: {
          status: "CLOSED",
          currentPrice,
          profitLoss,
          profitLossPercent,
          fees,
          closedAt: new Date(),
          rationale: reason ? `${trade.rationale || ""}\nClosed: ${reason}` : trade.rationale,
        },
      });

      this.logger.info(`Trade closed successfully: ${tradeId}`, { profitLoss, profitLossPercent });

      return updatedTrade;
    } catch (error) {
      this.logger.error(`Error closing trade ${tradeId}:`, error);
      throw error;
    }
  }

  /**
   * Update trade parameters (stop loss, take profit)
   */
  async updateTrade(tradeId: string, params: TradeUpdateParams, capitalApi?: CapitalMainService): Promise<any> {
    try {
      const trade = await prisma.trade.findUnique({
        where: { id: tradeId },
      });

      if (!trade) {
        throw new Error(`Trade not found: ${tradeId}`);
      }

      if (trade.status !== "OPEN") {
        throw new Error(`Cannot update trade with status: ${trade.status}`);
      }

      // Update position with broker if stop loss or take profit changed
      if ((params.stopLoss !== undefined || params.takeProfit !== undefined) && capitalApi) {
        await capitalApi.updatePosition(trade.brokerDealId!, params.stopLoss, params.takeProfit);
      }

      // Update trade record
      const updatedTrade = await prisma.trade.update({
        where: { id: tradeId },
        data: {
          stopLoss: params.stopLoss ?? trade.stopLoss,
          takeProfit: params.takeProfit ?? trade.takeProfit,
          quantity: params.quantity ?? trade.quantity,
        },
      });

      this.logger.info(`Trade updated successfully: ${tradeId}`, params);

      return updatedTrade;
    } catch (error) {
      this.logger.error(`Error updating trade ${tradeId}:`, error);
      throw error;
    }
  }

  /**
   * Helper methods replacing removed RiskManagementService
   */
  private getMinDistanceMultiplier(epic: string, currentPrice: number): number {
    // Default multiplier for minimum distance calculations
    return 1.5; // 50% buffer above minimum requirements
  }

  private getPricePrecision(epic: string, currentPrice: number): number {
    // Determine decimal places based on price
    if (currentPrice >= 1000) return 2;
    if (currentPrice >= 100) return 3;
    if (currentPrice >= 10) return 4;
    if (currentPrice >= 1) return 5;
    return 6;
  }
}
