"use client";

import { useState } from "react";

interface Position {
  id: string;
  symbol: string;
  type: "BUY" | "SELL";
  size: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  openTime: string;
}

interface Trade {
  id: string;
  symbol: string;
  type: "BUY" | "SELL";
  size: number;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  openTime: string;
  closeTime: string;
}

export default function PortfolioPage() {
  // Mock portfolio data - in a real app, this would come from tRPC
  const [portfolioData] = useState({
    totalBalance: 10000,
    totalPnL: 1250.75,
    totalPnLPercentage: 12.51,
    openPositions: 3,
    todayPnL: 125.5,
    equity: 11250.75,
    freeMargin: 9250.75,
    marginLevel: 562,
  });

  const [positions] = useState<Position[]>([
    {
      id: "1",
      symbol: "EURUSD",
      type: "BUY",
      size: 1.0,
      entryPrice: 1.085,
      currentPrice: 1.0875,
      pnl: 250.0,
      openTime: new Date().toISOString(),
    },
    {
      id: "2",
      symbol: "GBPUSD",
      type: "SELL",
      size: 0.5,
      entryPrice: 1.265,
      currentPrice: 1.2625,
      pnl: 125.0,
      openTime: new Date().toISOString(),
    },
    {
      id: "3",
      symbol: "USDJPY",
      type: "BUY",
      size: 0.8,
      entryPrice: 149.5,
      currentPrice: 149.25,
      pnl: -200.0,
      openTime: new Date().toISOString(),
    },
  ]);

  const [trades] = useState<Trade[]>([
    {
      id: "1",
      symbol: "USDJPY",
      type: "BUY",
      size: 1.0,
      entryPrice: 149.5,
      exitPrice: 150.25,
      pnl: 500.0,
      openTime: new Date(Date.now() - 86400000).toISOString(),
      closeTime: new Date().toISOString(),
    },
    {
      id: "2",
      symbol: "AUDUSD",
      type: "SELL",
      size: 0.8,
      entryPrice: 0.675,
      exitPrice: 0.6725,
      pnl: 200.0,
      openTime: new Date(Date.now() - 172800000).toISOString(),
      closeTime: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: "3",
      symbol: "EURUSD",
      type: "BUY",
      size: 0.5,
      entryPrice: 1.0825,
      exitPrice: 1.0875,
      pnl: 250.0,
      openTime: new Date(Date.now() - 259200000).toISOString(),
      closeTime: new Date(Date.now() - 172800000).toISOString(),
    },
  ]);

  const [activeTab, setActiveTab] = useState<"overview" | "positions" | "trades" | "performance">(
    "overview",
  );

  const handleClosePosition = (positionId: string) => {
    if (confirm("Are you sure you want to close this position?")) {
      console.log("Closing position:", positionId);
      // In a real app, this would call a tRPC mutation
    }
  };

  const totalPositionPnL = positions.reduce((sum, pos) => sum + pos.pnl, 0);
  const winningTrades = trades.filter((trade) => trade.pnl > 0).length;
  const losingTrades = trades.filter((trade) => trade.pnl < 0).length;
  const winRate = trades.length > 0 ? (winningTrades / trades.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Portfolio</h1>

        {/* Portfolio Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Total Balance</h3>
                <p className="text-2xl font-bold text-gray-900">
                  ${portfolioData.totalBalance.toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <div className="w-6 h-6 bg-blue-600 rounded"></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Total P&L</h3>
                <p
                  className={`text-2xl font-bold ${portfolioData.totalPnL >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  ${portfolioData.totalPnL.toFixed(2)}
                </p>
                <p
                  className={`text-sm ${portfolioData.totalPnLPercentage >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {portfolioData.totalPnLPercentage >= 0 ? "+" : ""}
                  {portfolioData.totalPnLPercentage.toFixed(2)}%
                </p>
              </div>
              <div
                className={`p-3 rounded-full ${portfolioData.totalPnL >= 0 ? "bg-green-100" : "bg-red-100"}`}
              >
                <div
                  className={`w-6 h-6 ${portfolioData.totalPnL >= 0 ? "bg-green-600" : "bg-red-600"} rounded`}
                ></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Today&apos;s P&L</h3>
                <p
                  className={`text-2xl font-bold ${portfolioData.todayPnL >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  ${portfolioData.todayPnL.toFixed(2)}
                </p>
              </div>
              <div
                className={`p-3 rounded-full ${portfolioData.todayPnL >= 0 ? "bg-green-100" : "bg-red-100"}`}
              >
                <div
                  className={`w-6 h-6 ${portfolioData.todayPnL >= 0 ? "bg-green-600" : "bg-red-600"} rounded`}
                ></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Open Positions</h3>
                <p className="text-2xl font-bold text-gray-900">{positions.length}</p>
                <p
                  className={`text-sm ${totalPositionPnL >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  ${totalPositionPnL.toFixed(2)} P&L
                </p>
              </div>
              <div className="p-3 rounded-full bg-orange-100">
                <div className="w-6 h-6 bg-orange-600 rounded"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-lg">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: "overview", label: "Overview" },
                { id: "positions", label: "Open Positions" },
                { id: "trades", label: "Trade History" },
                { id: "performance", label: "Performance" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() =>
                    setActiveTab(tab.id as "overview" | "positions" | "trades" | "performance")
                  }
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Account Summary */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Account Summary</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Balance:</span>
                        <span className="font-medium">
                          ${portfolioData.totalBalance.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Equity:</span>
                        <span className="font-medium">
                          ${portfolioData.equity.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Free Margin:</span>
                        <span className="font-medium">
                          ${portfolioData.freeMargin.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Margin Level:</span>
                        <span className="font-medium">{portfolioData.marginLevel}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Trading Statistics */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Trading Statistics</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Trades:</span>
                        <span className="font-medium">{trades.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Winning Trades:</span>
                        <span className="font-medium text-green-600">{winningTrades}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Losing Trades:</span>
                        <span className="font-medium text-red-600">{losingTrades}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Win Rate:</span>
                        <span className="font-medium">{winRate.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                      <div className="text-2xl mb-2">📊</div>
                      <div className="font-medium">View Analytics</div>
                      <div className="text-sm text-gray-600">Detailed performance analysis</div>
                    </button>
                    <button className="p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                      <div className="text-2xl mb-2">💰</div>
                      <div className="font-medium">Deposit Funds</div>
                      <div className="text-sm text-gray-600">Add money to your account</div>
                    </button>
                    <button className="p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
                      <div className="text-2xl mb-2">📈</div>
                      <div className="font-medium">Export Report</div>
                      <div className="text-sm text-gray-600">Download trading report</div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Open Positions Tab */}
            {activeTab === "positions" && (
              <div>
                {positions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Symbol
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Size
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Entry Price
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Current Price
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            P&L
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Open Time
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {positions.map((position) => (
                          <tr key={position.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {position.symbol}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  position.type === "BUY"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {position.type}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {position.size}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {position.entryPrice.toFixed(5)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {position.currentPrice.toFixed(5)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <span
                                className={position.pnl >= 0 ? "text-green-600" : "text-red-600"}
                              >
                                ${position.pnl.toFixed(2)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(position.openTime).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() => handleClosePosition(position.id)}
                                className="text-red-600 hover:text-red-900 transition-colors"
                              >
                                Close
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-6xl mb-4">📊</div>
                    <p className="text-gray-500 mb-4">No open positions</p>
                    <a
                      href="/bots"
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                    >
                      Start Trading
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Trade History Tab */}
            {activeTab === "trades" && (
              <div>
                {trades.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Symbol
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Size
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Entry Price
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Exit Price
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            P&L
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Duration
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {trades.map((trade) => (
                          <tr key={trade.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {trade.symbol}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  trade.type === "BUY"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {trade.type}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {trade.size}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {trade.entryPrice.toFixed(5)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {trade.exitPrice.toFixed(5)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <span className={trade.pnl >= 0 ? "text-green-600" : "text-red-600"}>
                                ${trade.pnl.toFixed(2)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {Math.round(
                                (new Date(trade.closeTime).getTime() -
                                  new Date(trade.openTime).getTime()) /
                                  (1000 * 60 * 60),
                              )}
                              h
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-6xl mb-4">📈</div>
                    <p className="text-gray-500">No trade history available</p>
                  </div>
                )}
              </div>
            )}

            {/* Performance Tab */}
            {activeTab === "performance" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-blue-50 rounded-lg p-6">
                    <h4 className="font-semibold text-blue-900 mb-2">Total Return</h4>
                    <p className="text-2xl font-bold text-blue-700">
                      {portfolioData.totalPnLPercentage.toFixed(2)}%
                    </p>
                    <p className="text-sm text-blue-600">Since inception</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-6">
                    <h4 className="font-semibold text-green-900 mb-2">Win Rate</h4>
                    <p className="text-2xl font-bold text-green-700">{winRate.toFixed(1)}%</p>
                    <p className="text-sm text-green-600">
                      {winningTrades} of {trades.length} trades
                    </p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-6">
                    <h4 className="font-semibold text-purple-900 mb-2">Best Trade</h4>
                    <p className="text-2xl font-bold text-purple-700">
                      ${Math.max(...trades.map((t) => t.pnl)).toFixed(2)}
                    </p>
                    <p className="text-sm text-purple-600">Single trade profit</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="font-semibold mb-4">Performance Chart</h4>
                  <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                    <div className="text-center text-gray-500">
                      <div className="text-4xl mb-2">📊</div>
                      <p>Performance chart coming soon</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
