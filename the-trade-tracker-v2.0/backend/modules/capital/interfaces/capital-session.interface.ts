/**
 * Interfaces for Capital.com API session responses and authentication
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
  accounts: CapitalAccount[];
  accountInfo: CapitalAccountInfo;
  cst: string;
  securityToken: string;
}

/**
 * Account information for a Capital.com account
 */
export interface CapitalAccount {
  accountId: string;
  accountName: string;
  accountType: string;
  preferred: boolean;
  balance: number;
}

/**
 * Account balance and financial information
 */
export interface CapitalAccountInfo {
  balance: number;
  deposit: number;
  profitLoss: number;
}

/**
 * Capital.com authentication credentials
 */
export interface CapitalAuthConfig {
  apiKey: string;
  identifier: string;
  password: string;
  isDemo: boolean;
}
