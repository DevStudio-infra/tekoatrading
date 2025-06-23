/**
 * Capital.com trading position interfaces
 */

/**
 * Trading position data
 */
export interface CapitalPosition {
  position: {
    contractSize: number;
    createdDate: string;
    createdDateUTC: string;
    dealId: string;
    dealReference: string;
    direction: 'BUY' | 'SELL';
    level: number;
    limitLevel?: number;
    size: number;
    stopLevel?: number;
    currency: string;
    epic: string;
    profitAndLoss: number;
  };
}

/**
 * List of positions
 */
export interface PositionsResponse {
  positions: CapitalPosition[];
}

/**
 * Request to create a new position
 */
export interface CreatePositionRequest {
  epic: string;
  direction: 'BUY' | 'SELL';
  size: number;
  guaranteedStop?: boolean;
  stopLevel?: number;
  profitLevel?: number;
}

/**
 * Request to close an existing position
 */
export interface ClosePositionRequest {
  dealId: string;
  direction: 'BUY' | 'SELL';
  size: number;
}

/**
 * Response from position creation
 */
export interface PositionResponse {
  dealReference: string;
  status: string;
}
