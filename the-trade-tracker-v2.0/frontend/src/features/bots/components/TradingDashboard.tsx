"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TrendingUp, TrendingDown, DollarSign, Activity, Clock, AlertTriangle, RefreshCw, X } from "lucide-react";
import {
  getPositionSummary,
  getActiveTrades,
  getTradeHistory,
  closeTrade,
  closeAllPositions,
  formatPnL,
  formatPercentage,
  getTradeStatusBadge,
  getDirectionBadge,
  calculateTimeInPosition,
  getRiskScoreBadge,
  getConfidenceBadge,
  type Trade,
  type PositionSummary,
} from "../services/trading-service";

interface TradingDashboardProps {
  botId: string;
  botName: string;
  isAiTradingActive: boolean;
}

export default function TradingDashboard({ botId, botName, isAiTradingActive }: TradingDashboardProps) {
  const [positionSummary, setPositionSummary] = useState<PositionSummary | null>(null);
  const [activeTrades, setActiveTrades] = useState<Trade[]>([]);
  const [tradeHistory, setTradeHistory] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Load data
  const loadData = async () => {
    try {
      setError(null);
      const [summaryRes, activeRes, historyRes] = await Promise.all([getPositionSummary(botId), getActiveTrades(botId), getTradeHistory(botId, 20)]);

      setPositionSummary(summaryRes.summary);
      setActiveTrades(activeRes.trades);
      setTradeHistory(historyRes.trades);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load trading data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadData();
  }, [botId]);

  // Auto-refresh every 30 seconds for active trades
  useEffect(() => {
    if (!isAiTradingActive) return;

    const interval = setInterval(() => {
      loadData();
    }, 30000);

    return () => clearInterval(interval);
  }, [botId, isAiTradingActive]);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  // Handle close trade
  const handleCloseTrade = async (tradeId: string, reason?: string) => {
    try {
      await closeTrade(tradeId, reason);
      await loadData(); // Refresh data
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to close trade");
    }
  };

  // Handle close all positions
  const handleCloseAllPositions = async () => {
    try {
      await closeAllPositions(botId, "Manual close all from dashboard");
      await loadData(); // Refresh data
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to close all positions");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Trading Dashboard</h2>
          <p className="text-gray-600">{botName}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {activeTrades.length > 0 && (
            <Button variant="destructive" size="sm" onClick={handleCloseAllPositions}>
              Close All Positions
            </Button>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* AI Trading Status */}
      {!isAiTradingActive && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>AI Trading is disabled for this bot. Enable it to start automated trading.</AlertDescription>
        </Alert>
      )}

      {/* Performance Summary Cards */}
      {positionSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Trades</p>
                  <p className="text-2xl font-bold">{positionSummary.activeTrades}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Unrealized P&L</p>
                  <p className={`text-2xl font-bold ${formatPnL(positionSummary.totalUnrealizedPnL).className}`}>{formatPnL(positionSummary.totalUnrealizedPnL).formatted}</p>
                </div>
                {positionSummary.totalUnrealizedPnL >= 0 ? <TrendingUp className="h-8 w-8 text-green-600" /> : <TrendingDown className="h-8 w-8 text-red-600" />}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total P&L</p>
                  <p className={`text-2xl font-bold ${formatPnL(positionSummary.totalPnL).className}`}>{formatPnL(positionSummary.totalPnL).formatted}</p>
                </div>
                <DollarSign className="h-8 w-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Win Rate</p>
                  <p className="text-2xl font-bold">{positionSummary.winRate.toFixed(1)}%</p>
                </div>
                <Activity className="h-8 w-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Trades Tabs */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active">Active Trades ({activeTrades.length})</TabsTrigger>
          <TabsTrigger value="history">Trade History ({tradeHistory.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeTrades.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Trades</h3>
                <p className="text-gray-600">
                  {isAiTradingActive ? "The AI will automatically execute trades when opportunities are identified." : "Enable AI trading to start automated trading."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {activeTrades.map((trade) => (
                <TradeCard key={trade.id} trade={trade} onClose={(reason) => handleCloseTrade(trade.id, reason)} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {tradeHistory.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Trade History</h3>
                <p className="text-gray-600">Trade history will appear here once trades are executed.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {tradeHistory.map((trade) => (
                <TradeCard key={trade.id} trade={trade} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Trade Card Component
interface TradeCardProps {
  trade: Trade;
  onClose?: (reason?: string) => void;
}

function TradeCard({ trade, onClose }: TradeCardProps) {
  const statusBadge = getTradeStatusBadge(trade.status);
  const directionBadge = getDirectionBadge(trade.direction);
  const riskBadge = getRiskScoreBadge(trade.riskScore);
  const confidenceBadge = getConfidenceBadge(trade.aiConfidence);

  const currentPnL = trade.profitLoss || 0;
  const currentPnLPercent = trade.profitLossPercent || 0;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="text-lg font-semibold">{trade.symbol}</h3>
              <p className="text-sm text-gray-600">
                {trade.quantity} units @ ${trade.entryPrice?.toFixed(4) || "Pending"}
              </p>
            </div>
            <div className="flex gap-2">
              <Badge className={directionBadge.className}>{directionBadge.label}</Badge>
              <Badge className={statusBadge.className}>{statusBadge.label}</Badge>
            </div>
          </div>
          {onClose && trade.status === "OPEN" && (
            <Button variant="outline" size="sm" onClick={() => onClose("Manual close")}>
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-600">Current Price</p>
            <p className="font-medium">${trade.currentPrice?.toFixed(4) || "N/A"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">P&L</p>
            <p className={`font-medium ${formatPnL(currentPnL).className}`}>{formatPnL(currentPnL).formatted}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">P&L %</p>
            <p className={`font-medium ${formatPercentage(currentPnLPercent).className}`}>{formatPercentage(currentPnLPercent).formatted}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Time</p>
            <p className="font-medium">{trade.openedAt ? calculateTimeInPosition(trade.openedAt) : "N/A"}</p>
          </div>
        </div>

        {(trade.stopLoss || trade.takeProfit) && (
          <div className="grid grid-cols-2 gap-4 mb-4">
            {trade.stopLoss && (
              <div>
                <p className="text-sm text-gray-600">Stop Loss</p>
                <p className="font-medium">${trade.stopLoss.toFixed(4)}</p>
              </div>
            )}
            {trade.takeProfit && (
              <div>
                <p className="text-sm text-gray-600">Take Profit</p>
                <p className="font-medium">${trade.takeProfit.toFixed(4)}</p>
              </div>
            )}
          </div>
        )}

        {(trade.aiConfidence || trade.riskScore) && (
          <div className="flex gap-2 mb-4">
            {trade.aiConfidence && (
              <Badge className={confidenceBadge.className}>
                {confidenceBadge.label} ({trade.aiConfidence}%)
              </Badge>
            )}
            {trade.riskScore && <Badge className={riskBadge.className}>{riskBadge.label}</Badge>}
          </div>
        )}

        {trade.rationale && (
          <div>
            <p className="text-sm text-gray-600 mb-1">Rationale</p>
            <p className="text-sm bg-gray-50 p-2 rounded">{trade.rationale}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
