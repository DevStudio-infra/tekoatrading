/**
 * LangChain.js Agents Configuration
 * Central configuration for all trading agents and AI components
 */

export const agentsConfig = {
  // LLM Configuration
  llm: {
    model: "gpt-4",
    temperature: 0.1,
    maxTokens: 2048,
    apiKey: process.env.OPENAI_API_KEY,
  },

  // Agent-specific configurations
  agents: {
    technicalAnalysis: {
      name: "TechnicalAnalysisAgent",
      description: "Analyzes charts and technical indicators for trading signals",
      temperature: 0.3,
      maxRetries: 2,
      timeout: 30000,
      timeframes: ["1m", "5m", "15m", "1h", "4h", "1d"],
      indicators: ["rsi", "macd", "sma", "ema", "bollinger_bands"],
    },

    riskAssessment: {
      name: "risk_assessment_agent",
      description: "Evaluates trading risks and portfolio safety",
      temperature: 0.1,
      maxRetries: 2,
      timeout: 20000,
    },

    positionSizing: {
      name: "position_sizing_agent",
      description: "Calculates optimal position sizes based on risk parameters",
      temperature: 0.1,
      maxRetries: 2,
      timeout: 15000,
      minPositionSize: 10, // Minimum position size in base currency
      maxPositionSize: 10000, // Maximum position size
      defaultRiskPerTrade: 0.02, // 2% risk per trade
    },

    tradeExecution: {
      name: "trade_execution_agent",
      description: "Executes and manages trading orders",
      temperature: 0.1,
      maxRetries: 3,
      timeout: 25000,
      maxSlippage: 0.001, // 0.1% max slippage
      executionTimeout: 30000, // 30 seconds
      retryAttempts: 3,
    },

    portfolioSync: {
      name: "portfolio_sync_agent",
      description: "Synchronizes portfolio data between broker and database",
      temperature: 0.1,
      maxRetries: 2,
      timeout: 20000,
      syncInterval: 300000, // 5 minutes
    },

    accountBalance: {
      name: "account_balance_agent",
      description: "Monitors and validates account balance information",
      temperature: 0.1,
      maxRetries: 2,
      timeout: 15000,
    },
  },

  // Tool configurations
  tools: {
    database: {
      timeout: 10000,
      retries: 2,
    },
    capitalApi: {
      timeout: 15000,
      retries: 3,
    },
    riskCalculation: {
      timeout: 5000,
      retries: 1,
    },
    chartAnalysis: {
      timeout: 10000,
      retries: 2,
    },
  },

  // Workflow configurations
  workflows: {
    riskCheck: {
      timeout: 60000, // 1 minute
      maxSteps: 10,
      requireAllAgents: false,
    },

    fullTrade: {
      timeout: 120000, // 2 minutes
      maxSteps: 15,
      requireRiskCheck: true,
    },

    emergencySync: {
      timeout: 30000, // 30 seconds
      maxSteps: 8,
      criticalMode: true,
    },
  },

  // Risk management defaults
  risk: {
    maxPositionsPerBot: 5,
    maxDailyLoss: 0.05, // 5%
    maxDrawdown: 0.15, // 15%
    correlationThreshold: 0.7,
    volatilityThreshold: 0.3,

    // Position sizing defaults
    defaultRiskPerTrade: 0.02, // 2%
    maxRiskPerTrade: 0.05, // 5%
    minPositionSize: 10,
    maxPositionSize: 10000,

    // Stop loss defaults
    defaultStopLoss: 0.03, // 3%
    maxStopLoss: 0.1, // 10%
    trailingStopEnabled: true,
  },

  // Market data configurations
  market: {
    timeframes: ["1m", "5m", "15m", "1h", "4h", "1d"],
    defaultTimeframe: "1h",
    lookbackPeriods: {
      short: 20,
      medium: 50,
      long: 200,
    },
  },

  // Logging and monitoring
  logging: {
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
    enableAgentLogs: true,
    enableToolLogs: true,
    enableWorkflowLogs: true,
    logRetention: 7, // days
  },

  // Performance thresholds
  performance: {
    maxExecutionTime: 30000, // 30 seconds
    maxMemoryUsage: 512, // MB
    warningThresholds: {
      executionTime: 15000, // 15 seconds
      memoryUsage: 256, // MB
    },
  },

  // Emergency procedures
  emergency: {
    triggers: {
      marginCallThreshold: 0.2, // 20%
      maxDrawdownTrigger: 0.15, // 15%
      positionMismatchCount: 3,
      systemErrorCount: 5,
    },

    actions: {
      closeAllPositions: true,
      disableTrading: true,
      notifyAdmins: true,
      generateReport: true,
    },
  },
};

// Export individual configurations for easier imports
export const llmConfig = agentsConfig.llm;
export const agentConfigs = agentsConfig.agents;
export const toolConfigs = agentsConfig.tools;
export const workflowConfigs = agentsConfig.workflows;
export const riskConfig = agentsConfig.risk;
export const marketConfig = agentsConfig.market;
export const loggingConfig = agentsConfig.logging;
export const performanceConfig = agentsConfig.performance;
export const emergencyConfig = agentsConfig.emergency;

export default agentsConfig;
