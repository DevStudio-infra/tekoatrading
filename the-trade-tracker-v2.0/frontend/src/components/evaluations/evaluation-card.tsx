import React, { useState } from "react";
import Image from "next/image";
import { formatDate } from "@/lib/utils";
import { Evaluation } from "./evaluation-history-container";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface EvaluationCardProps {
  evaluation: Evaluation;
}

// Helper function to get the correct chart image URL
const getChartImageUrl = (originalUrl: string): string => {
  if (!originalUrl) return "";

  // If it's already a Supabase URL, return as is
  if (originalUrl.includes("supabase.co")) {
    return originalUrl;
  }

  // If it's a file:// URL, extract filename and convert to Supabase URL
  if (originalUrl.startsWith("file://")) {
    const filename = originalUrl.split("/").pop();
    if (filename) {
      // Use the Supabase domain from the Next.js config
      return `https://fjraryjhmsjmplbpmafw.supabase.co/storage/v1/object/public/trade-charts/system/charts/${filename}`;
    }
  }

  // If it's just a filename, convert to Supabase URL
  if (originalUrl.includes(".png") || originalUrl.includes(".jpg") || originalUrl.includes(".jpeg")) {
    const filename = originalUrl.split("/").pop() || originalUrl;
    return `https://fjraryjhmsjmplbpmafw.supabase.co/storage/v1/object/public/trade-charts/system/charts/${filename}`;
  }

  // If it's a local API URL, convert to Supabase URL
  if (originalUrl.includes("localhost:5000/api/")) {
    const filename = originalUrl.split("/").pop();
    if (filename) {
      return `https://fjraryjhmsjmplbpmafw.supabase.co/storage/v1/object/public/trade-charts/system/charts/${filename}`;
    }
  }

  return originalUrl;
};

