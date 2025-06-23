"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, AlertTriangle, Target, Shield, BarChart3, PieChart, Zap } from "lucide-react";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { toast } from "sonner";

interface MultiFactor {
  aiSignal: {
    score: number;
    confidence: number;
    recommendation: string;
  };
  marketRegime: {
    regime: "TRENDING" | "RANGING" | "VOLATILE" | "CALM";
    score: number;
    description: string;
  };
  portfolioRisk: {
    score: number;
    level: "LOW" | "MEDIUM" | "HIGH";
    factors: string[];
  };
  correlationRisk: {
    score: number;
    maxCorrelation: number;
    riskPairs: string[];
  };
  timing: {
    score: number;
    factors: string[];
  };
  overallScore: number;
  recommendation: "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL";
}

interface CorrelationMatrix {
  symbols: string[];
  matrix: number[][];
  riskPairs: Array<{
    symbol1: string;
    symbol2: string;
    correlation: number;
    risk: "LOW" | "MEDIUM" | "HIGH";
  }>;
}

interface RiskAssessment {
  portfolioRisk: {
    level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    score: number;
    factors: string[];
  };
  positionRisk: {
    totalExposure: number;
    maxSinglePosition: number;
    diversificationScore: number;
  };
  marketRisk: {
    volatility: number;
    trend: "BULLISH" | "BEARISH" | "SIDEWAYS";
    uncertainty: number;
  };
  recommendations: string[];
}

interface AITradingAnalyticsProps {
  botId: string;
}

