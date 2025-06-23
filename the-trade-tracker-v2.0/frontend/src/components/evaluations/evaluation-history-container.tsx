import React, { useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { EvaluationCard } from "./evaluation-card";
import { Spinner } from "@/components/ui/spinner";
import { useInView } from "react-intersection-observer";
import { Button } from "@/components/ui/button";
import { EvaluationFilters } from "./evaluation-filters";

// Updated Evaluation interface to match API response
export interface Evaluation {
  id: number;
  botId: string; // Change to string to match API
  botName: string; // This will be derived from bot.name
  timestamp: string; // This will be derived from createdAt
  chartImageUrl: string; // This will be derived from chartUrl
  aiAnalysis: string; // This will be derived from metrics.insights
  profitLoss: number;
  trade?: {
    direction: "BUY" | "SELL";
    epic: string;
    size: number;
    openLevel: number;
    closeLevel: number | null;
    profit: number | null;
    status: "OPEN" | "CLOSED";
  };
  indicators: Array<{
    name: string;
    values: Array<Record<string, unknown>>;
  }>;
  // Additional fields from API
  chartUrl?: string;
  prediction?: string;
  confidence?: number;
  metrics?: {
    insights?: string[];
    signalStrength?: number;
    marketCondition?: string;
    riskFactor?: number;
  };
  bot?: {
    name: string;
    tradingPairSymbol?: string;
    timeframe?: string;
  };
  createdAt?: string;
  // New fields for enhanced display
  tradingPair?: string;
  timeframe?: string;
  strategyName?: string;
  signalStrength?: number;
  marketCondition?: string;
  riskFactor?: number;
}

// API Response interface to type the raw API data
interface ApiEvaluation {
  id: number;
  botId: string;
  chartUrl?: string;
  chartImageUrl?: string;
  aiAnalysis?: string | Record<string, unknown>;
  profitLoss: number;
  prediction?: string;
  confidence?: number;
  trade?: {
    direction: "BUY" | "SELL";
    epic: string;
    size: number;
    openLevel: number;
    closeLevel: number | null;
    profit: number | null;
    status: "OPEN" | "CLOSED";
  };
  indicators?: Array<{
    name: string;
    values: Array<Record<string, unknown>>;
  }>;
  metrics?: {
    insights?: string[];
    signalStrength?: number;
    marketCondition?: string;
    riskFactor?: number;
  };
  bot?: {
    name: string;
    tradingPairSymbol?: string;
    timeframe?: string;
  };
  parameters?: {
    strategyName?: string;
    timeframe?: string;
  };
  createdAt?: string;
  timestamp?: string;
}

// Transform API evaluation data to match component expectations
function transformEvaluation(apiEvaluation: ApiEvaluation): Evaluation {
  // Extract AI analysis from the aiAnalysis field (which contains the full LLM response)
  let aiAnalysisText = "No AI analysis available for this evaluation.";

  if (apiEvaluation.aiAnalysis) {
    // If aiAnalysis is a string, use it directly
    if (typeof apiEvaluation.aiAnalysis === "string") {
      aiAnalysisText = apiEvaluation.aiAnalysis;
    }
    // If aiAnalysis is an object, try to extract meaningful text
    else if (typeof apiEvaluation.aiAnalysis === "object") {
      const analysis = apiEvaluation.aiAnalysis as Record<string, unknown>;
      // Try different possible fields where the LLM response might be stored
      aiAnalysisText =
        (analysis.rationale as string) ||
        (analysis.reasoning as string) ||
        (analysis.analysis as string) ||
        (Array.isArray(analysis.insights) ? analysis.insights.join(". ") : "") ||
        JSON.stringify(analysis, null, 2);
    }
  }
  // Fallback to metrics.insights if available
  else if (apiEvaluation.metrics?.insights?.length) {
    aiAnalysisText = apiEvaluation.metrics.insights.join(". ");
  }

  return {
    ...apiEvaluation,
    botName: apiEvaluation.bot?.name || `Bot ${apiEvaluation.botId}`,
    timestamp: apiEvaluation.createdAt || apiEvaluation.timestamp || new Date().toISOString(),
    chartImageUrl: apiEvaluation.chartUrl || apiEvaluation.chartImageUrl || "",
    aiAnalysis: aiAnalysisText,
    indicators: apiEvaluation.indicators || [],
    // Add new fields for enhanced display
    tradingPair: apiEvaluation.bot?.tradingPairSymbol || "Unknown",
    timeframe: apiEvaluation.bot?.timeframe || apiEvaluation.parameters?.timeframe || "Unknown",
    strategyName: apiEvaluation.parameters?.strategyName || "Unknown Strategy",
    signalStrength: apiEvaluation.metrics?.signalStrength || 0,
    marketCondition: apiEvaluation.metrics?.marketCondition || "Unknown",
    riskFactor: apiEvaluation.metrics?.riskFactor || 0,
  };
}

export function EvaluationHistoryContainer() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    botId: null as string | null, // Change to string
    dateRange: null as { from: Date; to: Date } | null,
    profitOnly: false,
  });

  // Use intersection observer for infinite scroll
  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: "200px",
  });

  // Function to fetch evaluations with proper dependencies
  const fetchEvaluations = useCallback(async () => {
    try {
      if (isLoading || !hasMore) return;

      setIsLoading(true);

      // Prepare query params
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      });

      if (filters.botId) {
        queryParams.append("botId", filters.botId);
      }

      if (filters.dateRange) {
        queryParams.append("from", filters.dateRange.from.toISOString());
        queryParams.append("to", filters.dateRange.to.toISOString());
      }

      if (filters.profitOnly) {
        queryParams.append("profitOnly", "true");
      }

      // Fetch data from API with authentication
      const response = await fetchWithAuth(`/api/evaluations?${queryParams.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch evaluations");
      }

      const data = await response.json();

      if (data.evaluations.length === 0) {
        setHasMore(false);
      } else {
        // Transform API data to match component expectations
        const transformedEvaluations = data.evaluations.map(transformEvaluation);

        // Prevent duplicates by filtering out evaluations that already exist
        setEvaluations((prev) => {
          const existingIds = new Set(prev.map((evaluation) => evaluation.id));
          const newEvaluations = transformedEvaluations.filter((evaluation: Evaluation) => !existingIds.has(evaluation.id));
          return [...prev, ...newEvaluations];
        });
        setPage((prev) => prev + 1);

        // If we got less than requested, we've reached the end
        if (data.evaluations.length < 10) {
          setHasMore(false);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [page, filters, isLoading, hasMore]);

  // Load more when bottom is in view
  useEffect(() => {
    if (inView && !isLoading && hasMore) {
      fetchEvaluations();
    }
  }, [inView, fetchEvaluations, isLoading, hasMore]);

  // Trigger initial fetch when filters change
  useEffect(() => {
    if (evaluations.length === 0 && hasMore && !isLoading) {
      fetchEvaluations();
    }
  }, [filters, evaluations.length, hasMore, isLoading, fetchEvaluations]);

  // Handle filter changes - properly memoized to prevent infinite re-renders
  const handleFilterChange = useCallback((newFilters: typeof filters) => {
    setFilters(newFilters);
    setEvaluations([]); // Clear existing evaluations
    setPage(1); // Reset to first page
    setHasMore(true); // Reset hasMore flag
    setError(null); // Clear any errors
  }, []);

  return (
    <div className="space-y-6">
      <EvaluationFilters onFilterChange={handleFilterChange} />

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}

      {evaluations.length === 0 && !isLoading ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No evaluations found</p>
          <Button
            onClick={() =>
              setFilters({
                botId: null,
                dateRange: null,
                profitOnly: false,
              })
            }
            variant="outline"
            className="mt-4">
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {evaluations.map((evaluation) => (
            <EvaluationCard key={evaluation.id} evaluation={evaluation} />
          ))}
        </div>
      )}

      {/* Loader reference element */}
      <div ref={ref} className="flex justify-center py-4">
        {isLoading && <Spinner size="md" />}
      </div>
    </div>
  );
}
