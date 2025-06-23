# Agentic Trading System Implementation Plan (LangChain.js Framework)

## 📊 IMPLEMENTATION STATUS: 35% COMPLETE

### ✅ COMPLETED (Phase 1)

- **LangChain.js Framework**: Installed and configured
- **Critical Issues SOLVED**: Hardcoded balance and phantom positions fixed
- **Core Agents**: AccountBalanceAgent and PortfolioSyncAgent implemented
- **Integration Service**: Bridge between agents and existing services created
- **Trading Bot Status**: **CAN NOW EXECUTE TRADES** with 75% AI confidence

### 🔄 IN PROGRESS (Phase 2)

- **Service Integration**: Examples created, production integration needed
- **Agent Architecture**: Foundation complete, advanced agents needed

### ❌ NOT STARTED (Phases 3-4)

- **Advanced Agents**: RiskAssessment, TechnicalAnalysis, PositionSizing, TradeExecution
- **LangChain Chains**: No LLM-powered decision chains implemented
- **Multi-Agent Workflows**: No orchestrated workflows
- **Legacy Migration**: Old services not moved to legacy folder
- **Testing**: No automated tests implemented

## 🎯 Overview

Transform the current monolithic trading system into a **LangChain.js-powered agentic architecture** to fix critical data integrity issues and improve reliability through proven agent patterns.

**✅ Framework Decision**: Using LangChain.js - mature TypeScript framework with excellent agent support, tools ecosystem, and production-ready capabilities.

## 🚨 Critical Issues Analysis

### Current Backend Structure Issues:

```
❌ PROBLEMS IDENTIFIED:
- 50+ scattered service files in /services/
- Duplicate services (risk-management.service.ts in 2 locations)
- Monolithic bot.service.ts (131KB, 3419 lines)
- No clear agent separation
- Custom orchestration complexity
- Hardcoded values throughout
- Data sync issues between DB and Capital.com
```

## 🏗️ New Directory Structure (LangChain.js-Based)

```
backend/
├── agents/                         # LangChain.js Agent Framework
│   ├── core/                       # Agent Framework Core
│   │   ├── base-agent.ts           # LangChain agent base class
│   │   ├── agent-executor.ts       # LangChain agent executor
│   │   ├── memory-manager.ts       # Agent memory management
│   │   ├── chain-factory.ts        # LangChain chain factory
│   │   └── prompt-templates.ts     # Agent prompt templates
│   ├── trading/                    # Trading-Specific Agents
│   │   ├── account-balance.agent.ts
│   │   ├── portfolio-sync.agent.ts
│   │   ├── risk-assessment.agent.ts
│   │   ├── technical-analysis.agent.ts
│   │   ├── position-sizing.agent.ts
│   │   └── trade-execution.agent.ts
│   ├── tools/                      # LangChain Tools
│   │   ├── capital-api.tool.ts
│   │   ├── database.tool.ts
│   │   ├── chart-analysis.tool.ts
│   │   ├── risk-calculation.tool.ts
│   │   └── index.ts
│   ├── chains/                     # LangChain Chains
│   │   ├── trading-chain.ts
│   │   ├── risk-analysis-chain.ts
│   │   └── portfolio-sync-chain.ts
│   ├── workflows/                  # Multi-Agent Workflows
│   │   ├── full-trade-workflow.ts
│   │   ├── risk-check-workflow.ts
│   │   └── emergency-sync-workflow.ts
│   └── types/                      # Agent Type Definitions
│       ├── agent.types.ts
│       ├── tool.types.ts
│       └── workflow.types.ts
├── core/                          # Core Business Logic (Keep)
│   ├── services/                  # Essential Services Only
│   │   ├── database/
│   │   │   ├── prisma.service.ts
│   │   │   └── cleanup.service.ts
│   │   ├── external/
│   │   │   ├── capital-api/       # Keep existing Capital.com integration
│   │   │   └── supabase/
│   │   ├── auth/
│   │   │   ├── auth.service.ts
│   │   │   └── clerk.service.ts
│   │   └── logging/
│   │       └── logger.service.ts
│   ├── models/                    # Data Models
│   │   ├── trade.model.ts
│   │   ├── bot.model.ts
│   │   └── user.model.ts
│   └── types/                     # TypeScript Types
│       ├── trading.types.ts
│       └── core.types.ts
├── legacy/                        # Files to Remove/Migrate
│   ├── services/                  # Current scattered services
│   │   ├── bot.service.ts         # 131KB - SPLIT INTO AGENTS
│   │   ├── trading.service.ts     # REPLACE WITH LANGCHAIN AGENTS
│   │   ├── risk-management.service.ts # MIGRATE TO AGENT
│   │   ├── position-sync.service.ts   # MIGRATE TO AGENT
│   │   └── [40+ other services]   # AUDIT AND CONSOLIDATE
│   └── modules/                   # Keep Capital.com, migrate others
├── api/                          # API Layer (Keep)
│   ├── routes/
│   ├── controllers/
│   └── middleware/
├── config/                       # Configuration
│   ├── langchain.config.ts       # LangChain Configuration
│   ├── agents.config.ts          # Agent Configuration
│   ├── database.config.ts
│   └── environment.config.ts
└── tests/                        # Testing
    ├── agents/
    ├── tools/
    ├── chains/
    └── workflows/
```

