/**
 * Capital.com API session and authentication interfaces
 */

/**
 * Response from Capital.com API session creation
 */
export interface CapitalSessionResponse {
  clientId: string;
  accountId: string;
  accountType: string;
  lightstreamerEndpoint: string;
  currentAccountId: string;
  currency: string;
  streamingHost: string;
  accounts: Array<{
    accountId: string;
    accountName: string;
    accountType: string;
    preferred: boolean;
    balance: number;
  }>;
  accountInfo: {
    balance: number;
    deposit: number;
    profitLoss: number;
  };
  cst: string;
  securityToken: string;
}

/**
 * Configuration for Capital.com API authentication
 */
export interface CapitalAuthConfig {
  apiKey: string;
  identifier: string;
  password: string;
  isDemo: boolean;
}

/**
 * Account information returned from the API
 */
export interface CapitalAccount {
  accountId: string;
  accountName: string;
  accountType: string;
  preferred: boolean;
  balance: number;
}

/**
 * Account balance and financial details
 */
export interface CapitalAccountInfo {
  balance: number;
  deposit: number;
  profitLoss: number;
}
