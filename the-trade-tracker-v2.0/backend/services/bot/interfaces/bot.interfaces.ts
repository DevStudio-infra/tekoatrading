// Prisma types - using any for now to avoid import issues during refactoring
export type Bot = any;
export type Trade = any;
export type Evaluation = any;

// Base types and enums
export interface CreateBotRequest {
  name: string;
  tradingPairSymbol: string;
  timeframe: string;
  strategy?: string;
  strategyId?: string;
  brokerCredentialId?: string;
  maxSimultaneousTrades: number;
  riskPercentage: number;
  stopLossPercentage: number;
  takeProfitPercentage: number;
  isActive?: boolean;
  aiTradingEnabled?: boolean;
}

export interface UpdateBotRequest {
  name?: string;
  strategy?: string;
  strategyId?: string;
  brokerCredentialId?: string;
  maxSimultaneousTrades?: number;
  riskPercentage?: number;
  stopLossPercentage?: number;
  takeProfitPercentage?: number;
  isActive?: boolean;
  aiTradingEnabled?: boolean;
}

export interface BotWithStats extends Bot {
  tradesCount?: number;
  evaluationsCount?: number;
  activeTradesCount?: number;
  totalPnL?: number;
  winRate?: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface BotAccessResult {
  hasAccess: boolean;
  bot?: Bot;
  error?: string;
}

// Service interfaces
export interface IBotManagementService {
  // Bot CRUD operations
  createBot(userId: string, data: CreateBotRequest): Promise<Bot>;
  getBotById(id: string, userId: string): Promise<Bot | null>;
  getUserBots(userId: string): Promise<BotWithStats[]>;
  updateBot(id: string, userId: string, data: UpdateBotRequest): Promise<Bot>;
  deleteBot(id: string, userId: string): Promise<void>;

  // Bot status management
  startBot(id: string, userId: string): Promise<Bot>;
  stopBot(id: string, userId: string): Promise<Bot>;
  toggleBotActive(id: string, userId: string): Promise<Bot>;
  toggleAiTrading(id: string, userId: string): Promise<Bot>;

  // Validation and access
  validateBotAccess(botId: string, userId: string): Promise<BotAccessResult>;
  validateCreateBotRequest(data: CreateBotRequest): ValidationResult;
}

export interface IBotEvaluationService {
  evaluateBot(botId: string, userId: string): Promise<Evaluation>;
  createEvaluation(botId: string, data: any): Promise<Evaluation>;
  getBotEvaluations(botId: string, userId: string, limit?: number): Promise<Evaluation[]>;
}

export interface IBotValidationService {
  validateCreateBotRequest(data: any): ValidationResult;
  validateBotAccess(botId: string, userId: string): Promise<boolean>;
  validateTradingParameters(params: any): ValidationResult;
  validateTimeframe(timeframe: string): boolean;
  validateTradingSymbol(symbol: string): boolean;
}

// Error handling
export enum BotErrorCode {
  BOT_NOT_FOUND = "BOT_NOT_FOUND",
  ACCESS_DENIED = "ACCESS_DENIED",
  INVALID_REQUEST = "INVALID_REQUEST",
  BOT_ALREADY_ACTIVE = "BOT_ALREADY_ACTIVE",
  BOT_ALREADY_INACTIVE = "BOT_ALREADY_INACTIVE",
  VALIDATION_FAILED = "VALIDATION_FAILED",
  DATABASE_ERROR = "DATABASE_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

export class BotServiceError extends Error {
  constructor(message: string, public code: BotErrorCode, public details?: any) {
    super(message);
    this.name = "BotServiceError";
  }
}

// Event types for service communication
export interface BotCreatedEvent {
  type: "BOT_CREATED";
  botId: string;
  userId: string;
  bot: Bot;
}

export interface BotUpdatedEvent {
  type: "BOT_UPDATED";
  botId: string;
  userId: string;
  changes: Partial<Bot>;
}

export interface BotDeletedEvent {
  type: "BOT_DELETED";
  botId: string;
  userId: string;
}

export interface BotStatusChangedEvent {
  type: "BOT_STATUS_CHANGED";
  botId: string;
  userId: string;
  isActive: boolean;
}

export type BotEvent = BotCreatedEvent | BotUpdatedEvent | BotDeletedEvent | BotStatusChangedEvent;
