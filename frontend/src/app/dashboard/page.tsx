"use client";

import { useState } from "react";
import { trpc } from "../../lib/trpc";

export default function Dashboard() {
  const [symbol, setSymbol] = useState("AAPL");
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const analyzeTrade = trpc.ai.analyzeTrade.useMutation({
    onSuccess: (data) => {
      setAnalysisResult(data);
      setLoading(false);
    },
    onError: (error) => {
      console.error("Analysis failed:", error);
      setLoading(false);
    },
  });

  const handleAnalyze = () => {
    setLoading(true);
    analyzeTrade.mutate({
      symbol,
      price: 150.25,
      volume: 1000000,
      high24h: 152.3,
      low24h: 148.5,
      change24h: 1.2,
      portfolioBalance: 10000,
      currentPositions: 2,
      proposedTradeSize: 1000,
      marketVolatility: 15,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Trading Dashboard</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Analysis Panel */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">AI Trading Analysis</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Symbol</label>
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  className="w-full p-2 border rounded-md"
                  placeholder="Enter symbol (e.g., AAPL)"
                />
              </div>

              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Analyzing..." : "Analyze Trade"}
              </button>
            </div>
          </div>

          {/* Results Panel */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Analysis Results</h2>

            {analysisResult ? (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-md">
                  <h3 className="font-semibold mb-2">Trading Decision</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Action:</span>
                      <span
                        className={`ml-2 font-semibold ${
                          analysisResult.action === "buy"
                            ? "text-green-600"
                            : analysisResult.action === "sell"
                              ? "text-red-600"
                              : "text-yellow-600"
                        }`}
                      >
                        {analysisResult.action.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Quantity:</span>
                      <span className="ml-2 font-semibold">
                        ${analysisResult.quantity.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Confidence:</span>
                      <span className="ml-2 font-semibold">
                        {(analysisResult.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                {analysisResult.technicalAnalysis && (
                  <div className="p-4 bg-blue-50 rounded-md">
                    <h3 className="font-semibold mb-2">Technical Analysis</h3>
                    <div className="text-sm space-y-1">
                      <div>
                        Trend:{" "}
                        <span className="font-semibold">
                          {analysisResult.technicalAnalysis.trend}
                        </span>
                      </div>
                      <div>
                        Strength:{" "}
                        <span className="font-semibold">
                          {analysisResult.technicalAnalysis.strength}/10
                        </span>
                      </div>
                      <div>
                        Recommendation:{" "}
                        <span className="font-semibold">
                          {analysisResult.technicalAnalysis.recommendation}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {analysisResult.riskAssessment && (
                  <div className="p-4 bg-red-50 rounded-md">
                    <h3 className="font-semibold mb-2">Risk Assessment</h3>
                    <div className="text-sm space-y-1">
                      <div>
                        Risk Level:{" "}
                        <span className="font-semibold">
                          {analysisResult.riskAssessment.riskLevel}
                        </span>
                      </div>
                      <div>
                        Max Position:{" "}
                        <span className="font-semibold">
                          ${analysisResult.riskAssessment.maxPositionSize.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        Stop Loss:{" "}
                        <span className="font-semibold">
                          {analysisResult.riskAssessment.stopLoss}%
                        </span>
                      </div>
                      <div>
                        Take Profit:{" "}
                        <span className="font-semibold">
                          {analysisResult.riskAssessment.takeProfit}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-4 bg-gray-50 rounded-md">
                  <h3 className="font-semibold mb-2">Reasoning</h3>
                  <ul className="text-sm space-y-1">
                    {analysisResult.reasoning.map((reason: string, index: number) => (
                      <li key={index} className="flex items-start">
                        <span className="text-gray-400 mr-2">•</span>
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Run an analysis to see results</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
