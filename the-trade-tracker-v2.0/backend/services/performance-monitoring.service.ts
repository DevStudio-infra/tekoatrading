import { TradingService } from "./trading.service";
import { PositionManagementService } from "./position-management.service";
import { riskManagementService } from "./adapters/risk-management.adapter";
import { loggerService } from "./logger.service";
import { prisma } from "../utils/prisma";

// Types and interfaces for performance monitoring
export interface RealTimePnL {
  botId: string;
  totalUnrealizedPnL: number;
  totalRealizedPnL: number;
  dailyPnL: number;
  weeklyPnL: number;
  monthlyPnL: number;
  totalPnL: number;
  pnLPercentage: number;
  bestTrade: {
    id: string;
    symbol: string;
    pnL: number;
    percentage: number;
  } | null;
  worstTrade: {
    id: string;
    symbol: string;
    pnL: number;
    percentage: number;
  } | null;
  activeTrades: number;
  timestamp: Date;
}

export interface PerformanceMetrics {
  botId: string;
  timeframe: "DAILY" | "WEEKLY" | "MONTHLY" | "ALL_TIME";
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  totalReturn: number;
  totalReturnPercent: number;
  averageTradeReturn: number;
  bestTrade: number;
  worstTrade: number;
  averageHoldingTime: number; // in hours
  riskAdjustedReturn: number;
  volatility: number;
  calmarRatio: number;
  recoveryFactor: number;
  timestamp: Date;
}

export interface PerformanceAlert {
  id: string;
  botId: string;
  type: "PROFIT_TARGET" | "LOSS_LIMIT" | "DRAWDOWN" | "WIN_STREAK" | "LOSS_STREAK" | "VOLATILITY" | "PERFORMANCE";
  severity: "INFO" | "WARNING" | "CRITICAL";
  title: string;
  message: string;
  threshold: number;
  currentValue: number;
  triggered: boolean;
  triggeredAt?: Date;
  acknowledged: boolean;
  acknowledgedAt?: Date;
  createdAt: Date;
}

export interface BenchmarkComparison {
  botId: string;
  benchmarkName: string;
  botReturn: number;
  benchmarkReturn: number;
  outperformance: number;
  botSharpe: number;
  benchmarkSharpe: number;
  botVolatility: number;
  benchmarkVolatility: number;
  correlation: number;
  beta: number;
  alpha: number;
  informationRatio: number;
  trackingError: number;
  period: string;
}

export interface PerformanceReport {
  botId: string;
  reportType: "DAILY" | "WEEKLY" | "MONTHLY" | "CUSTOM";
  startDate: Date;
  endDate: Date;
  summary: {
    totalTrades: number;
    totalReturn: number;
    totalReturnPercent: number;
    winRate: number;
    sharpeRatio: number;
    maxDrawdown: number;
    profitFactor: number;
  };
  metrics: PerformanceMetrics;
  pnlHistory: Array<{
    date: Date;
    dailyPnL: number;
    cumulativePnL: number;
    drawdown: number;
  }>;
  tradeAnalysis: {
    bySymbol: Array<{
      symbol: string;
      trades: number;
      winRate: number;
      totalPnL: number;
      averagePnL: number;
    }>;
    byTimeOfDay: Array<{
      hour: number;
      trades: number;
      winRate: number;
      averagePnL: number;
    }>;
    byDayOfWeek: Array<{
      day: string;
      trades: number;
      winRate: number;
      averagePnL: number;
    }>;
  };
  riskMetrics: {
    var95: number; // Value at Risk 95%
    var99: number; // Value at Risk 99%
    expectedShortfall: number;
    maxConsecutiveLosses: number;
    maxConsecutiveWins: number;
    averageDrawdownDuration: number;
  };
  benchmarkComparison?: BenchmarkComparison;
  generatedAt: Date;
}

export class PerformanceMonitoringService {
  private tradingService: TradingService;
  private positionManagementService: PositionManagementService;
  private alertCache: Map<string, PerformanceAlert[]> = new Map();
  private pnlCache: Map<string, RealTimePnL> = new Map();
  private metricsCache: Map<string, PerformanceMetrics> = new Map();

