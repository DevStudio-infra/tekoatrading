/**
 * Capital.com authentication configuration
 */
export interface CapitalAuthConfig {
  apiKey: string;
  identifier: string;
  password: string;
  isDemo?: boolean;
  instanceId?: string;
}

/**
 * Capital.com session data
 */
export interface CapitalSession {
  cst: string;
  securityToken: string;
  streamingHost?: string;
  accountId?: string;
  currency?: string;
  balance?: number;
  available?: number;
  deposit?: number;
  profitLoss?: number;
  createdAt: Date;
  expiresAt?: Date;
}
