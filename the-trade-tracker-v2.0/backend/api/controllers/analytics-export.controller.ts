import { Request, Response } from "express";
import { loggerService } from "../../agents/core/services/logging/logger.service";
import { prisma } from "../../utils/prisma";
import PDFDocument from "pdfkit";
import { Parser } from "json2csv";

/**
 * Utility function to get the real user UUID
 */
async function getRealUserUuid(userId: string): Promise<string> {
  return userId; // Direct mapping for now
}

interface ExportRequest {
  period: string;
  format: "PDF" | "CSV";
  sections: {
    performanceMetrics: boolean;
    pnlHistory: boolean;
    winLossDistribution: boolean;
    botComparison: boolean;
    strategyPerformance: boolean;
    riskAnalysis: boolean;
    tradeDetails: boolean;
  };
  userId?: string;
  strategyFilter?: { id: string; name: string };
  dateRange?: {
    start: string;
    end: string;
  };
}

interface AnalyticsData {
  performanceMetrics?: any;
  pnlHistory?: any;
  winLossDistribution?: any;
  botComparison?: any;
  strategyPerformance?: any;
  riskAnalysis?: any;
  tradeDetails?: any;
}

/**
 * Export analytics data as PDF
 */
export const exportAnalyticsPDF = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const userId = String(req.user.userId);
    const realUserId = await getRealUserUuid(userId);
    const exportRequest: ExportRequest = req.body;

    loggerService.info(`[ANALYTICS EXPORT] Generating PDF report for user ${userId}`);

    // Gather all requested analytics data
    const analyticsData = await gatherAnalyticsData(realUserId, exportRequest);

    // Generate PDF
    const pdfBuffer = await generatePDFReport(analyticsData, exportRequest);

    // Set response headers
    const filename = generateFilename(exportRequest, "pdf");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);

    // Send PDF
    res.end(pdfBuffer);

    loggerService.info(`[ANALYTICS EXPORT] PDF report generated successfully for user ${userId}`);
  } catch (error: any) {
    loggerService.error("Error generating PDF export:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate PDF export",
      error: error.message,
    });
  }
};

/**
 * Export analytics data as CSV
 */
export const exportAnalyticsCSV = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const userId = String(req.user.userId);
    const realUserId = await getRealUserUuid(userId);
    const exportRequest: ExportRequest = req.body;

    loggerService.info(`[ANALYTICS EXPORT] Generating CSV export for user ${userId}`);

    // Gather all requested analytics data
    const analyticsData = await gatherAnalyticsData(realUserId, exportRequest);

    // Generate CSV
    const csvData = await generateCSVExport(analyticsData, exportRequest);

    // Set response headers
    const filename = generateFilename(exportRequest, "csv");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    // Send CSV
    res.send(csvData);

    loggerService.info(`[ANALYTICS EXPORT] CSV export generated successfully for user ${userId}`);
  } catch (error: any) {
    loggerService.error("Error generating CSV export:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate CSV export",
      error: error.message,
    });
  }
};

/**
 * Gather all requested analytics data
 */
async function gatherAnalyticsData(userId: string, exportRequest: ExportRequest): Promise<AnalyticsData> {
  const data: AnalyticsData = {};

  // Calculate date range
  const { startDate, endDate } = getDateRange(exportRequest.period);

  // Base trade query
  const baseTradeQuery = {
    userId,
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
  };

  // Add strategy filter if provided
  if (exportRequest.strategyFilter) {
    // Add strategy filter logic here if needed
  }

  try {
    // Performance Metrics
    if (exportRequest.sections.performanceMetrics) {
      data.performanceMetrics = await calculatePerformanceMetrics(userId, startDate, endDate);
    }

    // P&L History
    if (exportRequest.sections.pnlHistory) {
      data.pnlHistory = await calculatePnLHistory(userId, startDate, endDate);
    }

    // Win/Loss Distribution
    if (exportRequest.sections.winLossDistribution) {
      data.winLossDistribution = await calculateWinLossDistribution(userId, startDate, endDate);
    }

    // Bot Comparison
    if (exportRequest.sections.botComparison) {
      data.botComparison = await calculateBotComparison(userId, startDate, endDate);
    }

    // Strategy Performance
    if (exportRequest.sections.strategyPerformance) {
      data.strategyPerformance = await calculateStrategyPerformance(userId, startDate, endDate);
    }

    // Risk Analysis
    if (exportRequest.sections.riskAnalysis) {
      data.riskAnalysis = await calculateRiskAnalysis(userId, startDate, endDate);
    }

    // Trade Details
    if (exportRequest.sections.tradeDetails) {
      data.tradeDetails = await getTradeDetails(userId, startDate, endDate);
    }

    return data;
  } catch (error) {
    loggerService.error("Error gathering analytics data:", error);
    throw error;
  }
}

