import { fetchWithAuth } from "@/lib/fetch-with-auth";

export interface TradingDecision {
  action: "BUY" | "SELL" | "HOLD" | "CLOSE";
  confidence: number;
  positionSize: number;
  stopLoss: number;
  takeProfit: number;
  rationale: string;
  riskScore: number;
  timeframe: string;
  urgency: "LOW" | "MEDIUM" | "HIGH";
}

export interface ChartAnalysis {
  technicalIndicators: Array<{
    name: string;
    value: number;
    signal: "BUY" | "SELL" | "NEUTRAL";
    strength: number;
  }>;
  trendDirection: "BULLISH" | "BEARISH" | "SIDEWAYS";
  supportLevels: number[];
  resistanceLevels: number[];
  patternRecognition: Array<{
    name: string;
    confidence: number;
    type: "BULLISH" | "BEARISH" | "NEUTRAL";
    description: string;
  }>;
  volatility: number;
  momentum: number;
  priceAction: {
    currentPrice: number;
    priceChange: number;
    priceChangePercent: number;
  };
}

export interface StrategyAnalysis {
  strategyAlignment: number;
  entryConditions: Array<{
    condition: string;
    met: boolean;
    confidence: number;
  }>;
  exitConditions: Array<{
    condition: string;
    applicable: boolean;
    confidence: number;
  }>;
  riskFactors: string[];
  recommendations: string[];
}

export interface AIAnalysisResult {
  chartAnalysis: ChartAnalysis;
  strategyAnalysis: StrategyAnalysis;
  tradingDecision: TradingDecision;
  marketCondition: "BULLISH" | "BEARISH" | "NEUTRAL" | "VOLATILE";
  insights: string[];
  warnings: string[];
  timestamp: string;
}

export interface AIEvaluationResponse {
  success: boolean;
  message: string;
  evaluation: {
    id: number;
    botId: string;
    tradingSignal: string;
    confidenceScore: number;
    aiAnalysis: AIAnalysisResult;
    createdAt: string;
  };
  aiAnalysis: AIAnalysisResult;
  tradingDecision: TradingDecision;
}

export interface AIPerformanceMetrics {
  totalPredictions: number;
  correctPredictions: number;
  accuracy: number;
  avgConfidence: number;
  avgProfitLoss: number;
  confidenceRanges: {
    high: { count: number; accuracy: number };
    medium: { count: number; accuracy: number };
    low: { count: number; accuracy: number };
  };
}

/**
 * Convert canvas to base64 image data
 */
export function canvasToBase64(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL("image/png");
}

/**
 * Convert image file to base64
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to convert file to base64"));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Run AI-enhanced evaluation for a bot
 */
export async function runAIEvaluation(botId: string, chartImageBase64: string, symbol: string, timeframe: string): Promise<AIEvaluationResponse> {
  try {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

    const response = await fetchWithAuth(`${baseUrl}/api/bots/${botId}/ai-evaluate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chartImageBase64,
        symbol,
        timeframe,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to run AI evaluation");
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || "AI evaluation failed");
    }

    return data;
  } catch (error) {
    console.error("Error running AI evaluation:", error);
    throw error;
  }
}

/**
 * Get AI performance metrics for a bot
 */
export async function getAIPerformanceMetrics(botId: string): Promise<AIPerformanceMetrics> {
  try {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

    const response = await fetchWithAuth(`${baseUrl}/api/bots/${botId}/ai-metrics`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to fetch AI metrics");
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || "Failed to fetch AI metrics");
    }

    return data.metrics;
  } catch (error) {
    console.error("Error fetching AI performance metrics:", error);
    throw error;
  }
}

/**
 * Format confidence score for display
 */
export function formatConfidence(confidence: number): string {
  if (confidence >= 80) return "High";
  if (confidence >= 60) return "Medium";
  return "Low";
}

/**
 * Get confidence color for UI display
 */
export function getConfidenceColor(confidence: number): string {
  if (confidence >= 80) return "text-green-600";
  if (confidence >= 60) return "text-yellow-600";
  return "text-red-600";
}

/**
 * Format trading action for display
 */
export function formatTradingAction(action: string): string {
  switch (action) {
    case "BUY":
      return "📈 Buy";
    case "SELL":
      return "📉 Sell";
    case "HOLD":
      return "⏸️ Hold";
    case "CLOSE":
      return "❌ Close";
    default:
      return action;
  }
}

/**
 * Get action color for UI display
 */
export function getActionColor(action: string): string {
  switch (action) {
    case "BUY":
      return "text-green-600 bg-green-50";
    case "SELL":
      return "text-red-600 bg-red-50";
    case "HOLD":
      return "text-blue-600 bg-blue-50";
    case "CLOSE":
      return "text-gray-600 bg-gray-50";
    default:
      return "text-gray-600 bg-gray-50";
  }
}

/**
 * Format risk score for display
 */
export function formatRiskScore(riskScore: number): string {
  const riskLabels = ["Very Low", "Low", "Medium", "High", "Very High"];
  return riskLabels[Math.min(riskScore - 1, 4)] || "Unknown";
}

/**
 * Get risk color for UI display
 */
export function getRiskColor(riskScore: number): string {
  if (riskScore <= 2) return "text-green-600";
  if (riskScore <= 3) return "text-yellow-600";
  return "text-red-600";
}
