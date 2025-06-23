# Tekoa Trading Platform

A sophisticated, AI-powered trading platform built with modern technologies for automated forex and cryptocurrency trading.

## 🚀 Features

### Core Trading Features

- **Real-time Market Data**: Live price feeds with WebSocket connections
- **AI-Powered Trading Bots**: Intelligent automated trading with machine learning
- **Advanced Risk Management**: Sophisticated position sizing and risk controls
- **Multi-Broker Integration**: Support for Capital.com and extensible to other brokers
- **Real-time Portfolio Tracking**: Live P&L monitoring and performance analytics

### Platform Capabilities

- **Professional Trading Dashboard**: Real-time overview with market data and bot status
- **Comprehensive Bot Management**: Full CRUD operations for trading bots
- **Strategy Development**: Create and backtest custom trading strategies
- **Advanced Charts**: Technical analysis with multiple indicators and timeframes
- **Portfolio Analytics**: Detailed performance tracking and trade history

### Technical Infrastructure

- **Modern Tech Stack**: Next.js 14, TypeScript, tRPC, Prisma, PostgreSQL
- **Real-time Communication**: WebSocket integration for live data
- **AI Integration**: LangChain with Google Gemini for intelligent analysis
- **Production-Ready**: Scalable architecture with comprehensive error handling

## 🏗️ Architecture

### Backend Services

- **BrokerIntegrationService**: Real trading execution and position management
- **BotEvaluationService**: AI-powered trade analysis and execution
- **MarketDataService**: Real-time price monitoring and data feeds
- **WebSocketService**: Live communication and notifications

### Database Schema

- **Enhanced Prisma Models**: 10+ sophisticated models with relationships
- **Comprehensive Entities**: Users, Bots, Strategies, Trades, Positions, Evaluations
- **Performance Tracking**: Detailed metrics and analytics storage

### Frontend Components

- **TradingDashboard**: Real-time overview with live data simulation
- **Bot Management**: Comprehensive CRUD with performance metrics
- **Portfolio Tracker**: Multi-tab interface with positions and trade history
- **Strategy Builder**: Advanced strategy creation with risk management
- **Chart Analysis**: Professional charting with technical indicators

## 🛠️ Technology Stack

### Backend

- **Runtime**: Node.js with TypeScript
- **Framework**: tRPC for type-safe APIs
- **Database**: PostgreSQL with Prisma ORM
- **AI**: LangChain + Google Gemini
- **Real-time**: Socket.io + WebSocket
- **Trading**: Capital.com API integration

### Frontend

- **Framework**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS
- **State Management**: tRPC React Query
- **UI Components**: Custom responsive components
- **Real-time**: WebSocket client integration

### Infrastructure

- **Database**: PostgreSQL
- **Containerization**: Docker support
- **Version Control**: Git with GitHub
- **Package Management**: npm

## 📦 Installation & Setup

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Capital.com API credentials (for live trading)
- Google Gemini API key (for AI features)

### Quick Start

1. **Clone the Repository**

   ```bash
   git clone https://github.com/RaphaelMalburg/TekoaTrading.git
   cd tekoa-trading
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Environment Setup**

   ```bash
   # Backend (.env)
   DATABASE_URL="postgresql://user:password@localhost:5432/tekoa_trading"
   GOOGLE_GEMINI_API_KEY="your_gemini_api_key"
   CAPITAL_API_KEY="your_capital_api_key"
   CAPITAL_IDENTIFIER="your_capital_identifier"
   CAPITAL_PASSWORD="your_capital_password"

   # Frontend (.env.local)
   NEXT_PUBLIC_API_URL="http://localhost:3001"
   ```

4. **Database Setup**

   ```bash
   cd backend
   npx prisma migrate dev
   npx prisma db seed
   ```

5. **Start Development**

   ```bash
   # Backend (Terminal 1)
   cd backend
   npm run dev

   # Frontend (Terminal 2)
   cd frontend
   npm run dev
   ```

6. **Access the Platform**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

## 🎯 Usage Guide

### 1. Dashboard Overview

- Monitor real-time market data and portfolio performance
- Track active trading bots and their status
- View live P&L and position updates

### 2. Bot Management

- Create sophisticated trading bots with custom parameters
- Configure risk management settings
- Enable AI-powered trading decisions
- Monitor bot performance and metrics

### 3. Strategy Development

- Build custom trading strategies with multiple indicators
- Set entry and exit conditions
- Configure risk-reward ratios
- Backtest strategy performance

### 4. Portfolio Tracking

- Monitor all positions and trades in real-time
- Analyze performance across different timeframes
- Track win rates and profitability metrics

### 5. Chart Analysis

- Access professional charting tools
- Apply technical indicators and overlays
- Save and manage chart configurations
- Perform detailed technical analysis

## 🔧 Configuration

### Trading Bot Configuration

```typescript
{
  name: "EUR Scalper",
  tradingPairSymbol: "EURUSD",
  timeframe: "M15",
  maxPositionSize: 1000,
  riskPercentage: 2,
  isAiTradingActive: true
}
```

### Strategy Configuration

```typescript
{
  name: "Trend Following Strategy",
  type: "trend_following",
  timeframe: "H4",
  maxRisk: 3,
  stopLoss: 2,
  takeProfit: 6,
  indicators: ["SMA", "ADX", "Bollinger"]
}
```

## 📊 Performance Features

### Real-time Metrics

- Live P&L tracking
- Position monitoring
- Win rate calculations
- Risk exposure analysis

### Analytics Dashboard

- Performance over time
- Strategy effectiveness
- Bot comparison metrics
- Market correlation analysis

## 🔐 Security & Risk Management

### Built-in Safety Features

- Position size limits
- Maximum risk per trade
- Stop-loss enforcement
- Account balance protection

### API Security

- Secure credential storage
- Encrypted communications
- Rate limiting protection
- Error handling and recovery

## 🚀 Deployment

### Production Deployment

1. Set up PostgreSQL database
2. Configure environment variables
3. Build and deploy backend service
4. Build and deploy frontend application
5. Set up monitoring and logging

### Docker Deployment

```bash
docker-compose up -d
```

## 📈 Roadmap

### Planned Features

- [ ] Advanced backtesting engine
- [ ] Multi-broker support expansion
- [ ] Mobile application
- [ ] Social trading features
- [ ] Advanced AI models
- [ ] Webhook integrations

### Current Status

- ✅ Core trading infrastructure
- ✅ AI-powered bot evaluation
- ✅ Real-time market data
- ✅ Comprehensive frontend
- ✅ Portfolio management
- ✅ Strategy development tools

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

- Create an issue on GitHub
- Check the documentation
- Review the code examples

## 🙏 Acknowledgments

- Capital.com for trading API
- Google Gemini for AI capabilities
- Open source community for tools and libraries

---

**Disclaimer**: This software is for educational and research purposes. Trading involves substantial risk of loss. Use at your own risk and never trade with money you cannot afford to lose.
