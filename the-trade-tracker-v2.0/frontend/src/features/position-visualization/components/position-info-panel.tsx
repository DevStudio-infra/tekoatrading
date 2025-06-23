"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Clock } from "lucide-react";
import { PositionInfoPanelProps } from "../types/position-chart.types";
import { formatDuration, calculateRiskRewardRatio, formatPrice, getDistanceToLevel } from "../lib/chart-utils";
import { useState } from "react";

export function PositionInfoPanel({ position, currentPrice, realTimePnL, realTimePnLPercent }: PositionInfoPanelProps) {
  const [isClosing, setIsClosing] = useState(false);

  const isProfit = realTimePnL >= 0;
  const riskRewardRatio = calculateRiskRewardRatio(position);

  const timeInPosition = Date.now() - new Date(position.entryTime).getTime();
  const distanceToStopLoss = getDistanceToLevel(currentPrice, position.stopLoss);
  const distanceToTakeProfit = getDistanceToLevel(currentPrice, position.takeProfit);

  const closePosition = async () => {
    if (!position.id) {
      console.error("No trade ID available for position");
      return;
    }

    try {
      setIsClosing(true);
      const response = await fetch(`/api/trades/${position.id}/close`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: "Manual close from chart view" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to close position");
      }

      console.log("Position closed successfully");
      // You might want to emit an event or callback here to notify parent component
    } catch (error) {
      console.error("Error closing position:", error);
      // You might want to show a toast notification here
    } finally {
      setIsClosing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Position Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Badge variant={position.direction === "BUY" ? "default" : "destructive"}>{position.direction}</Badge>
            {position.symbol}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Current P&L */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">P&L</span>
            <div className="flex items-center gap-1">
              {isProfit ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
              <span className={`font-bold ${isProfit ? "text-green-600" : "text-red-600"}`}>${realTimePnL.toFixed(2)}</span>
              <span className={`text-sm ${isProfit ? "text-green-500" : "text-red-500"}`}>({realTimePnLPercent.toFixed(2)}%)</span>
            </div>
          </div>

          {/* Position Details */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Entry</span>
              <div className="font-mono font-medium text-blue-600">{formatPrice(position.entryPrice, position.symbol)}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Current</span>
              <div className="font-mono font-medium">{formatPrice(currentPrice, position.symbol)}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Stop Loss</span>
              <div className="font-mono font-medium text-red-600">{position.stopLoss ? formatPrice(position.stopLoss, position.symbol) : "Not set"}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Take Profit</span>
              <div className="font-mono font-medium text-green-600">{position.takeProfit ? formatPrice(position.takeProfit, position.symbol) : "Not set"}</div>
            </div>
          </div>

          {/* Risk Metrics */}
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Risk:Reward</span>
              <span className="font-medium">1:{riskRewardRatio.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Quantity</span>
              <span className="font-medium">{position.quantity}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Time in Position</span>
            <span className="font-medium">{formatDuration(timeInPosition)}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Distance to SL</span>
            <span className="font-medium text-red-600">{position.stopLoss ? formatPrice(distanceToStopLoss, position.symbol) : "N/A"}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Distance to TP</span>
            <span className="font-medium text-green-600">{position.takeProfit ? formatPrice(distanceToTakeProfit, position.symbol) : "N/A"}</span>
          </div>
        </CardContent>
      </Card>

      {/* Status Indicators */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Position Status</span>
            <Badge variant={position.status === "OPEN" ? "default" : "secondary"}>{position.status || "OPEN"}</Badge>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Entry Date</span>
            <span className="font-medium">{new Date(position.entryTime).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Entry Time</span>
            <span className="font-medium">{new Date(position.entryTime).toLocaleTimeString()}</span>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            <button
              className="px-3 py-2 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded text-xs font-medium hover:bg-red-200 dark:hover:bg-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={closePosition}
              disabled={isClosing}>
              {isClosing ? "Closing..." : "Close Position"}
            </button>
            <button
              className="px-3 py-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs font-medium hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
              onClick={() => {
                // TODO: Implement modify levels functionality
                console.log("Modify levels clicked");
              }}>
              Modify Levels
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
