import { Request, Response, NextFunction } from "express";
import { z, ZodError, ZodSchema } from "zod";
import { loggerService } from "../../agents/core/services/logging/logger.service";
import DOMPurify from "isomorphic-dompurify";

// Common validation schemas
export const commonSchemas = {
  // Basic types
  id: z.string().uuid("Invalid UUID format"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128, "Password too long"),

  // Trading-specific
  symbol: z.string().regex(/^[A-Z]{2,10}\/[A-Z]{2,10}$|^[A-Z]{2,10}$/, "Invalid trading symbol format"),
  timeframe: z.enum(["M1", "M5", "M15", "M30", "H1", "H4", "D1", "W1"], {
    errorMap: () => ({ message: "Invalid timeframe" }),
  }),
  direction: z.enum(["BUY", "SELL", "LONG", "SHORT"], {
    errorMap: () => ({ message: "Invalid trade direction" }),
  }),

  // Numeric validations
  positiveNumber: z.number().positive("Must be a positive number"),
  percentage: z.number().min(0, "Percentage cannot be negative").max(100, "Percentage cannot exceed 100"),
  price: z.number().positive("Price must be positive").max(1000000, "Price too high"),
  quantity: z.number().positive("Quantity must be positive").max(1000000, "Quantity too high"),

  // Pagination
  pagination: z.object({
    page: z.coerce.number().int().min(1, "Page must be at least 1").default(1),
    limit: z.coerce.number().int().min(1, "Limit must be at least 1").max(100, "Limit cannot exceed 100").default(10),
  }),

  // Date range
  dateRange: z
    .object({
      startDate: z.string().datetime("Invalid start date format"),
      endDate: z.string().datetime("Invalid end date format"),
    })
    .refine((data) => new Date(data.startDate) <= new Date(data.endDate), { message: "Start date must be before end date", path: ["startDate"] }),
};

// Bot-specific schemas
export const botSchemas = {
  createBot: z.object({
    name: z.string().min(1, "Bot name is required").max(100, "Bot name too long"),
    strategyId: z.string().uuid("Invalid strategy ID"),
    brokerCredentialId: z.string().uuid("Invalid broker credential ID"),
    symbol: commonSchemas.symbol,
    timeframe: commonSchemas.timeframe,
    isActive: z.boolean().default(false),
    isPaperTrading: z.boolean().default(true),
    aiEnabled: z.boolean().default(false),
    maxSimultaneousTrades: z.number().int().min(1).max(10).default(1),
    riskControls: z
      .object({
        maxDrawdown: commonSchemas.percentage.optional(),
        stopLoss: commonSchemas.percentage.optional(),
        takeProfit: commonSchemas.percentage.optional(),
        maxRiskPerTrade: commonSchemas.percentage.optional(),
      })
      .optional(),
  }),

  updateBot: z.object({
    name: z.string().min(1).max(100).optional(),
    isActive: z.boolean().optional(),
    isPaperTrading: z.boolean().optional(),
    aiEnabled: z.boolean().optional(),
    maxSimultaneousTrades: z.number().int().min(1).max(10).optional(),
    riskControls: z
      .object({
        maxDrawdown: commonSchemas.percentage.optional(),
        stopLoss: commonSchemas.percentage.optional(),
        takeProfit: commonSchemas.percentage.optional(),
        maxRiskPerTrade: commonSchemas.percentage.optional(),
      })
      .optional(),
  }),

  tradeParams: z.object({
    symbol: commonSchemas.symbol,
    direction: commonSchemas.direction,
    quantity: commonSchemas.quantity,
    price: commonSchemas.price.optional(),
    stopLoss: commonSchemas.price.optional(),
    takeProfit: commonSchemas.price.optional(),
    orderType: z.enum(["MARKET", "LIMIT", "STOP"], {
      errorMap: () => ({ message: "Invalid order type" }),
    }),
  }),
};

// Strategy schemas
export const strategySchemas = {
  createStrategy: z.object({
    name: z.string().min(1, "Strategy name is required").max(100, "Strategy name too long"),
    description: z.string().max(500, "Description too long").optional(),
    timeframes: z.array(commonSchemas.timeframe).min(1, "At least one timeframe is required"),
    indicators: z
      .array(
        z.object({
          type: z.string().min(1, "Indicator type is required"),
          params: z.record(z.any()).optional(),
          color: z
            .string()
            .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format")
            .optional(),
        })
      )
      .optional(),
    entryConditions: z.array(z.any()).optional(),
    exitConditions: z.array(z.any()).optional(),
    riskControls: z
      .object({
        maxDrawdown: commonSchemas.percentage.optional(),
        trailingStopLoss: commonSchemas.percentage.optional(),
        takeProfitLevel: commonSchemas.percentage.optional(),
      })
      .optional(),
  }),
};