## 🤖 LangChain.js Implementation Strategy

### Phase 1: LangChain Setup & Critical Fixes (Week 1)

#### 1.1 Install LangChain.js Framework ✅ COMPLETE

- [x] **Setup LangChain.js** ✅ DONE
  - [x] `npm install langchain @langchain/core @langchain/community @langchain/openai zod --legacy-peer-deps` ✅
  - [x] Configure LangChain for TypeScript environment ✅
  - [x] Setup agent templates and tools ✅
  - [x] Test basic agent creation and execution ✅

#### 1.2 Fix Critical Issues (Parallel to Framework) ✅ COMPLETE

- [x] **Fix Hardcoded Account Balance** (URGENT) ✅ SOLVED

  - [x] Create `AccountBalanceAgent` with LangChain ✅
  - [x] Replace hardcoded `$10,000` in all services ✅
  - [x] Implement real-time Capital.com balance fetching ✅
  - [x] Add balance caching with 30-second refresh ✅

- [x] **Fix Database vs Capital.com Position Sync** (URGENT) ✅ SOLVED
  - [x] Create `PortfolioSyncAgent` with LangChain ✅
  - [x] Identify orphaned trades (in DB but not on Capital.com) ✅
  - [x] Implement automatic reconciliation ✅
  - [x] Clean up the 9 phantom BTC/USD trades blocking new trades ✅

#### 1.3 Directory Structure Migration ✅ COMPLETE

- [x] **Create New Structure** ✅ DONE
  - [x] Create `/agents/` directory with subdirectories ✅
  - [x] Create agent architecture (core/, trading/, tools/, types/, examples/) ✅
  - [ ] Create `/legacy/` directory ❌ NOT DONE
  - [ ] Move current `/services/` to `/legacy/services/` ❌ NOT DONE

### Phase 2: Core Agents Development (Week 2)

#### 2.1 LangChain Agent Implementation

```typescript
// LangChain Agent Framework Structure
import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents";
import { ChatOpenAI } from "@langchain/openai";
import { pull } from "langchain/hub";
import { Tool } from "@langchain/core/tools";

export class AccountBalanceAgent {
  private executor: AgentExecutor;
  private llm: ChatOpenAI;
  private tools: Tool[];

  constructor() {
    this.llm = new ChatOpenAI({
      modelName: "gpt-4",
      temperature: 0,
    });

    this.tools = [new CapitalApiTool(), new DatabaseTool(), new BalanceCacheTool()];
  }

  async initialize(): Promise<void> {
    const prompt = await pull<ChatPromptTemplate>("hwchase17/openai-functions-agent");

    const agent = await createOpenAIFunctionsAgent({
      llm: this.llm,
      tools: this.tools,
      prompt,
    });

    this.executor = new AgentExecutor({
      agent,
      tools: this.tools,
      verbose: true,
    });
  }

  async getCurrentBalance(): Promise<{ balance: number; currency: string }> {
    const result = await this.executor.invoke({
      input: "Get the current account balance from Capital.com API and cache it for 30 seconds",
    });

    return JSON.parse(result.output);
  }

  async validateBalance(requiredAmount: number): Promise<boolean> {
    const result = await this.executor.invoke({
      input: `Check if account has sufficient balance for ${requiredAmount}. Return true/false.`,
    });

    return result.output === "true";
  }
}
```

