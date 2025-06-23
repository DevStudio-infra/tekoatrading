import { Router } from "express";
import * as botController from "../controllers/bot.controller";
import { authenticate } from "../middlewares/auth.middleware";
//import { requireAuth } from "../middleware/auth";
import { botService } from "../../services/bot.service";
import { dailyPerformanceService } from "../../services/daily-performance.service";
import { loggerService } from "../../services/logger.service";

const router = Router();

// All bot routes require authentication
router.use(authenticate as any);

// Bot management routes
router.post("/", botController.createBot as any);
router.get("/", botController.getUserBots as any);
router.get("/:id", botController.getBotById as any);
router.put("/:id", botController.updateBot as any);
router.delete("/:id", botController.deleteBot as any);

// Bot operations
router.post("/:id/toggle-active", botController.toggleBotActive as any);
router.post("/:id/toggle-ai-trading", botController.toggleAiTrading as any);
router.post("/:id/evaluate", botController.runBotEvaluation as any);
router.get("/:id/evaluations", botController.getBotEvaluations as any);

// AI-enhanced operations
router.post("/:id/ai-evaluate", botController.runAIEvaluation as any);
router.get("/:id/ai-metrics", botController.getAIPerformanceMetrics as any);

// Phase 3: Advanced AI Trading Logic
router.post("/:id/enhanced-decision", botController.generateEnhancedDecision as any);
router.get("/:id/portfolio-correlations", botController.getPortfolioCorrelations as any);

// Trading operations
router.post("/:id/execute-trade", botController.executeTrade as any);
router.get("/:id/active-trades", botController.getActiveTrades as any);
router.get("/:id/trade-history", botController.getTradeHistory as any);
router.get("/:id/position-summary", botController.getPositionSummary as any);
router.post("/:id/close-all-positions", botController.closeAllPositions as any);

// Individual trade operations
router.post("/trades/:tradeId/close", botController.closeTrade as any);
router.put("/trades/:tradeId", botController.updateTrade as any);
router.get("/trades/:tradeId/metrics", botController.getPositionMetrics as any);

// Phase 3: Trade Management AI
router.post("/trades/:tradeId/analyze-management", botController.analyzeTradeManagement as any);
router.post("/trades/:tradeId/trailing-stop", botController.implementTrailingStop as any);
router.post("/trades/:tradeId/profit-taking", botController.executeDynamicProfitTaking as any);
router.post("/trades/:tradeId/position-scaling", botController.analyzePositionScaling as any);
router.post("/trades/:tradeId/exit-signals", botController.detectExitSignals as any);

// Phase 3: Risk Management
router.post("/:id/assess-risk", botController.assessPortfolioRisk as any);
router.post("/:id/validate-trade-risk", botController.validateTradeRisk as any);
router.get("/:id/monitor-risk", botController.monitorRiskLimits as any);
router.post("/:id/risk-limits", botController.setRiskLimits as any);
router.get("/:id/risk-limits", botController.getRiskLimits as any);

// Phase 4: Real-time Monitoring & Optimization routes

// Market Data routes
router.get("/:id/market-data/:symbol", botController.getMarketData);
router.get("/:id/technical-indicators/:symbol", botController.getTechnicalIndicators);
router.get("/:id/market-events", botController.getMarketEvents);
router.get("/:id/data-quality", botController.getDataQualityMetrics);

// Performance Monitoring routes
router.get("/:id/real-time-pnl", botController.getRealTimePnL);
router.get("/:id/performance-metrics", botController.getPerformanceMetrics);
router.get("/:id/performance-report", botController.generatePerformanceReport);

// Alert Management routes
router.get("/:id/alerts", botController.getActiveAlerts);
router.post("/:id/alerts", botController.createAlert);
router.put("/:id/alerts/:alertId/acknowledge", botController.acknowledgeAlert);

// Advanced settings routes
router.get("/:id/advanced-settings", botController.getAdvancedSettings as any);
router.put("/:id/advanced-settings", botController.updateAdvancedSettings as any);

// New endpoint for manually cleaning up stale trades for a bot
router.post("/:id/cleanup-stale-trades", botController.cleanupStaleTrades as any);

export default router;