// Broker credential schemas
export const brokerSchemas = {
  createCredential: z.object({
    brokerName: z.enum(["capital.com", "alpaca", "interactive_brokers"], {
      errorMap: () => ({ message: "Unsupported broker" }),
    }),
    credentials: z.record(z.string()).refine((creds) => Object.keys(creds).length > 0, { message: "Credentials cannot be empty" }),
    isDemo: z.boolean().default(true),
    name: z.string().min(1, "Credential name is required").max(100, "Name too long"),
  }),
};

// Analytics schemas
export const analyticsSchemas = {
  exportRequest: z.object({
    period: z.enum(["7d", "30d", "90d", "1y"], {
      errorMap: () => ({ message: "Invalid period" }),
    }),
    format: z.enum(["PDF", "CSV"], {
      errorMap: () => ({ message: "Invalid export format" }),
    }),
    sections: z.object({
      performanceMetrics: z.boolean().default(true),
      pnlHistory: z.boolean().default(true),
      winLossDistribution: z.boolean().default(true),
      botComparison: z.boolean().default(false),
      strategyPerformance: z.boolean().default(false),
      riskAnalysis: z.boolean().default(true),
      tradeDetails: z.boolean().default(false),
    }),
    strategyFilter: z
      .object({
        id: z.string().uuid(),
        name: z.string(),
      })
      .optional(),
    dateRange: commonSchemas.dateRange.optional(),
  }),
};

// Sanitization functions
const sanitizeString = (value: string): string => {
  if (typeof value !== "string") return value;

  // Remove HTML tags and malicious content
  const cleaned = DOMPurify.sanitize(value, { ALLOWED_TAGS: [] });

  // Trim whitespace
  return cleaned.trim();
};

const sanitizeObject = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === "string") {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (typeof obj === "object") {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
};

// Validation middleware factory
export const validateInput = (schema: ZodSchema, target: "body" | "query" | "params" = "body") => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get the data to validate
      let data = req[target];

      // Sanitize the data before validation
      data = sanitizeObject(data);

      // Validate the data
      const validatedData = schema.parse(data);

      // Replace the original data with validated and sanitized data
      req[target] = validatedData;

      loggerService.debug(`Input validation passed for ${req.method} ${req.originalUrl}`);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
          received: "received" in err ? err.received : "unknown",
        }));

        loggerService.warn(`Input validation failed for ${req.method} ${req.originalUrl}: ${JSON.stringify(errors)}`);

        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors,
        });
      }

      loggerService.error(`Validation middleware error: ${error}`);
      return res.status(500).json({
        success: false,
        message: "Internal validation error",
      });
    }
  };
};

// Pre-configured validation middlewares
export const validationMiddleware = {
  // Common validations
  pagination: validateInput(commonSchemas.pagination, "query"),
  dateRange: validateInput(commonSchemas.dateRange, "query"),
  id: validateInput(z.object({ id: commonSchemas.id }), "params"),

  // Bot validations
  createBot: validateInput(botSchemas.createBot),
  updateBot: validateInput(botSchemas.updateBot),
  tradeParams: validateInput(botSchemas.tradeParams),

  // Strategy validations
  createStrategy: validateInput(strategySchemas.createStrategy),

  // Broker validations
  createCredential: validateInput(brokerSchemas.createCredential),

  // Analytics validations
  exportRequest: validateInput(analyticsSchemas.exportRequest),
};

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Set security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");

  // Remove server information
  res.removeHeader("X-Powered-By");

  next();
};

// Request size limit middleware
export const requestSizeLimit = (maxSize: string = "10mb") => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = req.get("content-length");

    if (contentLength) {
      const sizeInBytes = parseInt(contentLength, 10);
      const maxSizeInBytes = parseSize(maxSize);

      if (sizeInBytes > maxSizeInBytes) {
        return res.status(413).json({
          success: false,
          message: "Request entity too large",
          maxSize,
        });
      }
    }

    next();
  };
};

// Helper function to parse size strings like "10mb", "1gb", etc.
const parseSize = (size: string): number => {
  const units: { [key: string]: number } = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };

  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)$/);
  if (!match) return 0;

  const [, value, unit] = match;
  return parseFloat(value) * units[unit];
};
