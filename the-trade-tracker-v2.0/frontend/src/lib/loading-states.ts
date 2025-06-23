import { create } from "zustand";
import { devtools } from "zustand/middleware";

export interface LoadingState {
  isLoading: boolean;
  message?: string;
  progress?: number;
  type?: "indeterminate" | "determinate" | "buffer";
  startTime?: Date;
  estimatedDuration?: number;
}

export interface LoadingStore {
  states: Map<string, LoadingState>;
  setLoading: (key: string, state: Partial<LoadingState> | boolean) => void;
  clearLoading: (key: string) => void;
  clearAllLoading: () => void;
  isLoading: (key: string) => boolean;
  getLoadingState: (key: string) => LoadingState | undefined;
  getGlobalLoadingState: () => { isLoading: boolean; count: number };
}

export const useLoadingStore = create<LoadingStore>()(
  devtools(
    (set, get) => ({
      states: new Map(),

      setLoading: (key: string, state: Partial<LoadingState> | boolean) => {
        set((current) => {
          const newStates = new Map(current.states);

          if (typeof state === "boolean") {
            if (state) {
              newStates.set(key, {
                isLoading: true,
                startTime: new Date(),
                type: "indeterminate",
              });
            } else {
              newStates.delete(key);
            }
          } else {
            const currentState = newStates.get(key) || { isLoading: false };
            newStates.set(key, {
              ...currentState,
              ...state,
              isLoading: state.isLoading ?? true,
              startTime: state.isLoading !== false ? currentState.startTime || new Date() : undefined,
            });
          }

          return { states: newStates };
        });
      },

      clearLoading: (key: string) => {
        set((current) => {
          const newStates = new Map(current.states);
          newStates.delete(key);
          return { states: newStates };
        });
      },

      clearAllLoading: () => {
        set({ states: new Map() });
      },

      isLoading: (key: string) => {
        const state = get().states.get(key);
        return state?.isLoading ?? false;
      },

      getLoadingState: (key: string) => {
        return get().states.get(key);
      },

      getGlobalLoadingState: () => {
        const states = get().states;
        const loadingStates = Array.from(states.values()).filter((state: LoadingState) => state.isLoading);
        return {
          isLoading: loadingStates.length > 0,
          count: loadingStates.length,
        };
      },
    }),
    {
      name: "loading-store",
    }
  )
);

// Hook for individual loading states
export const useLoading = (key: string) => {
  const { setLoading, clearLoading, isLoading, getLoadingState } = useLoadingStore();

  return {
    isLoading: isLoading(key),
    state: getLoadingState(key),
    setLoading: (state: Partial<LoadingState> | boolean) => setLoading(key, state),
    clearLoading: () => clearLoading(key),
  };
};

// Hook for global loading state
export const useGlobalLoading = () => {
  const { getGlobalLoadingState, clearAllLoading } = useLoadingStore();

  return {
    ...getGlobalLoadingState(),
    clearAll: clearAllLoading,
  };
};

// Utility functions for common loading patterns
export class LoadingManager {
  private static instance: LoadingManager;
  private store: LoadingStore;

  constructor() {
    this.store = useLoadingStore.getState();
  }

  static getInstance(): LoadingManager {
    if (!LoadingManager.instance) {
      LoadingManager.instance = new LoadingManager();
    }
    return LoadingManager.instance;
  }

  // Async operation wrapper
  async withLoading<T>(
    key: string,
    operation: () => Promise<T>,
    options?: {
      message?: string;
      estimatedDuration?: number;
      onProgress?: (progress: number) => void;
    }
  ): Promise<T> {
    try {
      this.store.setLoading(key, {
        isLoading: true,
        message: options?.message,
        estimatedDuration: options?.estimatedDuration,
        type: options?.onProgress ? "determinate" : "indeterminate",
      });

      const result = await operation();
      return result;
    } finally {
      this.store.clearLoading(key);
    }
  }

