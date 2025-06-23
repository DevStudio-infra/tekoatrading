"use client";

import React, { useState, useEffect } from "react";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ArrowLeftIcon, DownloadIcon, TrendingUpIcon, TrendingDownIcon, MinusIcon } from "lucide-react";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { toast } from "sonner";

interface ChartData {
  image: string; // Base64 encoded image
  timestamp: string;
  score: number;
  prediction: "buy" | "sell" | "hold";
  confidence: number;
  insights: string[];
}

interface EvaluationMetrics {
  insights?: string[];
  riskFactor?: number;
  signalStrength?: number;
  isFallbackChart?: boolean;
  marketCondition?: string;
}

interface Evaluation {
  id: string;
  botId: string;
  timestamp?: string;
  createdAt?: string;
  chartData?: ChartData;
  chartUrl?: string; // Direct URL to chart image
  prediction?: "buy" | "sell" | "hold";
  confidence?: number;
  profitLoss?: number;
  winRate?: number;
  metrics?: EvaluationMetrics;
  parameters?: Record<string, unknown>;
}

interface BotEvaluationsProps {
  botId: string;
  botName: string;
  onBack: () => void;
}

// Helper function to render prediction with icon
function renderPrediction(type: string, confidence: number) {
  let icon;
  let colorClass;

  switch (type.toLowerCase()) {
    case "buy":
      icon = <TrendingUpIcon className="h-4 w-4 mr-1" />;
      colorClass = "text-green-600";
      break;
    case "sell":
      icon = <TrendingDownIcon className="h-4 w-4 mr-1" />;
      colorClass = "text-red-600";
      break;
    default: // hold
      icon = <MinusIcon className="h-4 w-4 mr-1" />;
      colorClass = "text-yellow-600";
  }

  return (
    <div className={`flex items-center ${colorClass}`}>
      {icon}
      <span className="font-medium">
        {type.toUpperCase()} ({confidence}%)
      </span>
    </div>
  );
}

