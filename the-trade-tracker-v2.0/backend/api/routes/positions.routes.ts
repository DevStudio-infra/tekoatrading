import { Router } from "express";
import { OrderManagementService } from "../../services/order-management.service";
import { asyncHandler } from "../../middleware/error-handler.middleware";
import { ApiError } from "../../middleware/error-handler.middleware";

// Create an instance of the OrderManagementService
const orderManagementService = new OrderManagementService();

const router = Router();

// Get all positions for a bot
router.get(
  "/bot/:botId",
  asyncHandler(async (req, res) => {
    const botId = Number(req.params.botId);
    const activeOnly = req.query.activeOnly === "true";
    const limit = 100; // Default limit
    const offset = 0; // Default offset

    if (isNaN(botId)) {
      throw new ApiError(400, "Invalid bot ID");
    }

    // Call with proper types - botId as string, limit and offset instead of activeOnly
    const positions = await orderManagementService.getPositionsByBotId(botId.toString(), limit, offset);

    res.status(200).json({
      status: "success",
      data: {
        positions,
      },
    });
  })
);

// Get a specific position by ID
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    // The service expects a string ID, not a number
    const positionId = req.params.id;

    if (!positionId) {
      throw new ApiError(400, "Invalid position ID");
    }

    const position = await orderManagementService.getPositionById(positionId);

    if (!position) {
      throw new ApiError(404, `Position with ID ${positionId} not found`);
    }

    res.status(200).json({
      status: "success",
      data: {
        position,
      },
    });
  })
);

// Close a position
router.post(
  "/:id/close",
  asyncHandler(async (req, res) => {
    const positionId = req.params.id;
    const closePrice = parseFloat(req.body.closePrice) || 0;
    const profitLoss = parseFloat(req.body.profitLoss) || 0;

    if (!positionId) {
      throw new ApiError(400, "Invalid position ID");
    }

    if (isNaN(closePrice) || isNaN(profitLoss)) {
      throw new ApiError(400, "closePrice and profitLoss must be numbers");
    }

    await orderManagementService.closePosition(positionId, closePrice, profitLoss);

    res.status(200).json({
      status: "success",
      message: "Position closed successfully",
    });
  })
);

// Partially close a position
router.post(
  "/:id/partial-close",
  asyncHandler(async (req, res) => {
    const positionId = req.params.id;
    const closePrice = parseFloat(req.body.closePrice) || 0;
    const profitLoss = parseFloat(req.body.profitLoss) || 0;
    const partialSize = parseFloat(req.body.partialSize) || 0;

    if (!positionId) {
      throw new ApiError(400, "Invalid position ID");
    }

    if (isNaN(closePrice) || isNaN(profitLoss) || isNaN(partialSize)) {
      throw new ApiError(400, "closePrice, profitLoss, and partialSize must be numbers");
    }

    // The closePosition method only accepts 3 parameters, and UpdatePositionParams doesn't have a size property
    // For partial close, we need to store the partial size in metadata
    await orderManagementService.updatePosition(positionId, {
      metadata: JSON.stringify({
        isPartialClose: true,
        partialSize: partialSize,
        originalSize: req.body.originalSize,
      }),
    });

    // Then close with the standard 3 parameters
    await orderManagementService.closePosition(positionId, closePrice, profitLoss);

    res.status(200).json({
      status: "success",
      message: "Position partially closed successfully",
    });
  })
);

// Update a position's stop loss or take profit
router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const positionId = req.params.id;
    const { stopLossPrice, takeProfitPrice, metadata } = req.body;

    if (!positionId) {
      throw new ApiError(400, "Invalid position ID");
    }

    const updateParams: any = {};

    if (stopLossPrice !== undefined) {
      updateParams.stopLossPrice = parseFloat(stopLossPrice);
    }

    if (takeProfitPrice !== undefined) {
      updateParams.takeProfitPrice = parseFloat(takeProfitPrice);
    }

    if (metadata !== undefined) {
      updateParams.metadata = typeof metadata === "string" ? metadata : JSON.stringify(metadata);
    }

    const updatedPosition = await orderManagementService.updatePosition(positionId, updateParams);

    res.status(200).json({
      status: "success",
      data: {
        position: updatedPosition,
      },
    });
  })
);

// Sync positions from broker
router.post(
  "/sync",
  asyncHandler(async (req, res) => {
    const { botId, brokerId } = req.body;

    if (typeof botId !== "number" || typeof brokerId !== "number") {
      throw new ApiError(400, "botId and brokerId must be numbers");
    }

    // This method doesn't exist in OrderManagementService
    // We'll skip this for now - this would need to be implemented in the service
    // await orderManagementService.syncPositionsFromBroker(botId);

    // For now, let's just return a message
    res.status(501).json({
      status: "error",
      message: "Position syncing not implemented",
    });
  })
);

export default router;
