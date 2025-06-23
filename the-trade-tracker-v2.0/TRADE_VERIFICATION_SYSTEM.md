# Trade Verification System

## Overview

I've implemented a comprehensive trade verification logging system to help you verify if your bot is actually placing real trades on Capital.com. This system logs both LLM trading decisions and actual trade executions so you can compare them.

## What Was Added

### 1. Trade Verification Logger Service

- **File**: `backend/services/trade-verification-logger.service.ts`
- **Purpose**: Logs all LLM decisions and actual Capital.com executions
- **Log Location**: `backend/logs/trade-verification.log`

### 2. Integration Points

#### LLM Decision Logging

- **Where**: `backend/agents/chains/trading-chain.ts`
- **What**: Logs every time the AI makes a trading decision
- **Includes**: Decision type, confidence, reasoning, raw LLM response

#### Actual Trade Execution Logging

- **Where**: `backend/agents/trading/trade-execution.agent.ts`
- **What**: Logs every actual API call to Capital.com
- **Includes**: Trade details, Capital.com response, success/failure status

### 3. Monitoring Script

- **File**: `backend/scripts/monitor-trades.js`
- **Purpose**: Easy way to view and monitor the trade logs
- **Usage**: `node backend/scripts/monitor-trades.js`

## How to Use

### 1. Start Your Bot

When your bot runs, it will automatically create the log file and start logging.

### 2. Monitor Real-Time Activity

```bash
# Run the monitoring script
node backend/scripts/monitor-trades.js

# Or monitor the log file directly (Windows PowerShell)
Get-Content "backend/logs/trade-verification.log" -Wait -Tail 10

# Or on Unix/Linux/macOS
tail -f backend/logs/trade-verification.log
```

### 3. What You'll See

#### LLM Decisions

```
🧠 LLM DECISION [2024-01-15T10:30:00.000Z]
Bot: trading-chain
Symbol: BTC/USD
Action: BUY
Confidence: 85%
Reasoning: Strong bullish momentum with RSI oversold recovery
Raw LLM Response: {"decision":"EXECUTE_TRADE","confidence":85...}
================================================================================
```

#### Actual Capital.com Executions

```
✅ CAPITAL.COM EXECUTION [2024-01-15T10:30:05.000Z]
Bot: execution-agent
Symbol: BTC/USD
Action: BUY
Amount: 0.01
Price: 43250.50
Success: true
Trade ID: DEAL123456789
Response: {"dealReference":"DEAL123456789","dealStatus":"ACCEPTED"...}
================================================================================
```

#### Failed Trades

```
❌ CAPITAL.COM EXECUTION [2024-01-15T10:35:00.000Z]
Bot: execution-agent
Symbol: BTC/USD
Action: SELL
Amount: 0.01
Price: 43100.25
Success: false
Error: Insufficient margin
Response: {"errorCode":"INSUFFICIENT_FUNDS"...}
================================================================================
```

## Verification Checklist

### ✅ Your Bot IS Trading for Real If You See:

1. **LLM decisions** followed by **Capital.com executions**
2. **Deal references** (like "DEAL123456789") in successful trades
3. **Actual prices** that match current market prices
4. **Trade confirmations** with Capital.com response data

### ❌ Your Bot is NOT Trading for Real If You See:

1. **Only LLM decisions** with no Capital.com executions
2. **All trades failing** with API errors
3. **Simulation messages** in the logs
4. **No deal references** in trade responses

## Troubleshooting

### No Log File Created

- Make sure your bot is running and making trading decisions
- Check that the `backend/logs/` directory exists
- Verify the bot has write permissions

### Only LLM Decisions, No Executions

- Check your Capital.com API credentials in `.env`
- Verify your bot has a valid broker credential configured
- Look for API connection errors in the main bot logs

### All Trades Failing

- Check if you're using demo vs live Capital.com credentials
- Verify your account has sufficient balance
- Check for Capital.com API rate limiting (429 errors)

## Log File Location

The verification log is saved to:

```
backend/logs/trade-verification.log
```

This file contains:

- All LLM trading decisions with full reasoning
- All Capital.com API calls and responses
- Success/failure status of each trade
- Timestamps for correlation

## Next Steps

1. **Start your bot** and let it run for a few minutes
2. **Run the monitoring script**: `node backend/scripts/monitor-trades.js`
3. **Compare LLM decisions with Capital.com executions**
4. **Check your Capital.com account** to verify trades appear there too

This system gives you complete transparency into whether your bot is actually trading or just simulating. You can now confidently verify that your AI trading decisions are being executed on the real Capital.com platform!
