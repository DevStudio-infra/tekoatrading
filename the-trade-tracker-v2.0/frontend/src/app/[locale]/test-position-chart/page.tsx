"use client";

import { PositionChartContainer } from "@/features/position-visualization/components/position-chart-container";
import { ActivePosition } from "@/features/position-visualization/types/position-chart.types";

export default function TestPositionChart() {
  // Sample position data for demonstration
  const samplePosition: ActivePosition = {
    id: "test-position-1",
    symbol: "BTC/USD",
    direction: "BUY",
    entryPrice: 43250.5,
    entryTime: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
    stopLoss: 42800.0,
    takeProfit: 44500.0,
    quantity: 0.01,
    currentPrice: 43485.75,
    unrealizedPnL: 235.25,
    unrealizedPnLPercent: 0.54,
    status: "OPEN",
  };

  const sampleForexPosition: ActivePosition = {
    id: "test-position-2",
    symbol: "EUR/USD",
    direction: "SELL",
    entryPrice: 1.0845,
    entryTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    stopLoss: 1.0865,
    takeProfit: 1.0815,
    quantity: 10000,
    currentPrice: 1.0828,
    unrealizedPnL: 170.0,
    unrealizedPnLPercent: 0.16,
    status: "OPEN",
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">TradingView Position Visualization</h1>
        <p className="text-muted-foreground">Phase 1 Demo - Core Chart Infrastructure with Lightweight Charts v5.0.7</p>
      </div>

      {/* BTC Position */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">BTC/USD Long Position</h2>
        <div className="border rounded-lg p-4">
          <PositionChartContainer position={samplePosition} />
        </div>
      </div>

      {/* Forex Position */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">EUR/USD Short Position</h2>
        <div className="border rounded-lg p-4">
          <PositionChartContainer position={sampleForexPosition} />
        </div>
      </div>

      {/* Features Demo */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Features Demonstrated</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 border rounded-lg">
            <h3 className="font-medium text-green-600">✅ TradingView Charts v5.0.7</h3>
            <p className="text-sm text-muted-foreground">Latest lightweight charts with mobile support</p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-medium text-green-600">✅ Position Levels</h3>
            <p className="text-sm text-muted-foreground">Entry, Stop Loss, Take Profit visualization</p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-medium text-green-600">✅ Real-time P&L</h3>
            <p className="text-sm text-muted-foreground">Live profit/loss calculations</p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-medium text-green-600">✅ Mobile Responsive</h3>
            <p className="text-sm text-muted-foreground">Touch-friendly controls and layout</p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-medium text-green-600">✅ Dark/Light Theme</h3>
            <p className="text-sm text-muted-foreground">Automatic theme detection</p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-medium text-yellow-600">🚧 Real-time Data</h3>
            <p className="text-sm text-muted-foreground">Coming in Phase 2 - WebSocket integration</p>
          </div>
        </div>
      </div>

      {/* Next Steps */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Next Steps - Phase 2</h2>
        <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
          <ul className="space-y-2 text-sm">
            <li>• WebSocket real-time price feeds</li>
            <li>• Dynamic chart data updates</li>
            <li>• Live P&L calculations</li>
            <li>• Enhanced mobile interactions</li>
            <li>• Integration with existing trades page</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
