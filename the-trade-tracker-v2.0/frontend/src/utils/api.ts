"use client";

import { QueryClient } from '@tanstack/react-query';

// Create a query client for React Query
export const createQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: false,
      },
    },
  });
};

// Create a dummy API client without JSX
export const api = {
  // Simple provider function that just returns children
  Provider: function ApiProvider(props: { children: any; client?: any; queryClient?: any }) {
    return props.children;
  }
};

export const getBaseUrl = () => {
  // Browser should use relative URL
  if (typeof window !== 'undefined') {
    // For internationalized routes, we need to make sure we're using the correct base URL
    return window.location.origin;
  }
  
  // SSR should use the API URL from env
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // Fallback to localhost
  return `http://localhost:${process.env.PORT || 5000}`;
};

export const getApiUrl = () => {
  return `${getBaseUrl()}/api/trpc`;
};

// Helper to handle API errors gracefully
export const handleApiError = (error: any) => {
  console.error('API Error:', error);
  if (error?.message?.includes('Failed to fetch')) {
    return 'Could not connect to the API server. Please make sure the backend is running.';
  }
  return error?.message || 'An unknown error occurred';
};

// Create dummy functions for API calls that would normally use tRPC
// These will return empty data but won't cause errors
export const createDummyApiHandler = () => {
  return {
    useQuery: () => ({
      data: null,
      isLoading: false,
      error: null,
    }),
    useMutation: () => ({
      mutate: async () => null,
      isLoading: false,
      error: null,
    }),
  };
};

// Export dummy API handlers for common resources
export const brokers = createDummyApiHandler();
export const evaluations = createDummyApiHandler();
export const strategies = createDummyApiHandler();
export const bots = createDummyApiHandler();
