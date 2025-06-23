"use client";

import { useState } from "react";
import { trpc } from "../../lib/trpc";

export default function Strategies() {
  const [userId] = useState("demo-user-id");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newStrategy, setNewStrategy] = useState({
    name: "",
    description: "",
    maxRisk: 0.02,
    stopLoss: 0.05,
    takeProfit: 0.1,
    indicators: ["SMA", "RSI"],
  });

  const { data: strategies, refetch } = trpc.strategies.list.useQuery({ userId });

  const createStrategy = trpc.strategies.create.useMutation({
    onSuccess: () => {
      refetch();
      setShowCreateForm(false);
      setNewStrategy({
        name: "",
        description: "",
        maxRisk: 0.02,
        stopLoss: 0.05,
        takeProfit: 0.1,
        indicators: ["SMA", "RSI"],
      });
    },
  });

  const handleCreateStrategy = () => {
    createStrategy.mutate({
      name: newStrategy.name,
      description: newStrategy.description,
      rules: {
        maxRisk: newStrategy.maxRisk,
        stopLoss: newStrategy.stopLoss,
        takeProfit: newStrategy.takeProfit,
        indicators: newStrategy.indicators,
      },
      userId,
    });
  };

  const availableIndicators = ["SMA", "RSI", "MACD", "Bollinger", "EMA", "STOCH"];

  const toggleIndicator = (indicator: string) => {
    setNewStrategy((prev) => ({
      ...prev,
      indicators: prev.indicators.includes(indicator)
        ? prev.indicators.filter((i) => i !== indicator)
        : [...prev.indicators, indicator],
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Trading Strategies</h1>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
          >
            Create New Strategy
          </button>
        </div>

        {/* Create Strategy Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
              <h2 className="text-xl font-semibold mb-4">Create New Strategy</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Strategy Name</label>
                  <input
                    type="text"
                    value={newStrategy.name}
                    onChange={(e) => setNewStrategy((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full p-2 border rounded-md"
                    placeholder="Enter strategy name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={newStrategy.description}
                    onChange={(e) =>
                      setNewStrategy((prev) => ({ ...prev, description: e.target.value }))
                    }
                    className="w-full p-2 border rounded-md h-20"
                    placeholder="Describe your strategy"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Max Risk (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newStrategy.maxRisk * 100}
                      onChange={(e) =>
                        setNewStrategy((prev) => ({
                          ...prev,
                          maxRisk: parseFloat(e.target.value) / 100,
                        }))
                      }
                      className="w-full p-2 border rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Stop Loss (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newStrategy.stopLoss * 100}
                      onChange={(e) =>
                        setNewStrategy((prev) => ({
                          ...prev,
                          stopLoss: parseFloat(e.target.value) / 100,
                        }))
                      }
                      className="w-full p-2 border rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Take Profit (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newStrategy.takeProfit * 100}
                      onChange={(e) =>
                        setNewStrategy((prev) => ({
                          ...prev,
                          takeProfit: parseFloat(e.target.value) / 100,
                        }))
                      }
                      className="w-full p-2 border rounded-md"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Technical Indicators</label>
                  <div className="flex flex-wrap gap-2">
                    {availableIndicators.map((indicator) => (
                      <button
                        key={indicator}
                        onClick={() => toggleIndicator(indicator)}
                        className={`px-3 py-1 rounded-full text-sm ${
                          newStrategy.indicators.includes(indicator)
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        }`}
                      >
                        {indicator}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-6">
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateStrategy}
                  disabled={createStrategy.isLoading || !newStrategy.name}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {createStrategy.isLoading ? "Creating..." : "Create Strategy"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Strategies Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {strategies?.map((strategy: any) => (
            <div key={strategy.id} className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-2">{strategy.name}</h3>
              <p className="text-gray-600 text-sm mb-4">{strategy.description}</p>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Max Risk:</span>
                  <span className="font-medium">{(strategy.rules.maxRisk * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Stop Loss:</span>
                  <span className="font-medium">{(strategy.rules.stopLoss * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Take Profit:</span>
                  <span className="font-medium">
                    {(strategy.rules.takeProfit * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">Indicators:</p>
                <div className="flex flex-wrap gap-1">
                  {strategy.rules.indicators?.map((indicator: string) => (
                    <span
                      key={indicator}
                      className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                    >
                      {indicator}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-gray-500">Used by {strategy.bots?.length || 0} bot(s)</p>
              </div>
            </div>
          ))}
        </div>

        {strategies?.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No strategies created yet</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
            >
              Create Your First Strategy
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