  // Step-based loading (for multi-step operations)
  async withSteppedLoading<T>(
    key: string,
    steps: Array<{
      name: string;
      operation: () => Promise<T>;
      weight?: number;
    }>,
    options?: {
      onStepComplete?: (stepIndex: number, stepName: string) => void;
    }
  ): Promise<T[]> {
    const totalWeight = steps.reduce((sum, step) => sum + (step.weight || 1), 0);
    let completedWeight = 0;
    const results: T[] = [];

    try {
      this.store.setLoading(key, {
        isLoading: true,
        progress: 0,
        type: "determinate",
        message: `Starting ${steps.length} steps...`,
      });

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const stepWeight = step.weight || 1;

        this.store.setLoading(key, {
          isLoading: true,
          progress: (completedWeight / totalWeight) * 100,
          message: step.name,
        });

        const result = await step.operation();
        results.push(result);

        completedWeight += stepWeight;
        options?.onStepComplete?.(i, step.name);

        this.store.setLoading(key, {
          isLoading: true,
          progress: (completedWeight / totalWeight) * 100,
          message: i === steps.length - 1 ? "Completing..." : step.name,
        });
      }

      return results;
    } finally {
      this.store.clearLoading(key);
    }
  }

  // File upload progress
  uploadWithProgress(key: string, file: File, uploadFn: (file: File, onProgress: (progress: number) => void) => Promise<unknown>): Promise<unknown> {
    return this.withLoading(key, () => {
      return uploadFn(file, (progress) => {
        this.store.setLoading(key, {
          isLoading: true,
          progress,
          type: "determinate",
          message: `Uploading ${file.name}... ${Math.round(progress)}%`,
        });
      });
    });
  }

  // Batch operations
  async withBatchLoading<T, R>(
    key: string,
    items: T[],
    batchFn: (item: T, index: number) => Promise<R>,
    options?: {
      batchSize?: number;
      message?: string;
      onBatchComplete?: (completedCount: number, totalCount: number) => void;
    }
  ): Promise<R[]> {
    const batchSize = options?.batchSize || 5;
    const results: R[] = [];
    let completedCount = 0;

    this.store.setLoading(key, {
      isLoading: true,
      progress: 0,
      type: "determinate",
      message: options?.message || `Processing ${items.length} items...`,
    });

    try {
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchPromises = batch.map((item, batchIndex) => batchFn(item, i + batchIndex));

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        completedCount += batch.length;
        const progress = (completedCount / items.length) * 100;

        this.store.setLoading(key, {
          isLoading: true,
          progress,
          message: `Processed ${completedCount}/${items.length} items`,
        });

        options?.onBatchComplete?.(completedCount, items.length);
      }

      return results;
    } finally {
      this.store.clearLoading(key);
    }
  }

  // Simple loading setters
  start(key: string, message?: string) {
    this.store.setLoading(key, {
      isLoading: true,
      message,
      type: "indeterminate",
    });
  }

  progress(key: string, progress: number, message?: string) {
    this.store.setLoading(key, {
      isLoading: true,
      progress,
      message,
      type: "determinate",
    });
  }

  stop(key: string) {
    this.store.clearLoading(key);
  }

  isLoading(key: string): boolean {
    return this.store.isLoading(key);
  }

  getState(key: string): LoadingState | undefined {
    return this.store.getLoadingState(key);
  }
}

// Singleton instance
export const loadingManager = LoadingManager.getInstance();

// Common loading keys for the application
export const LoadingKeys = {
  // Authentication
  LOGIN: "auth.login",
  LOGOUT: "auth.logout",
  REGISTER: "auth.register",

  // Dashboard
  DASHBOARD_INIT: "dashboard.init",
  DASHBOARD_REFRESH: "dashboard.refresh",

  // Bots
  BOT_CREATE: "bot.create",
  BOT_UPDATE: "bot.update",
  BOT_DELETE: "bot.delete",
  BOT_START: "bot.start",
  BOT_STOP: "bot.stop",
  BOT_EVALUATE: "bot.evaluate",

  // Trades
  TRADE_OPEN: "trade.open",
  TRADE_CLOSE: "trade.close",
  TRADE_UPDATE: "trade.update",
  TRADES_LOAD: "trades.load",

  // Market Data
  MARKET_DATA_LOAD: "market.load",
  CHART_LOAD: "chart.load",

  // Settings
  SETTINGS_SAVE: "settings.save",
  CREDENTIALS_SAVE: "credentials.save",

  // File Operations
  EXPORT_DATA: "export.data",
  IMPORT_DATA: "import.data",

  // Analysis
  ANALYSIS_RUN: "analysis.run",
  BACKTEST_RUN: "backtest.run",
} as const;

// Helper hooks for common operations
export const useAsyncOperation = <T extends unknown[], R>(key: string, fn: (...args: T) => Promise<R>) => {
  const { isLoading, setLoading, clearLoading } = useLoading(key);

  const execute = async (...args: T): Promise<R> => {
    try {
      setLoading(true);
      return await fn(...args);
    } finally {
      clearLoading();
    }
  };

  return {
    execute,
    isLoading,
  };
};

export const useSteppedOperation = (key: string) => {
  const { state } = useLoading(key);

  const executeSteps = async <T>(
    steps: Array<{
      name: string;
      operation: () => Promise<T>;
      weight?: number;
    }>
  ) => {
    return loadingManager.withSteppedLoading(key, steps);
  };

  return {
    executeSteps,
    isLoading: state?.isLoading ?? false,
    progress: state?.progress,
    message: state?.message,
  };
};
