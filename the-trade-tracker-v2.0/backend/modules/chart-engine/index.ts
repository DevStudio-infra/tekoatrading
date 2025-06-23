/**
 * Chart Engine Module
 * Provides chart generation and rendering capabilities
 */

// Export interfaces
export { ChartOptions, HistoricalDataPoint, ChartResult } from './interfaces/chart-options.interface';

// Export utilities
export {
  ensureOutputDirectory,
  generateChartFilename,
  parseTimeframe,
  calculateDateRange,
  formatTimestamp,
  generateAsciiChart
} from './utils/chart-utils';

// Export service class
export { ChartEngineService } from './services/chart-engine.service';

// Import and re-export the singleton instance
import { chartEngineService as engineService } from './services/chart-engine.service';
export const chartEngineService = engineService;

// Convenience function to get the singleton instance
export function getChartEngineService() {
  return engineService;
}
