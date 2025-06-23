import { AgentExecutor } from "langchain/agents";
import { Tool } from "@langchain/core/tools";
import { ChatOpenAI } from "@langchain/openai";

// Base Agent Types
export interface AgentConfig {
  id: string;
  role: string;
  description: string;
  tools: Tool[];
  llm?: ChatOpenAI;
  verbose?: boolean;
  maxIterations?: number;
}

// Agent Result Types
export interface AgentResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp?: Date;
  source?: string;
  metadata?: {
    executionTime: number;
    tokensUsed?: number;
    intermediateSteps?: any[];
    source?: string;
  };
}

export interface AgentTask {
  id: string;
  type: string;
  input: string;
  params?: Record<string, any>;
  priority?: "low" | "medium" | "high" | "critical";
  timeout?: number;
}

// Trading-Specific Types
export interface BalanceInfo {
  balance: number;
  currency: string;
  available: number;
  reserved: number;
  lastUpdated: Date;
}

export interface PositionInfo {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  size: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercentage: number;
  openTime: Date;
}

export interface RiskAssessment {
  riskScore: number; // 1-10
  recommendation: "APPROVE" | "REJECT" | "MODIFY";
  reasoning: string;
  portfolioRisk: {
    totalExposure: number;
    riskLevel: string;
    concentrationRisk?: number;
    correlationRisk?: number;
  };
  tradeRisk: {
    riskPercentage: number;
    riskLevel: string;
  };
  suggestions: string[];
}

export interface PortfolioRisk {
  overallRiskScore: number;
  totalExposure: number;
  positionCount: number;
  concentrationRisk: number;
  correlationRisk: number;
  recommendations: string[];
  riskLevel: string;
}

export interface TechnicalSignal {
  signal: "BUY" | "SELL" | "HOLD";
  confidence: number; // 1-100
  reasoning: string;
  indicators: {
    rsi?: any;
    macd?: any;
    movingAverages?: any;
    bollingerBands?: any;
  };
  patterns: {
    trend: string;
    supportResistance: any;
    chartPatterns: any[];
  };
  priceTargets: {
    entry: number;
    stopLoss: number;
    takeProfit: number;
  };
  timeframe: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
}

export interface MarketAnalysis {
  symbol: string;
  timeframe: string;
  signal: TechnicalSignal;
  confidence: number;
  timestamp: Date;
}

export interface PositionSizing {
  recommendedSize: number;
  maxSize: number;
  riskAmount: number;
  riskPercentage: number;
  reasoning: string;
  method: "fixed_percentage" | "kelly" | "volatility_adjusted";
}

export interface TradeExecution {
  orderId: string;
  status: "PENDING" | "FILLED" | "REJECTED" | "CANCELLED";
  executedPrice?: number;
  executedQuantity?: number;
  slippage?: number;
  executionTime?: Date;
  reasoning: string;
}

export interface TradeOrder {
  symbol: string;
  side: "buy" | "sell";
  size: number;
  type: "market" | "limit";
  price?: number;
  stopLoss?: number;
  takeProfit?: number;
  timeInForce?: "GTC" | "IOC" | "FOK";
}

export interface TradeResult {
  success: boolean;
  orderId?: string;
  executedPrice?: number;
  executedSize?: number;
  fees?: number;
  error?: string;
  timestamp: Date;
}

// Workflow Types
export interface WorkflowStep {
  agentId: string;
  task: AgentTask;
  dependencies?: string[];
  optional?: boolean;
}

export interface WorkflowResult {
  success: boolean;
  results: Record<string, AgentResult>;
  executionTime: number;
  errors?: string[];
}

// Tool Types
export interface ToolConfig {
  name: string;
  description: string;
  timeout?: number;
  retryAttempts?: number;
}

export interface CapitalApiParams {
  action: "getBalance" | "getPositions" | "createOrder" | "closePosition" | "getMarketData";
  params?: Record<string, any>;
}

export interface DatabaseParams {
  operation: "select" | "insert" | "update" | "delete";
  table: string;
  data?: Record<string, any>;
  where?: Record<string, any>;
}

// Memory Types
export interface AgentMemory {
  shortTerm: Record<string, any>;
  longTerm: Record<string, any>;
  context: string[];
  lastUpdated: Date;
}

// Error Types
export class AgentError extends Error {
  constructor(message: string, public agentId: string, public taskId?: string, public originalError?: Error) {
    super(message);
    this.name = "AgentError";
  }
}

export class ToolError extends Error {
  constructor(message: string, public toolName: string, public params?: any, public originalError?: Error) {
    super(message);
    this.name = "ToolError";
  }
}

export class WorkflowError extends Error {
  constructor(message: string, public workflowId: string, public failedStep?: string, public originalError?: Error) {
    super(message);
    this.name = "WorkflowError";
  }
}
