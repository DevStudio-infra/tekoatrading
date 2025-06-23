# Trading Service Refactoring Plan

## Current State Analysis

The `trading.service.ts` file has grown to over 2,100 lines and violates the Single Responsibility Principle. It currently handles:

- Trade execution (market, limit, stop orders)
- Position synchronization with broker
- Trade verification and confirmation
- Database operations (CRUD for trades)
- Symbol mapping and epic resolution
- Market hours validation
- Risk management and validation
- Performance tracking
- Position tracking and recovery

## Refactoring Strategy

### 1. Core Services Architecture

```
TradingService (Orchestrator)
├── TradeExecutionService
├── PositionSyncService
├── TradeDataService
├── SymbolMappingService
├── MarketValidationService
├── RiskManagementService
└── TradeVerificationService
```

### 2. Service Breakdown

#### 2.1 TradeExecutionService

**File**: `services/trading/trade-execution.service.ts`
**Responsibilities**:

- Execute market, limit, and stop orders
- Handle broker API interactions for order placement
- Manage order-specific logic and validation

**Methods to move**:

- `executeMarketOrder()`
- `executeLimitOrder()`
- `executeStopOrder()`
- `executeBrokerTrade()`
- `getMinDistanceMultiplier()`
- `getPricePrecision()`

**Dependencies**:

- CapitalMainService
- SymbolMappingService
- RiskManagementService

#### 2.2 PositionSyncService

**File**: `services/trading/position-sync.service.ts`
**Responsibilities**:

- Synchronize positions between broker and database
- Handle position recovery and tracking
- Manage position lifecycle

**Methods to move**:

- `syncOpenPositions()`
- `syncSinglePosition()`
- `updateTradeFromBrokerPosition()`
- `handleClosedPositions()`
- `markTradeAsClosed()`
- `getClosingDetails()`
- `determineTradStatus()`

**Dependencies**:

- TradeDataService
- SymbolMappingService

#### 2.3 TradeDataService

**File**: `services/trading/trade-data.service.ts`
**Responsibilities**:

- Database CRUD operations for trades
- Performance tracking and analytics
- Data persistence and retrieval

**Methods to move**:

- `createTradeRecord()`
- `updateTradeRecord()`
- `getDatabaseTrades()`
- `updateBotPerformance()`
- `getActiveTrades()`
- `getTradeHistory()`

**Dependencies**:

- Supabase client
- Prisma client

#### 2.4 SymbolMappingService

**File**: `services/trading/symbol-mapping.service.ts`
**Responsibilities**:

- Map symbols between different formats
- Resolve trading symbols to broker epics
- Handle symbol normalization and matching

**Methods to move**:

- `getEpicForSymbol()`
- `getEpicForSymbolFallback()`
- `formatTradingPairSymbol()`
- `getAlternativeEpicFormats()`
- `isKnownIndexSymbol()`
- `isSymbolMatch()`
- `normalizeSymbolForMatching()`

**Dependencies**:

- CapitalMainService

#### 2.5 MarketValidationService

**File**: `services/trading/market-validation.service.ts`
**Responsibilities**:

- Validate market trading hours
- Check market availability
- Handle timezone and session logic

**Methods to move**:

- `checkMarketTradingHours()`
- `isWithinTradingHours()`
- `isTimeInSession()`
- `isCryptoMarket()`

**Dependencies**:

- CapitalMainService

#### 2.6 RiskManagementService

**File**: `services/trading/risk-management.service.ts`
**Responsibilities**:

- Position size calculations
- Risk validation and limits
- Stop loss and take profit validation

**Methods to move**:

- `validateTradeParams()`
- `canOpenNewPosition()`
- `calculatePositionSize()`

**Dependencies**:

- TradeDataService
- CapitalMainService

#### 2.7 TradeVerificationService

**File**: `services/trading/trade-verification.service.ts`
**Responsibilities**:

- Verify trade execution with broker
- Handle confirmation and rejection logic
- Manage deal reference tracking

**Methods to move**:

- `verifyTradeExecution()`
- `checkRecentDeals()`

**Dependencies**:

