# Automatic Stale Trades Cleanup - Problem & Solution

## The Problem You Identified ✅

You were absolutely right! The system was detecting **stale trades in the database** (trades older than 24 hours) but was only logging warnings like:

```
⚠️ Bot has 3 potentially stale trades (>24h old). Consider manual cleanup.
Bot has reached max simultaneous trades: 3/3
```

This created a **terrible user experience** where:

- Bots couldn't open new positions because they thought they had reached max trades
- Users had to **manually track and clean up** old trades
- The system suggested "manual cleanup" instead of doing it automatically
- Users had no visibility into what trades needed cleanup or how to do it

## Root Cause Analysis

The stale trades were **database inconsistencies** where:

1. Trades in the database showed as "OPEN" status
2. But these positions may have been closed on the broker side (Capital.com)
3. The position sync wasn't properly reconciling these differences
4. The system detected this but only warned instead of fixing it automatically

## The Complete Solution ✅

### 1. **Automatic Cleanup on Detection**

- **Before**: System logged "Consider manual cleanup" and did nothing
- **After**: System automatically triggers cleanup when stale trades are detected
- **Code**: Modified `getActiveTrades()` in `risk-management.service.ts` to call `cleanupStaleTrades(botId, 24, false)` automatically

### 2. **Broker Verification Before Cleanup**

Enhanced the cleanup process to be **safer and more intelligent**:

```typescript
// NEW: Verify with Capital.com API before closing trades
if (capitalApi && trade.brokerDealId) {
  const brokerPosition = await capitalApi.getPositionById(trade.brokerDealId);
  if (brokerPosition) {
    // Position still exists on broker - don't auto-close
    this.logger.warn(`Trade is stale but still open on broker. Manual review needed.`);
  } else {
    // Position closed on broker - safe to auto-close
    closeReason = "Position closed on broker (stale trade cleanup)";
  }
}
```

### 3. **Smart Cleanup Rules**

- **24h+ with broker verification**: Auto-close if confirmed closed on broker
- **48h+ without broker verification**: Auto-close with warning (assumes very stale)
- **Stale but still open on broker**: Keep open, log for manual review
- **Failed broker verification**: Only close if extremely old (48h+)

### 4. **Manual Cleanup API (Backup)**

Added API endpoint for manual cleanup if needed:

- **Endpoint**: `POST /api/bots/:id/cleanup-stale-trades`
- **Parameters**: `{ maxAgeHours: 24, dryRun: false }`
- **Returns**: Detailed cleanup results with verification stats

### 5. **Enhanced Logging & Tracking**

- **Before**: Generic "consider manual cleanup" warning
- **After**: Detailed logs showing exactly what was cleaned up and why:

```
✅ Automatically cleaned up 3 stale trades for bot (verified 2 with broker)
Auto-closed stale trade abc123: Position closed on broker (stale trade cleanup)
```

## Results & Benefits

### For Bots 🤖

- **No more stuck bots**: Automatically frees up position slots for new trades
- **Accurate position tracking**: Database stays in sync with actual broker positions
- **Better risk management**: Prevents phantom positions from affecting risk calculations

### For Users 👤

- **Zero manual intervention**: System handles stale trades automatically
- **No more confusion**: Clear logging shows what happened and why
- **Better reliability**: Bots can continue trading without getting stuck
- **Optional manual control**: API available if manual cleanup is needed

### For System Health 🔧

- **Database accuracy**: Keeps trade status in sync with broker reality
- **Reduced support burden**: Fewer user reports about "stuck" bots
- **Better monitoring**: Clear distinction between real issues and cleanup events

## Testing the Fix

The system will now automatically:

1. Detect stale trades during normal bot evaluation cycles
2. Verify status with Capital.com API
3. Auto-close confirmed closed positions
4. Log detailed results for monitoring
5. Free up position slots for new trades

**No user action required** - the cleanup happens automatically in the background!

## API Usage (Optional)

If you ever want to manually trigger cleanup:

```bash
POST /api/bots/{botId}/cleanup-stale-trades
{
  "maxAgeHours": 24,
  "dryRun": false
}
```

Response:

```json
{
  "message": "Cleaned up stale trades successfully",
  "result": {
    "found": 3,
    "cleaned": 2,
    "verified": 2,
    "trades": [...],
    "dryRun": false
  }
}
```

## Summary

✅ **Problem Fixed**: No more manual cleanup needed
✅ **Bots Unblocked**: Automatic position slot freeing
✅ **Smart & Safe**: Broker verification before cleanup
✅ **Full Visibility**: Detailed logging of all actions
✅ **Zero User Effort**: Completely automated background process