export function BotEvaluations({ botId, botName, onBack }: BotEvaluationsProps) {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [runningNew, setRunningNew] = useState(false);

  useEffect(() => {
    if (botId) {
      console.log(`[BotEvaluations] Initializing with botId: ${botId}`);
      fetchEvaluations();

      // Set up polling for new evaluations every 30 seconds
      const pollingInterval = setInterval(() => {
        console.log("[BotEvaluations] Polling for new evaluations...");
        fetchEvaluations(false); // Don't show loading state on polling
      }, 30000); // 30 seconds

      // Clean up interval on unmount
      return () => clearInterval(pollingInterval);
    }
  }, [botId]);

  async function fetchEvaluations(showLoading = true) {
    if (showLoading) {
      setIsLoading(true);
    }
    try {
      // Import the service function to get evaluations
      const { getBotEvaluations } = await import("./services/bot-service");
      console.log(`[BotEvaluations] Fetching evaluations for bot ${botId}`);

      // Use the service function which already handles absolute URLs
      const data = await getBotEvaluations(botId);
      console.log("[BotEvaluations] Received data:", data);

      // Handle the response data structure
      const newEvaluations = data.evaluations || [];
      console.log("[BotEvaluations] Parsed evaluations:", newEvaluations);

      // Check if new evaluations arrived
      if (newEvaluations.length > evaluations.length && evaluations.length > 0) {
        toast.success("New evaluation received!");
      }

      setEvaluations(newEvaluations);
    } catch (error) {
      console.error("Error fetching evaluations:", error);
      if (showLoading) {
        // Only show error toast on initial load, not during polling
        toast.error("Failed to load evaluations");
      }
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }

  async function runNewEvaluation() {
    setRunningNew(true);
    try {
      // Use absolute URL to avoid parsing issues
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
      console.log(`[BotEvaluations] Running new evaluation for bot ${botId}`);

      const response = await fetchWithAuth(`${baseUrl}/api/bots/${botId}/evaluate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to run evaluation: ${response.status} ${response.statusText}`);
      }

      toast.success("Evaluation started. This may take a few minutes.");
      // Poll for updates
      setTimeout(fetchEvaluations, 5000);
    } catch (error) {
      console.error("Error running evaluation:", error);
      toast.error("Failed to run evaluation");
    } finally {
      setRunningNew(false);
    }
  }

  function downloadChart(evaluation: Evaluation) {
    try {
      // Create a link to download the image
      const link = document.createElement("a");
      // Use the appropriate image URL based on the evaluation structure
      const imageUrl = evaluation.chartUrl || evaluation.chartData?.image;
      if (!imageUrl) {
        throw new Error("No chart image available");
      }

      link.href = imageUrl;
      const timestamp = evaluation.createdAt || evaluation.timestamp || new Date();
      link.download = `bot-${botId}-evaluation-${new Date(timestamp).toISOString().split("T")[0]}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading chart:", error);
      toast.error("Failed to download chart");
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Spinner size="lg" />
        <p className="mt-4 text-sm text-gray-500">Loading evaluations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" onClick={onBack}>
            <ArrowLeftIcon className="h-4 w-4" />
          </Button>
          <h2 className="text-2xl font-bold">{botName} Evaluations</h2>
        </div>

        <Button onClick={runNewEvaluation} disabled={runningNew}>
          {runningNew ? <Spinner className="mr-2 h-4 w-4" /> : null}
          Run New Evaluation
        </Button>
      </div>

      {evaluations.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400 mb-4">No evaluations available yet.</p>
          <Button onClick={runNewEvaluation} disabled={runningNew}>
            {runningNew ? <Spinner className="mr-2 h-4 w-4" /> : null}
            Run First Evaluation
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {evaluations.map((evaluation) => (
            <Card key={evaluation.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{new Date(evaluation.createdAt || evaluation.timestamp || Date.now()).toLocaleString()}</CardTitle>
                    <CardDescription>Confidence: {evaluation.confidence || evaluation.chartData?.confidence || 0}%</CardDescription>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => downloadChart(evaluation)}>
                    <DownloadIcon className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent>
                <div className="relative">
                  <img src={evaluation.chartUrl || evaluation.chartData?.image} alt="Chart Analysis" className="w-full h-auto rounded-md" />
                  <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium">
                    {renderPrediction(evaluation.prediction || evaluation.chartData?.prediction || "hold", evaluation.confidence || evaluation.chartData?.confidence || 0)}
                  </div>
                </div>

                {/* Signal Strength Display */}
                {evaluation.metrics?.signalStrength && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">Signal Strength</h4>
                      <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{evaluation.metrics.signalStrength}%</span>
                    </div>
                    <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                      <div className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300" style={{ width: `${evaluation.metrics.signalStrength}%` }}></div>
                    </div>
                  </div>
                )}

                {/* AI Insights from metrics or chartData */}
                {((evaluation.metrics?.insights && evaluation.metrics.insights.length > 0) || (evaluation.chartData?.insights && evaluation.chartData.insights.length > 0)) && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">AI Insights:</h4>
                    <ul className="text-sm space-y-1">
                      {(evaluation.metrics?.insights || evaluation.chartData?.insights || []).map((insight, index) => (
                        <li key={index} className="flex items-start">
                          <span className="mr-2 text-green-500">•</span>
                          <span>{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Market Condition and Risk Factor */}
                {(evaluation.metrics?.marketCondition || evaluation.metrics?.riskFactor) && (
                  <div className="mt-4 flex gap-2">
                    {evaluation.metrics?.marketCondition && (
                      <div className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                        Market: <span className="font-medium capitalize">{evaluation.metrics.marketCondition}</span>
                      </div>
                    )}
                    {evaluation.metrics?.riskFactor && (
                      <div className="px-2 py-1 bg-orange-100 dark:bg-orange-900/20 rounded text-xs">
                        Risk: <span className="font-medium">{evaluation.metrics.riskFactor}/5</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>

              <CardFooter className="border-t pt-4 flex justify-between items-center">
                <div className="text-sm">
                  Score: <span className="font-medium">{evaluation.chartData?.score || 0}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Profit/Loss</div>
                    <div className={`text-lg font-bold ${(evaluation.profitLoss || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {(evaluation.profitLoss || 0) >= 0 ? "+" : ""}
                      {(evaluation.profitLoss || 0).toFixed(2)}%
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Win Rate</div>
                    <div className="text-lg font-bold">{(evaluation.winRate || 0).toFixed(0)}%</div>
                  </div>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default BotEvaluations;