  constructor() {
    this.tradingService = new TradingService();
    this.positionManagementService = new PositionManagementService();
    this.initializeMonitoring();
  }

  /**
   * Initialize performance monitoring
   */
  private initializeMonitoring(): void {
    loggerService.info("Initializing Performance Monitoring Service");

    // Start real-time monitoring (every 30 seconds)
    setInterval(() => {
      this.updateAllBotMetrics();
    }, 30000);

    // Start alert checking (every minute)
    setInterval(() => {
      this.checkAllAlerts();
    }, 60000);

    loggerService.info("Performance Monitoring Service initialized");
  }

  /**
   * Get real-time P&L for a bot
   */
  async getRealTimePnL(botId: string): Promise<RealTimePnL> {
    try {
      // Check cache first
      const cachedPnL = this.pnlCache.get(botId);
      if (cachedPnL && this.isPnLDataFresh(cachedPnL)) {
        return cachedPnL;
      }

      // Calculate real-time P&L
      const pnl = await this.calculateRealTimePnL(botId);

      // Update cache
      this.pnlCache.set(botId, pnl);

      return pnl;
    } catch (error) {
      loggerService.error(`Error getting real-time P&L for bot ${botId}:`, error);
      throw error;
    }
  }

  /**
   * Get comprehensive performance metrics
   */
  async getPerformanceMetrics(botId: string, timeframe: "DAILY" | "WEEKLY" | "MONTHLY" | "ALL_TIME" = "ALL_TIME"): Promise<PerformanceMetrics> {
    try {
      const cacheKey = `${botId}_${timeframe}`;

      // Check cache first
      const cachedMetrics = this.metricsCache.get(cacheKey);
      if (cachedMetrics && this.isMetricsDataFresh(cachedMetrics)) {
        return cachedMetrics;
      }

      // Calculate performance metrics
      const metrics = await this.calculatePerformanceMetrics(botId, timeframe);

      // Update cache
      this.metricsCache.set(cacheKey, metrics);

      return metrics;
    } catch (error) {
      loggerService.error(`Error getting performance metrics for bot ${botId}:`, error);
      throw error;
    }
  }

  /**
   * Get active alerts for a bot
   */
  async getActiveAlerts(botId: string): Promise<PerformanceAlert[]> {
    try {
      const alerts = this.alertCache.get(botId) || [];
      return alerts.filter((alert) => alert.triggered && !alert.acknowledged);
    } catch (error) {
      loggerService.error(`Error getting active alerts for bot ${botId}:`, error);
      return [];
    }
  }

  /**
   * Create a new performance alert
   */
  async createAlert(
    botId: string,
    alertConfig: {
      type: PerformanceAlert["type"];
      threshold: number;
      title: string;
      message: string;
    }
  ): Promise<PerformanceAlert> {
    try {
      const alert: PerformanceAlert = {
        id: `alert_${botId}_${Date.now()}`,
        botId,
        type: alertConfig.type,
        severity: this.determineSeverity(alertConfig.type),
        title: alertConfig.title,
        message: alertConfig.message,
        threshold: alertConfig.threshold,
        currentValue: 0,
        triggered: false,
        acknowledged: false,
        createdAt: new Date(),
      };

      // Add to cache
      const botAlerts = this.alertCache.get(botId) || [];
      botAlerts.push(alert);
      this.alertCache.set(botId, botAlerts);

      loggerService.info(`Created alert ${alert.id} for bot ${botId}`);

      return alert;
    } catch (error) {
      loggerService.error(`Error creating alert for bot ${botId}:`, error);
      throw error;
    }
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string): Promise<void> {
    try {
      for (const [botId, alerts] of this.alertCache) {
        const alert = alerts.find((a) => a.id === alertId);
        if (alert) {
          alert.acknowledged = true;
          alert.acknowledgedAt = new Date();
          loggerService.info(`Alert ${alertId} acknowledged`);
          return;
        }
      }

      throw new Error("Alert not found");
    } catch (error) {
      loggerService.error(`Error acknowledging alert ${alertId}:`, error);
      throw error;
    }
  }

