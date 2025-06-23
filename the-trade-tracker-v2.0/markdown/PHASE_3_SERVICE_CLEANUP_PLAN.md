# Phase 3: Service Cleanup Plan - Remove Replaced Services

## 🎯 Objective

Remove all services that have been replaced by the new LangChain.js agent system, eliminating duplication and reducing maintenance overhead.

## 📊 Analysis Summary

### Services to REMOVE (Replaced by Agents)

#### 1. **Human Trading Services** (ENTIRE DIRECTORY)

**Location**: `services/human-trading/`
**Reason**: Replaced by LangChain agents with better AI decision-making
**Files to Remove**:

- `trading-orchestrator.service.ts` → Replaced by `full-trade-workflow.ts`
- `enhanced-decision.service.ts` → Replaced by `risk-assessment.agent.ts` + `technical-analysis.agent.ts`
- `position-sizing.service.ts` → Replaced by `position-sizing.agent.ts`
- `advanced-trade-management.service.ts` → Replaced by `trade-execution.agent.ts`
- `market-regime-detection.service.ts` → Replaced by `technical-analysis.agent.ts`
- `dynamic-position-sizing.service.ts` → Replaced by `position-sizing.agent.ts`
- `human-trading-orchestrator.service.ts` → Replaced by workflows
- `market-session-awareness.service.ts` → Integrated into agents
- `multi-timeframe-analysis.service.ts` → Replaced by `technical-analysis.agent.ts`
- `enhanced-gemini-prompts.service.ts` → Replaced by LangChain prompts
- All other files in this directory

#### 2. **AI Analysis Services** (PARTIAL DIRECTORY)

**Location**: `services/ai/`
**Reason**: Replaced by agent-based AI analysis
**Files to Remove**:

- `ai-analysis-service-refactored.ts` → Replaced by `risk-analysis-chain.ts`
- `technical-analysis.ts` → Replaced by `technical-analysis.agent.ts`
- `prompt-builder.ts` → Replaced by LangChain prompt templates

**Files to KEEP**:

- `json-parser.ts` → Still used by agents
- `validators.ts` → Still used for validation
- `types.ts` → Still used for type definitions
- `index.ts` → Update to export only kept files

#### 3. **Duplicate Agent Services**

**Location**: `services/agents/`
**Reason**: Duplicated in main agents directory
**Files to Remove**:

- `account-balance.agent.ts` → Duplicate of `agents/trading/account-balance.agent.ts`
- `portfolio-sync.agent.ts` → Duplicate of `agents/trading/portfolio-sync.agent.ts`

#### 4. **Legacy AI Service**

**Location**: `services/`
**Files to Remove**:

- `ai.service.ts` → Replaced by agent-based AI

#### 5. **Duplicate Services in /src**

**Location**: `src/services/`
**Files to Remove**:

- `PerformanceCalculationService.ts` → Duplicate of `services/PerformanceCalculationService.ts`
- `ScheduledJobsService.ts` → Functionality moved to `scheduler.service.ts`

#### 6. **Trading Service** (Replaced by Agents)

**Location**: `services/`
**Files to Remove**:

- `trading.service.ts` → Replaced by `trade-execution.agent.ts` and workflows

### Services to KEEP (Still Needed)

#### Core Infrastructure

- `bot.service.ts` → Core bot management (update to use agents)
- `scheduler.service.ts` → Job scheduling
- `logger.service.ts` → Logging infrastructure
- `auth.service.ts` → Authentication
- `clerk-auth.service.ts` → Clerk integration

#### Data & Market Services

- `market-data.service.ts` → Market data fetching
- `broker-integration.service.ts` → Broker API integration
- `capital-api.service.ts` → Capital.com API
- `chart-engine.service.ts` → Chart generation

#### Business Logic (Update to use agents)

- `evaluation.service.ts` → Strategy evaluation
- `performance-monitoring.service.ts` → Performance tracking
- `strategy.service.ts` → Strategy management
- `order-management.service.ts` → Order handling
- `position-management.service.ts` → Position tracking

#### Storage & Utilities

- `broker-credential.service.ts` → Credential management
- `database-cleanup.service.ts` → Database maintenance
- `supabase-storage.service.ts` → File storage
- `websocket.service.ts` → Real-time updates

## 🗂️ Directory Reorganization

### Before:

```
services/
├── human-trading/ (15 files) ❌ REMOVE
├── ai/ (7 files) ❌ REMOVE 3, KEEP 4
├── agents/ (2 files) ❌ REMOVE (duplicates)
├── trading/ (keep but review)
├── adapters/ (keep)
├── bot/ (keep)
└── [other services]

src/
└── services/ (2 files) ❌ REMOVE (duplicates)
```

### After:

```
services/
├── trading/ (keep essential only)
├── adapters/ (keep)
├── bot/ (keep)
└── [core services only]

agents/ (main implementation)
├── trading/
├── tools/
├── chains/
└── workflows/
```

## 📋 Execution Plan

### Step 1: Remove Human Trading Services

- Delete entire `services/human-trading/` directory
- Update any imports/references

### Step 2: Clean AI Services

- Remove replaced AI analysis files
- Keep utility files (json-parser, validators, types)
- Update index.ts

### Step 3: Remove Duplicate Agents

- Delete `services/agents/` directory
- Ensure main agents in `agents/trading/` are complete

### Step 4: Remove Legacy Services

- Delete `services/ai.service.ts`
- Delete `services/trading.service.ts`
- Remove `src/services/` directory

### Step 5: Update References

- Update imports in controllers
- Update service registrations
- Fix any broken dependencies

## 📊 Impact Assessment

### Files to Remove: ~25 files

### Estimated Error Reduction: 30-40 TypeScript errors

### Maintenance Reduction: ~50% less code to maintain

### Architecture Clarity: Single source of truth (agents)
