"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { getCurrentUserId } from "../../lib/dev-auth";

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
  // Get user from Clerk or use dev user in development
  const { user } = useUser();
  const userId = user?.id || getCurrentUserId();

  const [activeTab, setActiveTab] = useState("overview");

  // Mock data - in a real app, this would come from tRPC queries
  const [portfolioData] = useState({
    accountBalance: 50000,
    equity: 53875.5,
    margin: 2500,
    freeMargin: 51375.5,
    marginLevel: 2155.02,
    profit: 3875.5,
    todayPnL: 125.75,
    weeklyPnL: 892.3,
    monthlyPnL: 2450.8,
  });

  const [positions] = useState([
    {
      id: "1",
      symbol: "EURUSD",
      type: "BUY",
      volume: 1.0,
      openPrice: 1.085,
      currentPrice: 1.0875,
      pnl: 250.0,
      swap: -2.5,
      openTime: "2024-01-15 10:30:00",
    },
    {
      id: "2",
      symbol: "GBPUSD",
      type: "SELL",
      volume: 0.5,
      openPrice: 1.264,
      currentPrice: 1.2625,
      pnl: 125.0,
      swap: -1.25,
      openTime: "2024-01-15 14:15:00",
    },
    {
      id: "3",
      symbol: "USDJPY",
      type: "BUY",
      volume: 0.8,
      openPrice: 149.5,
      currentPrice: 150.25,
      pnl: -75.5,
      swap: 3.2,
      openTime: "2024-01-16 08:45:00",
    },
  ]);

  const [trades] = useState([
    {
      id: "1",
      symbol: "EURUSD",
      type: "BUY",
      volume: 0.5,
      openPrice: 1.082,
      closePrice: 1.0865,
      pnl: 225.0,
      duration: "2h 15m",
      openTime: "2024-01-14 09:30:00",
      closeTime: "2024-01-14 11:45:00",
    },
    {
      id: "2",
      symbol: "GBPUSD",
      type: "SELL",
      volume: 1.0,
      openPrice: 1.268,
      closePrice: 1.265,
      pnl: 300.0,
      duration: "4h 20m",
      openTime: "2024-01-13 13:20:00",
      closeTime: "2024-01-13 17:40:00",
    },
    {
      id: "3",
      symbol: "USDJPY",
      type: "BUY",
      volume: 0.3,
      openPrice: 148.8,
      closePrice: 148.2,
      pnl: -180.0,
      duration: "1h 35m",
      openTime: "2024-01-12 16:10:00",
      closeTime: "2024-01-12 17:45:00",
    },
  ]);

  // Show loading state if user is not available yet
  if (!userId) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading user data...</p>
        </div>
      </div>
    );
  }

  const handleClosePosition = (positionId: string) => {
    if (confirm("Are you sure you want to close this position?")) {
      // In a real app, this would call a tRPC mutation
      console.log("Closing position:", positionId);
      alert("Position closed successfully!");
    }
  };

  const calculateWinRate = () => {
    const winningTrades = trades.filter((trade) => trade.pnl > 0).length;
    return trades.length > 0 ? ((winningTrades / trades.length) * 100).toFixed(1) : "0.0";
  };

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "positions", label: "Positions" },
    { id: "trades", label: "Trades" },
    { id: "performance", label: "Performance" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8 pb-32">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Portfolio</h1>
          {user && (
            <div className="text-sm text-gray-600">
              Portfolio for {user.firstName || user.emailAddresses[0]?.emailAddress || "Trader"}
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-lg mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
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
                {/* Account Summary */}
                <div>
                  <h2 className="text-xl font-semibold mb-4">Account Summary</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-sm font-medium text-blue-600">Account Balance</p>
                      <p className="text-2xl font-bold text-blue-900">
                        ${portfolioData.accountBalance.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-sm font-medium text-green-600">Equity</p>
                      <p className="text-2xl font-bold text-green-900">
                        ${portfolioData.equity.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4">
                      <p className="text-sm font-medium text-orange-600">Margin Used</p>
                      <p className="text-2xl font-bold text-orange-900">
                        ${portfolioData.margin.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <p className="text-sm font-medium text-purple-600">Free Margin</p>
                      <p className="text-2xl font-bold text-purple-900">
                        ${portfolioData.freeMargin.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Trading Statistics */}
                <div>
                  <h2 className="text-xl font-semibold mb-4">Trading Statistics</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm font-medium text-gray-600">Today's P&L</p>
                      <p
                        className={`text-xl font-bold ${portfolioData.todayPnL >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        ${portfolioData.todayPnL.toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm font-medium text-gray-600">Weekly P&L</p>
                      <p
                        className={`text-xl font-bold ${portfolioData.weeklyPnL >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        ${portfolioData.weeklyPnL.toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm font-medium text-gray-600">Monthly P&L</p>
                      <p
                        className={`text-xl font-bold ${portfolioData.monthlyPnL >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        ${portfolioData.monthlyPnL.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Positions Tab */}
            {activeTab === "positions" && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Open Positions</h2>
                  <span className="text-sm text-gray-600">{positions.length} open positions</span>
                </div>

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
                            Volume
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Open Price
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
                              {position.volume}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {position.openPrice}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {position.currentPrice}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <span
                                className={position.pnl >= 0 ? "text-green-600" : "text-red-600"}
                              >
                                ${position.pnl.toFixed(2)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {position.openTime}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() => handleClosePosition(position.id)}
                                className="text-red-600 hover:text-red-900 bg-red-100 hover:bg-red-200 px-3 py-1 rounded-lg transition-colors"
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
                    <p className="text-gray-500">No open positions</p>
                  </div>
                )}
              </div>
            )}

            {/* Trades Tab */}
            {activeTab === "trades" && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Trade History</h2>
                  <span className="text-sm text-gray-600">{trades.length} completed trades</span>
                </div>

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
                            Volume
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Open Price
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Close Price
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            P&L
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Duration
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Close Time
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
                              {trade.volume}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {trade.openPrice}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {trade.closePrice}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <span className={trade.pnl >= 0 ? "text-green-600" : "text-red-600"}>
                                ${trade.pnl.toFixed(2)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {trade.duration}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {trade.closeTime}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-6xl mb-4">📈</div>
                    <p className="text-gray-500">No completed trades</p>
                  </div>
                )}
              </div>
            )}

            {/* Performance Tab */}
            {activeTab === "performance" && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold">Performance Analytics</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-blue-600">Total Trades</p>
                    <p className="text-2xl font-bold text-blue-900">{trades.length}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-green-600">Win Rate</p>
                    <p className="text-2xl font-bold text-green-900">{calculateWinRate()}%</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-purple-600">Best Trade</p>
                    <p className="text-2xl font-bold text-purple-900">
                      ${Math.max(...trades.map((t) => t.pnl)).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-red-600">Worst Trade</p>
                    <p className="text-2xl font-bold text-red-900">
                      ${Math.min(...trades.map((t) => t.pnl)).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-medium mb-4">Performance Metrics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-2">Profit Factor</p>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: "75%" }}
                        ></div>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">1.75</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-2">Sharpe Ratio</p>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: "60%" }}
                        ></div>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">1.2</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-2">Max Drawdown</p>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-red-600 h-2 rounded-full" style={{ width: "25%" }}></div>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">-5.2%</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-2">Recovery Factor</p>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full"
                          style={{ width: "80%" }}
                        ></div>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">3.2</p>
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
