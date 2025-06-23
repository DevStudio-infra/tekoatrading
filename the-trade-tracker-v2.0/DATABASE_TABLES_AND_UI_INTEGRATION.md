# Database Tables & UI Integration Guide

## ✅ Confirmed: ALL Tables Are Actively Used

After cleanup, we now have **11 essential tables** that are all actively used in the codebase. This document outlines what data each table provides and how it should be integrated into the UI.

---

## 📊 Core Tables & UI Integration

### 1. 👤 **User Table**

**Purpose**: Authentication and user management
**Usage**: Core authentication, user profiles

#### UI Data Requirements:

```typescript
interface UserDisplay {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  username?: string;
  createdAt: Date;
}
```

#### UI Components Needed:

- **User Profile Page**: Display user info, edit profile
- **Header/Navigation**: User avatar, name, dropdown menu
- **Settings Page**: Account management

---

### 2. 🤖 **Bot Table**

**Purpose**: Trading bot management with cached performance metrics
**Usage**: Bot creation, management, performance tracking

#### UI Data Requirements:

```typescript
interface BotDisplay {
  id: string;
  name: string;
  isActive: boolean;
  isAiTradingActive: boolean;
  tradingPairSymbol?: string;
  timeframe: string;
  maxSimultaneousTrades: number;

  // Performance Cache (for quick display)
  totalPnL?: number;
  totalTrades: number;
  winRate?: number;
  maxDrawdown?: number;
  lastPerformanceUpdate?: Date;

  // Related data
  strategy: Strategy;
  brokerCredential: BrokerCredential;
}
```

#### UI Components Needed:

- **Bot Dashboard**: Grid/list of all bots with status
- **Bot Detail Page**: Full bot configuration and performance
- **Bot Creation Form**: Create new bots
- **Bot Status Cards**: Quick performance overview
- **Performance Charts**: P&L, win rate, drawdown graphs

---

### 3. 📈 **Trade Table**

**Purpose**: Complete trade lifecycle tracking
**Usage**: Active trading operations, trade history, performance analysis

#### UI Data Requirements:

```typescript
interface TradeDisplay {
  id: string;
  symbol: string;
  direction: "BUY" | "SELL";
  orderType: "MARKET" | "LIMIT" | "STOP";
  quantity: number;
  entryPrice?: number;
  currentPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  status: "PENDING" | "OPEN" | "CLOSED" | "CANCELLED";
  profitLoss?: number;
  profitLossPercent?: number;
  tradeDurationMinutes?: number;
  riskRewardRatio?: number;
  openedAt?: Date;
  closedAt?: Date;
  rationale?: string;
  aiConfidence?: number;
}
```

#### UI Components Needed:

- **Active Trades Table**: Real-time open positions
- **Trade History**: Paginated list of closed trades
- **Trade Detail Modal**: Full trade information
- **P&L Chart**: Profit/loss over time
- **Trade Analytics**: Performance metrics, risk analysis

---

### 4. 📍 **Position Table**

**Purpose**: Historical position tracking
**Usage**: Position history, portfolio analysis

#### UI Data Requirements:

```typescript
interface PositionDisplay {
  id: number;
  symbol: string;
  side: "long" | "short";
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  status: "open" | "closed";
  pnl?: number;
  pnlPercent?: number;
  entryTime: Date;
  exitTime?: Date;
  notes?: string;
}
```

#### UI Components Needed:

- **Position History**: Table of all positions
- **Portfolio Overview**: Current and historical positions
- **Position Analytics**: Performance by symbol, timeframe

---

### 5. 🎯 **Strategy Table**

**Purpose**: Trading strategy definitions
**Usage**: Strategy management, bot configuration

#### UI Data Requirements:

```typescript
interface StrategyDisplay {
  id: string;
  name: string;
  type: string;
  description: string;
  category?: string;
  parameters: any; // JSON object
  minRiskPerTrade: number;
  maxRiskPerTrade: number;
  confidenceThreshold: number;
  isDefault: boolean;
  createdAt: Date;
}
```

#### UI Components Needed:

- **Strategy Library**: Grid/list of available strategies
- **Strategy Editor**: Create/edit custom strategies
- **Strategy Detail**: View strategy parameters and rules
- **Strategy Performance**: Backtest results, usage analytics

---

### 6. 📋 **StrategyTemplate Table**

**Purpose**: Predefined strategy templates
**Usage**: Quick strategy creation, strategy marketplace

#### UI Data Requirements:

```typescript
interface StrategyTemplateDisplay {
  id: string;
  name: string;
  category: string;
  description: string;
  shortDescription: string;
  complexity: "beginner" | "intermediate" | "advanced";
  marketCondition: string;
  winRateExpected?: number;
  riskRewardRatio?: number;
  usageCount: number;
  isActive: boolean;
}
```

#### UI Components Needed:

- **Template Marketplace**: Browse available templates
- **Template Cards**: Preview with key metrics
- **Template Detail**: Full description and configuration
- **Template Usage Stats**: Popularity, performance metrics

---

### 7. 🔐 **BrokerCredential Table**

**Purpose**: Broker API connection management
**Usage**: Broker account setup, trading connections

#### UI Data Requirements:

