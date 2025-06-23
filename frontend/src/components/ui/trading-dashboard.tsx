"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { getCurrentUserId } from "../../lib/dev-auth";
import { trpc } from "../../lib/trpc";

export function TradingDashboard() {
  // Get user from Clerk or use dev user in development
  const { user } = useUser();
  const userId = user?.id || getCurrentUserId();

  // tRPC queries
  const {
    data: bots,
    isLoading: botsLoading,
    error: botsError,
  } = trpc.bots.getAll.useQuery({ userId });

  // Mock data for positions and market data until we implement these endpoints
  const [positions] = useState([
    {
      id: "1",
      symbol: "EURUSD",
      type: "BUY" as const,
      size: 1.0,
      pnl: 250.0,
      openTime: new Date().toISOString(),
    },
    {
      id: "2",
      symbol: "GBPUSD",
      type: "SELL" as const,
      size: 0.5,
      pnl: 125.0,
      openTime: new Date().toISOString(),
    },
    {
      id: "3",
      symbol: "USDJPY",
      type: "BUY" as const,
      size: 0.8,
      pnl: -75.5,
      openTime: new Date().toISOString(),
    },
  ]);

  const [portfolioData] = useState({
    totalBalance: 50000,
    totalPnL: 3875.0,
    totalPnLPercentage: 7.75,
    openPositions: positions.length,
    todayPnL: 125.5,
    equity: 53875.0,
  });

  const [marketData, setMarketData] = useState([
    { symbol: "EURUSD", price: 1.0875, change: 0.0025, changePercent: 0.23 },
    { symbol: "GBPUSD", price: 1.2625, change: -0.0015, changePercent: -0.12 },
    { symbol: "USDJPY", price: 150.25, change: 0.75, changePercent: 0.5 },
    { symbol: "USDCHF", price: 0.8955, change: 0.0005, changePercent: 0.06 },
  ]);

  // Simulate real-time market data updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMarketData((prev) =>
        prev.map((item) => ({
          ...item,
          price: item.price + (Math.random() - 0.5) * 0.001,
          change: (Math.random() - 0.5) * 0.005,
          changePercent: (Math.random() - 0.5) * 1.0,
        })),
      );
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Calculate stats from real data
  const activeBots = bots?.filter((bot: any) => bot.isActive) || [];
  const totalProfit =
    bots?.reduce((sum: number, bot: any) => sum + (bot.metrics?.totalPnL || 0), 0) || 0;
  const totalTrades = bots?.length || 0;

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

  // Handle loading and error states
  if (botsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (botsError) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️ Error loading dashboard</div>
          <p className="text-gray-600">Please check if the backend server is running</p>
          <p className="text-sm text-gray-500 mt-2">Error: {botsError.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 pb-32">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Trading Dashboard</h1>
          {user && (
            <div className="text-sm text-gray-600">
              Welcome back, {user.firstName || user.emailAddresses[0]?.emailAddress || "Trader"}!
            </div>
          )}
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Balance</p>
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
                <p className="text-sm font-medium text-gray-600">Total P&L</p>
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
                <p className="text-sm font-medium text-gray-600">Active Bots</p>
                <p className="text-2xl font-bold text-gray-900">{activeBots.length}</p>
                <p className="text-sm text-blue-600">of {bots?.length || 0} total</p>
              </div>
              <div className="p-3 rounded-full bg-purple-100">
                <div className="w-6 h-6 bg-purple-600 rounded"></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Open Positions</p>
                <p className="text-2xl font-bold text-gray-900">{positions.length}</p>
                <p className="text-sm text-gray-600">
                  across {new Set(positions.map((p) => p.symbol)).size} symbols
                </p>
              </div>
              <div className="p-3 rounded-full bg-orange-100">
                <div className="w-6 h-6 bg-orange-600 rounded"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Trading Bots Status */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Trading Bots Status</h2>

            <div className="space-y-4">
              {bots && bots.length > 0 ? (
                bots.map((bot: any) => (
                  <div
                    key={bot.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          bot.isActive ? "bg-green-500" : "bg-red-500"
                        }`}
                      ></div>
                      <div>
                        <h3 className="font-medium text-gray-900">{bot.name}</h3>
                        <p className="text-sm text-gray-600">Symbol: {bot.tradingPairSymbol}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p
                        className={`font-medium ${(bot.metrics?.totalPnL || 0) >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        ${(bot.metrics?.totalPnL || 0).toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-600">P&L</p>
                    </div>

                    <div className="text-right">
                      <p className="font-medium">{bot.isActive ? "Active" : "Inactive"}</p>
                      <p className="text-sm text-gray-600">Status</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No trading bots found</p>
                  <a
                    href="/bots"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Create Your First Bot
                  </a>
                </div>
              )}
            </div>

            {/* Bot Summary */}
            {bots && bots.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{totalTrades}</p>
                    <p className="text-sm text-gray-600">Total Bots</p>
                  </div>
                  <div>
                    <p
                      className={`text-2xl font-bold ${totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      ${totalProfit.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600">Total Profits</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{activeBots.length}</p>
                    <p className="text-sm text-gray-600">Active Bots</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Live Market Data */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Live Market Data</h2>

            <div className="space-y-4">
              {marketData.map((data) => (
                <div key={data.symbol} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{data.symbol}</p>
                    <p className="text-lg font-bold">{data.price.toFixed(5)}</p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-medium ${data.change >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {data.change >= 0 ? "+" : ""}
                      {data.change.toFixed(4)}
                    </p>
                    <p
                      className={`text-xs ${data.changePercent >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {data.changePercent >= 0 ? "+" : ""}
                      {data.changePercent.toFixed(2)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                Live data • Updates every 3 seconds
              </p>
            </div>
          </div>
        </div>

        {/* Open Positions */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Open Positions</h2>

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
                    <tr key={position.id}>
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <span className={position.pnl >= 0 ? "text-green-600" : "text-red-600"}>
                          ${position.pnl.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(position.openTime).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button className="text-red-600 hover:text-red-900">Close</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No open positions</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
