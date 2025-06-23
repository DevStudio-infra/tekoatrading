import { fetchWithAuth } from "../fetch-with-auth";

// Strategy Template API endpoints
const API_BASE = "/api/strategy-templates";

/**
 * Strategy Template type definition
 */
export interface StrategyTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  shortDescription: string;
  indicators: Array<{
    type: string;
    params?: Record<string, string | number | boolean>;
    required: boolean;
    description: string;
  }>;
  timeframes: string[];
  entryConditions: string[];
  exitConditions: string[];
  riskManagement: {
    riskPerTrade: string;
    riskRewardRatio: number;
    stopLossType: string;
    takeProfitType: string;
    [key: string]: string | number | boolean;
  };
  minRiskPerTrade: number;
  maxRiskPerTrade: number;
  confidenceThreshold: number;
  winRateExpected?: number;
  riskRewardRatio: number;
  complexity: "beginner" | "intermediate" | "advanced";
  marketCondition: "trending" | "ranging" | "volatile" | "any";
  isActive: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Strategy Template validation info
 */
export interface TemplateValidation {
  valid: boolean;
  missingIndicators: string[];
  supportedIndicators: string[];
}

/**
 * Strategy Template with validation
 */
export interface StrategyTemplateWithValidation extends StrategyTemplate {
  validation: TemplateValidation;
}

/**
 * Templates grouped by category
 */
export interface TemplatesByCategory {
  scalping: StrategyTemplate[];
  day_trade: StrategyTemplate[];
  swing_trade: StrategyTemplate[];
}

/**
 * Fetch all strategy templates with optional filters
 */
export async function getStrategyTemplates(filters?: { category?: string; complexity?: string; marketCondition?: string }): Promise<{
  success: boolean;
  data: StrategyTemplate[];
  total: number;
}> {
  const params = new URLSearchParams();
  if (filters?.category) params.append("category", filters.category);
  if (filters?.complexity) params.append("complexity", filters.complexity);
  if (filters?.marketCondition) params.append("marketCondition", filters.marketCondition);

  const url = params.toString() ? `${API_BASE}?${params}` : API_BASE;
  const response = await fetchWithAuth(url);
  return response.json();
}

/**
 * Get strategy templates grouped by category
 */
export async function getTemplatesByCategory(): Promise<{
  success: boolean;
  data: TemplatesByCategory;
}> {
  const response = await fetchWithAuth(`${API_BASE}/categories`);
  return response.json();
}

/**
 * Search strategy templates
 */
export async function searchStrategyTemplates(query: string): Promise<{
  success: boolean;
  data: StrategyTemplate[];
  total: number;
}> {
  const response = await fetchWithAuth(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
  return response.json();
}

/**
 * Get a specific strategy template by ID with validation
 */
export async function getStrategyTemplateById(id: string): Promise<{
  success: boolean;
  data: StrategyTemplateWithValidation;
}> {
  const response = await fetchWithAuth(`${API_BASE}/${id}`);
  return response.json();
}

/**
 * Create a user strategy from a template
 */
export async function createStrategyFromTemplate(
  templateId: string,
  customizations?: {
    name?: string;
    description?: string;
    minRiskPerTrade?: number;
    maxRiskPerTrade?: number;
    confidenceThreshold?: number;
  }
): Promise<{
  success: boolean;
  data: {
    id: string;
    name: string;
    templateId: string;
    [key: string]: string | number | boolean;
  };
  message: string;
}> {
  const response = await fetchWithAuth(`${API_BASE}/${templateId}/create-strategy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(customizations || {}),
  });
  return response.json();
}

/**
 * Get strategy template statistics
 */
export async function getTemplateStats(): Promise<{
  success: boolean;
  data: {
    totalTemplates: number;
    categoryCounts: Record<string, number>;
    complexityCounts: Record<string, number>;
    mostPopular: StrategyTemplate[];
  };
}> {
  const response = await fetchWithAuth(`${API_BASE}/stats`);
  return response.json();
}
