// Trading-related types and interfaces
export interface Trade {
  id: string;
  botId: string;
  evaluationId?: number;
  userId: string;
  symbol: string;
  direction: "BUY" | "SELL";
  orderType: "MARKET" | "LIMIT" | "STOP";
  quantity: number;
  entryPrice?: number;
  currentPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  status: "PENDING" | "OPEN" | "CLOSED" | "CANCELLED";
  brokerOrderId?: string;
  brokerDealId?: string;
  rationale?: string;
  aiConfidence?: number;
  riskScore?: number;
  profitLoss?: number;
  profitLossPercent?: number;
  fees?: number;
  openedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TradeExecutionParams {
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
  evaluationId?: number;
}

export interface PositionSummary {
  activeTrades: number;
  totalUnrealizedPnL: number;
  totalRealizedPnL: number;
  totalPnL: number;
  winRate: number;
  totalTrades: number;
  closedTrades: number;
  trades: Trade[];
}

export interface PositionRiskMetrics {
  currentRisk: number;
  maxRisk: number;
  riskPercentage: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  drawdown: number;
  timeInPosition: number;
}

export interface PositionMetrics {
  trade: Trade;
  currentPrice?: number;
  riskMetrics: PositionRiskMetrics;
}

/**
 * Execute a trade for a bot
 */
export async function executeTrade(botId: string, params: TradeExecutionParams): Promise<{ trade: Trade }> {
  const response = await fetch(`/api/bots/${botId}/execute-trade`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to execute trade");
  }

  return response.json();
}

/**
 * Get active trades for a bot
 */
export async function getActiveTrades(botId: string): Promise<{ trades: Trade[] }> {
  const response = await fetch(`/api/bots/${botId}/active-trades`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get active trades");
  }

  return response.json();
}

/**
 * Get trade history for a bot
 */
export async function getTradeHistory(botId: string, limit: number = 50): Promise<{ trades: Trade[] }> {
  const response = await fetch(`/api/bots/${botId}/trade-history?limit=${limit}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get trade history");
  }

  return response.json();
}

/**
 * Get position summary for a bot
 */
export async function getPositionSummary(botId: string): Promise<{ summary: PositionSummary }> {
  const response = await fetch(`/api/bots/${botId}/position-summary`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get position summary");
  }

  return response.json();
}

/**
 * Close a specific trade
 */
export async function closeTrade(tradeId: string, reason?: string): Promise<{ trade: Trade }> {
  const response = await fetch(`/api/bots/trades/${tradeId}/close`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ reason }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to close trade");
  }

  return response.json();
}

/**
 * Update trade parameters
 */
export async function updateTrade(
  tradeId: string,
  params: {
    stopLoss?: number;
    takeProfit?: number;
    quantity?: number;
  }
): Promise<{ trade: Trade }> {
  const response = await fetch(`/api/bots/trades/${tradeId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update trade");
  }

  return response.json();
}

/**
 * Get detailed position metrics for a trade
 */
export async function getPositionMetrics(tradeId: string): Promise<{ metrics: PositionMetrics }> {
  const response = await fetch(`/api/bots/trades/${tradeId}/metrics`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get position metrics");
  }

  return response.json();
}

/**
 * Close all positions for a bot
 */
export async function closeAllPositions(botId: string, reason?: string): Promise<{ message: string }> {
  const response = await fetch(`/api/bots/${botId}/close-all-positions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ reason }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to close all positions");
  }

  return response.json();
}

// Utility functions for UI formatting and calculations

/**
 * Format P&L value with appropriate styling
 */
export function formatPnL(value: number): {
  formatted: string;
  className: string;
} {
  const formatted = value >= 0 ? `+$${value.toFixed(2)}` : `-$${Math.abs(value).toFixed(2)}`;
  const className = value >= 0 ? "text-green-600" : "text-red-600";

  return { formatted, className };
}

/**
 * Format percentage with appropriate styling
 */
export function formatPercentage(value: number): {
  formatted: string;
  className: string;
} {
  const formatted = `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
  const className = value >= 0 ? "text-green-600" : "text-red-600";

  return { formatted, className };
}

/**
 * Get trade status badge styling
 */
export function getTradeStatusBadge(status: Trade["status"]): {
  label: string;
  className: string;
} {
  switch (status) {
    case "PENDING":
      return {
        label: "Pending",
        className: "bg-yellow-100 text-yellow-800 border-yellow-200",
      };
    case "OPEN":
      return {
        label: "Open",
        className: "bg-blue-100 text-blue-800 border-blue-200",
      };
    case "CLOSED":
      return {
        label: "Closed",
        className: "bg-gray-100 text-gray-800 border-gray-200",
      };
    case "CANCELLED":
      return {
        label: "Cancelled",
        className: "bg-red-100 text-red-800 border-red-200",
      };
    default:
      return {
        label: status,
        className: "bg-gray-100 text-gray-800 border-gray-200",
      };
  }
}

/**
 * Get direction badge styling
 */
export function getDirectionBadge(direction: "BUY" | "SELL"): {
  label: string;
  className: string;
} {
  return direction === "BUY"
    ? {
        label: "Long",
        className: "bg-green-100 text-green-800 border-green-200",
      }
    : {
        label: "Short",
        className: "bg-red-100 text-red-800 border-red-200",
      };
}

/**
 * Calculate time in position
 */
export function calculateTimeInPosition(openedAt: string): string {
  const opened = new Date(openedAt);
  const now = new Date();
  const diffMs = now.getTime() - opened.getTime();

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

/**
 * Get risk score badge styling
 */
export function getRiskScoreBadge(riskScore?: number): {
  label: string;
  className: string;
} {
  if (!riskScore) {
    return {
      label: "Unknown",
      className: "bg-gray-100 text-gray-800 border-gray-200",
    };
  }

  if (riskScore <= 2) {
    return {
      label: "Low Risk",
      className: "bg-green-100 text-green-800 border-green-200",
    };
  } else if (riskScore <= 3) {
    return {
      label: "Medium Risk",
      className: "bg-yellow-100 text-yellow-800 border-yellow-200",
    };
  } else {
    return {
      label: "High Risk",
      className: "bg-red-100 text-red-800 border-red-200",
    };
  }
}

/**
 * Get confidence score badge styling
 */
export function getConfidenceBadge(confidence?: number): {
  label: string;
  className: string;
} {
  if (!confidence) {
    return {
      label: "Unknown",
      className: "bg-gray-100 text-gray-800 border-gray-200",
    };
  }

  if (confidence >= 80) {
    return {
      label: "High Confidence",
      className: "bg-green-100 text-green-800 border-green-200",
    };
  } else if (confidence >= 60) {
    return {
      label: "Medium Confidence",
      className: "bg-yellow-100 text-yellow-800 border-yellow-200",
    };
  } else {
    return {
      label: "Low Confidence",
      className: "bg-red-100 text-red-800 border-red-200",
    };
  }
}