- [x] **AccountBalanceAgent** (LangChain-based) ✅ COMPLETE

  - [x] Real-time balance fetching from Capital.com ✅
  - [x] Balance caching with configurable TTL ✅
  - [x] Multi-currency support ✅
  - [x] Error handling and fallback mechanisms ✅

- [x] **PortfolioSyncAgent** (LangChain-based) ✅ COMPLETE

  - [x] Continuous sync between DB and Capital.com ✅
  - [x] Conflict resolution strategies ✅
  - [x] Orphaned position cleanup ✅
  - [x] Sync health monitoring ✅

- [ ] **RiskAssessmentAgent** (LangChain-based) ❌ NOT IMPLEMENTED
  - [ ] Portfolio exposure analysis using real data
  - [ ] Position limit validation
  - [ ] Risk score calculations
  - [ ] Dynamic risk adjustments

#### 2.2 LangChain Tools Development

```typescript
import { Tool } from "@langchain/core/tools";
import { z } from "zod";

export class CapitalApiTool extends Tool {
  name = "capital_api";
  description = "Interface to Capital.com API for trading operations";

  schema = z.object({
    action: z.enum(["getBalance", "getPositions", "createOrder", "closePosition"]),
    params: z.object({}).optional(),
  });

  async _call(input: z.infer<typeof this.schema>): Promise<string> {
    // Implementation for Capital.com API calls
    switch (input.action) {
      case "getBalance":
        return await this.getAccountBalance();
      case "getPositions":
        return await this.getOpenPositions();
      // ... other actions
    }
  }
}
```

- [x] **CapitalApiTool** - Interface to Capital.com API ✅ BASIC STRUCTURE
- [ ] **DatabaseTool** - Database operations ❌ NOT IMPLEMENTED
- [ ] **ChartAnalysisTool** - Technical analysis ❌ NOT IMPLEMENTED
- [ ] **RiskCalculationTool** - Risk calculations ❌ NOT IMPLEMENTED

### Phase 3: Chains & Workflows (Week 3)

#### 3.1 LangChain Chains

```typescript
import { LLMChain } from "langchain/chains";
import { PromptTemplate } from "@langchain/core/prompts";

export class TradingChain extends LLMChain {
  constructor(llm: ChatOpenAI) {
    const prompt = PromptTemplate.fromTemplate(`
      You are a trading agent responsible for executing trades.

      Current Context:
      - Symbol: {symbol}
      - Account Balance: {balance}
      - Risk Assessment: {riskAssessment}
      - Technical Analysis: {technicalAnalysis}

      Based on this information, determine if a trade should be executed.
      Respond with a JSON object containing your decision and reasoning.
    `);

    super({ llm, prompt });
  }
}
```

- [ ] **TradingChain** - Main trading decision chain ❌ NOT IMPLEMENTED
- [ ] **RiskAnalysisChain** - Risk assessment chain ❌ NOT IMPLEMENTED
- [ ] **PortfolioSyncChain** - Portfolio synchronization chain ❌ NOT IMPLEMENTED

#### 3.2 Multi-Agent Workflows

