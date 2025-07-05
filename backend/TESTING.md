# Capital.com Trading Tests

This directory contains comprehensive tests for the Capital.com trading integration to verify that all trading operations work correctly.

## Test Files

### 1. `capital-trading-tests.ts`

Comprehensive test suite that covers:

- Authentication and account management
- Market data retrieval
- Position sizing calculations
- Broker limit validation
- Market order creation (BUY/SELL)
- Pending order creation (LIMIT/STOP)
- Position management (modify, close)
- Error handling and edge cases

### 2. `quick-capital-test.ts`

Quick verification test that checks:

- Basic authentication
- Account details
- Market data access
- Price data retrieval
- Position sizing
- Broker validation
- Optional small market order test

## Running Tests

### Prerequisites

1. Make sure you have valid Capital.com credentials
2. Update credentials in the test files or environment variables
3. Ensure the backend dependencies are installed

### Quick Test (Recommended)

```bash
npm run test:quick
```

### Full Test Suite

```bash
npm run test:capital
```

## Test Credentials

The tests use the following credentials (configured for demo environment):

- API Key: `brPsM2gr0wqsm6aV`
- Identifier: `raphael.malburg@gmail.com`
- Password: `Laquie8501@`
- Demo Mode: `true`

## Safety Features

### Demo Environment

- All tests run in demo mode by default
- No real money is at risk
- Real positions are created but on demo accounts

### Position Cleanup

- Tests automatically clean up any positions they create
- Small position sizes are used (0.001 units)
- Positions are closed immediately after testing

### Error Handling

- Comprehensive error logging
- Graceful handling of API failures
- Detailed test result reporting

## Test Categories

### 1. Connection Tests

- ✅ Authentication
- ✅ Account details
- ✅ Session management

### 2. Data Tests

- ✅ Market data retrieval
- ✅ Price data access
- ✅ Epic resolution

### 3. Calculation Tests

- ✅ Position sizing
- ✅ Risk management
- ✅ Broker limit validation

### 4. Order Tests

- ✅ Market orders
- ✅ Limit orders
- ✅ Stop orders
- ✅ Orders with stop loss
- ✅ Orders with take profit

### 5. Position Management

- ✅ Position modification
- ✅ Partial position closing
- ✅ Full position closing

### 6. Error Handling

- ✅ Invalid parameters
- ✅ Insufficient funds
- ✅ Market closed scenarios

## Expected Results

### Successful Tests

When all systems are working correctly, you should see:

- Authentication successful
- Account balance displayed
- Market data retrieved
- Price data current
- Position sizing calculations
- Valid broker limit validation
- Order creation and closing (if enabled)

### Common Issues

#### Authentication Failures

- Check credentials are correct
- Verify demo mode is enabled
- Ensure Capital.com API is accessible

#### Market Data Issues

- Check internet connectivity
- Verify symbol format (BTCUSD, EURUSD, etc.)
- Ensure market is open or use 24/7 crypto pairs

#### Order Execution Problems

- Check account balance
- Verify position size is valid
- Ensure stop loss/take profit levels are reasonable

## Debugging

### Enable Debug Logging

Set environment variable:

```bash
LOG_LEVEL=debug npm run test:quick
```

### Check Test Results

Tests provide detailed output including:

- Test execution time
- Success/failure status
- Error messages with stack traces
- Data returned from API calls

### Manual Testing

You can also run individual test functions:

```typescript
import { quickTest } from "./src/tests/quick-capital-test";
quickTest();
```

## Important Notes

⚠️ **Warning**: Even though tests run in demo mode, they create real API calls and positions. Always verify demo mode is enabled.

✅ **Safe**: The tests use very small position sizes (0.001 units) and automatically clean up.

🔍 **Monitoring**: Check the test output for any failures or warnings about your trading setup.

## Troubleshooting

### Test Failures

1. Check your internet connection
2. Verify Capital.com credentials
3. Ensure the Capital.com API is accessible
4. Check if markets are open (use crypto pairs for 24/7 trading)
5. Verify account has sufficient balance

### Performance Issues

1. Tests may take 1-2 minutes to complete
2. Network latency affects test duration
3. API rate limits may slow down tests

### Integration Issues

1. Ensure all backend services are running
2. Check database connectivity
3. Verify all dependencies are installed

## Support

If tests fail consistently:

1. Check the Capital.com API status
2. Verify your account credentials
3. Review the error logs
4. Check network connectivity
5. Ensure demo mode is working

For additional help, check the main project documentation or contact support.
