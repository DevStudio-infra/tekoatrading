import { Router } from "express";
import { asyncHandler, ApiError } from "../../middleware/error-handler.middleware";
import { OrderManagementService } from "../../services/order-management.service";
import { TradingService } from "../../services/trading.service";
import { brokerFactoryService } from "../../services/broker-factory.service";
import { loggerService } from "../../services/logger.service";

// Development token helper function
function createDevelopmentToken(): string {
  const devTokenData = {
    userId: 1,
    id: 1,
    email: "dev@example.com",
  };
  return Buffer.from(JSON.stringify(devTokenData)).toString("base64");
}

// Create instances
const orderManagementService = new OrderManagementService();
const tradingService = new TradingService();
const router = Router();

// Get all trades for a bot with optional live data sync
router.get(
  "/bot/:botId",
  asyncHandler(async (req: any, res: any) => {
    const botId = req.params.botId;
    const syncLive = req.query.syncLive === "true";
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    if (!botId) {
      throw new ApiError(400, "Bot ID is required");
    }

    let trades = await orderManagementService.getTradesByBotId(botId, limit, offset);

    // If syncLive is requested, update trade data with live positions from Capital.com
    if (syncLive && trades.length > 0) {
      try {
        // Get the first trade to determine the bot's user ID and broker credential
        const firstTrade = trades[0];
        if (firstTrade?.userId && firstTrade?.botId) {
          // Get bot data to find the broker credential ID
          const botResponse = await fetch(`http://localhost:5000/api/v1/bots/${firstTrade.botId}`, {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${createDevelopmentToken()}`,
            },
          });

          if (!botResponse.ok) {
            throw new Error(`Failed to fetch bot data: ${botResponse.statusText}`);
          }

          const botData = await botResponse.json();
          if (!botData.success || !botData.data?.brokerCredentialId) {
            throw new Error(`Bot ${firstTrade.botId} has no broker credential ID`);
          }

          // Get Capital.com API instance using the bot's broker credential ID
          const capitalApi = await brokerFactoryService.getBrokerApi(botData.data.brokerCredentialId, firstTrade.userId);

          // Sync live data for open trades
          const updatedTrades = await Promise.allSettled(
            trades.map(async (trade: any) => {
              if (trade.status === "OPEN" && trade.brokerDealId) {
                try {
                  // Get live position data from Capital.com
                  const livePosition = await capitalApi.getPositionById(trade.brokerDealId);

                  if (livePosition) {
                    // Debug: Log the actual structure of the Capital.com response
                    console.log(`[TRADES API] Live position data for ${trade.brokerDealId}:`, JSON.stringify(livePosition, null, 2));

                    // Extract position data from nested structure
                    const positionData = livePosition.position || livePosition;

                    // Get live P&L from Capital.com or calculate as fallback
                    const currentPrice = positionData.level || trade.currentPrice || 0;
                    const entryPrice = trade.entryPrice || 0;

                    // Use Capital.com's actual unrealized P&L if available, otherwise calculate
                    const profitLoss =
                      positionData.upl !== undefined
                        ? positionData.upl
                        : (() => {
                            const priceDiff = trade.direction === "BUY" ? currentPrice - entryPrice : entryPrice - currentPrice;
                            return priceDiff * trade.quantity;
                          })();

                    const profitLossPercent = entryPrice > 0 ? (profitLoss / (entryPrice * trade.quantity)) * 100 : 0;

                    // Extract stop loss and take profit from Capital.com position
                    const stopLoss = positionData.stopLevel || trade.stopLoss;
                    const takeProfit = positionData.profitLevel || trade.takeProfit;

                    // Debug: Log the extracted values
                    console.log(`[TRADES API] Extracted values - SL: ${stopLoss}, TP: ${takeProfit}, Raw SL: ${positionData.stopLevel}, Raw TP: ${positionData.profitLevel}`);

                    // Update the trade object with live data (not persisted to DB unless closed)
                    return {
                      ...trade,
                      currentPrice,
                      profitLoss,
                      profitLossPercent,
                      stopLoss,
                      takeProfit,
                      liveData: {
                        timestamp: new Date().toISOString(),
                        brokerStatus: positionData.dealStatus,
                        size: positionData.size,
                        level: positionData.level,
                        stopLevel: positionData.stopLevel,
                        profitLevel: positionData.profitLevel,
                      },
                    };
                  }
                } catch (liveError) {
                  loggerService.warn(`Failed to get live data for trade ${trade.id}:`, liveError);
                }
              }
              return trade;
            })
          );

          // Extract successful results
          trades = updatedTrades.filter((result: any) => result.status === "fulfilled").map((result: any) => result.value);
        }
      } catch (syncError) {
        loggerService.warn("Failed to sync live trade data:", syncError);
        // Continue with non-live data if sync fails
      }
    }

    res.status(200).json({
      status: "success",
      data: {
        trades,
        total: trades.length,
        hasLiveData: syncLive,
      },
    });
  })
);

// Get active/open trades for a bot with live sync
router.get(
  "/bot/:botId/active",
  asyncHandler(async (req: any, res: any) => {
    const botId = req.params.botId;
    const syncLive = req.query.syncLive !== "false"; // Default to true for active trades

    if (!botId) {
      throw new ApiError(400, "Bot ID is required");
    }

    // Get active trades from database
    let activeTrades = await orderManagementService.getActiveTradesByBotId(botId);

    // Always try to sync live data for active trades
    if (syncLive && activeTrades.length > 0) {
      try {
        const firstTrade = activeTrades[0];
        if (firstTrade?.userId && firstTrade?.botId) {
          // Get bot data to find the broker credential ID
          const botResponse = await fetch(`http://localhost:5000/api/v1/bots/${firstTrade.botId}`, {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${createDevelopmentToken()}`,
            },
          });

          if (!botResponse.ok) {
            throw new Error(`Failed to fetch bot data: ${botResponse.statusText}`);
          }

          const botData = await botResponse.json();
          if (!botData.success || !botData.data?.brokerCredentialId) {
            throw new Error(`Bot ${firstTrade.botId} has no broker credential ID`);
          }

          const capitalApi = await brokerFactoryService.getBrokerApi(botData.data.brokerCredentialId, firstTrade.userId);

          const liveTradesData = await Promise.allSettled(
            activeTrades.map(async (trade: any) => {
              if (trade.brokerDealId) {
                try {
                  const livePosition = await capitalApi.getPositionById(trade.brokerDealId);

                  if (livePosition) {
                    // Extract position data from nested structure
                    const positionData = livePosition.position || livePosition;

                    const currentPrice = positionData.level || trade.currentPrice || 0;
                    const entryPrice = trade.entryPrice || 0;

                    // Use Capital.com's actual unrealized P&L if available, otherwise calculate
                    const profitLoss =
                      positionData.upl !== undefined
                        ? positionData.upl
                        : (() => {
                            const priceDiff = trade.direction === "BUY" ? currentPrice - entryPrice : entryPrice - currentPrice;
                            return priceDiff * trade.quantity;
                          })();

                    const profitLossPercent = entryPrice > 0 ? (profitLoss / (entryPrice * trade.quantity)) * 100 : 0;

                    // Extract stop loss and take profit from Capital.com position
                    const stopLoss = positionData.stopLevel || trade.stopLoss;
                    const takeProfit = positionData.profitLevel || trade.takeProfit;

                    // Debug: Log the extracted values for active trades
                    console.log(
                      `[ACTIVE TRADES API] Extracted values - SL: ${stopLoss}, TP: ${takeProfit}, Raw SL: ${positionData.stopLevel}, Raw TP: ${positionData.profitLevel}`
                    );

                    return {
                      ...trade,
                      currentPrice,
                      profitLoss,
                      profitLossPercent,
                      stopLoss,
                      takeProfit,
                      liveData: {
                        timestamp: new Date().toISOString(),
                        brokerStatus: positionData.dealStatus,
                        size: positionData.size,
                        level: positionData.level,
                        stopLevel: positionData.stopLevel,
                        profitLevel: positionData.profitLevel,
                        spread: positionData.spread,
                      },
                    };
                  }
                } catch (error) {
                  loggerService.warn(`Failed to get live data for active trade ${trade.id}:`, error);
                }
              }
              return trade;
            })
          );

          activeTrades = liveTradesData.filter((result: any) => result.status === "fulfilled").map((result: any) => result.value);
        }
      } catch (error) {
        loggerService.warn("Failed to sync live data for active trades:", error);
      }
    }

    res.status(200).json({
      status: "success",
      data: {
        activeTrades,
        totalActive: activeTrades.length,
        hasLiveData: syncLive,
      },
    });
  })
);

