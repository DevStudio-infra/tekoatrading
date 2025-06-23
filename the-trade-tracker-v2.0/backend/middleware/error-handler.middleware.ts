import { Request, Response, NextFunction } from 'express';
import { loggerService } from '../services/logger.service';
import { TRPCError } from '@trpc/server';

// Custom error class for API errors
export class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(statusCode: number, message: string, isOperational = true, stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// Error handler middleware for Express
export const errorHandler = (err: Error | ApiError | TRPCError, req: Request, res: Response, next: NextFunction) => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let isOperational = false;

  // Handle ApiError
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    isOperational = err.isOperational;
  } 
  // Handle TRPCError
  else if ('code' in err) {
    // Map TRPC error codes to HTTP status codes
    const codeMap: Record<string, number> = {
      BAD_REQUEST: 400,
      UNAUTHORIZED: 401,
      FORBIDDEN: 403,
      NOT_FOUND: 404,
      TIMEOUT: 408,
      CONFLICT: 409,
      PRECONDITION_FAILED: 412,
      PAYLOAD_TOO_LARGE: 413,
      METHOD_NOT_SUPPORTED: 405,
      UNPROCESSABLE_CONTENT: 422,
      TOO_MANY_REQUESTS: 429,
      INTERNAL_SERVER_ERROR: 500,
      NOT_IMPLEMENTED: 501,
      SERVICE_UNAVAILABLE: 503,
    };
    
    statusCode = codeMap[err.code] || 500;
    message = err.message;
    isOperational = true;
  }

  // Log error details
  loggerService.errorWithStack(
    `${req.method} ${req.path} - ${statusCode} ${message}`,
    err as Error,
    {
      method: req.method,
      path: req.path,
      statusCode,
      ip: req.ip,
      userId: (req as any).user?.id,
    }
  );

  // Send error response
  res.status(statusCode).json({
    status: 'error',
    message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    isOperational,
  });
};

// Not found middleware
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new ApiError(404, `Not Found - ${req.originalUrl}`);
  next(error);
};

// Async handler for route handlers
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
