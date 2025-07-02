/**
 * Capital.com position data
 */
export interface Position {
  dealId: string;
  dealReference: string;
  epic: string;
  instrumentName: string;
  dealSize: number;
  direction: "BUY" | "SELL";
  level: number;
  openLevel: number;
  currency: string;
  controlledRisk: boolean;
  stopLevel?: number;
  limitLevel?: number;
  profit: number;
  profitPct: number;
  trailingStopDistance?: number;
  trailingStep?: number;
  createdDate: string;
  createdDateUTC: string;
}

/**
 * Capital.com order data
 */
export interface Order {
  dealId: string;
  epic: string;
  instrumentName: string;
  orderSize: number;
  direction: "BUY" | "SELL";
  orderLevel: number;
  orderType: "LIMIT" | "STOP";
  timeInForce: string;
  goodTillDate?: string;
  currency: string;
  stopDistance?: number;
  limitDistance?: number;
  controlledRisk: boolean;
  createdDate: string;
  createdDateUTC: string;
}

/**
 * Position creation request
 */
export interface CreatePositionRequest {
  epic: string;
  direction: "BUY" | "SELL";
  size: number;
  orderType: "MARKET" | "LIMIT";
  level?: number;
  stopLevel?: number;
  profitLevel?: number; // Changed from limitLevel to profitLevel (Capital.com API standard)
  limitLevel?: number; // Keep for backward compatibility
  stopDistance?: number;
  limitDistance?: number;
  profitDistance?: number; // Added for distance-based take profit
  forceOpen?: boolean;
  guaranteedStop?: boolean;
  trailingStop?: boolean;
  trailingStopIncrement?: number;
  currencyCode?: string;
  timeInForce?: "GOOD_TILL_CANCELLED" | "GOOD_TILL_DATE" | "FILL_OR_KILL";
  goodTillDate?: string;
}

/**
 * Order creation request
 */
export interface CreateOrderRequest {
  epic: string;
  direction: "BUY" | "SELL";
  size: number;
  level: number;
  type: "LIMIT" | "STOP";
  stopLevel?: number;
  profitLevel?: number; // Added for take profit
  limitLevel?: number; // Keep for backward compatibility
  stopDistance?: number;
  limitDistance?: number;
  profitDistance?: number; // Added for distance-based take profit
  guaranteedStop?: boolean;
  timeInForce?: "GOOD_TILL_CANCELLED" | "GOOD_TILL_DATE";
  goodTillDate?: string;
  currencyCode?: string;
}

/**
 * Deal confirmation response
 */
export interface DealConfirmation {
  dealReference: string;
  dealStatus: "ACCEPTED" | "REJECTED";
  reason?: string;
  dealId?: string;
  epic?: string;
  status?: string;
  direction?: "BUY" | "SELL";
  size?: number;
  level?: number;
  stopLevel?: number;
  limitLevel?: number;
  profit?: number;
  profitCurrency?: string;
}

/**
 * Account details
 */
export interface AccountDetails {
  accountId: string;
  accountName: string;
  accountType: string;
  preferred: boolean;
  balance: number;
  deposit: number;
  profitLoss: number;
  available: number;
  currency: string;
  status: string;
}