// Close a specific trade
router.post(
  "/:tradeId/close",
  asyncHandler(async (req: any, res: any) => {
    const tradeId = req.params.tradeId;
    const { reason } = req.body;

    if (!tradeId) {
      throw new ApiError(400, "Trade ID is required");
    }

    const closedTrade = await tradingService.closeTrade(tradeId, reason);

    res.status(200).json({
      status: "success",
      message: "Trade closed successfully",
      data: {
        trade: closedTrade,
      },
    });
  })
);

// Update trade parameters (stop loss, take profit)
router.patch(
  "/:tradeId",
  asyncHandler(async (req: any, res: any) => {
    const tradeId = req.params.tradeId;
    const { stopLoss, takeProfit, quantity } = req.body;

    if (!tradeId) {
      throw new ApiError(400, "Trade ID is required");
    }

    const updateParams: any = {};
    if (stopLoss !== undefined) updateParams.stopLoss = stopLoss;
    if (takeProfit !== undefined) updateParams.takeProfit = takeProfit;
    if (quantity !== undefined) updateParams.quantity = quantity;

    if (Object.keys(updateParams).length === 0) {
      throw new ApiError(400, "At least one parameter (stopLoss, takeProfit, or quantity) must be provided");
    }

    const updatedTrade = await tradingService.updateTrade(tradeId, updateParams);

    res.status(200).json({
      status: "success",
      message: "Trade updated successfully",
      data: {
        trade: updatedTrade,
      },
    });
  })
);

// Get trade summary/statistics for a bot
router.get(
  "/bot/:botId/summary",
  asyncHandler(async (req: any, res: any) => {
    const botId = req.params.botId;

    if (!botId) {
      throw new ApiError(400, "Bot ID is required");
    }

    const summary = await orderManagementService.getTradeSummaryByBotId(botId);

    res.status(200).json({
      status: "success",
      data: {
        summary,
      },
    });
  })
);

export default router;
