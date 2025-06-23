// Mock trading pairs data to use when backend service is unavailable
// This provides a fallback to ensure the UI components can work properly

export interface MockTradingPair {
  id: number;
  symbol: string;
  name: string;
  description: string | null;
  marketId: string | null;
  type: string;
  category: string;
  brokerName: string;
  isActive: boolean;
  metadata: any | null;
  lastUpdated: string;
  createdAt: string;
  exchange?: string;
}

// Mock trading pairs for different brokers and categories
export const mockTradingPairs: MockTradingPair[] = [
  // Capital.com - Crypto
  {
    id: 1001,
    symbol: 'BTC/USD',
    name: 'Bitcoin / US Dollar',
    description: 'Bitcoin to US Dollar',
    marketId: 'crypto_btcusd',
    type: 'crypto',
    category: 'Crypto',
    brokerName: 'Capital.com',
    isActive: true,
    metadata: null,
    lastUpdated: new Date().toISOString(),
    createdAt: new Date().toISOString()
  },
  {
    id: 1002,
    symbol: 'ETH/USD',
    name: 'Ethereum / US Dollar',
    description: 'Ethereum to US Dollar',
    marketId: 'crypto_ethusd',
    type: 'crypto',
    category: 'Crypto',
    brokerName: 'Capital.com',
    isActive: true,
    metadata: null,
    lastUpdated: new Date().toISOString(),
    createdAt: new Date().toISOString()
  },
  {
    id: 1003,
    symbol: 'SOL/USD',
    name: 'Solana / US Dollar',
    description: 'Solana to US Dollar',
    marketId: 'crypto_solusd',
    type: 'crypto',
    category: 'Crypto',
    brokerName: 'Capital.com',
    isActive: true,
    metadata: null,
    lastUpdated: new Date().toISOString(),
    createdAt: new Date().toISOString()
  },
  {
    id: 1004,
    symbol: 'ADA/USD',
    name: 'Cardano / US Dollar',
    description: 'Cardano to US Dollar',
    marketId: 'crypto_adausd',
    type: 'crypto',
    category: 'Crypto',
    brokerName: 'Capital.com',
    isActive: true,
    metadata: null,
    lastUpdated: new Date().toISOString(),
    createdAt: new Date().toISOString()
  },
  
  // Capital.com - Forex
  {
    id: 2001,
    symbol: 'EUR/USD',
    name: 'Euro / US Dollar',
    description: 'Euro to US Dollar',
    marketId: 'forex_eurusd',
    type: 'forex',
    category: 'Forex',
    brokerName: 'Capital.com',
    isActive: true,
    metadata: null,
    lastUpdated: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    exchange: 'Forex'
  },
  {
    id: 2002,
    symbol: 'GBP/USD',
    name: 'British Pound / US Dollar',
    description: 'British Pound to US Dollar',
    marketId: 'forex_gbpusd',
    type: 'forex',
    category: 'Forex',
    brokerName: 'Capital.com',
    isActive: true,
    metadata: null,
    lastUpdated: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    exchange: 'Forex'
  },
  {
    id: 2003,
    symbol: 'USD/JPY',
    name: 'US Dollar / Japanese Yen',
    description: 'US Dollar to Japanese Yen',
    marketId: 'forex_usdjpy',
    type: 'forex',
    category: 'Forex',
    brokerName: 'Capital.com',
    isActive: true,
    metadata: null,
    lastUpdated: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    exchange: 'Forex'
  },

  // Capital.com - Stocks
  {
    id: 3001,
    symbol: 'AAPL',
    name: 'Apple Inc.',
    description: 'Apple Inc. stock',
    marketId: 'stock_aapl',
    type: 'stock',
    category: 'Stocks',
    brokerName: 'Capital.com',
    isActive: true,
    metadata: null,
    lastUpdated: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    exchange: 'NASDAQ'
  },
  {
    id: 3002,
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    description: 'Microsoft Corporation stock',
    marketId: 'stock_msft',
    type: 'stock',
    category: 'Stocks',
    brokerName: 'Capital.com',
    isActive: true,
    metadata: null,
    lastUpdated: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    exchange: 'NASDAQ'
  },
  {
    id: 3003,
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    description: 'Alphabet Inc. stock',
    marketId: 'stock_googl',
    type: 'stock',
    category: 'Stocks',
    brokerName: 'Capital.com',
    isActive: true,
    metadata: null,
    lastUpdated: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    exchange: 'NASDAQ'
  },

  // Capital.com - Indices
  {
    id: 4001,
    symbol: 'US500',
    name: 'S&P 500 Index',
    description: 'S&P 500 Stock Index',
    marketId: 'index_spx',
    type: 'index',
    category: 'Indices',
    brokerName: 'Capital.com',
    isActive: true,
    metadata: null,
    lastUpdated: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    exchange: 'US'
  },
  {
    id: 4002,
    symbol: 'US30',
    name: 'Dow Jones Industrial Average',
    description: 'Dow Jones Industrial Average Index',
    marketId: 'index_dji',
    type: 'index',
    category: 'Indices',
    brokerName: 'Capital.com',
    isActive: true,
    metadata: null,
    lastUpdated: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    exchange: 'US'
  },
  {
    id: 4003,
    symbol: 'UK100',
    name: 'FTSE 100 Index',
    description: 'Financial Times Stock Exchange 100 Index',
    marketId: 'index_ftse',
    type: 'index',
    category: 'Indices',
    brokerName: 'Capital.com',
    isActive: true,
    metadata: null,
    lastUpdated: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    exchange: 'UK'
  },

  // Capital.com - Commodities
  {
    id: 5001,
    symbol: 'GOLD',
    name: 'Gold',
    description: 'Gold Commodity',
    marketId: 'commodity_gold',
    type: 'commodity',
    category: 'Commodities',
    brokerName: 'Capital.com',
    isActive: true,
    metadata: null,
    lastUpdated: new Date().toISOString(),
    createdAt: new Date().toISOString()
  },
  {
    id: 5002,
    symbol: 'SILVER',
    name: 'Silver',
    description: 'Silver Commodity',
    marketId: 'commodity_silver',
    type: 'commodity',
    category: 'Commodities',
    brokerName: 'Capital.com',
    isActive: true,
    metadata: null,
    lastUpdated: new Date().toISOString(),
    createdAt: new Date().toISOString()
  },
  {
    id: 5003,
    symbol: 'OIL.WTI',
    name: 'WTI Crude Oil',
    description: 'West Texas Intermediate Crude Oil',
    marketId: 'commodity_wti',
    type: 'commodity',
    category: 'Commodities',
    brokerName: 'Capital.com',
    isActive: true,
    metadata: null,
    lastUpdated: new Date().toISOString(),
    createdAt: new Date().toISOString()
  },

  // Interactive Brokers - Crypto
  {
    id: 6001,
    symbol: 'BTC/USD',
    name: 'Bitcoin / US Dollar',
    description: 'Bitcoin to US Dollar',
    marketId: 'crypto_btcusd',
    type: 'crypto',
    category: 'Crypto',
    brokerName: 'Interactive Brokers',
    isActive: true,
    metadata: null,
    lastUpdated: new Date().toISOString(),
    createdAt: new Date().toISOString()
  },
  {
    id: 6002,
    symbol: 'ETH/USD',
    name: 'Ethereum / US Dollar',
    description: 'Ethereum to US Dollar',
    marketId: 'crypto_ethusd',
    type: 'crypto',
    category: 'Crypto',
    brokerName: 'Interactive Brokers',
    isActive: true,
    metadata: null,
    lastUpdated: new Date().toISOString(),
    createdAt: new Date().toISOString()
  }
];

// List of categories for the trading pairs
export const mockCategories = [
  'All',
  'Crypto',
  'Forex', 
  'Stocks', 
  'Indices', 
  'Commodities', 
  'Bonds', 
  'Economy'
];