  /**
   * Generate comprehensive performance report
   */
  async generatePerformanceReport(botId: string, reportType: "DAILY" | "WEEKLY" | "MONTHLY" | "CUSTOM" = "MONTHLY", startDate?: Date, endDate?: Date): Promise<PerformanceReport> {
    try {
      loggerService.info(`Generating ${reportType} performance report for bot ${botId}`);

      // Determine date range
      const { start, end } = this.getDateRange(reportType, startDate, endDate);

      // Get trades for the period
      const trades = await this.getTradesForPeriod(botId, start, end);

      // Calculate summary metrics
      const summary = this.calculateSummaryMetrics(trades);

      // Get detailed metrics
      const metrics = await this.getPerformanceMetrics(botId, this.mapReportTypeToTimeframe(reportType));

      // Calculate P&L history
      const pnlHistory = await this.calculatePnLHistory(botId, start, end);

      // Analyze trades
      const tradeAnalysis = this.analyzeTradePatterns(trades);

      // Calculate risk metrics
      const riskMetrics = this.calculateRiskMetrics(trades, pnlHistory);

      // Get benchmark comparison (optional)
      const benchmarkComparison = await this.getBenchmarkComparison(botId, start, end);

      const report: PerformanceReport = {
        botId,
        reportType,
        startDate: start,
        endDate: end,
        summary,
        metrics,
        pnlHistory,
        tradeAnalysis,
        riskMetrics,
        benchmarkComparison,
        generatedAt: new Date(),
      };

      loggerService.info(`Performance report generated for bot ${botId}`);

      return report;
    } catch (error) {
      loggerService.error(`Error generating performance report for bot ${botId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate real-time P&L
   */
  private async calculateRealTimePnL(botId: string): Promise<RealTimePnL> {
    try {
      // Get position summary
      const positionSummary = await this.positionManagementService.getPositionSummary(botId);

      // Get trade history for time-based calculations
      const allTrades = await this.tradingService.getTradeHistory(botId, 1000);
      const now = new Date();

      // Calculate daily P&L
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const dailyTrades = allTrades.filter((trade) => trade.closedAt && new Date(trade.closedAt) >= startOfDay);
      const dailyPnL = dailyTrades.reduce((sum, trade) => sum + (trade.profitLoss || 0), 0);

      // Calculate weekly P&L
      const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const weeklyTrades = allTrades.filter((trade) => trade.closedAt && new Date(trade.closedAt) >= startOfWeek);
      const weeklyPnL = weeklyTrades.reduce((sum, trade) => sum + (trade.profitLoss || 0), 0);

      // Calculate monthly P&L
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlyTrades = allTrades.filter((trade) => trade.closedAt && new Date(trade.closedAt) >= startOfMonth);
      const monthlyPnL = monthlyTrades.reduce((sum, trade) => sum + (trade.profitLoss || 0), 0);

      // Find best and worst trades
      const closedTrades = allTrades.filter((trade) => trade.status === "CLOSED" && trade.profitLoss !== null);
      const bestTrade = closedTrades.reduce((best, trade) => (!best || (trade.profitLoss || 0) > (best.profitLoss || 0) ? trade : best), null as any);
      const worstTrade = closedTrades.reduce((worst, trade) => (!worst || (trade.profitLoss || 0) < (worst.profitLoss || 0) ? trade : worst), null as any);

      const totalPnL = positionSummary.totalRealizedPnL + positionSummary.totalUnrealizedPnL;
      const accountBalance = 10000; // Mock account balance

      return {
        botId,
        totalUnrealizedPnL: positionSummary.totalUnrealizedPnL,
        totalRealizedPnL: positionSummary.totalRealizedPnL,
        dailyPnL,
        weeklyPnL,
        monthlyPnL,
        totalPnL,
        pnLPercentage: (totalPnL / accountBalance) * 100,
        bestTrade: bestTrade
          ? {
              id: bestTrade.id,
              symbol: bestTrade.symbol,
              pnL: bestTrade.profitLoss || 0,
              percentage: ((bestTrade.profitLoss || 0) / (bestTrade.entryPrice * bestTrade.quantity)) * 100,
            }
          : null,
        worstTrade: worstTrade
          ? {
              id: worstTrade.id,
              symbol: worstTrade.symbol,
              pnL: worstTrade.profitLoss || 0,
              percentage: ((worstTrade.profitLoss || 0) / (worstTrade.entryPrice * worstTrade.quantity)) * 100,
            }
          : null,
        activeTrades: positionSummary.activeTrades,
        timestamp: new Date(),
      };
    } catch (error) {
      loggerService.error(`Error calculating real-time P&L for bot ${botId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate comprehensive performance metrics
   */
  private async calculatePerformanceMetrics(botId: string, timeframe: "DAILY" | "WEEKLY" | "MONTHLY" | "ALL_TIME"): Promise<PerformanceMetrics> {
    try {
      // Get trades for the timeframe
      const { start, end } = this.getDateRange(timeframe);
      const trades = await this.getTradesForPeriod(botId, start, end);

      const closedTrades = trades.filter((trade) => trade.status === "CLOSED" && trade.profitLoss !== null);
      const winningTrades = closedTrades.filter((trade) => (trade.profitLoss || 0) > 0);
      const losingTrades = closedTrades.filter((trade) => (trade.profitLoss || 0) < 0);

      // Basic metrics
      const totalTrades = closedTrades.length;
      const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;
      const averageWin = winningTrades.length > 0 ? winningTrades.reduce((sum, trade) => sum + (trade.profitLoss || 0), 0) / winningTrades.length : 0;
      const averageLoss = losingTrades.length > 0 ? Math.abs(losingTrades.reduce((sum, trade) => sum + (trade.profitLoss || 0), 0) / losingTrades.length) : 0;

      // Profit factor
      const grossProfit = winningTrades.reduce((sum, trade) => sum + (trade.profitLoss || 0), 0);
      const grossLoss = Math.abs(losingTrades.reduce((sum, trade) => sum + (trade.profitLoss || 0), 0));
      const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

      // Total return
      const totalReturn = closedTrades.reduce((sum, trade) => sum + (trade.profitLoss || 0), 0);
      const accountBalance = 10000; // Mock account balance
      const totalReturnPercent = (totalReturn / accountBalance) * 100;

      // Calculate returns for Sharpe ratio
      const returns = this.calculateDailyReturns(closedTrades);
      const sharpeRatio = this.calculateSharpeRatio(returns);

      // Drawdown calculations
      const { maxDrawdown, maxDrawdownPercent } = this.calculateMaxDrawdown(closedTrades);

      // Other metrics
      const averageTradeReturn = totalTrades > 0 ? totalReturn / totalTrades : 0;
      const bestTrade = Math.max(...closedTrades.map((trade) => trade.profitLoss || 0));
      const worstTrade = Math.min(...closedTrades.map((trade) => trade.profitLoss || 0));

      // Average holding time
      const averageHoldingTime = this.calculateAverageHoldingTime(closedTrades);

      // Risk-adjusted metrics
      const volatility = this.calculateVolatility(returns);
      const riskAdjustedReturn = volatility > 0 ? totalReturnPercent / volatility : 0;
      const calmarRatio = maxDrawdownPercent > 0 ? totalReturnPercent / maxDrawdownPercent : 0;
      const recoveryFactor = maxDrawdown > 0 ? totalReturn / Math.abs(maxDrawdown) : 0;

      return {
        botId,
        timeframe,
        totalTrades,
        winningTrades: winningTrades.length,
        losingTrades: losingTrades.length,
        winRate,
        averageWin,
        averageLoss,
        profitFactor,
        sharpeRatio,
        maxDrawdown,
        maxDrawdownPercent,
        totalReturn,
        totalReturnPercent,
        averageTradeReturn,
        bestTrade,
        worstTrade,
        averageHoldingTime,
        riskAdjustedReturn,
        volatility,
        calmarRatio,
        recoveryFactor,
        timestamp: new Date(),
      };
    } catch (error) {
      loggerService.error(`Error calculating performance metrics for bot ${botId}:`, error);
      throw error;
    }
  }

  /**
   * Update metrics for all bots
   */
  private async updateAllBotMetrics(): Promise<void> {
    try {
      // Get all active bots from database instead of hardcoded values
      const activeBots = await prisma.bot.findMany({
        where: {
          isActive: true,
          isAiTradingActive: true,
        },
        select: {
          id: true,
        },
      });

      for (const bot of activeBots) {
        try {
          // Update P&L cache
          await this.getRealTimePnL(bot.id);

          // Update metrics cache
          await this.getPerformanceMetrics(bot.id);
        } catch (error) {
          loggerService.error(`Error updating metrics for bot ${bot.id}:`, error);
        }
      }
    } catch (error) {
      loggerService.error("Error updating all bot metrics:", error);
    }
  }

  /**
   * Check alerts for all bots
   */
  private async checkAllAlerts(): Promise<void> {
    try {
      for (const [botId, alerts] of this.alertCache) {
        for (const alert of alerts) {
          if (!alert.triggered) {
            await this.checkAlert(botId, alert);
          }
        }
      }
    } catch (error) {
      loggerService.error("Error checking all alerts:", error);
    }
  }

  /**
   * Check individual alert
   */
  private async checkAlert(botId: string, alert: PerformanceAlert): Promise<void> {
    try {
      let currentValue = 0;
      let shouldTrigger = false;

      switch (alert.type) {
        case "PROFIT_TARGET":
          const pnl = await this.getRealTimePnL(botId);
          currentValue = pnl.totalPnL;
          shouldTrigger = currentValue >= alert.threshold;
          break;

        case "LOSS_LIMIT":
          const lossPnL = await this.getRealTimePnL(botId);
          currentValue = lossPnL.totalPnL;
          shouldTrigger = currentValue <= -alert.threshold;
          break;

        case "DRAWDOWN":
          const metrics = await this.getPerformanceMetrics(botId);
          currentValue = metrics.maxDrawdownPercent;
          shouldTrigger = currentValue >= alert.threshold;
          break;

        // Add more alert types as needed
      }

      alert.currentValue = currentValue;

      if (shouldTrigger && !alert.triggered) {
        alert.triggered = true;
        alert.triggeredAt = new Date();
        loggerService.warn(`Alert triggered: ${alert.title} for bot ${botId}`);

        // Here you could send notifications, emails, etc.
        await this.sendAlertNotification(alert);
      }
    } catch (error) {
      loggerService.error(`Error checking alert ${alert.id}:`, error);
    }
  }

  /**
   * Helper methods
   */
  private isPnLDataFresh(pnl: RealTimePnL): boolean {
    const maxAge = 30 * 1000; // 30 seconds
    return Date.now() - pnl.timestamp.getTime() < maxAge;
  }

  private isMetricsDataFresh(metrics: PerformanceMetrics): boolean {
    const maxAge = 5 * 60 * 1000; // 5 minutes
    return Date.now() - metrics.timestamp.getTime() < maxAge;
  }

  private determineSeverity(type: PerformanceAlert["type"]): "INFO" | "WARNING" | "CRITICAL" {
    switch (type) {
      case "PROFIT_TARGET":
        return "INFO";
      case "LOSS_LIMIT":
      case "DRAWDOWN":
        return "CRITICAL";
      case "WIN_STREAK":
      case "LOSS_STREAK":
        return "WARNING";
      default:
        return "INFO";
    }
  }

  private getDateRange(timeframe: string, startDate?: Date, endDate?: Date): { start: Date; end: Date } {
    const now = new Date();
    const end = endDate || now;
    let start: Date;

    switch (timeframe) {
      case "DAILY":
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "WEEKLY":
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "MONTHLY":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "CUSTOM":
        start = startDate || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default: // ALL_TIME
        start = new Date(2020, 0, 1); // Arbitrary start date
        break;
    }

    return { start, end };
  }

  private async getTradesForPeriod(botId: string, start: Date, end: Date): Promise<any[]> {
    // Mock implementation - should query database
    const allTrades = await this.tradingService.getTradeHistory(botId, 1000);
    return allTrades.filter((trade) => {
      const tradeDate = trade.closedAt ? new Date(trade.closedAt) : new Date(trade.createdAt);
      return tradeDate >= start && tradeDate <= end;
    });
  }

  private calculateSummaryMetrics(trades: any[]): any {
    const closedTrades = trades.filter((trade) => trade.status === "CLOSED");
    const totalReturn = closedTrades.reduce((sum, trade) => sum + (trade.profitLoss || 0), 0);
    const winningTrades = closedTrades.filter((trade) => (trade.profitLoss || 0) > 0);

    return {
      totalTrades: closedTrades.length,
      totalReturn,
      totalReturnPercent: (totalReturn / 10000) * 100, // Mock account balance
      winRate: closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0,
      sharpeRatio: 0, // Simplified
      maxDrawdown: 0, // Simplified
      profitFactor: 0, // Simplified
    };
  }

  private mapReportTypeToTimeframe(reportType: string): "DAILY" | "WEEKLY" | "MONTHLY" | "ALL_TIME" {
    switch (reportType) {
      case "DAILY":
        return "DAILY";
      case "WEEKLY":
        return "WEEKLY";
      case "MONTHLY":
        return "MONTHLY";
      default:
        return "ALL_TIME";
    }
  }

  private async calculatePnLHistory(botId: string, start: Date, end: Date): Promise<any[]> {
    // Mock implementation
    const history = [];
    const current = new Date(start);
    let cumulativePnL = 0;

    while (current <= end) {
      const dailyPnL = (Math.random() - 0.5) * 200; // Random daily P&L
      cumulativePnL += dailyPnL;

      history.push({
        date: new Date(current),
        dailyPnL,
        cumulativePnL,
        drawdown: Math.min(0, cumulativePnL),
      });

      current.setDate(current.getDate() + 1);
    }

    return history;
  }

  private analyzeTradePatterns(trades: any[]): any {
    // Simplified trade analysis
    return {
      bySymbol: [],
      byTimeOfDay: [],
      byDayOfWeek: [],
    };
  }

  private calculateRiskMetrics(trades: any[], pnlHistory: any[]): any {
    // Simplified risk metrics
    return {
      var95: 0,
      var99: 0,
      expectedShortfall: 0,
      maxConsecutiveLosses: 0,
      maxConsecutiveWins: 0,
      averageDrawdownDuration: 0,
    };
  }

  private async getBenchmarkComparison(botId: string, start: Date, end: Date): Promise<BenchmarkComparison | undefined> {
    // Mock benchmark comparison
    return undefined;
  }

  private calculateDailyReturns(trades: any[]): number[] {
    // Simplified daily returns calculation
    return trades.map((trade) => ((trade.profitLoss || 0) / 10000) * 100);
  }

  private calculateSharpeRatio(returns: number[]): number {
    if (returns.length === 0) return 0;

    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    return stdDev > 0 ? (avgReturn - 0.02) / stdDev : 0; // Assuming 2% risk-free rate
  }

  private calculateMaxDrawdown(trades: any[]): { maxDrawdown: number; maxDrawdownPercent: number } {
    let peak = 0;
    let maxDrawdown = 0;
    let runningPnL = 0;

    for (const trade of trades) {
      runningPnL += trade.profitLoss || 0;
      if (runningPnL > peak) peak = runningPnL;
      const drawdown = peak - runningPnL;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    const maxDrawdownPercent = peak > 0 ? (maxDrawdown / peak) * 100 : 0;
    return { maxDrawdown, maxDrawdownPercent };
  }

  private calculateAverageHoldingTime(trades: any[]): number {
    const tradesWithTime = trades.filter((trade) => trade.openedAt && trade.closedAt);
    if (tradesWithTime.length === 0) return 0;

    const totalTime = tradesWithTime.reduce((sum, trade) => {
      const openTime = new Date(trade.openedAt).getTime();
      const closeTime = new Date(trade.closedAt).getTime();
      return sum + (closeTime - openTime);
    }, 0);

    return totalTime / tradesWithTime.length / (1000 * 60 * 60); // Convert to hours
  }

  private calculateVolatility(returns: number[]): number {
    if (returns.length === 0) return 0;

    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;

    return Math.sqrt(variance * 252); // Annualized volatility
  }

  private async sendAlertNotification(alert: PerformanceAlert): Promise<void> {
    // Mock notification sending
    loggerService.info(`Sending notification for alert: ${alert.title}`);
    // Here you would integrate with email, SMS, push notifications, etc.
  }
}

export const performanceMonitoringService = new PerformanceMonitoringService();
