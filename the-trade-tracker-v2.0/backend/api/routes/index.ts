import { Router } from "express";
import authRoutes from "./auth.routes";
import botRoutes from "./bot.routes";
import brokerCredentialRoutes from "./broker-credential.routes";
import strategyRoutes from "./strategy.routes";
import strategyTemplateRoutes from "./strategy-templates.routes";
import clerkAuthRoutes from "./clerk-auth.routes";
import positionsRoutes from "./positions.routes";
import tradesRoutes from "./trades.routes";
import clerkWebhookRoutes from "./clerk-webhook.routes";
import evaluationRoutes from "./evaluations";
import evaluationChartRoutes from "./evaluations/chart";
import chartRoutes from "./chart.routes";
import tradingPairRoutes from "./trading-pair.routes";
// Test routes removed - see CLEANUP_PLAN.md
import dashboardRoutes from "./dashboard.routes";
import analyticsRoutes from "./analytics.routes";
import debugRoutes from "./debug.routes";
// Human trading routes removed - replaced by LangChain agent workflows
const diagnosticsRoutes = require("./diagnostics.routes");

const router = Router();

// Register all route modules
router.use("/auth", authRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/clerk-auth", clerkAuthRoutes);
router.use("/bots", botRoutes);
router.use("/broker-credentials", brokerCredentialRoutes);
router.use("/strategies", strategyRoutes);
router.use("/strategy-templates", strategyTemplateRoutes);
router.use("/positions", positionsRoutes);
router.use("/trades", tradesRoutes);
router.use("/clerk-webhook", clerkWebhookRoutes);
router.use("/evaluations", evaluationRoutes);
router.use("/evaluations/chart", evaluationChartRoutes);
router.use("/chart", chartRoutes);
router.use("/trading-pairs", tradingPairRoutes);
// Test routes removed during LangChain cleanup - see CLEANUP_PLAN.md
router.use("/diagnostics", diagnosticsRoutes); // Add diagnostics routes
router.use("/debug", debugRoutes); // Add debug routes for broker API testing
// Human trading routes removed - functionality moved to LangChain agent workflows

export default router;
