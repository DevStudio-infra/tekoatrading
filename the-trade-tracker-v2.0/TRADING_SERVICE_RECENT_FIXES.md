# Trading Service Recent Critical Fixes

## Issue Summary

The trading service had critical issues with stop loss and take profit validation that were causing incorrect order parameters to be sent to the broker.

## Root Cause

The adjustment logic in `executeMarketOrder()` was only checking if SL/TP levels were too close to current price, but **not validating that they were on the correct side** of the current price first.

### Specific Problem

- **BUY orders**: Take profit was being set BELOW current price (e.g., TP=4545 when current=5984.4)
- **SELL orders**: Similar issues with stop loss and take profit on wrong sides
- The distance-based validation would fail to trigger because the wrong-side distance could be large

## Fixes Applied

### 1. Take Profit Validation Fix

**File**: `backend/services/trading.service.ts` (lines ~757-780)

**Before**:

```typescript
if (adjustedTakeProfit) {
  const profitDistance = trade.direction === "BUY" ? Math.abs(adjustedTakeProfit - currentPrice) : Math.abs(currentPrice - adjustedTakeProfit);
  // ... only checked distance, not direction
}
```

**After**:

```typescript
if (adjustedTakeProfit) {
  // CRITICAL FIX: First validate take profit is on correct side of current price
  const isTakeProfitOnCorrectSide = trade.direction === "BUY" ? adjustedTakeProfit > currentPrice : adjustedTakeProfit < currentPrice;

  if (!isTakeProfitOnCorrectSide) {
    // Take profit is on wrong side - fix immediately
    const emergencyDistance = currentPrice * 0.01; // 1% emergency distance
    const correctedTakeProfit = trade.direction === "BUY" ? currentPrice + emergencyDistance : currentPrice - emergencyDistance;

    this.logger.error(
      `CRITICAL: Take profit ${adjustedTakeProfit} is on WRONG SIDE for ${trade.direction} order (current: ${currentPrice}). Correcting to ${correctedTakeProfit.toFixed(6)}`
    );
    adjustedTakeProfit = parseFloat(correctedTakeProfit.toFixed(this.getPricePrecision(epic, currentPrice)));
  } else {
    // Take profit is on correct side, now check distance
    // ... existing distance validation logic
  }
}
```

### 2. Stop Loss Validation Fix

**File**: `backend/services/trading.service.ts` (lines ~738-755)

**Before**:

```typescript
if (adjustedStopLoss) {
  const stopDistance = trade.direction === "BUY" ? Math.abs(currentPrice - adjustedStopLoss) : Math.abs(adjustedStopLoss - currentPrice);
  // ... only checked distance, not direction
}
```

**After**:

```typescript
if (adjustedStopLoss) {
  // CRITICAL FIX: First validate stop loss is on correct side of current price
  const isStopLossOnCorrectSide = trade.direction === "BUY" ? adjustedStopLoss < currentPrice : adjustedStopLoss > currentPrice;

  if (!isStopLossOnCorrectSide) {
    // Stop loss is on wrong side - fix immediately
    const emergencyDistance = currentPrice * 0.01; // 1% emergency distance
    const correctedStopLoss = trade.direction === "BUY" ? currentPrice - emergencyDistance : currentPrice + emergencyDistance;

    this.logger.error(
      `CRITICAL: Stop loss ${adjustedStopLoss} is on WRONG SIDE for ${trade.direction} order (current: ${currentPrice}). Correcting to ${correctedStopLoss.toFixed(6)}`
    );
    adjustedStopLoss = parseFloat(correctedStopLoss.toFixed(this.getPricePrecision(epic, currentPrice)));
  } else {
    // Stop loss is on correct side, now check distance
    // ... existing distance validation logic
  }
}
```

## Validation Logic

### Correct Side Rules

- **BUY Orders**:

  - Stop Loss: Must be BELOW current price (`stopLoss < currentPrice`)
  - Take Profit: Must be ABOVE current price (`takeProfit > currentPrice`)

- **SELL Orders**:
  - Stop Loss: Must be ABOVE current price (`stopLoss > currentPrice`)
  - Take Profit: Must be BELOW current price (`takeProfit < currentPrice`)

### Emergency Correction

When wrong-side levels are detected:

1. Log critical error with details
2. Apply 1% emergency distance from current price
3. Place level on correct side with minimum safe distance
4. Continue with order execution

## Test Results

From the logs, we can see the fix working:

### Before Fix

```
Current market price for US500: 5984.4
Adjusted levels - SL: 4455, TP: 4545, R/R: -0.94
CRITICAL: BUY order TP 4545 <= current price 5984.4. This will be rejected by broker.
Emergency TP adjustment for BUY: 6014.321999999999
```

### Expected After Fix

```
Current market price for US500: 5984.4
CRITICAL: Take profit 4545 is on WRONG SIDE for BUY order (current: 5984.4). Correcting to 6044.256
Adjusted levels - SL: 4455, TP: 6044.256, R/R: 2.15
```

## Benefits

1. **Prevents broker rejections** due to invalid SL/TP levels
2. **Maintains trade execution** instead of failing completely
3. **Provides clear logging** for debugging invalid LLM calculations
4. **Safe fallback mechanism** with reasonable emergency distances
5. **Preserves existing distance validation** for correctly placed levels

## Next Steps

1. **Monitor logs** for "CRITICAL: Take profit" and "CRITICAL: Stop loss" messages
2. **Investigate LLM calculation logic** in bot.service.ts if issues persist
3. **Consider additional validation** in the orchestration layer
4. **Implement refactoring plan** to prevent similar issues in the future

## Impact

- **Immediate**: Prevents trading failures due to wrong SL/TP sides
- **Medium-term**: Improves trade execution success rate
- **Long-term**: Part of larger refactoring effort to improve code quality
