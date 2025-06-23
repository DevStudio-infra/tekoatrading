"use client";

import { useState } from "react";
import { trpc } from "../../lib/trpc";

// Bot interface that matches our backend schema
interface Bot {
  id: string;
  name: string;
  strategy: string;
  status?: string;
  profit?: number;
  isActive: boolean;
  createdAt: string;
}

export default function BotsPage() {
  // tRPC queries and mutations
  const { data: bots, isLoading, error, refetch } = trpc.bots.getAll.useQuery();
  const createBotMutation = trpc.bots.create.useMutation({
    onSuccess: () => {
      refetch();
      setShowCreateForm(false);
      setNewBot({ name: "", strategy: "scalping", symbol: "EURUSD", riskPercentage: 2 });
    },
  });
  const updateBotMutation = trpc.bots.update.useMutation({
    onSuccess: () => refetch(),
  });
  const deleteBotMutation = trpc.bots.delete.useMutation({
    onSuccess: () => refetch(),
  });

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newBot, setNewBot] = useState({
    name: "",
    strategy: "scalping",
    symbol: "EURUSD",
    riskPercentage: 2,
  });

  const handleCreateBot = () => {
    if (!newBot.name.trim()) return;
    createBotMutation.mutate({
      name: newBot.name,
      strategy: newBot.strategy,
      symbol: newBot.symbol,
      riskPercentage: newBot.riskPercentage,
    });
  };

  const toggleBotStatus = (botId: string) => {
    const bot = bots?.find((b) => b.id === botId);
    if (bot) {
      updateBotMutation.mutate({
        id: botId,
        isActive: !bot.isActive,
      });
    }
  };

  const handleDeleteBot = (botId: string) => {
    if (confirm("Are you sure you want to delete this bot?")) {
      deleteBotMutation.mutate({ id: botId });
    }
  };

  // Handle loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading bots...</p>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️ Error loading bots</div>
          <p className="text-gray-600">Please check if the backend server is running</p>
          <button
            onClick={() => refetch()}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Trading Bots</h1>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Create New Bot
          </button>
        </div>

        {/* Create Bot Form */}
        {showCreateForm && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Create New Trading Bot</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Bot Name</label>
                <input
                  type="text"
                  value={newBot.name}
                  onChange={(e) => setNewBot((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter bot name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Strategy</label>
                <select
                  value={newBot.strategy}
                  onChange={(e) => setNewBot((prev) => ({ ...prev, strategy: e.target.value }))}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="scalping">Scalping</option>
                  <option value="swing">Swing Trading</option>
                  <option value="trend">Trend Following</option>
                  <option value="mean_reversion">Mean Reversion</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Symbol</label>
                <input
                  type="text"
                  value={newBot.symbol}
                  onChange={(e) => setNewBot((prev) => ({ ...prev, symbol: e.target.value }))}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="EURUSD"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Risk Percentage</label>
                <input
                  type="number"
                  value={newBot.riskPercentage}
                  onChange={(e) =>
                    setNewBot((prev) => ({ ...prev, riskPercentage: Number(e.target.value) }))
                  }
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="0.1"
                  max="10"
                  step="0.1"
                />
              </div>
            </div>
            <div className="flex gap-4 mt-6">
              <button
                onClick={handleCreateBot}
                disabled={createBotMutation.isLoading}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createBotMutation.isLoading ? "Creating..." : "Create Bot"}
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Bots List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bots && bots.length > 0 ? (
            bots.map((bot) => (
              <div
                key={bot.id}
                className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold">{bot.name}</h3>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      bot.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}
                  >
                    {bot.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <p className="text-sm text-gray-600">
                    Strategy: <span className="font-medium">{bot.strategy}</span>
                  </p>
                  <p className="text-sm text-gray-600">
                    Created:{" "}
                    <span className="font-medium">
                      {new Date(bot.createdAt).toLocaleDateString()}
                    </span>
                  </p>
                  {bot.profit !== undefined && (
                    <p
                      className={`text-sm font-medium ${
                        bot.profit >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      P&L: ${bot.profit.toFixed(2)}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => toggleBotStatus(bot.id)}
                    disabled={updateBotMutation.isLoading}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                      bot.isActive
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : "bg-green-600 text-white hover:bg-green-700"
                    }`}
                  >
                    {updateBotMutation.isLoading ? "..." : bot.isActive ? "Pause" : "Start"}
                  </button>
                  <button
                    onClick={() => handleDeleteBot(bot.id)}
                    disabled={deleteBotMutation.isLoading}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {deleteBotMutation.isLoading ? "..." : "Delete"}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">🤖</div>
              <p className="text-gray-500 mb-4">No trading bots created yet.</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Create Your First Bot
              </button>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        {bots && bots.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Bot Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{bots.length}</p>
                <p className="text-sm text-gray-600">Total Bots</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {bots.filter((bot) => bot.isActive).length}
                </p>
                <p className="text-sm text-gray-600">Active Bots</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-600">
                  {new Set(bots.map((bot) => bot.strategy)).size}
                </p>
                <p className="text-sm text-gray-600">Strategies</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">
                  ${bots.reduce((sum, bot) => sum + (bot.profit || 0), 0).toFixed(2)}
                </p>
                <p className="text-sm text-gray-600">Total P&L</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
