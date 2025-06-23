/**
 * Utility to map trading symbols to their Capital.com equivalent epics
 * 
 * Capital.com uses specific epic IDs for each instrument, and these
 * sometimes differ from standard trading pair notation.
 */

// Common mappings for popular trading pairs
const SYMBOL_MAPPINGS: Record<string, string> = {
  // Cryptocurrency pairs
  'BTC/USD': 'CRYPTO:BTC/USD', // Bitcoin vs US Dollar
  'ETH/USD': 'CRYPTO:ETH/USD', // Ethereum vs US Dollar
  'XRP/USD': 'CRYPTO:XRP/USD', // Ripple vs US Dollar
  'LTC/USD': 'CRYPTO:LTC/USD', // Litecoin vs US Dollar
  'BNB/USD': 'CRYPTO:BNB/USD', // Binance Coin vs US Dollar
  'ADA/USD': 'CRYPTO:ADA/USD', // Cardano vs US Dollar
  'SOL/USD': 'CRYPTO:SOL/USD', // Solana vs US Dollar
  'DOGE/USD': 'CRYPTO:DOGE/USD', // Dogecoin vs US Dollar
  
  // Forex pairs
  'EUR/USD': 'EUR/USD', // Euro vs US Dollar
  'GBP/USD': 'GBP/USD', // British Pound vs US Dollar
  'USD/JPY': 'USD/JPY', // US Dollar vs Japanese Yen
  'USD/CAD': 'USD/CAD', // US Dollar vs Canadian Dollar
  'AUD/USD': 'AUD/USD', // Australian Dollar vs US Dollar
  
  // Stock indices
  'US500': 'US500', // S&P 500
  'US100': 'US100', // Nasdaq 100
  'Wall Street': 'Wall Street', // Dow Jones Industrial Average
  'UK100': 'UK100', // FTSE 100
  'Germany40': 'Germany40', // DAX 40
  
  // Commodities
  'Gold': 'Gold',
  'Silver': 'Silver',
  'Oil': 'Oil',
  'Natural Gas': 'Natural Gas'
};

/**
 * Convert a standard trading pair format to Capital.com epic format
 * 
 * @param symbol The standard trading pair symbol (e.g. 'BTC/USD')
 * @returns The Capital.com epic format or the original if not found
 */
export function convertToCapitalEpic(symbol: string): string {
  // Check if we have a direct mapping
  if (SYMBOL_MAPPINGS[symbol]) {
    console.log(`Using direct mapping for ${symbol}: ${SYMBOL_MAPPINGS[symbol]}`);
    return SYMBOL_MAPPINGS[symbol];
  }
  
  // For crypto pairs, try to use CRYPTO: prefix if it's in format X/Y
  if (symbol.includes('/')) {
    const cryptoFormat = `CRYPTO:${symbol}`;
    console.log(`No direct mapping found, trying crypto format: ${cryptoFormat}`);
    return cryptoFormat;
  }
  
  // Return the original symbol as fallback
  console.log(`No mapping found for ${symbol}, using as-is`);
  return symbol;
}

/**
 * Check if a symbol is likely a cryptocurrency pair
 * 
 * @param symbol The symbol to check
 * @returns True if it's likely a crypto pair
 */
export function isCryptoPair(symbol: string): boolean {
  const cryptoSymbols = ['BTC', 'ETH', 'XRP', 'LTC', 'ADA', 'DOT', 'SOL', 'AVAX', 'DOGE', 'SHIB', 'MATIC'];
  
  if (symbol.includes('/')) {
    const base = symbol.split('/')[0];
    return cryptoSymbols.some(crypto => base.includes(crypto));
  }
  
  return cryptoSymbols.some(crypto => symbol.includes(crypto));
}