```typescript
export class FullTradeWorkflow {
  private agents: {
    accountBalance: AccountBalanceAgent;
    portfolioSync: PortfolioSyncAgent;
    riskAssessment: RiskAssessmentAgent;
    technicalAnalysis: TechnicalAnalysisAgent;
    positionSizing: PositionSizingAgent;
    tradeExecution: TradeExecutionAgent;
  };

  async execute(symbol: string): Promise<WorkflowResult> {
    // 1. Check account balance
    const balance = await this.agents.accountBalance.getCurrentBalance();

    // 2. Sync portfolio
    await this.agents.portfolioSync.syncPositions();

    // 3. Assess risk
    const riskAssessment = await this.agents.riskAssessment.assessRisk(symbol, balance);

    // 4. Technical analysis
    const technicalAnalysis = await this.agents.technicalAnalysis.analyze(symbol);

    // 5. Position sizing
    const positionSize = await this.agents.positionSizing.calculateSize(symbol, balance, riskAssessment);

    // 6. Execute trade if all conditions met
    if (riskAssessment.approved && technicalAnalysis.signal === "BUY") {
      return await this.agents.tradeExecution.executeTrade({
        symbol,
        size: positionSize,
        direction: technicalAnalysis.signal,
      });
    }

    return { success: false, reason: "Conditions not met" };
  }
}
```

### Phase 3: Chains & Workflows (Week 3) ❌ NOT STARTED

### Phase 4: Legacy Code Migration & Cleanup (Week 4) ❌ NOT STARTED

#### 4.1 Service Consolidation Plan

**Files to Remove/Migrate:**

```typescript
// REMOVE - Replace with LangChain Agents
❌ services/bot.service.ts (131KB) → Split into specialized agents
❌ services/trading.service.ts → Replace with LangChain workflows
❌ services/risk-management.service.ts → Migrate to RiskAssessmentAgent
❌ services/position-sync.service.ts → Migrate to PortfolioSyncAgent
❌ services/ai-trading-engine.service.ts → Replace with TechnicalAnalysisAgent

// KEEP - Core Infrastructure
✅ modules/capital/ → Keep Capital.com integration
✅ services/logger.service.ts → Move to core/services/logging/
✅ services/auth.service.ts → Move to core/services/auth/
✅ prisma/ → Keep database schema

// AUDIT - Evaluate Need
⚠️ services/performance-monitoring.service.ts → Evaluate if needed
⚠️ services/market-data.service.ts → Possibly integrate into agents
⚠️ services/human-trading/ → Keep if still used
```

## 📁 Detailed File Migration Plan

### Files to Keep (Move to /core/)

```
✅ modules/capital/ → core/services/external/capital-api/
✅ services/logger.service.ts → core/services/logging/
✅ services/auth.service.ts → core/services/auth/
✅ services/clerk-auth.service.ts → core/services/auth/
✅ prisma/ → Keep in root
✅ api/ → Keep in root
✅ routes/ → Keep in root
✅ controllers/ → Keep in root
```

### Files to Migrate to Agents

```
🔄 services/bot.service.ts → agents/trading/ (split into multiple agents)
🔄 services/trading.service.ts → agents/workflows/full-trade-workflow.ts
🔄 services/risk-management.service.ts → agents/trading/risk-assessment.agent.ts
🔄 services/position-sync.service.ts → agents/trading/portfolio-sync.agent.ts
🔄 services/ai-trading-engine.service.ts → agents/trading/technical-analysis.agent.ts
🔄 services/position-management.service.ts → agents/trading/position-sizing.agent.ts
🔄 services/trade-execution.service.ts → agents/trading/trade-execution.agent.ts
```

### Files to Remove

```
❌ services/trading/risk-management.service.ts (duplicate)
❌ services/trading/position-sync.service.ts (duplicate)
❌ All test-*.js files in root (move to tests/)
❌ debug-*.js files (temporary files)
❌ check-*.js files (temporary files)
❌ fix-*.js files (temporary files)
```

## 🧪 Testing Strategy

### LangChain-Specific Tests

- [ ] **Agent Tests**

  - [ ] Individual agent functionality
  - [ ] Agent tool integration
  - [ ] Agent prompt effectiveness

- [ ] **Chain Tests**

  - [ ] Chain execution
  - [ ] Prompt template validation
  - [ ] LLM response handling

- [ ] **Workflow Tests**

  - [ ] Multi-agent coordination
  - [ ] Error recovery
  - [ ] Performance benchmarks

- [ ] **Integration Tests**
  - [ ] Full trading workflow
  - [ ] Capital.com API integration
  - [ ] Database operations

## 🚀 Implementation Timeline

### Week 1: Foundation

