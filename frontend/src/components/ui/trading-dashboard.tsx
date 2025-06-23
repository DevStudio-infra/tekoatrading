"use client";

import React, { useState, useEffect } from "react";
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
}

interface Bot {
  id: string;
  name: string;
  tradingPairSymbol: string;
  isActive: boolean;
  isAiTradingActive: boolean;
  metrics: {
    totalPnL: number;
    winRate: number;
    totalTrades: number;
    winningTrades: number;
  };
}

interface MarketData {
  symbol: string;
  price: number;
  change24h: number;
  volume: number;
  high24h: number;
  low24h: number;
}

export default function TradingDashboard() {
  const [selectedTimeframe, setSelectedTimeframe] = useState("1H");
  const [positions, setPositions] = useState<Position[]>([]);
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Mock user ID - in real app, get from auth
  const userId = "user-1";

  // Fetch bots data
  const { data: bots, isLoading: botsLoading } = trpc.bots.getAll.useQuery({ userId });

  // Fetch portfolio data
  const { data: portfolioData, isLoading: portfolioLoading } =
    trpc.portfolio?.getOverview?.useQuery({ userId }) || { data: null, isLoading: false };

  // Mock real-time data updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate real-time market data updates
      setMarketData([
        {
          symbol: "EURUSD",
          price: 1.0845 + (Math.random() - 0.5) * 0.001,
          change24h: (Math.random() - 0.5) * 2,
          volume: 1250000 + Math.random() * 100000,
          high24h: 1.0865,
          low24h: 1.0825,
        },
        {
          symbol: "GBPUSD",
          price: 1.2654 + (Math.random() - 0.5) * 0.001,
          change24h: (Math.random() - 0.5) * 2,
          volume: 950000 + Math.random() * 100000,
          high24h: 1.2675,
          low24h: 1.2635,
        },
        {
          symbol: "USDJPY",
          price: 149.85 + (Math.random() - 0.5) * 0.1,
          change24h: (Math.random() - 0.5) * 2,
          volume: 1100000 + Math.random() * 100000,
          high24h: 150.15,
          low24h: 149.65,
        },
      ]);

      // Simulate position updates
      setPositions([
        {
          id: "pos-1",
          symbol: "EURUSD",
          side: "long",
          size: 10000,
          entryPrice: 1.0835,
          currentPrice: 1.0845 + (Math.random() - 0.5) * 0.001,
          unrealizedPnL: (Math.random() - 0.3) * 100,
          realizedPnL: 0,
          status: "open",
        },
        {
          id: "pos-2",
          symbol: "GBPUSD",
          side: "short",
          size: 5000,
          entryPrice: 1.2665,
          currentPrice: 1.2654 + (Math.random() - 0.5) * 0.001,
          unrealizedPnL: (Math.random() - 0.3) * 80,
          realizedPnL: 0,
          status: "open",
        },
      ]);

      setIsConnected(true);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const totalPnL = positions.reduce((sum, pos) => sum + pos.unrealizedPnL + pos.realizedPnL, 0);
  const activeBots = bots?.filter((bot) => bot.isActive).length || 0;
  const aiActiveBots = bots?.filter((bot) => bot.isAiTradingActive).length || 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Trading Dashboard</h1>
            <p className="text-gray-600 mt-1">Real-time trading overview and AI insights</p>
          </div>
          <div className="flex items-center space-x-4">
            <div
              className={`flex items-center px-3 py-1 rounded-full text-sm ${
                isConnected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full mr-2 ${
                  isConnected ? "bg-green-500" : "bg-red-500"
                }`}
              ></div>
              {isConnected ? "Connected" : "Disconnected"}
            </div>
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1M">1 Minute</option>
              <option value="5M">5 Minutes</option>
              <option value="15M">15 Minutes</option>
              <option value="1H">1 Hour</option>
              <option value="4H">4 Hours</option>
              <option value="1D">1 Day</option>
            </select>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
                <p className="text-sm font-medium text-gray-600">Active Positions</p>
                <p className="text-2xl font-bold text-gray-900">{positions.length}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <div className="w-6 h-6 bg-blue-600 rounded"></div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Bots</p>
                <p className="text-2xl font-bold text-gray-900">{activeBots}</p>
              </div>
              <div className="p-3 rounded-full bg-purple-100">
                <div className="w-6 h-6 bg-purple-600 rounded"></div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">AI Trading</p>
                <p className="text-2xl font-bold text-gray-900">{aiActiveBots}</p>
              </div>
              <div className="p-3 rounded-full bg-orange-100">
                <div className="w-6 h-6 bg-orange-600 rounded"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Market Data */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Market Overview</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {marketData.map((market) => (
                  <div
                    key={market.symbol}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">{market.symbol}</p>
                      <p className="text-sm text-gray-600">Vol: {market.volume.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{market.price.toFixed(4)}</p>
                      <p
                        className={`text-sm ${market.change24h >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {market.change24h >= 0 ? "+" : ""}
                        {market.change24h.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Active Positions */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Active Positions</h2>
            </div>
            <div className="p-6">
              {positions.length > 0 ? (
                <div className="space-y-4">
                  {positions.map((position) => (
                    <div key={position.id} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-gray-900">{position.symbol}</span>
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              position.side === "long"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {position.side.toUpperCase()}
                          </span>
                        </div>
                        <span
                          className={`font-semibold ${
                            position.unrealizedPnL >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          ${position.unrealizedPnL.toFixed(2)}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                        <div>
                          <p>Size: {position.size.toLocaleString()}</p>
                        </div>
                        <div>
                          <p>Entry: {position.entryPrice.toFixed(4)}</p>
                        </div>
                        <div>
                          <p>Current: {position.currentPrice.toFixed(4)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No active positions</p>
              )}
            </div>
          </div>
        </div>

        {/* Trading Bots Overview */}
        <div className="mt-8 bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Trading Bots</h2>
          </div>
          <div className="p-6">
            {botsLoading ? (
              <p className="text-center py-8 text-gray-500">Loading bots...</p>
            ) : bots && bots.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {bots.map((bot) => (
                  <div key={bot.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900">{bot.name}</h3>
                      <div className="flex space-x-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            bot.isActive ? "bg-green-500" : "bg-gray-400"
                          }`}
                        ></div>
                        <div
                          className={`w-2 h-2 rounded-full ${
                            bot.isAiTradingActive ? "bg-blue-500" : "bg-gray-400"
                          }`}
                        ></div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{bot.tradingPairSymbol}</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">P&L:</span>
                        <span
                          className={`font-semibold ${
                            bot.metrics.totalPnL >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          ${bot.metrics.totalPnL.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Win Rate:</span>
                        <span className="font-semibold">{bot.metrics.winRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Trades:</span>
                        <span className="font-semibold">{bot.metrics.totalTrades}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-gray-500">No trading bots configured</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
