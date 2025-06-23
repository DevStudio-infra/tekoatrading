export interface TechnicalIndicator {
  name: string;
  value: number;
  signal: "BUY" | "SELL" | "NEUTRAL";
  strength: number; // 0-100
}

export interface ChartPattern {
  name: string;
  confidence: number; // 0-100
  type: "BULLISH" | "BEARISH" | "NEUTRAL";
  description: string;
}

export interface ChartAnalysis {
  technicalIndicators: TechnicalIndicator[];
  trendDirection: "BULLISH" | "BEARISH" | "SIDEWAYS";
  supportLevels: number[];
  resistanceLevels: number[];
  patternRecognition: ChartPattern[];
  volatility: number; // 0-100
  momentum: number; // -100 to 100
  priceAction: {
    currentPrice: number;
    priceChange: number;
    priceChangePercent: number;
  };
}

export interface StrategyAnalysis {
  strategyAlignment: number; // 0-100 score
  entryConditions: {
    condition: string;
    met: boolean;
    confidence: number;
  }[];
  exitConditions: {
    condition: string;
    applicable: boolean;
    confidence: number;
  }[];
  riskFactors: string[];
  recommendations: string[];
}

export interface TradingDecision {
  action: "BUY" | "SELL" | "HOLD" | "CLOSE";
  confidence: number; // 0-100
  positionSize: number; // exact quantity to trade (not percentage)
  positionSizeReasoning: string; // why this size was chosen
  stopLoss: number; // exact price level
  stopLossReasoning: string; // why this SL was chosen
  takeProfit: number; // exact price level
  takeProfitReasoning: string; // why this TP was chosen
  optimalEntry?: number; // optimal entry price (may differ from current price)
  orderType?: "MARKET" | "LIMIT" | "STOP" | "PENDING"; // recommended order type
  rationale: string;
  riskScore: number; // 1-5
  timeframe: string;
  urgency: "LOW" | "MEDIUM" | "HIGH";
  portfolioImpact: string; // how this trade affects overall portfolio
}

export interface PortfolioContext {
  accountBalance: number;
  openTrades: Array<{
    id: string;
    symbol: string;
    direction: "BUY" | "SELL";
    quantity: number;
    entryPrice: number;
    currentPrice?: number;
    unrealizedPnL: number;
    unrealizedPnLPercent: number;
    timeInPosition: number; // minutes
    botId?: string; // Include bot information for each trade
  }>;
  totalExposure: number;
  availableBalance: number;
  totalUnrealizedPnL: number;
  winRate: number;
  maxDrawdown: number;

  // New comprehensive trade statistics
  totalUserTrades?: number; // Total trades opened by user (all time)
  totalOpenTrades?: number; // Currently open trades
  totalClosedTrades?: number; // Total closed trades (recent 100)

  // Bot-specific information
  botMaxSimultaneousTrades?: number;
  botName?: string;
  botTradingPair?: string;
  botTimeframe?: string;
  botCurrentOpenTrades?: number;
  botIndicators?: string[];
  botOpenTradesDetails?: Array<{
    id: string;
    symbol: string;
    direction: "BUY" | "SELL";
    quantity: number;
    entryPrice: number;
    createdAt: string;
  }>;
}

export interface AIAnalysisResult {
  chartAnalysis: ChartAnalysis;
  strategyAnalysis: StrategyAnalysis;
  tradingDecision: TradingDecision;
  marketCondition: "BULLISH" | "BEARISH" | "NEUTRAL" | "VOLATILE";
  insights: string[];
  warnings: string[];
  timestamp: Date;
}

export interface TechnicalLevels {
  optimalEntry: number;
  stopLoss: number;
  takeProfit: number;
  orderType: "MARKET" | "LIMIT" | "STOP" | "PENDING";
  supportLevels: number[];
  resistanceLevels: number[];
  keyLevels: {
    nearestSupport: number;
    nearestResistance: number;
    majorSupport: number;
    majorResistance: number;
  };
  reasoning: {
    entryReasoning: string;
    stopLossReasoning: string;
    takeProfitReasoning: string;
    orderTypeReasoning: string;
  };
}

export interface PositionManagementResult {
  action: "HOLD" | "CLOSE" | "MODIFY_SL" | "MODIFY_TP" | "PARTIAL_CLOSE";
  newStopLoss?: number;
  newTakeProfit?: number;
  closePercentage?: number;
  rationale: string;
  confidence: number;
}

export interface BrokerConnectivityResult {
  brokerApiAvailable: boolean;
  priceDataReceived: boolean;
  currentPrice?: number;
  error?: string;
  details: any;
}
