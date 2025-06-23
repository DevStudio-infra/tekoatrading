export interface TradeExecutionParams {
  botId: string;
  evaluationId?: number;
  userId: string;
  symbol: string;
  direction: "BUY" | "SELL";
  orderType: "MARKET" | "LIMIT" | "STOP";
  quantity: number;
  limitPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  rationale?: string;
  aiConfidence?: number;
  riskScore?: number;
}

export interface TradeUpdateParams {
  stopLoss?: number;
  takeProfit?: number;
  quantity?: number;
}

export interface TradingDecision {
  shouldTrade: boolean;
  action: "BUY" | "SELL" | "HOLD" | "CLOSE";
  confidence: number;
  positionSize: number;
  stopLoss: number;
  takeProfit: number;
  rationale: string;
  riskScore: number;
}

export interface BrokerPosition {
  position: {
    dealId?: string;
    dealReference?: string;
    epic?: string;
    direction: "BUY" | "SELL";
    size: number;
    level?: number;
    openLevel?: number;
    stopLevel?: number;
    profitLevel?: number;
    upl?: number;
    createdDate?: string;
    contractId?: string;
  };
  market?: {
    symbol: string;
  };
}

export interface TradeRecord {
  id: string;
  bot_id: string;
  evaluation_id?: number;
  user_id: string;
  symbol: string;
  direction: "BUY" | "SELL";
  order_type: "MARKET" | "LIMIT" | "STOP";
  quantity: number;
  entry_price?: number;
  current_price?: number;
  stop_loss?: number;
  take_profit?: number;
  status: string;
  broker_order_id?: string;
  broker_deal_id?: string;
  rationale?: string;
  ai_confidence?: number;
  risk_score?: number;
  profit_loss?: number;
  profit_loss_percent?: number;
  fees: number;
  opened_at?: Date;
  closed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface MarketHoursResult {
  allowed: boolean;
  reason?: string;
}

export interface SymbolMappingResult {
  epic: string | null;
  mappedSymbol: string;
  alternativesUsed: string[];
}

export interface VerificationResult {
  success: boolean;
  position?: any;
  error?: string;
  wasRejected?: boolean;
  rejectReason?: string;
}

export interface BrokerExecutionResult {
  success: boolean;
  dealReference?: string;
  error?: string;
}
