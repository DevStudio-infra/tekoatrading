import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { exportAnalyticsPDF, exportAnalyticsCSV } from "../controllers/analytics-export.controller";

const router = Router();

// Apply authentication middleware to all export routes
router.use(authenticate as any);

/**
 * @swagger
 * /api/analytics/export/pdf:
 *   post:
 *     summary: Export analytics data as PDF
 *     description: Generate a comprehensive PDF report with selected analytics sections
 *     tags: [Analytics Export]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               period:
 *                 type: string
 *                 enum: [7d, 30d, 90d, 1y]
 *                 default: 30d
 *               format:
 *                 type: string
 *                 enum: [PDF]
 *               sections:
 *                 type: object
 *                 properties:
 *                   performanceMetrics:
 *                     type: boolean
 *                   pnlHistory:
 *                     type: boolean
 *                   winLossDistribution:
 *                     type: boolean
 *                   botComparison:
 *                     type: boolean
 *                   strategyPerformance:
 *                     type: boolean
 *                   riskAnalysis:
 *                     type: boolean
 *                   tradeDetails:
 *                     type: boolean
 *               strategyFilter:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *     responses:
 *       200:
 *         description: PDF report generated successfully
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post("/pdf", exportAnalyticsPDF as any);

/**
 * @swagger
 * /api/analytics/export/csv:
 *   post:
 *     summary: Export analytics data as CSV
 *     description: Generate CSV files with selected analytics data
 *     tags: [Analytics Export]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               period:
 *                 type: string
 *                 enum: [7d, 30d, 90d, 1y]
 *                 default: 30d
 *               format:
 *                 type: string
 *                 enum: [CSV]
 *               sections:
 *                 type: object
 *                 properties:
 *                   performanceMetrics:
 *                     type: boolean
 *                   pnlHistory:
 *                     type: boolean
 *                   winLossDistribution:
 *                     type: boolean
 *                   botComparison:
 *                     type: boolean
 *                   strategyPerformance:
 *                     type: boolean
 *                   riskAnalysis:
 *                     type: boolean
 *                   tradeDetails:
 *                     type: boolean
 *               strategyFilter:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *     responses:
 *       200:
 *         description: CSV data generated successfully
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post("/csv", exportAnalyticsCSV as any);

export default router;
