"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Brain, Shield, TrendingUp, Clock, AlertTriangle, Save, RotateCcw } from "lucide-react";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { toast } from "sonner";

interface AIModelConfig {
  model: string;
  confidence_threshold: number;
  risk_tolerance: number;
  learning_rate: number;
  lookback_period: number;
  prediction_horizon: number;
  ensemble_size: number;
  feature_selection: string[];
  market_regime_detection: boolean;
  sentiment_analysis: boolean;
  technical_indicators: string[];
}

interface RiskParameters {
  max_position_size: number;
  max_daily_loss: number;
  max_drawdown: number;
  correlation_limit: number;
  volatility_threshold: number;
  stop_loss_percentage: number;
  take_profit_percentage: number;
  position_sizing_method: string;
  risk_per_trade: number;
  max_concurrent_trades: number;
}

interface TradingConstraints {
  allowed_symbols: string[];
  forbidden_symbols: string[];
  trading_hours: {
    start: string;
    end: string;
    timezone: string;
  };
  max_trades_per_day: number;
  min_trade_interval: number;
  blackout_periods: Array<{
    start: string;
    end: string;
    reason: string;
  }>;
  news_filter: boolean;
  economic_calendar_filter: boolean;
}

interface PerformanceOptimization {
  rebalancing_frequency: string;
  performance_threshold: number;
  adaptation_speed: number;
  model_retrain_frequency: number;
  feature_importance_threshold: number;
  outlier_detection: boolean;
  regime_adaptation: boolean;
  dynamic_position_sizing: boolean;
}

interface AdvancedSettingsProps {
  botId: string;
}

