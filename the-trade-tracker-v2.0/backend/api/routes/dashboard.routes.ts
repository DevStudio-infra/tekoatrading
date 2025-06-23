import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { getDashboardData } from "../controllers/dashboard.controller";

const router = Router();

// Apply authentication middleware to all dashboard routes
router.use(authenticate as any);

/**
 * @swagger
 * /api/dashboard:
 *   get:
 *     summary: Get comprehensive dashboard data
 *     description: Returns all dashboard data including stats, performance, activity, and trading metrics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     stats:
 *                       type: object
 *                       properties:
 *                         totalPnL:
 *                           type: number
 *                         totalTrades:
 *                           type: number
 *                         winRate:
 *                           type: number
 *                         activeStrategies:
 *                           type: number
 *                         activeBots:
 *                           type: number
 *                         recentEvaluations:
 *                           type: number
 *                     performance:
 *                       type: object
 *                       properties:
 *                         value:
 *                           type: number
 *                         change:
 *                           type: number
 *                         changePercent:
 *                           type: number
 *                         isPositive:
 *                           type: boolean
 *                         period:
 *                           type: string
 *                     recentActivity:
 *                       type: array
 *                       items:
 *                         type: object
 *                     tradingMetrics:
 *                       type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/", getDashboardData as any);

export default router;
