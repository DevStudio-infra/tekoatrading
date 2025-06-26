"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../shared/components/ui/card";
import { Button } from "../../shared/components/ui/button";
import {
  ArrowLeftIcon,
  DownloadIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  MinusIcon,
  RefreshCcw,
} from "lucide-react";
import { trpc } from "../../../lib/trpc";
import { toast } from "sonner";
import { Skeleton } from "../../shared/components/ui/skeleton";
import { Alert, AlertDescription } from "../../shared/components/ui/alert";

interface BotEvaluationsProps {
  botId: string;
  botName: string;
  onBack: () => void;
}

export function BotEvaluations({ botId, botName, onBack }: BotEvaluationsProps) {
  const { data: evaluations, isLoading, refetch } = trpc.evaluation.getByBot.useQuery({ botId });
  const runEvaluationMutation = trpc.evaluation.run.useMutation();

  const handleRunEvaluation = async () => {
    try {
      await runEvaluationMutation.mutateAsync({ botId });
      toast.success("Evaluation started successfully");
      // Refetch after a delay to allow evaluation to complete
      setTimeout(() => refetch(), 5000);
    } catch (error) {
      toast.error("Failed to run evaluation");
    }
  };

  const downloadChart = (evaluation: any) => {
    try {
      if (!evaluation.chartUrl) {
        throw new Error("No chart image available");
      }

      const link = document.createElement("a");
      link.href = evaluation.chartUrl;
      link.download = `bot-${botId}-evaluation-${new Date(evaluation.createdAt).toISOString().split("T")[0]}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      toast.error("Failed to download chart");
    }
  };

  const renderPrediction = (type: string, confidence: number) => {
    let icon;
    let colorClass;

    switch (type?.toLowerCase()) {
      case "buy":
        icon = <TrendingUpIcon className="h-4 w-4 mr-1" />;
        colorClass = "text-green-600";
        break;
      case "sell":
        icon = <TrendingDownIcon className="h-4 w-4 mr-1" />;
        colorClass = "text-red-600";
        break;
      default:
        icon = <MinusIcon className="h-4 w-4 mr-1" />;
        colorClass = "text-yellow-600";
    }

    return (
      <div className={`flex items-center ${colorClass}`}>
        {icon}
        <span className="font-medium">
          {(type || "HOLD").toUpperCase()} ({confidence || 0}%)
        </span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
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

        <Button onClick={handleRunEvaluation} disabled={runEvaluationMutation.isPending}>
          {runEvaluationMutation.isPending ? (
            <>
              <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Run New Evaluation
            </>
          )}
        </Button>
      </div>

      {!evaluations || evaluations.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-center text-muted-foreground mb-4">
              No evaluations available yet. Run your first evaluation to see results.
            </p>
            <Button onClick={handleRunEvaluation} disabled={runEvaluationMutation.isPending}>
              {runEvaluationMutation.isPending ? (
                <>
                  <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Run First Evaluation
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {evaluations.map((evaluation: any) => (
            <Card key={evaluation.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{new Date(evaluation.createdAt).toLocaleString()}</CardTitle>
                    <CardDescription>Confidence: {evaluation.confidence || 0}%</CardDescription>
                  </div>
                  {evaluation.chartUrl && (
                    <Button variant="ghost" size="icon" onClick={() => downloadChart(evaluation)}>
                      <DownloadIcon className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                {evaluation.chartUrl ? (
                  <div className="relative">
                    <img
                      src={evaluation.chartUrl}
                      alt="Chart Analysis"
                      className="w-full h-auto rounded-md"
                      onError={(e) => {
                        e.currentTarget.src = "/chart-placeholder.png";
                      }}
                    />
                    <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium">
                      {renderPrediction(evaluation.decision || "hold", evaluation.confidence || 0)}
                    </div>
                  </div>
                ) : (
                  <Alert>
                    <AlertDescription>
                      No chart image available for this evaluation
                    </AlertDescription>
                  </Alert>
                )}

                {evaluation.reasoning && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Analysis:</h4>
                    <p className="text-sm text-muted-foreground">{evaluation.reasoning}</p>
                  </div>
                )}

                {evaluation.chartAnalysis && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Chart Analysis:</h4>
                    <p className="text-sm text-muted-foreground">{evaluation.chartAnalysis}</p>
                  </div>
                )}

                <div className="mt-4 flex gap-2 flex-wrap">
                  {evaluation.riskScore && (
                    <div className="px-2 py-1 bg-orange-100 dark:bg-orange-900/20 rounded text-xs">
                      Risk Score: <span className="font-medium">{evaluation.riskScore}/5</span>
                    </div>
                  )}
                  {evaluation.positionSize && (
                    <div className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 rounded text-xs">
                      Position Size: <span className="font-medium">{evaluation.positionSize}%</span>
                    </div>
                  )}
                  {evaluation.stopLoss && (
                    <div className="px-2 py-1 bg-red-100 dark:bg-red-900/20 rounded text-xs">
                      Stop Loss: <span className="font-medium">${evaluation.stopLoss}</span>
                    </div>
                  )}
                  {evaluation.takeProfit && (
                    <div className="px-2 py-1 bg-green-100 dark:bg-green-900/20 rounded text-xs">
                      Take Profit: <span className="font-medium">${evaluation.takeProfit}</span>
                    </div>
                  )}
                </div>
              </CardContent>

              <CardFooter className="border-t pt-4">
                <div className="flex justify-between items-center w-full">
                  <div className="text-sm">
                    Duration: <span className="font-medium">{evaluation.duration || 0}ms</span>
                  </div>
                  <div className="text-sm">
                    Status:{" "}
                    <span
                      className={`font-medium ${evaluation.success ? "text-green-600" : "text-red-600"}`}
                    >
                      {evaluation.success ? "Success" : "Failed"}
                    </span>
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
