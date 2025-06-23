import { Request, Response, NextFunction } from "express";
import { authService } from "../../services/auth.service";

// Extended Request interface to include user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string | number;
        id: string | number; // Add id as alias for userId to prevent errors
        email: string;
      };
    }
  }
}

/**
 * Middleware to authenticate requests using JWT
 */
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  console.log("[DEBUG] Auth middleware - Authenticating request to:", req.originalUrl);
  console.log("[DEBUG] Auth middleware - Headers:", JSON.stringify(req.headers, null, 2));

  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "No authorization token provided",
        error: "Authentication required",
      });
    }

    // Extract JWT token (Bearer token format)
    const parts = authHeader.split(" ");

    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization format",
        error: "Token must be in format: Bearer [token]",
      });
    }

    const token = parts[1];

    // Development mode bypass
    if (process.env.NODE_ENV === "development" && token === "dev-user") {
      console.log("[DEBUG] Auth middleware - Using development mode bypass");
      req.user = {
        userId: "dev-user",
        id: "dev-user",
        email: "dev@example.com",
      };
      return next();
    }

    // Verify token
    const decoded = authService.validateToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
        error: "Token verification failed",
      });
    }

    // Validate that userId or id exists in the decoded token
    const userId = decoded.userId || decoded.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload",
        error: "Token missing required user information",
      });
    }

    // Attach user info to request
    req.user = {
      userId: userId,
      id: userId, // Keep id as an alias for userId
      email: decoded.email || "",
    };

    // Continue to next middleware/controller
    next();
  } catch (error) {
    // Log the error for debugging
    console.error("Authentication error:", error);

    // Return a standardized error response
    return res.status(500).json({
      success: false,
      message: "Authentication failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