export function EvaluationCard({ evaluation }: EvaluationCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  // Since these are evaluations, not actual trades, we should show the prediction instead of P&L
  const predictionText = evaluation.prediction || "HOLD";
  const confidenceText = `${evaluation.confidence || 0}%`;

  // Determine prediction color
  const isPredictionPositive = evaluation.prediction === "BUY" || evaluation.prediction === "LONG";

  return (
    <>
      <Card className="h-full flex flex-col hover:shadow-md transition-shadow duration-200">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg">{evaluation.botName}</CardTitle>
              <div className="flex gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {evaluation.tradingPair}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {evaluation.timeframe}
                </Badge>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge
                variant={isPredictionPositive ? "default" : "secondary"}
                className={isPredictionPositive ? "bg-green-500 hover:bg-green-600" : "bg-blue-500 hover:bg-blue-600"}>
                {predictionText}
              </Badge>
              <span className="text-xs text-gray-500">{confidenceText}</span>
            </div>
          </div>
          <p className="text-sm text-gray-500">{formatDate(evaluation.timestamp)}</p>
        </CardHeader>

        <CardContent className="flex-grow">
          {/* Chart Image */}
          <div className="relative h-48 mb-4 rounded-md overflow-hidden bg-gray-100 cursor-pointer">
            {evaluation.chartImageUrl ? (
              <Image
                src={getChartImageUrl(evaluation.chartImageUrl)}
                alt="Chart"
                fill
                className="object-cover hover:scale-105 transition-transform duration-200"
                onClick={() => setShowDetails(true)}
                unoptimized={true}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">No chart available</div>
            )}
          </div>

          {/* AI Analysis - truncated */}
          <div>
            <h4 className="font-medium mb-1">AI Analysis</h4>
            <p className="text-sm line-clamp-3 text-gray-600">{evaluation.aiAnalysis}</p>
          </div>
        </CardContent>

        <CardFooter className="pt-2">
          <Button variant="outline" onClick={() => setShowDetails(true)} className="w-full">
            View Details
          </Button>
        </CardFooter>
      </Card>

      {/* Enhanced Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-[95vw] w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {evaluation.botName} - {evaluation.tradingPair} ({evaluation.timeframe})
            </DialogTitle>
            <p className="text-sm text-gray-500">{formatDate(evaluation.timestamp)}</p>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart Image - Larger */}
            <div className="space-y-4">
              <div className="relative h-96 rounded-md overflow-hidden bg-gray-100">
                {evaluation.chartImageUrl ? (
                  <Image src={getChartImageUrl(evaluation.chartImageUrl)} alt="Chart" fill className="object-contain" unoptimized={true} />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400">No chart available</div>
                )}
              </div>

              {/* Prediction and Confidence */}
              <div className="flex gap-3">
                <div className="flex-1 p-3 bg-blue-50 rounded-md">
                  <div className="text-sm text-blue-600 font-medium">Prediction</div>
                  <div className="text-lg font-bold text-blue-900">{evaluation.prediction || "HOLD"}</div>
                </div>
                <div className="flex-1 p-3 bg-purple-50 rounded-md">
                  <div className="text-sm text-purple-600 font-medium">Confidence</div>
                  <div className="text-lg font-bold text-purple-900">{evaluation.confidence || 0}%</div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {/* AI Evaluation Metrics */}
              <div>
                <h3 className="font-semibold text-lg mb-3">AI Evaluation</h3>

                {/* Signal Strength */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Signal Strength</span>
                    <span className="text-lg font-bold text-blue-600">{evaluation.signalStrength}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${evaluation.signalStrength}%` }}></div>
                  </div>
                </div>

                {/* Market Condition and Risk */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 bg-green-50 rounded-md">
                    <div className="text-sm text-green-600 font-medium">Market Condition</div>
                    <div className="text-lg font-bold text-green-900 capitalize">{evaluation.marketCondition?.toLowerCase()}</div>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-md">
                    <div className="text-sm text-orange-600 font-medium">Risk Factor</div>
                    <div className="text-lg font-bold text-orange-900">{evaluation.riskFactor}/5</div>
                  </div>
                </div>

                {/* Strategy Information */}
                <div className="p-3 bg-gray-50 rounded-md mb-4">
                  <div className="text-sm text-gray-600 font-medium">Strategy</div>
                  <div className="text-md font-semibold text-gray-900">{evaluation.strategyName}</div>
                </div>
              </div>

              {/* AI Analysis - Full */}
              <div>
                <h3 className="font-semibold text-lg mb-2">Detailed Analysis</h3>
                <div className="bg-gray-50 p-4 rounded-md text-sm leading-relaxed">{evaluation.aiAnalysis}</div>
              </div>

              {/* Trade Details */}
              {evaluation.trade && (
                <div>
                  <h3 className="font-semibold text-lg mb-3">Trade Details</h3>
                  <div className="bg-white border rounded-md p-4">
                    <dl className="grid grid-cols-2 gap-3 text-sm">
                      <dt className="text-gray-500">Direction</dt>
                      <dd>
                        <Badge variant={evaluation.trade.direction === "BUY" ? "default" : "secondary"}>{evaluation.trade.direction}</Badge>
                      </dd>

                      <dt className="text-gray-500">Instrument</dt>
                      <dd className="font-medium">{evaluation.trade.epic}</dd>

                      <dt className="text-gray-500">Size</dt>
                      <dd className="font-medium">{evaluation.trade.size}</dd>

                      <dt className="text-gray-500">Open Price</dt>
                      <dd className="font-medium">{evaluation.trade.openLevel}</dd>

                      <dt className="text-gray-500">Close Price</dt>
                      <dd className="font-medium">{evaluation.trade.closeLevel || "Open"}</dd>

                      <dt className="text-gray-500">Status</dt>
                      <dd>
                        <Badge variant={evaluation.trade.status === "CLOSED" ? "outline" : "default"}>{evaluation.trade.status}</Badge>
                      </dd>
                    </dl>
                  </div>
                </div>
              )}

              {/* Evaluation Summary */}
              <div>
                <h3 className="font-semibold text-lg mb-3">Evaluation Summary</h3>
                <div className="bg-white border rounded-md p-4">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Prediction</div>
                      <div className="text-xl font-bold text-blue-600">{evaluation.prediction || "HOLD"}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Confidence</div>
                      <div className="text-xl font-bold text-purple-600">{evaluation.confidence || 0}%</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Indicators */}
              {evaluation.indicators && evaluation.indicators.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Technical Indicators</h3>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {evaluation.indicators.map((indicator, index) => (
                      <div key={index} className="text-sm p-2 bg-gray-50 rounded">
                        <span className="font-medium">{indicator.name}: </span>
                        <span className="text-gray-600">
                          {Array.isArray(indicator.values)
                            ? typeof indicator.values.slice(-1)[0] === "number"
                              ? (indicator.values.slice(-1)[0] as unknown as number).toFixed(4)
                              : "N/A"
                            : "N/A"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
