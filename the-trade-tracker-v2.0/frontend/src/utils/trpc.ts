import { createTRPCProxyClient, httpBatchLink, loggerLink } from '@trpc/client';
import { createTRPCNext } from '@trpc/next';
import superjson from 'superjson';
import type { AppRouter } from '../../../backend/api/trpc/routers';

const getBaseUrl = () => {
  // If in the browser, use relative path
  if (typeof window !== 'undefined') {
    return '';
  }
  
  // In server-side rendering, use environment variable or default
  if (process.env.NEXT_PUBLIC_API_URL) {
    return `${process.env.NEXT_PUBLIC_API_URL}`;
  }
  
  // If running in development environment locally
  return `http://localhost:${process.env.PORT || 5000}`;
};

/**
 * A set of type-safe React hooks from your API
 */
export const trpc = createTRPCNext<AppRouter>({
  config: () => {
    return {
      transformer: superjson,
      links: [
        loggerLink({
          enabled: (opts) =>
            process.env.NODE_ENV === 'development' ||
            (opts.direction === 'down' && opts.result instanceof Error),
        }),
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
        }),
      ],
    };
  },
  /**
   * Whether tRPC should await queries when server rendering pages.
   */
  ssr: true,
});
