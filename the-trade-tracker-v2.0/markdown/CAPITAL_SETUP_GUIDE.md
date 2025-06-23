# 🚀 Capital.com Trading Setup Guide

This guide will help you configure your Capital.com API credentials to enable **live trading** with your trading bots.

## ⚠️ IMPORTANT: Trading Configuration Issue Fixed

The trading system was previously trying to use environment variables for Capital.com credentials, but it now correctly uses **your individual broker credentials stored in the database**. Each user can have their own Capital.com account connected.

---

## 📋 Prerequisites

1. **Capital.com Account** (Demo or Live)
2. **Two-Factor Authentication** enabled on your Capital.com account
3. **API Key** generated from Capital.com

---

## 🔧 Step 1: Create Capital.com Account

1. Go to [Capital.com](https://capital.com/)
2. Choose **Demo Account** (recommended for testing) or **Live Account**
3. Complete registration and verify your email

---

## 🔐 Step 2: Enable Two-Factor Authentication

**Required before API key generation**

1. Log into your Capital.com account
2. Go to **Settings** → **Security**
3. Enable **Two-Factor Authentication**
4. Follow the setup instructions

---

## 🔑 Step 3: Generate API Key

1. In Capital.com, go to **Settings** → **API Integrations**
2. Click **"Generate API Key"**
3. Enter your 2FA code
4. Provide a name: `"Trade Tracker Bot"`
5. **Set a custom password** (different from your account password)
6. Choose expiration date (optional - defaults to 1 year)
7. **Save the API key immediately** - it's only shown once!

---

## 💾 Step 4: Add Credentials to Trade Tracker

### Option A: Through the Web Interface (Recommended)

1. Open the Trade Tracker application
2. Go to **Broker Credentials** section
3. Click **"Add New Credential"**
4. Select **"Capital.com"** as broker
5. Fill in your credentials:
   - **API Key**: The key you just generated
   - **Username**: Your Capital.com login email
   - **Password**: The **custom API password** (NOT your account password)
   - **Demo Mode**: Check if using demo account

### Option B: Direct Database Entry

If you need to add credentials directly to the database:

```sql
INSERT INTO broker_credentials (
  user_id,
  name,
  broker,
  credentials,
  is_active
) VALUES (
  'your-user-id',
  'Capital.com Main Account',
  'capital',
  '{"apiKey":"your-api-key","identifier":"your-email","password":"your-api-password","isDemo":true}',
  true
);
```

---

## 🤖 Step 5: Configure Your Trading Bot

1. **Create or Edit a Bot**
2. **Select your Capital.com broker credential**
3. **Configure risk parameters**:

   - Position size (e.g., 0.1 lots)
   - Stop loss distance (e.g., 50 pips)
   - Take profit distance (e.g., 100 pips)
   - Maximum risk per trade (e.g., 2%)

4. **Enable AI Trading**:
   - Toggle **"Active"** to start evaluation
   - Toggle **"AI Trading"** to enable trade execution

---

## 📊 Step 6: Monitor Live Trades

### New Trading Dashboard Features:

- **Live Trade Tracking**: Real-time P&L updates from Capital.com
- **Active Positions**: Monitor all open trades with live data
- **Trade History**: Complete trading history with performance metrics
- **Risk Management**: Update stop loss and take profit levels

### API Endpoints Available:

- `GET /api/v1/trades/bot/{botId}?syncLive=true` - All trades with live data
- `GET /api/v1/trades/bot/{botId}/active` - Active trades with real-time P&L
- `POST /api/v1/trades/{tradeId}/close` - Close a specific trade
- `PATCH /api/v1/trades/{tradeId}` - Update trade parameters
- `GET /api/v1/trades/bot/{botId}/summary` - Trading performance summary

---

## 🔍 Step 7: Verify Setup

### Check Trading Logs

Monitor the backend logs for these confirmations:

```
✅ [BOT SERVICE] Bot is active and AI trading is enabled
✅ [BOT SERVICE] Confidence X% meets threshold 70%, executing trade...
✅ [BOT SERVICE] Trade executed successfully: [trade-id]
✅ Capital.com API session created successfully for account [account-id]
```

### Test Trade Execution

1. Ensure your bot has sufficient confidence threshold (70%+ default)
2. Check that the bot evaluation generates high-confidence signals
3. Monitor the Capital.com account for actual position creation

---

## ⚙️ Configuration Parameters

### Risk Management Settings

```json
{
  "positionSize": 1.0, // Lot size per trade (minimum 1.0 for most Capital.com instruments)
  "maxRiskPerTrade": 0.02, // 2% risk per trade
  "stopLossDistance": 50, // Pips from entry
  "takeProfitDistance": 100, // Pips from entry
  "confidenceThreshold": 70 // Minimum AI confidence %
}
```

### Strategy Configuration

Your strategy indicators are automatically extracted and used for chart analysis:

- **SMA** (Simple Moving Average)
- **EMA** (Exponential Moving Average)
- **MACD** (Moving Average Convergence Divergence)
- **Bollinger Bands**
- **RSI** (Relative Strength Index)

---

## 🛠️ Troubleshooting

### Common Issues:

#### ❌ "Missing Capital.com API credentials"

- **Solution**: Add your broker credentials through the web interface
- Check that credentials are associated with your user account

#### ❌ "Authentication failed"

- **Solution**: Verify API key, username, and custom password
- Ensure 2FA is enabled on Capital.com account
- Check if API key has expired

#### ❌ "Trade execution failed" / "error.invalid.size.minvalue"

- **Solution**: Position size is below Capital.com's minimum deal size
- **Fixed**: System now automatically adjusts position sizes to meet minimum requirements
- Default position size increased from 0.1 to 1.0 lots
- Check that trading pair is available on Capital.com
- Ensure demo/live mode matches your account type

#### ❌ Bot evaluates but doesn't trade

- **Solution**: Check AI confidence threshold (default 70%)
- Verify both "Active" and "AI Trading" are enabled
- Review risk parameters and position sizing

---

## 📈 Performance Monitoring

### Live Trade Metrics:

- **Real-time P&L**: Updated from Capital.com API
- **Win Rate**: Percentage of profitable trades
- **Average P&L**: Mean profit/loss per trade
- **Risk Metrics**: Drawdown and risk-adjusted returns
- **Trade Frequency**: Number of trades per time period

### Capital.com Integration:

- **Live Position Data**: Real-time position updates
- **Market Data**: Current prices and spreads
- **Account Information**: Balance and margin requirements
- **Order Management**: Create, modify, and close positions

---

## 🔒 Security Best Practices

1. **Use Demo Account** for initial testing
2. **Set API Key Expiration** (1 year maximum)
3. **Monitor Trade Activity** regularly
4. **Set Conservative Risk Limits** initially
5. **Keep API Credentials Secure** - never share or commit to code
6. **Regular Security Audits** of your Capital.com account

---

## 💡 Next Steps

1. **Start with Demo Trading** to verify setup
2. **Monitor Performance** for at least a week
3. **Adjust Risk Parameters** based on results
4. **Scale Position Sizes** gradually
5. **Consider Live Trading** only after thorough testing

---

## 📞 Support

If you encounter issues:

1. Check the **backend logs** for detailed error messages
2. Verify **Capital.com account status** and API permissions
3. Review the **trading bot configuration**
4. Test **API connectivity** with simple market data requests

**Happy Trading! 🚀📈**
