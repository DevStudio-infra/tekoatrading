/**
 * Adapter utilities to convert between the new API strategy format and the
 * legacy UI components that expect a different data structure
 */
import { Strategy as ApiStrategy } from './strategy-api';

/**
 * Legacy UI component Strategy interface
 */
export interface ComponentStrategy {
  id: number;
  name: string;
  description: string;
  indicators: Array<{
    name: string;
    type: string;
    parameters: Record<string, any>;
  }>;
  riskControls: {
    stopLoss: number;
    takeProfit: number;
    maxDrawdown: number;
  };
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
  botCount: number;
  winRate?: number;
}

/**
 * Convert a single API strategy to the format expected by UI components
 */
export function apiToComponentStrategy(apiStrategy: ApiStrategy): ComponentStrategy {
  // Extract indicators from parameters if they exist
  const indicators = (apiStrategy.parameters && apiStrategy.parameters.indicators) || [];
  
  // Extract or create default risk controls
  const riskControls = {
    stopLoss: apiStrategy.minRiskPerTrade ? apiStrategy.minRiskPerTrade / 100 : 0.5, // Convert basis points to percentage
    takeProfit: apiStrategy.maxRiskPerTrade ? apiStrategy.maxRiskPerTrade / 100 : 2.0, // Convert basis points to percentage
    maxDrawdown: 5.0, // Default
    ...(apiStrategy.parameters && apiStrategy.parameters.riskControls)
  };
  
  return {
    id: apiStrategy.id,
    name: apiStrategy.name,
    description: apiStrategy.description || '',
    indicators: Array.isArray(indicators) ? indicators : [],
    riskControls,
    createdAt: apiStrategy.createdAt || new Date().toISOString(),
    updatedAt: apiStrategy.updatedAt || new Date().toISOString(),
    isPublic: apiStrategy.isDefault || false,
    botCount: 0, // Default
    winRate: 0, // Default
  };
}

/**
 * Convert an array of API strategies to the format expected by UI components
 */
export function apiToComponentStrategies(apiStrategies: ApiStrategy[]): ComponentStrategy[] {
  return apiStrategies.map(apiToComponentStrategy);
}

/**
 * Convert a component strategy to the API format for creation/updates
 */
export function componentToApiStrategy(componentStrategy: ComponentStrategy): Omit<ApiStrategy, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    name: componentStrategy.name,
    description: componentStrategy.description,
    type: 'custom',
    parameters: {
      indicators: componentStrategy.indicators,
      riskControls: componentStrategy.riskControls,
    },
    minRiskPerTrade: componentStrategy.riskControls.stopLoss * 100, // Convert percentage to basis points
    maxRiskPerTrade: componentStrategy.riskControls.takeProfit * 100, // Convert percentage to basis points
    confidenceThreshold: 70, // Default
    isDefault: componentStrategy.isPublic,
  };
}