```typescript
interface BrokerCredentialDisplay {
  id: string;
  name: string;
  broker: string;
  isActive: boolean;
  createdAt: Date;
  // credentials: JSON (sensitive - don't display)
}
```

#### UI Components Needed:

- **Broker Setup**: Add/edit broker credentials
- **Credential List**: Manage connected accounts
- **Connection Status**: Show active/inactive status
- **Security Settings**: Manage API keys securely

---

### 8. 📊 **TradingPair Table**

**Purpose**: Available trading symbols
**Usage**: Symbol selection, market data

#### UI Data Requirements:

```typescript
interface TradingPairDisplay {
  id: number;
  symbol: string;
  name: string;
  description?: string;
  type: string; // forex, crypto, stocks
  category: string;
  brokerName: string;
  isActive: boolean;
  lastUpdated: Date;
}
```

#### UI Components Needed:

- **Symbol Selector**: Dropdown/search for trading pairs
- **Market Browser**: Browse by category/type
- **Symbol Details**: Market information, pricing
- **Watchlist**: Favorite trading pairs

---

### 9. 🧪 **Evaluation Table**

**Purpose**: Bot performance evaluations
**Usage**: Backtesting, strategy validation

#### UI Data Requirements:

```typescript
interface EvaluationDisplay {
  id: number;
  startDate: Date;
  endDate: Date;
  chartUrl?: string;
  prediction?: string;
  confidence?: number;
  profitLoss?: number;
  metrics: any; // JSON performance metrics
  aiAnalysis?: any;
  tradingSignal?: string;
  confidenceScore?: number;
  createdAt: Date;
}
```

#### UI Components Needed:

- **Evaluation Dashboard**: List of bot evaluations
- **Evaluation Results**: Charts, metrics, analysis
- **Backtesting Interface**: Configure and run backtests
- **AI Analysis Display**: Show AI insights and recommendations

---

### 10. 📈 **DailyPnLSummary Table**

**Purpose**: Daily performance tracking
**Usage**: Performance analytics, daily reports

#### UI Data Requirements:

```typescript
interface DailyPnLDisplay {
  id: number;
  date: Date;
  dailyPnL: number;
  cumulativePnL: number;
  drawdown: number;
  tradesOpened: number;
  tradesClosed: number;
  winningTrades: number;
  losingTrades: number;
  largestWin: number;
  largestLoss: number;
  totalVolume: number;
  averageHoldTime: number;
  riskExposure: number;
}
```

#### UI Components Needed:

- **Daily Performance Chart**: P&L timeline
- **Performance Calendar**: Monthly view with daily results
- **Performance Metrics**: Win rate, average trade, etc.
- **Risk Dashboard**: Drawdown, exposure tracking

---

### 11. 💾 **MarketDataCache Table**

**Purpose**: Real-time market data caching
**Usage**: Price feeds, market information

#### UI Data Requirements:

```typescript
interface MarketDataDisplay {
  symbol: string;
  timeframe: string;
  bid: number;
  ask: number;
  spread: number;
  volume?: number;
  change?: number;
  changePercent?: number;
  timestamp: Date;
}
```

#### UI Components Needed:

- **Price Ticker**: Real-time price display
- **Market Overview**: Multiple symbols at once
- **Price Charts**: Candlestick/line charts
- **Market Status**: Live/delayed data indicators

---

## 🎨 Recommended UI Architecture

### Dashboard Layout:

```
┌─────────────────────────────────────────────────────────┐
│ Header: User Info, Navigation, Notifications           │
├─────────────────────────────────────────────────────────┤
│ Sidebar: Bots, Strategies, Trades, Analytics           │
├─────────────────┬───────────────────────────────────────┤
│ Bot Status Cards│ Performance Charts                    │
├─────────────────┼───────────────────────────────────────┤
│ Active Trades   │ Daily P&L Summary                     │
├─────────────────┼───────────────────────────────────────┤
│ Recent Positions│ Market Data Widget                    │
└─────────────────┴───────────────────────────────────────┘
```

### Key UI Features:

- **Real-time Updates**: WebSocket integration for live data
- **Interactive Charts**: TradingView or Chart.js integration
- **Mobile Responsive**: Works on all devices
- **Dark/Light Mode**: Theme switching
- **Data Export**: CSV/PDF export capabilities
- **Notifications**: Real-time alerts for trades/performance

### Performance Considerations:

- **Cached Data**: Use bot performance cache for quick loading
- **Pagination**: For large datasets (trades, positions)
- **Lazy Loading**: Load data as needed
- **Real-time Subscriptions**: Only for active/critical data

---

## 🔗 Service Integration

### New TradePositionManagerService

Use this service for:

- Creating new trades: `createTrade()`
- Updating trade status: `executeTradeOrder()`, `closeTrade()`
- Getting trade data: `getActiveTrades()`, `getTradeHistory()`
- Position management: `getOpenPositions()`

### Data Flow:

1. **User Actions** → UI Components
2. **UI Components** → API Endpoints
3. **API Endpoints** → Services (TradePositionManagerService, BotService, etc.)
4. **Services** → Database (Prisma)
5. **Database** → Real-time updates → UI

This architecture ensures all database tables are properly utilized and integrated into a comprehensive trading platform UI.
