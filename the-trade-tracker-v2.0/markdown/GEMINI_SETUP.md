# 🤖 Gemini AI Setup Guide

## Environment Variables Required

Create a `.env` file in the backend directory with the following variables:

```bash
# Google Gemini AI Configuration
GOOGLE_API_KEY=your_google_gemini_api_key_here

# Database Configuration
DATABASE_URL=your_database_url_here

# Capital.com API Configuration
CAPITAL_API_KEY=your_capital_api_key_here
CAPITAL_API_SECRET=your_capital_api_secret_here
CAPITAL_API_URL=https://api-capital.backend-capital.com

# Application Configuration
NODE_ENV=development
PORT=3000

# Logging Configuration
LOG_LEVEL=info

# Trading Configuration
MAX_RISK_PER_TRADE=0.02
MAX_TOTAL_EXPOSURE=0.20
DEFAULT_STOP_LOSS=0.02
DEFAULT_TAKE_PROFIT=0.04

# LangChain Configuration
LANGCHAIN_VERBOSE=true
LANGCHAIN_MAX_ITERATIONS=5
LANGCHAIN_TIMEOUT=30000
```

## Getting Your Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key
5. Add it to your `.env` file as `GOOGLE_API_KEY`

## Gemini Model Configuration

The system is configured to use:

- **Model**: `gemini-pro`
- **Temperature**: `0` (for consistent trading decisions)
- **Max Output Tokens**: `2000`

## Updated LangChain Configuration

All chains and agents have been updated to use Google Gemini instead of OpenAI:

- ✅ `RiskAnalysisChain` → Uses Gemini for risk assessment
- ✅ `TradingChain` → Uses Gemini for trading decisions
- ✅ `PortfolioSyncChain` → Uses Gemini for portfolio synchronization
- ✅ `TechnicalAnalysisAgent` → Uses Gemini for market analysis

## Testing the Configuration

After setting up your API key, you can test the configuration by running:

```bash
npm run dev
```

The system will automatically initialize all Gemini-powered agents and chains.

## Cost Considerations

Gemini Pro pricing (as of 2024):

- **Free tier**: 60 requests per minute
- **Paid tier**: $0.50 per 1M input tokens, $1.50 per 1M output tokens

For production trading, consider the paid tier for higher rate limits.
