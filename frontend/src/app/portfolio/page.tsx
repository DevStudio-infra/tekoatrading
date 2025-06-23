"use client";

import { useState, useEffect } from "react";
import { trpc } from "../../lib/trpc";

interface Position {
  id: string;
  symbol: string;
  side: "long" | "short";
  size: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  realizedPnL: number;
  status: string;
  openTime: string;
  botId?: string;
  botName?: string;
}

interface Trade {
  id: string;
  symbol: string;
  side: "long" | "short";
  size: number;
  entryPrice: number;
  exitPrice?: number;
  profitLoss: number;
  status: string;
  openTime: string;
  closeTime?: string;
  botName?: string;
}

export default function Portfolio() {
  const [selectedTab, setSelectedTab] = useState<
    "overview" | "positions" | "trades" | "performance"
  >("overview");
  const [timeframe, setTimeframe] = useState("1D");

  // Mock user ID - in real app, get from auth
  const userId = "user-1";

  // Fetch portfolio data
  const { data: portfolioData, isLoading: portfolioLoading } =
    trpc.portfolio?.getOverview?.useQuery({ userId }) || { data: null, isLoading: false };
  const { data: bots } = trpc.bots.getAll.useQuery({ userId });

  // Mock real-time data for demonstration
  const [liveData, setLiveData] = useState({
    totalBalance: 50000,
    totalValue: 52750,
    dayChange: 1250,
    dayChangePercent: 2.44,
    weekChange: 2750,
    monthChange: 4200,
    positions: [
      {
        id: "pos-1",
        symbol: "EURUSD",
        side: "long" as const,
        size: 10000,
        entryPrice: 1.0835,
        currentPrice: 1.0845,
        unrealizedPnL: 100.5,
        realizedPnL: 0,
        status: "open",
        openTime: "2024-01-15T10:30:00Z",
        botId: "bot-1",
        botName: "EUR Scalper",
      },
      {
        id: "pos-2",
        symbol: "GBPUSD",
        side: "short" as const,
        size: 5000,
        entryPrice: 1.2665,
        currentPrice: 1.2654,
        unrealizedPnL: 55.25,
        realizedPnL: 0,
        status: "open",
        openTime: "2024-01-15T11:15:00Z",
        botId: "bot-2",
        botName: "GBP Momentum",
      },
    ] as Position[],
    recentTrades: [
      {
        id: "trade-1",
        symbol: "USDJPY",
        side: "long" as const,
        size: 8000,
        entryPrice: 149.85,
        exitPrice: 150.15,
        profitLoss: 159.84,
        status: "closed",
        openTime: "2024-01-15T09:00:00Z",
        closeTime: "2024-01-15T09:45:00Z",
        botName: "JPY Trend",
      },
      {
        id: "trade-2",
        symbol: "XAUUSD",
        side: "short" as const,
        size: 1,
        entryPrice: 2065.5,
        exitPrice: 2058.25,
        profitLoss: 7.25,
        status: "closed",
        openTime: "2024-01-15T08:30:00Z",
        closeTime: "2024-01-15T10:15:00Z",
        botName: "Gold Scalper",
      },
    ] as Trade[],
  });

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveData((prev) => ({
        ...prev,
        positions: prev.positions.map((pos) => ({
          ...pos,
          currentPrice: pos.currentPrice + (Math.random() - 0.5) * 0.001,
          unrealizedPnL: pos.unrealizedPnL + (Math.random() - 0.5) * 10,
        })),
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const totalUnrealizedPnL = liveData.positions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0);
  const totalRealizedPnL = liveData.recentTrades.reduce((sum, trade) => sum + trade.profitLoss, 0);
  const totalPnL = totalUnrealizedPnL + totalRealizedPnL;

  const winningTrades = liveData.recentTrades.filter((trade) => trade.profitLoss > 0).length;
  const winRate =
    liveData.recentTrades.length > 0 ? (winningTrades / liveData.recentTrades.length) * 100 : 0;

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "positions", label: "Positions" },
    { id: "trades", label: "Trade History" },
    { id: "performance", label: "Performance" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Portfolio</h1>
            <p className="text-gray-600 mt-1">Track your trading performance and positions</p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1D">1 Day</option>
              <option value="1W">1 Week</option>
              <option value="1M">1 Month</option>
              <option value="3M">3 Months</option>
              <option value="1Y">1 Year</option>
            </select>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Balance</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${liveData.totalBalance.toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <div className="w-6 h-6 bg-blue-600 rounded"></div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total P&L</p>
                <p
                  className={`text-2xl font-bold ${totalPnL >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  ${totalPnL.toFixed(2)}
                </p>
              </div>
              <div className={`p-3 rounded-full ${totalPnL >= 0 ? "bg-green-100" : "bg-red-100"}`}>
                <div
                  className={`w-6 h-6 ${totalPnL >= 0 ? "bg-green-600" : "bg-red-600"} rounded`}
                ></div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Win Rate</p>
                <p className="text-2xl font-bold text-gray-900">{winRate.toFixed(1)}%</p>
              </div>
              <div className="p-3 rounded-full bg-purple-100">
                <div className="w-6 h-6 bg-purple-600 rounded"></div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Positions</p>
                <p className="text-2xl font-bold text-gray-900">{liveData.positions.length}</p>
              </div>
              <div className="p-3 rounded-full bg-orange-100">
                <div className="w-6 h-6 bg-orange-600 rounded"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    selectedTab === tab.id
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
            {selectedTab === "overview" && (
              <div className="space-y-6">
                {/* Portfolio Summary */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Portfolio Summary</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Cash Balance:</span>
                        <span className="font-semibold">
                          ${liveData.totalBalance.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Unrealized P&L:</span>
                        <span
                          className={`font-semibold ${totalUnrealizedPnL >= 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          ${totalUnrealizedPnL.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Realized P&L:</span>
                        <span
                          className={`font-semibold ${totalRealizedPnL >= 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          ${totalRealizedPnL.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between border-t pt-3">
                        <span className="text-gray-900 font-semibold">Total Value:</span>
                        <span className="font-bold text-lg">
                          ${(liveData.totalBalance + totalPnL).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4">Trading Statistics</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Trades:</span>
                        <span className="font-semibold">{liveData.recentTrades.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Winning Trades:</span>
                        <span className="font-semibold text-green-600">{winningTrades}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Losing Trades:</span>
                        <span className="font-semibold text-red-600">
                          {liveData.recentTrades.length - winningTrades}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Win Rate:</span>
                        <span className="font-semibold">{winRate.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Active Bots:</span>
                        <span className="font-semibold">
                          {bots?.filter((bot) => bot.isActive).length || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedTab === "positions" && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Open Positions</h3>
                {liveData.positions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Symbol
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Side
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Size
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Entry Price
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Current Price
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            P&L
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Bot
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Open Time
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {liveData.positions.map((position) => (
                          <tr key={position.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {position.symbol}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${
                                  position.side === "long"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {position.side.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {position.size.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {position.entryPrice.toFixed(4)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {position.currentPrice.toFixed(4)}
                            </td>
                            <td
                              className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                                position.unrealizedPnL >= 0 ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              ${position.unrealizedPnL.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {position.botName || "Manual"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(position.openTime).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-center py-8 text-gray-500">No open positions</p>
                )}
              </div>
            )}

            {selectedTab === "trades" && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Recent Trades</h3>
                {liveData.recentTrades.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Symbol
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Side
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Size
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Entry
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Exit
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            P&L
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Bot
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Duration
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {liveData.recentTrades.map((trade) => (
                          <tr key={trade.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {trade.symbol}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${
                                  trade.side === "long"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {trade.side.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {trade.size.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {trade.entryPrice.toFixed(4)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {trade.exitPrice?.toFixed(4)}
                            </td>
                            <td
                              className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                                trade.profitLoss >= 0 ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              ${trade.profitLoss.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {trade.botName || "Manual"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {trade.closeTime &&
                              new Date(trade.closeTime).getTime() -
                                new Date(trade.openTime).getTime() >
                                0
                                ? `${Math.round((new Date(trade.closeTime).getTime() - new Date(trade.openTime).getTime()) / 60000)}m`
                                : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-center py-8 text-gray-500">No trades yet</p>
                )}
              </div>
            )}

            {selectedTab === "performance" && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Performance Analysis</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">Daily Performance</h4>
                    <p
                      className={`text-xl font-bold ${liveData.dayChange >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      ${liveData.dayChange.toFixed(2)}
                    </p>
                    <p
                      className={`text-sm ${liveData.dayChangePercent >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {liveData.dayChangePercent >= 0 ? "+" : ""}
                      {liveData.dayChangePercent.toFixed(2)}%
                    </p>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">Weekly Performance</h4>
                    <p
                      className={`text-xl font-bold ${liveData.weekChange >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      ${liveData.weekChange.toFixed(2)}
                    </p>
                    <p
                      className={`text-sm ${liveData.weekChange >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {liveData.weekChange >= 0 ? "+" : ""}
                      {((liveData.weekChange / liveData.totalBalance) * 100).toFixed(2)}%
                    </p>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">Monthly Performance</h4>
                    <p
                      className={`text-xl font-bold ${liveData.monthChange >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      ${liveData.monthChange.toFixed(2)}
                    </p>
                    <p
                      className={`text-sm ${liveData.monthChange >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {liveData.monthChange >= 0 ? "+" : ""}
                      {((liveData.monthChange / liveData.totalBalance) * 100).toFixed(2)}%
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-4">Trading Insights</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h5 className="font-medium text-gray-700 mb-2">Best Performing Symbol</h5>
                      <p className="text-lg font-semibold">USDJPY</p>
                      <p className="text-sm text-green-600">+$159.84 profit</p>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-700 mb-2">Most Active Bot</h5>
                      <p className="text-lg font-semibold">EUR Scalper</p>
                      <p className="text-sm text-blue-600">Currently active</p>
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