- CapitalMainService

#### 2.8 Updated TradingService (Orchestrator)

**File**: `services/trading.service.ts`
**Responsibilities**:

- Orchestrate trading operations
- Coordinate between services
- Maintain public API interface
- Handle high-level business logic

**Remaining methods**:

- `executeTrade()` (orchestrates other services)
- `closeTrade()` (orchestrates closing process)
- `updateTrade()` (orchestrates updates)
- `getCapitalApiForBot()` (broker API management)
- `cleanup()` (service cleanup)

### 3. Implementation Plan

#### Phase 1: Extract Utility Services (Low Risk)

1. **SymbolMappingService** - Pure functions, no side effects
2. **MarketValidationService** - Market hours logic
3. **RiskManagementService** - Calculation and validation logic

#### Phase 2: Extract Data Services (Medium Risk)

1. **TradeDataService** - Database operations
2. **TradeVerificationService** - Broker confirmation logic

#### Phase 3: Extract Core Services (High Risk)

1. **TradeExecutionService** - Order execution logic
2. **PositionSyncService** - Position synchronization

#### Phase 4: Refactor Main Service (High Risk)

1. Update **TradingService** to use new services
2. Ensure interface compatibility
3. Add comprehensive tests

### 4. Shared Types and Interfaces

#### 4.1 Common Types File

**File**: `services/trading/types/index.ts`

```typescript
export interface TradeExecutionParams {
  botId: string;
  evaluationId?: number;
  userId: string;
  symbol: string;
  direction: "BUY" | "SELL";
  orderType: "MARKET" | "LIMIT" | "STOP";
  quantity: number;
  limitPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  rationale?: string;
  aiConfidence?: number;
  riskScore?: number;
}

export interface TradeUpdateParams {
  stopLoss?: number;
  takeProfit?: number;
  quantity?: number;
}

export interface TradingDecision {
  shouldTrade: boolean;
  action: "BUY" | "SELL" | "HOLD" | "CLOSE";
  confidence: number;
  positionSize: number;
  stopLoss: number;
  takeProfit: number;
  rationale: string;
  riskScore: number;
}

export interface BrokerPosition {
  position: {
    dealId?: string;
    dealReference?: string;
    epic?: string;
    direction: "BUY" | "SELL";
    size: number;
    level?: number;
    openLevel?: number;
    stopLevel?: number;
    profitLevel?: number;
    upl?: number;
    createdDate?: string;
    contractId?: string;
  };
  market?: {
    symbol: string;
  };
}

export interface TradeRecord {
  id: string;
  bot_id: string;
  evaluation_id?: number;
  user_id: string;
  symbol: string;
  direction: "BUY" | "SELL";
  order_type: "MARKET" | "LIMIT" | "STOP";
  quantity: number;
  entry_price?: number;
  current_price?: number;
  stop_loss?: number;
  take_profit?: number;
  status: string;
  broker_order_id?: string;
  broker_deal_id?: string;
  rationale?: string;
  ai_confidence?: number;
  risk_score?: number;
  profit_loss?: number;
  profit_loss_percent?: number;
  fees: number;
  opened_at?: Date;
  closed_at?: Date;
  created_at: Date;
  updated_at: Date;
}
```

### 5. Directory Structure

```
backend/
├── services/
│   ├── trading/
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── trade-execution.service.ts
│   │   ├── position-sync.service.ts
│   │   ├── trade-data.service.ts
│   │   ├── symbol-mapping.service.ts
│   │   ├── market-validation.service.ts
│   │   ├── risk-management.service.ts
│   │   ├── trade-verification.service.ts
│   │   └── index.ts (barrel export)
│   └── trading.service.ts (orchestrator)
```

### 6. Service Dependencies and Injection

#### 6.1 Dependency Injection Pattern

Each service should be injectable and testable:

```typescript
export class TradingService extends EventEmitter {
  constructor(
    private tradeExecution: TradeExecutionService,
    private positionSync: PositionSyncService,
    private tradeData: TradeDataService,
    private symbolMapping: SymbolMappingService,
    private marketValidation: MarketValidationService,
    private riskManagement: RiskManagementService,
    private tradeVerification: TradeVerificationService
  ) {
    super();
  }
}
```