export function AITradingAnalytics({ botId }: AITradingAnalyticsProps) {
  const [multiFactor, setMultiFactor] = useState<MultiFactor | null>(null);
  const [correlations, setCorrelations] = useState<CorrelationMatrix | null>(null);
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchAnalyticsData();

    // Refresh data every 30 seconds
    const interval = setInterval(fetchAnalyticsData, 30000);
    return () => clearInterval(interval);
  }, [botId]);

  const fetchAnalyticsData = async () => {
    try {
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

      // Fetch multi-factor analysis
      const multiFactorResponse = await fetchWithAuth(`${baseUrl}/api/bots/${botId}/enhanced-decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: "EURUSD", // Default symbol for analysis
          chartImageBase64: "", // Would be provided in real implementation
          strategyDescription: "Default strategy",
          timeframe: "1H",
        }),
      });

      if (multiFactorResponse.ok) {
        const data = await multiFactorResponse.json();
        setMultiFactor(data.decision);
      }

      // Fetch correlation matrix
      const correlationResponse = await fetchWithAuth(`${baseUrl}/api/bots/${botId}/portfolio-correlations`);
      if (correlationResponse.ok) {
        const data = await correlationResponse.json();
        setCorrelations(data.correlations);
      }

      // Fetch risk assessment
      const riskResponse = await fetchWithAuth(`${baseUrl}/api/bots/${botId}/assess-risk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (riskResponse.ok) {
        const data = await riskResponse.json();
        setRiskAssessment(data.assessment);
      }
    } catch (error) {
      console.error("Error fetching analytics data:", error);
      toast.error("Failed to load analytics data");
    } finally {
      setIsLoading(false);
    }
  };

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case "STRONG_BUY":
        return "bg-green-600";
      case "BUY":
        return "bg-green-500";
      case "HOLD":
        return "bg-yellow-500";
      case "SELL":
        return "bg-red-500";
      case "STRONG_SELL":
        return "bg-red-600";
      default:
        return "bg-gray-500";
    }
  };

  const getRegimeColor = (regime: string) => {
    switch (regime) {
      case "TRENDING":
        return "bg-blue-500";
      case "RANGING":
        return "bg-purple-500";
      case "VOLATILE":
        return "bg-orange-500";
      case "CALM":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "LOW":
        return "bg-green-500";
      case "MEDIUM":
        return "bg-yellow-500";
      case "HIGH":
        return "bg-orange-500";
      case "CRITICAL":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading analytics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">AI Trading Analytics</h2>
        <Button onClick={fetchAnalyticsData} variant="outline" size="sm">
          <Activity className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="multifactor">Multi-Factor</TabsTrigger>
          <TabsTrigger value="correlations">Correlations</TabsTrigger>
          <TabsTrigger value="risk">Risk Assessment</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Overall Score */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Overall Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{multiFactor?.overallScore || 0}/100</div>
                <Progress value={multiFactor?.overallScore || 0} className="mt-2" />
                {multiFactor && <Badge className={`mt-2 ${getRecommendationColor(multiFactor.recommendation)}`}>{multiFactor.recommendation.replace("_", " ")}</Badge>}
              </CardContent>
            </Card>

            {/* Market Regime */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Market Regime</CardTitle>
              </CardHeader>
              <CardContent>
                {multiFactor?.marketRegime && (
                  <>
                    <Badge className={`${getRegimeColor(multiFactor.marketRegime.regime)}`}>{multiFactor.marketRegime.regime}</Badge>
                    <div className="text-sm text-gray-600 mt-2">{multiFactor.marketRegime.description}</div>
                    <Progress value={multiFactor.marketRegime.score} className="mt-2" />
                  </>
                )}
              </CardContent>
            </Card>

            {/* Risk Level */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Portfolio Risk</CardTitle>
              </CardHeader>
              <CardContent>
                {riskAssessment?.portfolioRisk && (
                  <>
                    <Badge className={`${getRiskColor(riskAssessment.portfolioRisk.level)}`}>{riskAssessment.portfolioRisk.level}</Badge>
                    <div className="text-2xl font-bold mt-2">{riskAssessment.portfolioRisk.score}/100</div>
                    <Progress value={riskAssessment.portfolioRisk.score} className="mt-2" />
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Insights */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">AI Signals</h4>
                  {multiFactor?.aiSignal && (
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>Confidence:</span>
                        <span>{multiFactor.aiSignal.confidence}%</span>
                      </div>
                      <div className="text-sm text-gray-600">{multiFactor.aiSignal.recommendation}</div>
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="font-medium mb-2">Risk Factors</h4>
                  {riskAssessment?.portfolioRisk.factors && (
                    <ul className="text-sm space-y-1">
                      {riskAssessment.portfolioRisk.factors.slice(0, 3).map((factor, index) => (
                        <li key={index} className="flex items-center">
                          <AlertTriangle className="h-3 w-3 mr-1 text-yellow-500" />
                          {factor}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="multifactor" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Multi-Factor Analysis</CardTitle>
              <CardDescription>Comprehensive analysis combining AI signals, market conditions, and risk factors</CardDescription>
            </CardHeader>
            <CardContent>
              {multiFactor && (
                <div className="space-y-6">
                  {/* AI Signal */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium flex items-center">
                        <Zap className="h-4 w-4 mr-2" />
                        AI Signal (40% weight)
                      </h4>
                      <span className="font-bold">{multiFactor.aiSignal.score}/100</span>
                    </div>
                    <Progress value={multiFactor.aiSignal.score} className="mb-2" />
                    <p className="text-sm text-gray-600">{multiFactor.aiSignal.recommendation}</p>
                  </div>

                  {/* Market Regime */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium flex items-center">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Market Regime (25% weight)
                      </h4>
                      <span className="font-bold">{multiFactor.marketRegime.score}/100</span>
                    </div>
                    <Progress value={multiFactor.marketRegime.score} className="mb-2" />
                    <div className="flex items-center gap-2">
                      <Badge className={`${getRegimeColor(multiFactor.marketRegime.regime)}`}>{multiFactor.marketRegime.regime}</Badge>
                      <span className="text-sm text-gray-600">{multiFactor.marketRegime.description}</span>
                    </div>
                  </div>

                  {/* Portfolio Risk */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium flex items-center">
                        <Shield className="h-4 w-4 mr-2" />
                        Portfolio Risk (15% weight)
                      </h4>
                      <span className="font-bold">{multiFactor.portfolioRisk.score}/100</span>
                    </div>
                    <Progress value={multiFactor.portfolioRisk.score} className="mb-2" />
                    <div className="flex items-center gap-2">
                      <Badge className={`${getRiskColor(multiFactor.portfolioRisk.level)}`}>{multiFactor.portfolioRisk.level}</Badge>
                      <span className="text-sm text-gray-600">{multiFactor.portfolioRisk.factors.length} risk factors identified</span>
                    </div>
                  </div>

                  {/* Correlation Risk */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium flex items-center">
                        <PieChart className="h-4 w-4 mr-2" />
                        Correlation Risk (10% weight)
                      </h4>
                      <span className="font-bold">{multiFactor.correlationRisk.score}/100</span>
                    </div>
                    <Progress value={multiFactor.correlationRisk.score} className="mb-2" />
                    <p className="text-sm text-gray-600">Max correlation: {(multiFactor.correlationRisk.maxCorrelation * 100).toFixed(1)}%</p>
                  </div>

                  {/* Timing */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium flex items-center">
                        <Target className="h-4 w-4 mr-2" />
                        Timing (10% weight)
                      </h4>
                      <span className="font-bold">{multiFactor.timing.score}/100</span>
                    </div>
                    <Progress value={multiFactor.timing.score} className="mb-2" />
                    <div className="text-sm text-gray-600">{multiFactor.timing.factors.join(", ")}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="correlations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Portfolio Correlations</CardTitle>
              <CardDescription>Correlation matrix showing relationships between positions</CardDescription>
            </CardHeader>
            <CardContent>
              {correlations ? (
                <div className="space-y-4">
                  {/* Correlation Matrix */}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <th className="border p-2"></th>
                          {correlations.symbols.map((symbol) => (
                            <th key={symbol} className="border p-2 text-sm">
                              {symbol}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {correlations.symbols.map((symbol1, i) => (
                          <tr key={symbol1}>
                            <td className="border p-2 font-medium text-sm">{symbol1}</td>
                            {correlations.symbols.map((symbol2, j) => {
                              const correlation = correlations.matrix[i][j];
                              const intensity = Math.abs(correlation);
                              const color = correlation > 0 ? "bg-red-" : "bg-blue-";
                              const shade = intensity > 0.7 ? "500" : intensity > 0.4 ? "300" : "100";

                              return (
                                <td key={symbol2} className={`border p-2 text-center text-xs ${color}${shade}`}>
                                  {correlation.toFixed(2)}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* High Risk Pairs */}
                  <div>
                    <h4 className="font-medium mb-2">High Risk Correlations</h4>
                    <div className="space-y-2">
                      {correlations.riskPairs.map((pair, index) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded">
                          <span className="text-sm">
                            {pair.symbol1} - {pair.symbol2}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{(pair.correlation * 100).toFixed(1)}%</span>
                            <Badge className={`${getRiskColor(pair.risk)}`}>{pair.risk}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">No correlation data available</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Risk Assessment Dashboard</CardTitle>
              <CardDescription>Comprehensive risk analysis and recommendations</CardDescription>
            </CardHeader>
            <CardContent>
              {riskAssessment && (
                <div className="space-y-6">
                  {/* Risk Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-2">Portfolio Risk</h4>
                      <Badge className={`${getRiskColor(riskAssessment.portfolioRisk.level)}`}>{riskAssessment.portfolioRisk.level}</Badge>
                      <div className="text-2xl font-bold mt-2">{riskAssessment.portfolioRisk.score}/100</div>
                    </div>

                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-2">Total Exposure</h4>
                      <div className="text-2xl font-bold">{riskAssessment.positionRisk.totalExposure.toFixed(1)}%</div>
                      <Progress value={riskAssessment.positionRisk.totalExposure} className="mt-2" />
                    </div>

                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-2">Diversification</h4>
                      <div className="text-2xl font-bold">{riskAssessment.positionRisk.diversificationScore}/100</div>
                      <Progress value={riskAssessment.positionRisk.diversificationScore} className="mt-2" />
                    </div>
                  </div>

                  {/* Market Risk */}
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-4">Market Risk Factors</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <span className="text-sm text-gray-600">Volatility</span>
                        <div className="text-lg font-bold">{(riskAssessment.marketRisk.volatility * 100).toFixed(1)}%</div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Trend</span>
                        <Badge
                          className={`mt-1 ${
                            riskAssessment.marketRisk.trend === "BULLISH" ? "bg-green-500" : riskAssessment.marketRisk.trend === "BEARISH" ? "bg-red-500" : "bg-yellow-500"
                          }`}>
                          {riskAssessment.marketRisk.trend}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Uncertainty</span>
                        <div className="text-lg font-bold">{(riskAssessment.marketRisk.uncertainty * 100).toFixed(1)}%</div>
                      </div>
                    </div>
                  </div>

                  {/* Risk Factors */}
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">Risk Factors</h4>
                    <ul className="space-y-2">
                      {riskAssessment.portfolioRisk.factors.map((factor, index) => (
                        <li key={index} className="flex items-center text-sm">
                          <AlertTriangle className="h-4 w-4 mr-2 text-yellow-500" />
                          {factor}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Recommendations */}
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">Recommendations</h4>
                    <ul className="space-y-2">
                      {riskAssessment.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-center text-sm">
                          <Target className="h-4 w-4 mr-2 text-blue-500" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AITradingAnalytics;
