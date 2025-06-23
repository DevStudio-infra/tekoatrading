import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { getPnLHistory, getPerformanceMetrics, getWinLossDistribution, getBotComparison, getStrategyPerformance, getRiskAnalysis } from "../controllers/analytics.controller";
import analyticsExportRoutes from "./analytics-export.routes";

const router = Router();

// Apply authentication middleware to all analytics routes
router.use(authenticate as any);

// Export routes
router.use("/export", analyticsExportRoutes);

/**
 * @swagger
 * /api/analytics/pnl-history:
 *   get:
 *     summary: Get P&L history data for charts
 *     description: Returns daily P&L data and cumulative performance over specified period
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y]
 *           default: 30d
 *         description: Time period for the analysis
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *           default: day
 *         description: How to group the data
 *     responses:
 *       200:
 *         description: P&L history data retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/pnl-history", getPnLHistory as any);

/**
 * @swagger
 * /api/analytics/performance-metrics:
 *   get:
 *     summary: Get advanced performance metrics
 *     description: Returns Sharpe ratio, max drawdown, profit factor, and other risk metrics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d]
 *           default: 30d
 *         description: Time period for the analysis
 *     responses:
 *       200:
 *         description: Performance metrics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/performance-metrics", getPerformanceMetrics as any);

/**
 * @swagger
 * /api/analytics/win-loss-distribution:
 *   get:
 *     summary: Get win/loss distribution analysis
 *     description: Returns detailed breakdown of winning vs losing trades
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Win/loss distribution retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/win-loss-distribution", getWinLossDistribution as any);

/**
 * @swagger
 * /api/analytics/bot-comparison:
 *   get:
 *     summary: Get bot performance comparison
 *     description: Returns comparative performance metrics across different bots
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y]
 *           default: 30d
 *         description: Time period for the analysis
 *     responses:
 *       200:
 *         description: Bot comparison data retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/bot-comparison", getBotComparison as any);

/**
 * @swagger
 * /api/analytics/strategy-performance:
 *   get:
 *     summary: Get strategy performance analysis
 *     description: Returns performance metrics aggregated by trading strategy
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y]
 *           default: 30d
 *         description: Time period for the analysis
 *     responses:
 *       200:
 *         description: Strategy performance data retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/strategy-performance", getStrategyPerformance as any);

/**
 * @swagger
 * /api/analytics/risk-analysis:
 *   get:
 *     summary: Get risk analysis data
 *     description: Returns risk metrics including exposure by symbol, concentration risk, volatility, and VaR
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y]
 *           default: 30d
 *         description: Time period for the analysis
 *     responses:
 *       200:
 *         description: Risk analysis data retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/risk-analysis", getRiskAnalysis as any);

export default router;