#### 6.2 Service Factory

**File**: `services/trading/trading-service.factory.ts`

```typescript
export class TradingServiceFactory {
  static create(): TradingService {
    const symbolMapping = new SymbolMappingService();
    const marketValidation = new MarketValidationService();
    const riskManagement = new RiskManagementService();
    const tradeData = new TradeDataService();
    const tradeVerification = new TradeVerificationService();
    const tradeExecution = new TradeExecutionService(symbolMapping, riskManagement);
    const positionSync = new PositionSyncService(tradeData, symbolMapping);

    return new TradingService(tradeExecution, positionSync, tradeData, symbolMapping, marketValidation, riskManagement, tradeVerification);
  }
}
```

### 7. Testing Strategy

#### 7.1 Unit Tests

- Each service should have comprehensive unit tests
- Mock dependencies using interfaces
- Test error scenarios and edge cases

#### 7.2 Integration Tests

- Test service interactions
- Verify orchestration logic in main TradingService
- Test with real broker API (staging environment)

#### 7.3 Test Structure

```
tests/
├── unit/
│   ├── trading/
│   │   ├── trade-execution.service.test.ts
│   │   ├── position-sync.service.test.ts
│   │   ├── trade-data.service.test.ts
│   │   ├── symbol-mapping.service.test.ts
│   │   ├── market-validation.service.test.ts
│   │   ├── risk-management.service.test.ts
│   │   └── trade-verification.service.test.ts
│   └── trading.service.test.ts
└── integration/
    └── trading/
        └── trading-flow.test.ts
```

### 8. Migration Strategy

#### 8.1 Backward Compatibility

- Maintain existing public API during transition
- Use feature flags for gradual rollout
- Keep original methods as wrappers initially

#### 8.2 Gradual Migration

1. Create new services alongside existing code
2. Gradually move logic to new services
3. Update tests and documentation
4. Remove old code once fully migrated

#### 8.3 Rollback Plan

- Keep original trading.service.ts as backup
- Feature flag to switch between old/new implementation
- Monitoring and alerting for any issues

### 9. Benefits After Refactoring

#### 9.1 Maintainability

- Smaller, focused files (200-400 lines each)
- Clear separation of concerns
- Easier to understand and modify

#### 9.2 Testability

- Isolated unit testing per service
- Mockable dependencies
- Better test coverage

#### 9.3 Scalability

- Independent service evolution
- Easier to add new features
- Better performance optimization opportunities

#### 9.4 Reliability

- Reduced risk of regressions
- Better error isolation
- Improved debugging capabilities

### 10. Timeline Estimation

- **Phase 1**: 1-2 weeks (Utility services)
- **Phase 2**: 2-3 weeks (Data services)
- **Phase 3**: 3-4 weeks (Core services)
- **Phase 4**: 2-3 weeks (Main service refactor)
- **Testing & Polish**: 1-2 weeks

**Total**: 9-14 weeks

### 11. Risk Mitigation

#### 11.1 High-Risk Areas

- Trade execution logic (financial impact)
- Position synchronization (data consistency)
- Order validation (broker rejections)

#### 11.2 Mitigation Strategies

- Extensive testing with paper trading
- Feature flags for gradual rollout
- Monitoring and alerting
- Rollback procedures
- Code reviews and pair programming

### 12. Success Metrics

- File size reduction (from 2100+ to <400 lines each)
- Test coverage increase (target >90%)
- Reduced cyclomatic complexity
- Faster development velocity
- Reduced bug rate
- Improved system reliability

---

## Implementation Priority

1. **Start with Phase 1** (SymbolMappingService, MarketValidationService, RiskManagementService)
2. **Implement comprehensive tests** for each extracted service
3. **Create service interfaces** for better abstraction
4. **Use dependency injection** for better testability
5. **Maintain backward compatibility** throughout migration
6. **Monitor system health** during rollout

This refactoring will significantly improve code maintainability, testability, and developer productivity while reducing the risk of bugs in critical trading functionality.
