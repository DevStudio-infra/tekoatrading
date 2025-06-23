import { fetchWithAuth } from "../fetch-with-auth";

// Strategy API endpoints
const API_BASE = "/api/v1/strategies";

/**
 * Strategy type definition
 */
export interface Strategy {
  id: number;
  name: string;
  type: string;
  description: string;
  parameters: Record<string, unknown>;
  minRiskPerTrade: number;
  maxRiskPerTrade: number;
  confidenceThreshold: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Strategy creation/update payload
 */
export interface StrategyPayload {
  name: string;
  type?: string;
  description: string;
  parameters: Record<string, unknown>;
  minRiskPerTrade?: number;
  maxRiskPerTrade?: number;
  confidenceThreshold?: number;
  isDefault?: boolean;
}

/**
 * Fetch all strategies for the current user
 */
export async function getStrategies(): Promise<{
  message: string;
  strategies: Strategy[];
}> {
  const response = await fetchWithAuth(API_BASE);
  return response.json();
}

/**
 * Fetch a specific strategy by ID
 */
export async function getStrategyById(id: number): Promise<{
  message: string;
  strategy: Strategy;
}> {
  const response = await fetchWithAuth(`${API_BASE}/${id}`);
  return response.json();
}

/**
 * Create a new strategy
 */
export async function createStrategy(data: StrategyPayload): Promise<{
  message: string;
  strategy: Strategy;
}> {
  const response = await fetchWithAuth(API_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  return response.json();
}

/**
 * Update an existing strategy
 */
export async function updateStrategy(
  id: number,
  data: Partial<StrategyPayload>
): Promise<{
  message: string;
  strategy: Strategy;
}> {
  const response = await fetchWithAuth(`${API_BASE}/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  return response.json();
}

/**
 * Delete a strategy
 */
export async function deleteStrategy(id: number): Promise<{
  message: string;
}> {
  const response = await fetchWithAuth(`${API_BASE}/${id}`, {
    method: "DELETE",
  });
  return response.json();
}

/**
 * Duplicate a strategy
 */
export async function duplicateStrategy(id: number): Promise<{
  message: string;
  strategy: Strategy;
}> {
  const response = await fetchWithAuth(`${API_BASE}/${id}/duplicate`, {
    method: "POST",
  });
  return response.json();
}
