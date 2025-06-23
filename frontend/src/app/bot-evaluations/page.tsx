"use client";

import { useState } from "react";

interface BotEvaluation {
  id: string;
  botId: string;
  botName: string;
  evaluationDate: string;
  score: number;
  performance: {
    winRate: number;
    totalTrades: number;
    profitLoss: number;
    averageReturn: number;
  };
  metrics: {
    sharpeRatio: number;
    maxDrawdown: number;
    volatility: number;
  };
  status: "excellent" | "good" | "average" | "poor";
}

export default function BotEvaluationsPage() {
  // Mock evaluations data
  const [evaluations] = useState<BotEvaluation[]>([
    {
      id: "1",
      botId: "bot-1",
      botName: "Scalping Bot Alpha",
      evaluationDate: new Date().toISOString(),
      score: 8.5,
      performance: {
        winRate: 78.5,
        totalTrades: 45,
        profitLoss: 1250.5,
        averageReturn: 2.8,
      },
      metrics: {
        sharpeRatio: 1.8,
        maxDrawdown: 12.5,
        volatility: 15.2,
      },
      status: "excellent",
    },
    {
      id: "2",
      botId: "bot-2",
      botName: "Swing Trading Bot",
      evaluationDate: new Date().toISOString(),
      score: 6.2,
      performance: {
        winRate: 42.0,
        totalTrades: 12,
        profitLoss: -125.25,
        averageReturn: -1.2,
      },
      metrics: {
        sharpeRatio: 0.8,
        maxDrawdown: 25.0,
        volatility: 22.1,
      },
      status: "average",
    },
    {
      id: "3",
      botId: "bot-3",
      botName: "Trend Following Bot",
      evaluationDate: new Date().toISOString(),
      score: 9.1,
      performance: {
        winRate: 85.7,
        totalTrades: 28,
        profitLoss: 2750.75,
        averageReturn: 4.2,
      },
      metrics: {
        sharpeRatio: 2.1,
        maxDrawdown: 8.5,
        volatility: 12.8,
      },
      status: "excellent",
    },
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "excellent":
        return "bg-green-100 text-green-800";
      case "good":
        return "bg-blue-100 text-blue-800";
      case "average":
        return "bg-yellow-100 text-yellow-800";
      case "poor":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Bot Evaluations</h1>
          <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
            Run New Evaluation
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {evaluations.map((evaluation) => (
            <div key={evaluation.id} className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{evaluation.botName}</h3>
                  <p className="text-sm text-gray-600">
                    {new Date(evaluation.evaluationDate).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                    evaluation.status,
                  )}`}
                >
                  {evaluation.status}
                </span>
              </div>

              {/* Overall Score */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Overall Score</span>
                  <span className="text-lg font-bold text-gray-900">{evaluation.score}/10</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${(evaluation.score / 10) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Performance</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Win Rate</span>
                      <p className="font-semibold">{evaluation.performance.winRate}%</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Total Trades</span>
                      <p className="font-semibold">{evaluation.performance.totalTrades}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">P&L</span>
                      <p
                        className={`font-semibold ${
                          evaluation.performance.profitLoss >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        ${evaluation.performance.profitLoss.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Avg Return</span>
                      <p
                        className={`font-semibold ${
                          evaluation.performance.averageReturn >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {evaluation.performance.averageReturn}%
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Risk Metrics</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Sharpe Ratio</span>
                      <p className="font-semibold">{evaluation.metrics.sharpeRatio}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Max Drawdown</span>
                      <p className="font-semibold text-red-600">
                        {evaluation.metrics.maxDrawdown}%
                      </p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-600">Volatility</span>
                      <p className="font-semibold">{evaluation.metrics.volatility}%</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200">
                <button className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition-colors">
                  View Detailed Report
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