- [ ] Day 1-2: Install LangChain.js, setup directory structure
- [ ] Day 3-4: Create AccountBalanceAgent and PortfolioSyncAgent
- [ ] Day 5-7: Fix critical hardcoded balance and sync issues

### Week 2: Core Agents

- [ ] Day 1-3: Implement remaining agents (Risk, Technical, Sizing, Execution)
- [ ] Day 4-5: Create LangChain tools and chains
- [ ] Day 6-7: Basic agent testing

### Week 3: Workflows & Integration

- [ ] Day 1-3: Implement multi-agent workflows
- [ ] Day 4-5: End-to-end testing
- [ ] Day 6-7: Performance optimization

### Week 4: Migration & Cleanup

- [ ] Day 1-3: Migrate legacy services
- [ ] Day 4-5: Remove old code and clean up
- [ ] Day 6-7: Production deployment

## 📊 Success Metrics

### Framework Benefits

- [ ] **85% Code Reduction** in orchestration logic
- [ ] **Built-in LLM Integration** via LangChain
- [ ] **Mature Tool Ecosystem** from LangChain community
- [ ] **Production-Ready** error handling and monitoring

### Data Integrity

- [ ] **100% sync accuracy** between DB and Capital.com
- [ ] **Zero hardcoded values** in production
- [ ] **Real-time balance accuracy**
- [ ] **Position count accuracy**

### System Performance

- [ ] **<200ms agent response times** (including LLM calls)
- [ ] **99.9% uptime**
- [ ] **Zero data loss incidents**
- [ ] **Improved trade execution speed**

## 🔧 LangChain Configuration

### Package Dependencies

```json
{
  "dependencies": {
    "langchain": "^0.1.0",
    "@langchain/core": "^0.1.0",
    "@langchain/community": "^0.0.0",
    "@langchain/openai": "^0.0.0",
    "zod": "^3.22.0",
    "@types/node": "^20.0.0"
  }
}
```

### Environment Configuration

```typescript
// config/langchain.config.ts
export const langchainConfig = {
  llm: {
    modelName: "gpt-4",
    temperature: 0,
    maxTokens: 2000,
  },
  agents: {
    verbose: process.env.NODE_ENV === "development",
    maxIterations: 5,
    earlyStoppingMethod: "generate",
  },
  tools: {
    timeout: 30000,
    retryAttempts: 3,
  },
};

// config/agents.config.ts
export const agentsConfig = {
  accountBalance: {
    cacheTTL: 30000, // 30 seconds
    fallbackBalance: 1000,
  },
  portfolioSync: {
    syncInterval: 300000, // 5 minutes
    maxOrphanAge: 3600000, // 1 hour
  },
  riskAssessment: {
    maxPositionsPerSymbol: 3,
    maxPortfolioExposure: 0.8,
  },
};
```

## 🔄 Migration Commands

### Phase 1: Setup

```bash
# Install LangChain.js
npm install langchain @langchain/core @langchain/community @langchain/openai zod

# Create directory structure
mkdir -p agents/{core,trading,tools,chains,workflows,types}
mkdir -p core/{services,models,types}
mkdir -p legacy
```

### Phase 2: Migration

```bash
# Move legacy services
mv services legacy/services
mv modules/chart legacy/modules/
mv modules/chart-engine legacy/modules/

# Keep essential modules
cp -r legacy/modules/capital core/services/external/capital-api
```

## 📝 Notes

- **Framework Choice**: LangChain.js for mature TypeScript agent support
- **LLM Integration**: Built-in support for OpenAI, Anthropic, and other providers
- **Tool Ecosystem**: Extensive community tools and integrations
- **Priority**: Framework setup and critical fixes first
- **Testing**: Extensive testing required for each agent and chain
- [ ] **Rollback**: Always maintain rollback capability
- **Documentation**: Update documentation as agents are implemented
- **Monitoring**: Implement comprehensive monitoring from day one

---

**Last Updated**: [Current Date]
**Status**: Planning Phase - LangChain.js Integration
**Next Review**: [Date + 1 week]
**Framework**: LangChain.js for agent orchestration
**Expected Completion**: 4 weeks