export function AdvancedSettings({ botId }: AdvancedSettingsProps) {
  const [aiConfig, setAiConfig] = useState<AIModelConfig>({
    model: "ensemble",
    confidence_threshold: 0.7,
    risk_tolerance: 0.5,
    learning_rate: 0.001,
    lookback_period: 100,
    prediction_horizon: 24,
    ensemble_size: 5,
    feature_selection: ["price", "volume", "volatility"],
    market_regime_detection: true,
    sentiment_analysis: true,
    technical_indicators: ["RSI", "MACD", "BB"],
  });

  const [riskParams, setRiskParams] = useState<RiskParameters>({
    max_position_size: 0.1,
    max_daily_loss: 0.02,
    max_drawdown: 0.1,
    correlation_limit: 0.7,
    volatility_threshold: 0.3,
    stop_loss_percentage: 0.02,
    take_profit_percentage: 0.04,
    position_sizing_method: "kelly",
    risk_per_trade: 0.01,
    max_concurrent_trades: 5,
  });

  const [tradingConstraints, setTradingConstraints] = useState<TradingConstraints>({
    allowed_symbols: ["EURUSD", "GBPUSD", "USDJPY"],
    forbidden_symbols: [],
    trading_hours: {
      start: "09:00",
      end: "17:00",
      timezone: "UTC",
    },
    max_trades_per_day: 10,
    min_trade_interval: 30,
    blackout_periods: [],
    news_filter: true,
    economic_calendar_filter: true,
  });

  const [perfOptimization, setPerfOptimization] = useState<PerformanceOptimization>({
    rebalancing_frequency: "daily",
    performance_threshold: 0.05,
    adaptation_speed: 0.1,
    model_retrain_frequency: 7,
    feature_importance_threshold: 0.05,
    outlier_detection: true,
    regime_adaptation: true,
    dynamic_position_sizing: true,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("ai-model");

  useEffect(() => {
    loadSettings();
  }, [botId]);

  const loadSettings = async () => {
    try {
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
      const response = await fetchWithAuth(`${baseUrl}/api/bots/${botId}/advanced-settings`);

      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          setAiConfig(data.settings.aiConfig || aiConfig);
          setRiskParams(data.settings.riskParams || riskParams);
          setTradingConstraints(data.settings.tradingConstraints || tradingConstraints);
          setPerfOptimization(data.settings.perfOptimization || perfOptimization);
        }
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
      const response = await fetchWithAuth(`${baseUrl}/api/bots/${botId}/advanced-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aiConfig,
          riskParams,
          tradingConstraints,
          perfOptimization,
        }),
      });

      if (response.ok) {
        toast.success("Settings saved successfully");
      } else {
        throw new Error("Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefaults = () => {
    setAiConfig({
      model: "ensemble",
      confidence_threshold: 0.7,
      risk_tolerance: 0.5,
      learning_rate: 0.001,
      lookback_period: 100,
      prediction_horizon: 24,
      ensemble_size: 5,
      feature_selection: ["price", "volume", "volatility"],
      market_regime_detection: true,
      sentiment_analysis: true,
      technical_indicators: ["RSI", "MACD", "BB"],
    });

    setRiskParams({
      max_position_size: 0.1,
      max_daily_loss: 0.02,
      max_drawdown: 0.1,
      correlation_limit: 0.7,
      volatility_threshold: 0.3,
      stop_loss_percentage: 0.02,
      take_profit_percentage: 0.04,
      position_sizing_method: "kelly",
      risk_per_trade: 0.01,
      max_concurrent_trades: 5,
    });

    toast.info("Settings reset to defaults");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Advanced Settings</h2>
        <div className="flex gap-2">
          <Button onClick={resetToDefaults} variant="outline" size="sm">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button onClick={saveSettings} disabled={isSaving} size="sm">
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ai-model">AI Model</TabsTrigger>
          <TabsTrigger value="risk">Risk Management</TabsTrigger>
          <TabsTrigger value="constraints">Trading Constraints</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
        </TabsList>

        <TabsContent value="ai-model" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Brain className="h-5 w-5 mr-2" />
                AI Model Configuration
              </CardTitle>
              <CardDescription>Configure the AI model parameters and features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Model Selection */}
              <div className="space-y-2">
                <Label htmlFor="model">Model Type</Label>
                <Select value={aiConfig.model} onValueChange={(value) => setAiConfig({ ...aiConfig, model: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ensemble">Ensemble Model</SelectItem>
                    <SelectItem value="lstm">LSTM Neural Network</SelectItem>
                    <SelectItem value="transformer">Transformer</SelectItem>
                    <SelectItem value="random_forest">Random Forest</SelectItem>
                    <SelectItem value="xgboost">XGBoost</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Confidence Threshold */}
              <div className="space-y-2">
                <Label>Confidence Threshold: {(aiConfig.confidence_threshold * 100).toFixed(0)}%</Label>
                <Slider
                  value={[aiConfig.confidence_threshold]}
                  onValueChange={([value]) => setAiConfig({ ...aiConfig, confidence_threshold: value })}
                  min={0.5}
                  max={0.95}
                  step={0.05}
                  className="w-full"
                />
                <p className="text-sm text-gray-600">Minimum confidence required for trade signals</p>
              </div>

              {/* Risk Tolerance */}
              <div className="space-y-2">
                <Label>Risk Tolerance: {(aiConfig.risk_tolerance * 100).toFixed(0)}%</Label>
                <Slider
                  value={[aiConfig.risk_tolerance]}
                  onValueChange={([value]) => setAiConfig({ ...aiConfig, risk_tolerance: value })}
                  min={0.1}
                  max={1.0}
                  step={0.1}
                  className="w-full"
                />
                <p className="text-sm text-gray-600">AI model&apos;s risk appetite</p>
              </div>

              {/* Learning Rate */}
              <div className="space-y-2">
                <Label htmlFor="learning_rate">Learning Rate</Label>
                <Input
                  id="learning_rate"
                  type="number"
                  value={aiConfig.learning_rate}
                  onChange={(e) => setAiConfig({ ...aiConfig, learning_rate: parseFloat(e.target.value) })}
                  step={0.0001}
                  min={0.0001}
                  max={0.01}
                />
                <p className="text-sm text-gray-600">Model adaptation speed</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Lookback Period */}
                <div className="space-y-2">
                  <Label htmlFor="lookback_period">Lookback Period (hours)</Label>
                  <Input
                    id="lookback_period"
                    type="number"
                    value={aiConfig.lookback_period}
                    onChange={(e) => setAiConfig({ ...aiConfig, lookback_period: parseInt(e.target.value) })}
                    min={24}
                    max={1000}
                  />
                </div>

                {/* Prediction Horizon */}
                <div className="space-y-2">
                  <Label htmlFor="prediction_horizon">Prediction Horizon (hours)</Label>
                  <Input
                    id="prediction_horizon"
                    type="number"
                    value={aiConfig.prediction_horizon}
                    onChange={(e) => setAiConfig({ ...aiConfig, prediction_horizon: parseInt(e.target.value) })}
                    min={1}
                    max={168}
                  />
                </div>
              </div>

              <Separator />

              {/* Feature Toggles */}
              <div className="space-y-4">
                <h4 className="font-medium">AI Features</h4>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Market Regime Detection</Label>
                    <p className="text-sm text-gray-600">Detect market conditions (trending, ranging, etc.)</p>
                  </div>
                  <Switch checked={aiConfig.market_regime_detection} onCheckedChange={(checked) => setAiConfig({ ...aiConfig, market_regime_detection: checked })} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Sentiment Analysis</Label>
                    <p className="text-sm text-gray-600">Analyze market sentiment from news and social media</p>
                  </div>
                  <Switch checked={aiConfig.sentiment_analysis} onCheckedChange={(checked) => setAiConfig({ ...aiConfig, sentiment_analysis: checked })} />
                </div>
              </div>

              {/* Technical Indicators */}
              <div className="space-y-2">
                <Label>Technical Indicators</Label>
                <div className="flex flex-wrap gap-2">
                  {["RSI", "MACD", "BB", "SMA", "EMA", "Stochastic", "ATR", "ADX"].map((indicator) => (
                    <Badge
                      key={indicator}
                      variant={aiConfig.technical_indicators.includes(indicator) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        const indicators = aiConfig.technical_indicators.includes(indicator)
                          ? aiConfig.technical_indicators.filter((i) => i !== indicator)
                          : [...aiConfig.technical_indicators, indicator];
                        setAiConfig({ ...aiConfig, technical_indicators: indicators });
                      }}>
                      {indicator}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Risk Management Parameters
              </CardTitle>
              <CardDescription>Configure risk limits and position sizing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Position Sizing */}
              <div className="space-y-2">
                <Label>Max Position Size: {(riskParams.max_position_size * 100).toFixed(1)}%</Label>
                <Slider
                  value={[riskParams.max_position_size]}
                  onValueChange={([value]) => setRiskParams({ ...riskParams, max_position_size: value })}
                  min={0.01}
                  max={0.5}
                  step={0.01}
                  className="w-full"
                />
                <p className="text-sm text-gray-600">Maximum percentage of portfolio per position</p>
              </div>

              {/* Daily Loss Limit */}
              <div className="space-y-2">
                <Label>Max Daily Loss: {(riskParams.max_daily_loss * 100).toFixed(1)}%</Label>
                <Slider
                  value={[riskParams.max_daily_loss]}
                  onValueChange={([value]) => setRiskParams({ ...riskParams, max_daily_loss: value })}
                  min={0.005}
                  max={0.1}
                  step={0.005}
                  className="w-full"
                />
                <p className="text-sm text-gray-600">Stop trading if daily loss exceeds this limit</p>
              </div>

              {/* Max Drawdown */}
              <div className="space-y-2">
                <Label>Max Drawdown: {(riskParams.max_drawdown * 100).toFixed(1)}%</Label>
                <Slider
                  value={[riskParams.max_drawdown]}
                  onValueChange={([value]) => setRiskParams({ ...riskParams, max_drawdown: value })}
                  min={0.05}
                  max={0.3}
                  step={0.01}
                  className="w-full"
                />
                <p className="text-sm text-gray-600">Maximum portfolio drawdown before stopping</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Stop Loss */}
                <div className="space-y-2">
                  <Label htmlFor="stop_loss">Stop Loss (%)</Label>
                  <Input
                    id="stop_loss"
                    type="number"
                    value={riskParams.stop_loss_percentage * 100}
                    onChange={(e) => setRiskParams({ ...riskParams, stop_loss_percentage: parseFloat(e.target.value) / 100 })}
                    min={0.5}
                    max={10}
                    step={0.1}
                  />
                </div>

                {/* Take Profit */}
                <div className="space-y-2">
                  <Label htmlFor="take_profit">Take Profit (%)</Label>
                  <Input
                    id="take_profit"
                    type="number"
                    value={riskParams.take_profit_percentage * 100}
                    onChange={(e) => setRiskParams({ ...riskParams, take_profit_percentage: parseFloat(e.target.value) / 100 })}
                    min={1}
                    max={20}
                    step={0.1}
                  />
                </div>
              </div>

              {/* Position Sizing Method */}
              <div className="space-y-2">
                <Label htmlFor="position_sizing">Position Sizing Method</Label>
                <Select value={riskParams.position_sizing_method} onValueChange={(value) => setRiskParams({ ...riskParams, position_sizing_method: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Size</SelectItem>
                    <SelectItem value="kelly">Kelly Criterion</SelectItem>
                    <SelectItem value="volatility">Volatility-Based</SelectItem>
                    <SelectItem value="risk_parity">Risk Parity</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Risk per Trade */}
              <div className="space-y-2">
                <Label>Risk per Trade: {(riskParams.risk_per_trade * 100).toFixed(2)}%</Label>
                <Slider
                  value={[riskParams.risk_per_trade]}
                  onValueChange={([value]) => setRiskParams({ ...riskParams, risk_per_trade: value })}
                  min={0.001}
                  max={0.05}
                  step={0.001}
                  className="w-full"
                />
                <p className="text-sm text-gray-600">Percentage of portfolio to risk per trade</p>
              </div>

              {/* Max Concurrent Trades */}
              <div className="space-y-2">
                <Label htmlFor="max_trades">Max Concurrent Trades</Label>
                <Input
                  id="max_trades"
                  type="number"
                  value={riskParams.max_concurrent_trades}
                  onChange={(e) => setRiskParams({ ...riskParams, max_concurrent_trades: parseInt(e.target.value) })}
                  min={1}
                  max={20}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="constraints" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Trading Constraints
              </CardTitle>
              <CardDescription>Set trading hours, symbols, and other constraints</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Trading Hours */}
              <div className="space-y-4">
                <h4 className="font-medium">Trading Hours</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_time">Start Time</Label>
                    <Input
                      id="start_time"
                      type="time"
                      value={tradingConstraints.trading_hours.start}
                      onChange={(e) =>
                        setTradingConstraints({
                          ...tradingConstraints,
                          trading_hours: { ...tradingConstraints.trading_hours, start: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_time">End Time</Label>
                    <Input
                      id="end_time"
                      type="time"
                      value={tradingConstraints.trading_hours.end}
                      onChange={(e) =>
                        setTradingConstraints({
                          ...tradingConstraints,
                          trading_hours: { ...tradingConstraints.trading_hours, end: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select
                      value={tradingConstraints.trading_hours.timezone}
                      onValueChange={(value) =>
                        setTradingConstraints({
                          ...tradingConstraints,
                          trading_hours: { ...tradingConstraints.trading_hours, timezone: value },
                        })
                      }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="EST">EST</SelectItem>
                        <SelectItem value="PST">PST</SelectItem>
                        <SelectItem value="GMT">GMT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Trade Limits */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max_trades_day">Max Trades per Day</Label>
                  <Input
                    id="max_trades_day"
                    type="number"
                    value={tradingConstraints.max_trades_per_day}
                    onChange={(e) => setTradingConstraints({ ...tradingConstraints, max_trades_per_day: parseInt(e.target.value) })}
                    min={1}
                    max={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="min_interval">Min Trade Interval (minutes)</Label>
                  <Input
                    id="min_interval"
                    type="number"
                    value={tradingConstraints.min_trade_interval}
                    onChange={(e) => setTradingConstraints({ ...tradingConstraints, min_trade_interval: parseInt(e.target.value) })}
                    min={1}
                    max={1440}
                  />
                </div>
              </div>

              <Separator />

              {/* Filters */}
              <div className="space-y-4">
                <h4 className="font-medium">Market Filters</h4>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>News Filter</Label>
                    <p className="text-sm text-gray-600">Avoid trading during major news events</p>
                  </div>
                  <Switch checked={tradingConstraints.news_filter} onCheckedChange={(checked) => setTradingConstraints({ ...tradingConstraints, news_filter: checked })} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Economic Calendar Filter</Label>
                    <p className="text-sm text-gray-600">Consider economic events in trading decisions</p>
                  </div>
                  <Switch
                    checked={tradingConstraints.economic_calendar_filter}
                    onCheckedChange={(checked) => setTradingConstraints({ ...tradingConstraints, economic_calendar_filter: checked })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="optimization" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Performance Optimization
              </CardTitle>
              <CardDescription>Configure adaptive learning and optimization parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Rebalancing Frequency */}
              <div className="space-y-2">
                <Label htmlFor="rebalancing">Rebalancing Frequency</Label>
                <Select value={perfOptimization.rebalancing_frequency} onValueChange={(value) => setPerfOptimization({ ...perfOptimization, rebalancing_frequency: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Performance Threshold */}
              <div className="space-y-2">
                <Label>Performance Threshold: {(perfOptimization.performance_threshold * 100).toFixed(1)}%</Label>
                <Slider
                  value={[perfOptimization.performance_threshold]}
                  onValueChange={([value]) => setPerfOptimization({ ...perfOptimization, performance_threshold: value })}
                  min={0.01}
                  max={0.2}
                  step={0.01}
                  className="w-full"
                />
                <p className="text-sm text-gray-600">Trigger optimization when performance drops below this threshold</p>
              </div>

              {/* Adaptation Speed */}
              <div className="space-y-2">
                <Label>Adaptation Speed: {(perfOptimization.adaptation_speed * 100).toFixed(0)}%</Label>
                <Slider
                  value={[perfOptimization.adaptation_speed]}
                  onValueChange={([value]) => setPerfOptimization({ ...perfOptimization, adaptation_speed: value })}
                  min={0.01}
                  max={1.0}
                  step={0.01}
                  className="w-full"
                />
                <p className="text-sm text-gray-600">How quickly the model adapts to new market conditions</p>
              </div>

              {/* Model Retrain Frequency */}
              <div className="space-y-2">
                <Label htmlFor="retrain_freq">Model Retrain Frequency (days)</Label>
                <Input
                  id="retrain_freq"
                  type="number"
                  value={perfOptimization.model_retrain_frequency}
                  onChange={(e) => setPerfOptimization({ ...perfOptimization, model_retrain_frequency: parseInt(e.target.value) })}
                  min={1}
                  max={30}
                />
              </div>

              <Separator />

              {/* Optimization Features */}
              <div className="space-y-4">
                <h4 className="font-medium">Optimization Features</h4>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Outlier Detection</Label>
                    <p className="text-sm text-gray-600">Detect and handle market anomalies</p>
                  </div>
                  <Switch checked={perfOptimization.outlier_detection} onCheckedChange={(checked) => setPerfOptimization({ ...perfOptimization, outlier_detection: checked })} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Regime Adaptation</Label>
                    <p className="text-sm text-gray-600">Adapt strategy based on market regime changes</p>
                  </div>
                  <Switch checked={perfOptimization.regime_adaptation} onCheckedChange={(checked) => setPerfOptimization({ ...perfOptimization, regime_adaptation: checked })} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Dynamic Position Sizing</Label>
                    <p className="text-sm text-gray-600">Adjust position sizes based on market conditions</p>
                  </div>
                  <Switch
                    checked={perfOptimization.dynamic_position_sizing}
                    onCheckedChange={(checked) => setPerfOptimization({ ...perfOptimization, dynamic_position_sizing: checked })}
                  />
                </div>
              </div>

              {/* Feature Importance Threshold */}
              <div className="space-y-2">
                <Label>Feature Importance Threshold: {(perfOptimization.feature_importance_threshold * 100).toFixed(1)}%</Label>
                <Slider
                  value={[perfOptimization.feature_importance_threshold]}
                  onValueChange={([value]) => setPerfOptimization({ ...perfOptimization, feature_importance_threshold: value })}
                  min={0.01}
                  max={0.2}
                  step={0.01}
                  className="w-full"
                />
                <p className="text-sm text-gray-600">Minimum importance for features to be included in the model</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Warning Banner */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-800">Important Notice</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Advanced settings can significantly impact bot performance. Test changes in a demo environment before applying to live trading. Some changes may require bot restart
                to take effect.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AdvancedSettings;
