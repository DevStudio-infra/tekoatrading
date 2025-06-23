import { Router } from "express";
import { asyncHandler } from "../../middleware/error-handler.middleware";
import { enhancedTradeManagementService } from "../../services/enhanced-trade-management.service";
import { loggerService } from "../../services/logger.service";

const router = Router();

// Trade-specific endpoints
router.get(
  "/trades/:tradeId/metrics",
  asyncHandler(async (req: any, res: any) => {
    const { tradeId } = req.params;

    if (!tradeId) {
      return res.status(400).json({
        success: false,
        error: "Trade ID is required",
      });
    }

    const metrics = await enhancedTradeManagementService.getTradeMetrics(tradeId);

    if (!metrics) {
      return res.status(404).json({
        success: false,
        error: "Trade not found",
      });
    }

    res.json({
      success: true,
      data: metrics,
    });
  })
);

router.put(
  "/trades/:tradeId/update-with-tracking",
  asyncHandler(async (req: any, res: any) => {
    const { tradeId } = req.params;
    const { updates, exitReason } = req.body;

    if (!tradeId || !updates) {
      return res.status(400).json({
        success: false,
        error: "Trade ID and updates are required",
      });
    }

    const success = await enhancedTradeManagementService.updateTradeWithTracking(tradeId, updates, exitReason);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: "Trade not found or update failed",
      });
    }

    res.json({
      success: true,
      message: "Trade updated successfully",
    });
  })
);

// Bot performance endpoints
router.get(
  "/bots/:botId/performance-snapshot",
  asyncHandler(async (req: any, res: any) => {
    const { botId } = req.params;

    if (!botId) {
      return res.status(400).json({
        success: false,
        error: "Bot ID is required",
      });
    }

    const snapshot = await enhancedTradeManagementService.getPerformanceSnapshot(botId);

    if (!snapshot) {
      return res.status(404).json({
        success: false,
        error: "No performance data found for this bot",
      });
    }

    res.json({
      success: true,
      data: snapshot,
    });
  })
);

router.post(
  "/bots/:botId/store-daily-snapshot",
  asyncHandler(async (req: any, res: any) => {
    const { botId } = req.params;

    if (!botId) {
      return res.status(400).json({
        success: false,
        error: "Bot ID is required",
      });
    }

    const success = await enhancedTradeManagementService.storeDailyPerformanceSnapshot(botId);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: "Failed to store daily performance snapshot",
      });
    }

    res.json({
      success: true,
      message: "Daily performance snapshot stored successfully",
    });
  })
);

router.get(
  "/bots/:botId/trade-analytics",
  asyncHandler(async (req: any, res: any) => {
    const { botId } = req.params;
    const { timeframe = "all" } = req.query;

    if (!botId) {
      return res.status(400).json({
        success: false,
        error: "Bot ID is required",
      });
    }

    if (!["24h", "7d", "30d", "all"].includes(timeframe as string)) {
      return res.status(400).json({
        success: false,
        error: "Invalid timeframe. Use: 24h, 7d, 30d, or all",
      });
    }

    const analytics = await enhancedTradeManagementService.getTradeAnalytics(botId, timeframe as "24h" | "7d" | "30d" | "all");

    if (!analytics) {
      return res.status(404).json({
        success: false,
        error: "No analytics data found for this bot",
      });
    }

    res.json({
      success: true,
      data: analytics,
    });
  })
);

router.get(
  "/bots/:botId/dashboard",
  asyncHandler(async (req: any, res: any) => {
    const { botId } = req.params;

    if (!botId) {
      return res.status(400).json({
        success: false,
        error: "Bot ID is required",
      });
    }

    // Get all data in parallel for better performance
    const [snapshot, analytics24h, analytics7d, analytics30d, analyticsAll] = await Promise.all([
      enhancedTradeManagementService.getPerformanceSnapshot(botId),
      enhancedTradeManagementService.getTradeAnalytics(botId, "24h"),
      enhancedTradeManagementService.getTradeAnalytics(botId, "7d"),
      enhancedTradeManagementService.getTradeAnalytics(botId, "30d"),
      enhancedTradeManagementService.getTradeAnalytics(botId, "all"),
    ]);

    const dashboardData = {
      performanceSnapshot: snapshot,
      analytics: {
        "24h": analytics24h,
        "7d": analytics7d,
        "30d": analytics30d,
        all: analyticsAll,
      },
      lastUpdated: new Date(),
    };

    res.json({
      success: true,
      data: dashboardData,
    });
  })
);

// Multi-bot comparison endpoints
router.post(
  "/bots/performance-comparison",
  asyncHandler(async (req: any, res: any) => {
    const { botIds, timeframe = "all" } = req.body;

    if (!botIds || !Array.isArray(botIds) || botIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Bot IDs array is required",
      });
    }

    if (!["24h", "7d", "30d", "all"].includes(timeframe)) {
      return res.status(400).json({
        success: false,
        error: "Invalid timeframe. Use: 24h, 7d, 30d, or all",
      });
    }

    // Get analytics for all bots
    const comparisons = await Promise.all(
      botIds.map(async (botId: string) => {
        const [snapshot, analytics] = await Promise.all([
          enhancedTradeManagementService.getPerformanceSnapshot(botId),
          enhancedTradeManagementService.getTradeAnalytics(botId, timeframe),
        ]);

        return {
          botId,
          snapshot,
          analytics,
        };
      })
    );

    // Calculate rankings
    const rankings = {
      byPnL: [...comparisons].filter((c) => c.snapshot).sort((a, b) => (b.snapshot!.totalPnL || 0) - (a.snapshot!.totalPnL || 0)),
      byWinRate: [...comparisons].filter((c) => c.snapshot).sort((a, b) => (b.snapshot!.winRate || 0) - (a.snapshot!.winRate || 0)),
      byTotalTrades: [...comparisons].filter((c) => c.snapshot).sort((a, b) => (b.snapshot!.totalTrades || 0) - (a.snapshot!.totalTrades || 0)),
    };

    res.json({
      success: true,
      data: {
        comparisons: comparisons.filter((c) => c.snapshot !== null),
        rankings,
        timeframe,
        generatedAt: new Date(),
      },
    });
  })
);

export default router;
