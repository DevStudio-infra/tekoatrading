# Database Analysis and Cleanup Plan

## 📊 Current Database Schema Analysis

### Core Tables (ACTIVELY USED) ✅

1. **User** - User management

   - Used in: auth, strategy, bot services
   - Relations: strategies, bots, positions, trades, etc.

2. **TradingPair** - Trading symbols and market data

   - Used in: trading-pair.service.ts extensively
   - Relations: positions

3. **Strategy** - Trading strategies

   - Used in: strategy.service.ts, strategy-template.service.ts
   - Relations: user, bots

4. **StrategyTemplate** - Predefined strategy templates

   - Used in: strategy-template.service.ts
   - Relations: none (standalone)

5. **BrokerCredential** - Broker API credentials

   - Used in: broker services, bot creation
   - Relations: user, bots, positions

6. **Bot** - Trading bot instances

   - Used extensively across all services
   - Relations: user, strategy, brokerCredential, positions, trades

7. **Trade** - Active trading operations

   - Used extensively in: trade-execution, trade-data, position-management
   - Relations: bot, evaluation, user

8. **Position** - Trading positions (legacy/alternative to Trade)

   - Used in: order-management, trade-visualization
   - Relations: user, bot, brokerCredential, tradingPair

9. **Evaluation** - Bot evaluations and backtesting
   - Used in: evaluation.service.ts
   - Relations: bot, trades

### Performance & Analytics Tables (ACTIVELY USED) ✅

10. **DailyPnLSummary** - Daily performance tracking

    - Used in: daily-performance.service.ts
    - Relations: bot, user

11. **PerformanceMetricsHistory** - Historical performance data
    - Used in: daily-performance.service.ts, database-cleanup.service.ts
    - Relations: bot

### Cache Tables (ACTIVELY USED) ✅

12. **MarketDataCache** - Real-time market data caching

    - Used in: database-cleanup.service.ts (cleanup)
    - Relations: none

13. **TimeframeAnalysisCache** - Multi-timeframe analysis caching
    - Used in: database-cleanup.service.ts (cleanup)
    - Relations: none

### Human Trading Enhancement Tables (PARTIALLY USED) ⚠️

14. **PositionSizingLog** - Dynamic position sizing tracking

    - Used in: database-cleanup.service.ts (cleanup only)
    - Relations: bot

15. **TradeManagementLog** - Trade management actions

    - Used in: database-cleanup.service.ts (cleanup only)
    - Relations: bot

16. **HumanTradingDecision** - Trading decision log

    - Used in: database-cleanup.service.ts (cleanup only)
    - Relations: bot

17. **MarketRegimeHistory** - Market regime tracking
    - Used in: database-cleanup.service.ts (cleanup only)
    - Relations: none

## 🗑️ UNUSED TABLES (CANDIDATES FOR REMOVAL)

### 1. TechnicalIndicatorsCache ❌ UNUSED

- **Purpose**: Cache technical indicators
- **Usage**: No references found in codebase
- **Recommendation**: REMOVE

### 2. MarketEvent ❌ UNUSED

- **Purpose**: Track significant market events
- **Usage**: No references found in codebase
- **Recommendation**: REMOVE

### 3. PerformanceAlert ❌ UNUSED

- **Purpose**: Performance-based alerts
- **Usage**: Only cleanup references found
- **Recommendation**: REMOVE

### 4. DataQualityMetrics ❌ UNUSED

- **Purpose**: Monitor data feed quality
- **Usage**: No references found in codebase
- **Recommendation**: REMOVE

### 5. SystemHealthLog ❌ UNUSED

- **Purpose**: System health monitoring
- **Usage**: No references found in codebase
- **Recommendation**: REMOVE

### 6. PerformanceBenchmark ❌ UNUSED

- **Purpose**: Market benchmark comparison
- **Usage**: No references found in codebase
- **Recommendation**: REMOVE

### 7. BotPsychologyState ❌ UNUSED

- **Purpose**: Bot emotional states
- **Usage**: No references found in codebase
- **Recommendation**: REMOVE