/**
 * Generate PDF report
 */
async function generatePDFReport(data: AnalyticsData, exportRequest: ExportRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // Header
      doc.fontSize(24).text("Trading Analytics Report", { align: "center" });
      doc.fontSize(12).text(`Generated on ${new Date().toLocaleDateString()}`, { align: "center" });
      doc.fontSize(12).text(`Period: ${exportRequest.period}`, { align: "center" });

      if (exportRequest.strategyFilter) {
        doc.text(`Strategy: ${exportRequest.strategyFilter.name}`, { align: "center" });
      }

      doc.moveDown(2);

      // Performance Metrics Section
      if (data.performanceMetrics) {
        addPerformanceMetricsSection(doc, data.performanceMetrics);
      }

      // P&L History Section
      if (data.pnlHistory) {
        addPnLHistorySection(doc, data.pnlHistory);
      }

      // Win/Loss Distribution Section
      if (data.winLossDistribution) {
        addWinLossSection(doc, data.winLossDistribution);
      }

      // Bot Comparison Section
      if (data.botComparison) {
        addBotComparisonSection(doc, data.botComparison);
      }

      // Strategy Performance Section
      if (data.strategyPerformance) {
        addStrategyPerformanceSection(doc, data.strategyPerformance);
      }

      // Risk Analysis Section
      if (data.riskAnalysis) {
        addRiskAnalysisSection(doc, data.riskAnalysis);
      }

      // Trade Details Section
      if (data.tradeDetails) {
        addTradeDetailsSection(doc, data.tradeDetails);
      }

      // Footer
      doc.fontSize(10).text(`Report generated by Trade Tracker v2.0 on ${new Date().toISOString()}`, { align: "center" });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate CSV export
 */
async function generateCSVExport(data: AnalyticsData, exportRequest: ExportRequest): Promise<string> {
  const csvSections: string[] = [];

  try {
    // Performance Metrics CSV
    if (data.performanceMetrics) {
      const metricsCSV = generatePerformanceMetricsCSV(data.performanceMetrics);
      csvSections.push("PERFORMANCE METRICS\n" + metricsCSV);
    }

    // P&L History CSV
    if (data.pnlHistory) {
      const pnlCSV = generatePnLHistoryCSV(data.pnlHistory);
      csvSections.push("P&L HISTORY\n" + pnlCSV);
    }

    // Win/Loss Distribution CSV
    if (data.winLossDistribution) {
      const winLossCSV = generateWinLossCSV(data.winLossDistribution);
      csvSections.push("WIN/LOSS DISTRIBUTION\n" + winLossCSV);
    }

    // Bot Comparison CSV
    if (data.botComparison) {
      const botComparisonCSV = generateBotComparisonCSV(data.botComparison);
      csvSections.push("BOT COMPARISON\n" + botComparisonCSV);
    }

    // Strategy Performance CSV
    if (data.strategyPerformance) {
      const strategyCSV = generateStrategyPerformanceCSV(data.strategyPerformance);
      csvSections.push("STRATEGY PERFORMANCE\n" + strategyCSV);
    }

    // Risk Analysis CSV
    if (data.riskAnalysis) {
      const riskCSV = generateRiskAnalysisCSV(data.riskAnalysis);
      csvSections.push("RISK ANALYSIS\n" + riskCSV);
    }

    // Trade Details CSV
    if (data.tradeDetails) {
      const tradesCSV = generateTradeDetailsCSV(data.tradeDetails);
      csvSections.push("TRADE DETAILS\n" + tradesCSV);
    }

    return csvSections.join("\n\n");
  } catch (error) {
    loggerService.error("Error generating CSV export:", error);
    throw error;
  }
}

// Helper functions for data calculation
async function calculatePerformanceMetrics(userId: string, startDate: Date, endDate: Date) {
  const trades = await prisma.trade.findMany({
    where: {
      userId,
      createdAt: { gte: startDate, lte: endDate },
      status: "CLOSED",
      profitLoss: { not: null },
    },
  });

  if (trades.length === 0) {
    return null;
  }

  const totalPnL = trades.reduce((sum, trade) => sum + (trade.profitLoss || 0), 0);
  const winningTrades = trades.filter((trade) => (trade.profitLoss || 0) > 0);
  const losingTrades = trades.filter((trade) => (trade.profitLoss || 0) < 0);

  const winRate = (winningTrades.length / trades.length) * 100;
  const avgWin = winningTrades.length > 0 ? winningTrades.reduce((sum, trade) => sum + trade.profitLoss!, 0) / winningTrades.length : 0;
  const avgLoss = losingTrades.length > 0 ? losingTrades.reduce((sum, trade) => sum + trade.profitLoss!, 0) / losingTrades.length : 0;
  const profitFactor = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : 0;

  // Calculate Sharpe Ratio (simplified)
  const returns = trades.map((trade) => trade.profitLoss || 0);
  const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
  const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev !== 0 ? avgReturn / stdDev : 0;

  // Calculate Max Drawdown
  let peak = 0;
  let maxDrawdown = 0;
  let runningPnL = 0;

  trades.forEach((trade) => {
    runningPnL += trade.profitLoss || 0;
    if (runningPnL > peak) {
      peak = runningPnL;
    }
    const drawdown = ((peak - runningPnL) / peak) * 100;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  });

  return {
    totalTrades: trades.length,
    totalPnL: Number(totalPnL.toFixed(2)),
    winRate: Number(winRate.toFixed(1)),
    profitFactor: Number(profitFactor.toFixed(2)),
    sharpeRatio: Number(sharpeRatio.toFixed(2)),
    maxDrawdown: Number(maxDrawdown.toFixed(2)),
    avgWin: Number(avgWin.toFixed(2)),
    avgLoss: Number(avgLoss.toFixed(2)),
    grossProfit: Number(winningTrades.reduce((sum, trade) => sum + trade.profitLoss!, 0).toFixed(2)),
    grossLoss: Number(losingTrades.reduce((sum, trade) => sum + trade.profitLoss!, 0).toFixed(2)),
  };
}

async function calculatePnLHistory(userId: string, startDate: Date, endDate: Date) {
  const trades = await prisma.trade.findMany({
    where: {
      userId,
      createdAt: { gte: startDate, lte: endDate },
      status: "CLOSED",
      profitLoss: { not: null },
    },
    orderBy: { createdAt: "asc" },
  });

  const dailyPnL: { [key: string]: number } = {};
  trades.forEach((trade) => {
    const date = trade.createdAt.toISOString().split("T")[0];
    dailyPnL[date] = (dailyPnL[date] || 0) + (trade.profitLoss || 0);
  });

  const chartData = [];
  let cumulativePnL = 0;
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split("T")[0];
    const dailyValue = dailyPnL[dateStr] || 0;
    cumulativePnL += dailyValue;

    chartData.push({
      date: dateStr,
      dailyPnL: Number(dailyValue.toFixed(2)),
      cumulativePnL: Number(cumulativePnL.toFixed(2)),
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return { chartData, summary: { totalPnL: cumulativePnL } };
}

async function calculateWinLossDistribution(userId: string, startDate: Date, endDate: Date) {
  const trades = await prisma.trade.findMany({
    where: {
      userId,
      createdAt: { gte: startDate, lte: endDate },
      status: "CLOSED",
      profitLoss: { not: null },
    },
  });

  const wins = trades.filter((trade) => (trade.profitLoss || 0) > 0);
  const losses = trades.filter((trade) => (trade.profitLoss || 0) < 0);
  const neutral = trades.filter((trade) => (trade.profitLoss || 0) === 0);

  return {
    totalTrades: trades.length,
    wins: {
      count: wins.length,
      percentage: trades.length > 0 ? (wins.length / trades.length) * 100 : 0,
      totalPnL: wins.reduce((sum, trade) => sum + trade.profitLoss!, 0),
      avgPnL: wins.length > 0 ? wins.reduce((sum, trade) => sum + trade.profitLoss!, 0) / wins.length : 0,
    },
    losses: {
      count: losses.length,
      percentage: trades.length > 0 ? (losses.length / trades.length) * 100 : 0,
      totalPnL: losses.reduce((sum, trade) => sum + trade.profitLoss!, 0),
      avgPnL: losses.length > 0 ? losses.reduce((sum, trade) => sum + trade.profitLoss!, 0) / losses.length : 0,
    },
    neutral: {
      count: neutral.length,
      percentage: trades.length > 0 ? (neutral.length / trades.length) * 100 : 0,
    },
  };
}

async function calculateBotComparison(userId: string, startDate: Date, endDate: Date) {
  // Implementation for bot comparison data
  return { bots: [] }; // Placeholder
}

async function calculateStrategyPerformance(userId: string, startDate: Date, endDate: Date) {
  // Implementation for strategy performance data
  return { strategies: [] }; // Placeholder
}

async function calculateRiskAnalysis(userId: string, startDate: Date, endDate: Date) {
  // Implementation for risk analysis data
  return { exposureBySymbol: [], riskMetrics: {} }; // Placeholder
}

async function getTradeDetails(userId: string, startDate: Date, endDate: Date) {
  return await prisma.trade.findMany({
    where: {
      userId,
      createdAt: { gte: startDate, lte: endDate },
    },
    orderBy: { createdAt: "desc" },
  });
}

// PDF section generators
function addPerformanceMetricsSection(doc: any, data: any) {
  doc.addPage();
  doc.fontSize(18).text("Performance Metrics", { underline: true });
  doc.moveDown();

  doc.fontSize(12);
  doc.text(`Total Trades: ${data.totalTrades}`);
  doc.text(`Total P&L: $${data.totalPnL}`);
  doc.text(`Win Rate: ${data.winRate}%`);
  doc.text(`Profit Factor: ${data.profitFactor}`);
  doc.text(`Sharpe Ratio: ${data.sharpeRatio}`);
  doc.text(`Max Drawdown: ${data.maxDrawdown}%`);
  doc.text(`Average Win: $${data.avgWin}`);
  doc.text(`Average Loss: $${data.avgLoss}`);
  doc.moveDown();
}

function addPnLHistorySection(doc: any, data: any) {
  doc.addPage();
  doc.fontSize(18).text("P&L History", { underline: true });
  doc.moveDown();

  doc.fontSize(12);
  doc.text(`Total P&L: $${data.summary.totalPnL}`);
  doc.text(`Data Points: ${data.chartData.length}`);
  doc.moveDown();
}

function addWinLossSection(doc: any, data: any) {
  doc.addPage();
  doc.fontSize(18).text("Win/Loss Distribution", { underline: true });
  doc.moveDown();

  doc.fontSize(12);
  doc.text(`Total Trades: ${data.totalTrades}`);
  doc.text(`Wins: ${data.wins.count} (${data.wins.percentage.toFixed(1)}%)`);
  doc.text(`Losses: ${data.losses.count} (${data.losses.percentage.toFixed(1)}%)`);
  doc.text(`Average Win: $${data.wins.avgPnL.toFixed(2)}`);
  doc.text(`Average Loss: $${data.losses.avgPnL.toFixed(2)}`);
  doc.moveDown();
}

function addBotComparisonSection(doc: any, data: any) {
  doc.addPage();
  doc.fontSize(18).text("Bot Comparison", { underline: true });
  doc.moveDown();
}

function addStrategyPerformanceSection(doc: any, data: any) {
  doc.addPage();
  doc.fontSize(18).text("Strategy Performance", { underline: true });
  doc.moveDown();
}

function addRiskAnalysisSection(doc: any, data: any) {
  doc.addPage();
  doc.fontSize(18).text("Risk Analysis", { underline: true });
  doc.moveDown();
}

function addTradeDetailsSection(doc: any, data: any) {
  doc.addPage();
  doc.fontSize(18).text("Trade Details", { underline: true });
  doc.moveDown();

  doc.fontSize(10);
  data.slice(0, 50).forEach((trade: any, index: number) => {
    doc.text(`${index + 1}. ${trade.symbol} - ${trade.direction} - P&L: $${trade.profitLoss || 0} - ${trade.createdAt.toLocaleDateString()}`);
  });
}

// CSV generators
function generatePerformanceMetricsCSV(data: any): string {
  const fields = ["metric", "value"];
  const records = [
    { metric: "Total Trades", value: data.totalTrades },
    { metric: "Total P&L", value: data.totalPnL },
    { metric: "Win Rate (%)", value: data.winRate },
    { metric: "Profit Factor", value: data.profitFactor },
    { metric: "Sharpe Ratio", value: data.sharpeRatio },
    { metric: "Max Drawdown (%)", value: data.maxDrawdown },
    { metric: "Average Win", value: data.avgWin },
    { metric: "Average Loss", value: data.avgLoss },
  ];

  const parser = new Parser({ fields });
  return parser.parse(records);
}

function generatePnLHistoryCSV(data: any): string {
  const fields = ["date", "dailyPnL", "cumulativePnL"];
  const parser = new Parser({ fields });
  return parser.parse(data.chartData);
}

function generateWinLossCSV(data: any): string {
  const fields = ["outcome", "count", "percentage", "totalPnL", "avgPnL"];
  const records = [
    {
      outcome: "Wins",
      count: data.wins.count,
      percentage: data.wins.percentage,
      totalPnL: data.wins.totalPnL,
      avgPnL: data.wins.avgPnL,
    },
    {
      outcome: "Losses",
      count: data.losses.count,
      percentage: data.losses.percentage,
      totalPnL: data.losses.totalPnL,
      avgPnL: data.losses.avgPnL,
    },
    {
      outcome: "Neutral",
      count: data.neutral.count,
      percentage: data.neutral.percentage,
      totalPnL: 0,
      avgPnL: 0,
    },
  ];

  const parser = new Parser({ fields });
  return parser.parse(records);
}

function generateBotComparisonCSV(data: any): string {
  // Implementation for bot comparison CSV
  return "";
}

function generateStrategyPerformanceCSV(data: any): string {
  // Implementation for strategy performance CSV
  return "";
}

function generateRiskAnalysisCSV(data: any): string {
  // Implementation for risk analysis CSV
  return "";
}

function generateTradeDetailsCSV(data: any): string {
  const fields = ["id", "symbol", "direction", "quantity", "entryPrice", "exitPrice", "profitLoss", "status", "createdAt", "closedAt"];
  const parser = new Parser({ fields });
  return parser.parse(data);
}

// Utility functions
function getDateRange(period: string): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  const startDate = new Date();

  switch (period) {
    case "7d":
      startDate.setDate(endDate.getDate() - 7);
      break;
    case "30d":
      startDate.setDate(endDate.getDate() - 30);
      break;
    case "90d":
      startDate.setDate(endDate.getDate() - 90);
      break;
    case "1y":
      startDate.setFullYear(endDate.getFullYear() - 1);
      break;
    default:
      startDate.setDate(endDate.getDate() - 30);
  }

  return { startDate, endDate };
}

function generateFilename(exportRequest: ExportRequest, extension: string): string {
  const timestamp = new Date().toISOString().split("T")[0];
  const strategyPart = exportRequest.strategyFilter ? `_${exportRequest.strategyFilter.name.replace(/\s+/g, "_")}` : "";
  return `analytics_report_${exportRequest.period}${strategyPart}_${timestamp}.${extension}`;
}
