# Phase 4: Priority Fixes Plan (101 Errors → ~20 Errors)

## Progress Update

- **Starting Phase 4**: 101 TypeScript errors (down from 119)
- **Tool Call Fixes**: Successfully fixed workflow tool calls (reduced ~18 errors)
- **Bot Directory**: Evaluated and cleaned up (removed empty directories)

## Error Categories & Priorities

### Priority 1: Agent Method Mismatches (20 errors)

**Issue**: Workflows calling non-existent agent methods
**Impact**: High - blocks agent functionality

**Fixes Required**:

1. `AccountBalanceAgent.getAccountBalance()` → `getCurrentBalance()`
2. `TechnicalAnalysisAgent.analyzeTechnicals()` → create method or fix calls
3. `RiskAssessmentAgent.assessRisk()` → create method or fix calls
4. `TradeExecutionAgent.closePosition()` → create method or fix calls
5. `PositionSizingAgent.calculatePositionSize()` → fix parameter signature

### Priority 2: Service Integration Issues (30 errors)

**Issue**: Controllers/services calling removed methods from TradingService
**Impact**: High - breaks API functionality

**Fixes Required**:

1. Add missing methods to TradingService compatibility bridge:
   - `closeTrade()`, `updateTrade()`, `getActiveTrades()`, `getTradeHistory()`
   - `getCapitalApiForBot()`, `cleanup()`
2. Fix parameter mismatches in service calls
3. Update AI service integration points

### Priority 3: Configuration & Import Issues (25 errors)

**Issue**: Missing config references and import paths
**Impact**: Medium - prevents compilation

**Fixes Required**:

1. Add missing `riskAssessment` config to `agents.config.ts`
2. Fix import paths for `agents.config` and `logger.service`
3. Add missing LangChain imports (`ChatOpenAI`)

### Priority 4: Type & Generic Issues (15 errors)

**Issue**: Generic type usage and property access
**Impact**: Low - mostly TypeScript strictness

**Fixes Required**:

1. Fix `AgentResult<T>` generic usage (remove generics)
2. Fix error handling (`error.message` on unknown type)
3. Fix property access on result objects

### Priority 5: Tool Schema Issues (11 errors)

**Issue**: Tool schema compatibility with LangChain
**Impact**: Medium - affects tool functionality

**Fixes Required**:

1. Fix `TechnicalIndicatorsTool` and `ChartPatternTool` schemas
2. Update tool `_call` method signatures to match LangChain base

## Implementation Strategy

### Phase 4A: Agent Methods (Target: -20 errors)

1. Fix `AccountBalanceAgent.getAccountBalance()` calls
2. Add missing agent methods or update calls
3. Fix agent parameter signatures

### Phase 4B: Service Bridge Expansion (Target: -30 errors)

1. Expand TradingService compatibility bridge
2. Add missing service methods
3. Fix parameter mismatches

### Phase 4C: Configuration & Imports (Target: -25 errors)

1. Complete agents.config.ts
2. Fix import paths
3. Add missing dependencies

### Phase 4D: Type Fixes (Target: -15 errors)

1. Fix generic usage
2. Improve error handling
3. Fix property access

### Phase 4E: Tool Schema Fixes (Target: -11 errors)

1. Update tool schemas
2. Fix tool method signatures

## Expected Results

- **Current**: 101 errors
- **After Phase 4**: ~20-30 errors
- **Architecture**: Clean agent-based system with proper service bridges
- **Functionality**: All major workflows operational

## Bot Directory Status ✅

- **Evaluation Complete**: Bot services are complementary infrastructure
- **Action Taken**: Removed empty directories (analysis/, market/, evaluation/)
- **Decision**: Keep bot services (entity management) + agent system (trading logic)
- **Architecture**: Clear separation of concerns maintained
