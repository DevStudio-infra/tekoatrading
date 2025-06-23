import { Request, Response, NextFunction } from "express";
import { loggerService } from "../../agents/core/services/logging/logger.service";

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class RateLimiter {
  private store: RateLimitStore = {};
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = {
      message: "Too many requests from this IP, please try again later.",
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      ...config,
    };

    // Clean up expired entries every 5 minutes
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  private cleanup() {
    const now = Date.now();
    Object.keys(this.store).forEach((key) => {
      if (this.store[key].resetTime <= now) {
        delete this.store[key];
      }
    });
  }

  private getKey(req: Request): string {
    // Use combination of IP and user ID if authenticated
    const ip = req.ip || req.connection.remoteAddress || "unknown";
    const userId = (req as any).user?.userId || "anonymous";
    return `${ip}:${userId}`;
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const key = this.getKey(req);
      const now = Date.now();

      // Initialize or reset if window expired
      if (!this.store[key] || this.store[key].resetTime <= now) {
        this.store[key] = {
          count: 0,
          resetTime: now + this.config.windowMs,
        };
      }

      // Increment request count
      this.store[key].count++;

      // Check if limit exceeded
      if (this.store[key].count > this.config.maxRequests) {
        const resetTime = Math.ceil((this.store[key].resetTime - now) / 1000);

        loggerService.warn(`Rate limit exceeded for ${key} on ${req.method} ${req.originalUrl}. ` + `Count: ${this.store[key].count}/${this.config.maxRequests}`);

        res.set({
          "X-RateLimit-Limit": this.config.maxRequests.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": this.store[key].resetTime.toString(),
          "Retry-After": resetTime.toString(),
        });

        return res.status(429).json({
          success: false,
          message: this.config.message,
          retryAfter: resetTime,
        });
      }

      // Set rate limit headers
      res.set({
        "X-RateLimit-Limit": this.config.maxRequests.toString(),
        "X-RateLimit-Remaining": (this.config.maxRequests - this.store[key].count).toString(),
        "X-RateLimit-Reset": this.store[key].resetTime.toString(),
      });

      // Handle response to potentially skip counting
      const originalSend = res.send;
      const rateLimiter = this;
      res.send = function (data: any) {
        const statusCode = res.statusCode;

        // Skip counting based on configuration
        if ((rateLimiter.config.skipSuccessfulRequests && statusCode < 400) || (rateLimiter.config.skipFailedRequests && statusCode >= 400)) {
          rateLimiter.store[key].count--;
        }

        return originalSend.call(this, data);
      };

      next();
    };
  }
}

// Pre-configured rate limiters for different use cases
export const createRateLimiter = (config: RateLimitConfig) => new RateLimiter(config);

// General API rate limiter
export const generalRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 1000, // 1000 requests per 15 minutes
  message: "Too many requests from this IP, please try again later.",
});

// Strict rate limiter for sensitive endpoints
export const strictRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes
  message: "Too many requests to this endpoint, please try again later.",
});

// Authentication rate limiter
export const authRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 login attempts per 15 minutes
  message: "Too many authentication attempts, please try again later.",
  skipSuccessfulRequests: true, // Only count failed attempts
});

// Trading operations rate limiter
export const tradingRateLimit = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  maxRequests: 10, // 10 trading operations per minute
  message: "Too many trading operations, please wait before trying again.",
});

// API creation/modification rate limiter
export const creationRateLimit = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 20, // 20 creation operations per 5 minutes
  message: "Too many creation requests, please wait before trying again.",
});

// Export middleware functions
export const rateLimitMiddleware = {
  general: generalRateLimit.middleware(),
  strict: strictRateLimit.middleware(),
  auth: authRateLimit.middleware(),
  trading: tradingRateLimit.middleware(),
  creation: creationRateLimit.middleware(),
};