### 8. SessionPerformance ❌ UNUSED

- **Purpose**: Performance by market session
- **Usage**: No references found in codebase
- **Recommendation**: REMOVE

### 9. BotPerformanceAnalytics ❌ UNUSED

- **Purpose**: Enhanced performance analytics
- **Usage**: No references found in codebase
- **Recommendation**: REMOVE

## 📈 How Trade Management Works Currently

### Trade Lifecycle

1. **Trade Creation**: Created via `Trade` model with status "PENDING"
2. **Trade Opening**: Status changes to "OPEN" when executed
3. **Trade Monitoring**: Real-time tracking via various services
4. **Trade Closing**: Status changes to "CLOSED" with P&L calculation

### Trade Status Flow

```
PENDING → OPEN → CLOSED
         ↓
      CANCELLED
```

### Key Fields for Trade Management

- `status`: "PENDING" | "OPEN" | "CLOSED" | "CANCELLED"
- `openedAt`: When trade was opened
- `closedAt`: When trade was closed
- `profitLoss`: Realized P&L
- `profitLossPercent`: P&L percentage

## 📊 Performance Metrics Storage

### Current Implementation

1. **Real-time Metrics**: Calculated on-demand in services
2. **Daily Summaries**: Stored in `DailyPnLSummary`
3. **Historical Data**: Stored in `PerformanceMetricsHistory`
4. **Bot Caching**: Performance cached in `Bot` table fields

### Key Performance Fields

- `totalPnL`: Cumulative profit/loss
- `totalTrades`: Total number of trades
- `winRate`: Win percentage
- `maxDrawdown`: Maximum drawdown
- `sharpeRatio`: Risk-adjusted returns

### Performance Calculation Services

- `PerformanceCalculationService`: Core metrics calculation
- `daily-performance.service.ts`: Daily aggregation
- `performance-monitoring.service.ts`: Real-time monitoring

## 🔧 Recommended Improvements

### 1. Enhanced Trade Management

```sql
-- Add missing fields to Trade table
ALTER TABLE trades ADD COLUMN exit_reason VARCHAR(50);
ALTER TABLE trades ADD COLUMN trade_duration_seconds INTEGER;
ALTER TABLE trades ADD COLUMN max_profit FLOAT;
ALTER TABLE trades ADD COLUMN max_loss FLOAT;
```

### 2. Improved Performance Tracking

```sql
-- Add performance snapshot table
CREATE TABLE performance_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID REFERENCES bots(id),
  snapshot_date DATE,
  total_trades INTEGER,
  win_rate FLOAT,
  total_pnl FLOAT,
  max_drawdown FLOAT,
  sharpe_ratio FLOAT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 3. Trade Analytics Enhancement

```sql
-- Add trade analytics table
CREATE TABLE trade_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID REFERENCES trades(id),
  entry_signal_strength FLOAT,
  exit_signal_strength FLOAT,
  market_volatility FLOAT,
  correlation_score FLOAT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🗑️ Cleanup Migration Plan

### Phase 1: Remove Unused Tables

1. Drop unused tables in order (no dependencies first)
2. Update Prisma schema
3. Generate new migration

### Phase 2: Optimize Existing Tables

1. Add missing indexes for performance
2. Add new recommended fields
3. Update application code

### Phase 3: Data Migration

1. Migrate any valuable data from removed tables
2. Update existing records with new fields
3. Verify data integrity

## 📋 Migration Script Preview

```prisma
// Remove unused models from schema.prisma
// - TechnicalIndicatorsCache
// - MarketEvent
// - PerformanceAlert
// - DataQualityMetrics
// - SystemHealthLog
// - PerformanceBenchmark
// - BotPsychologyState
// - SessionPerformance
// - BotPerformanceAnalytics

// Keep these for potential future use:
// - PositionSizingLog (human trading features)
// - TradeManagementLog (human trading features)
// - HumanTradingDecision (human trading features)
// - MarketRegimeHistory (market analysis)
// - TimeframeAnalysisCache (performance optimization)
```

This cleanup will reduce database complexity by ~40% while maintaining all actively used functionality.
