/**
 * @deprecated This service is deprecated. Please use clerk-auth.service.ts instead
 * This is a compatibility layer for legacy code while migrating to Clerk authentication
 */

import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';
import { loggerService } from './logger.service';

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export class AuthService {
  /**
   * @deprecated Use clerk-auth.service.ts instead
   */
  async register(userData: any): Promise<{ user: any; token: string }> {
    loggerService.warn('Legacy auth.service.register called - this method is deprecated');
    
    // For compatibility, find or create a user with the provided email
    const existingUser = await prisma.user.findFirst({
      where: { email: userData.email }
    });
    
    if (existingUser) {
      const token = this.generateToken(existingUser);
      return {
        user: existingUser,
        token
      };
    }
    
    // Create a new user without password (since we use Clerk now)
    const newUser = await prisma.user.create({
      data: {
        email: userData.email,
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        clerkId: `legacy-${Date.now()}` // Temporary clerkId for legacy registration
      }
    });
    
    const token = this.generateToken(newUser);
    return {
      user: newUser,
      token
    };
  }
  
  /**
   * @deprecated Use clerk-auth.service.ts instead
   */
  async login(email: string, _password: string): Promise<{ user: any; token: string } | null> {
    loggerService.warn('Legacy auth.service.login called - this method is deprecated');
    
    // Find user by email - ignore password check since we've migrated to Clerk
    const user = await prisma.user.findFirst({
      where: { email }
    });
    
    if (!user) {
      return null; // User not found
    }
    
    // Generate token
    const token = this.generateToken(user);
    
    return {
      user,
      token
    };
  }
  
  /**
   * @deprecated Use clerk-auth.service.ts instead
   */
  verifyToken(token: string): any {
    try {
      // @ts-ignore - ignoring type issues since this service is deprecated
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      // In development mode, also try base64 parsing for compatibility
      if (process.env.NODE_ENV === 'development') {
        try {
          loggerService.debug('JWT verification failed, trying base64 JSON parsing');
          const decoded = Buffer.from(token, 'base64').toString('utf-8');
          return JSON.parse(decoded);
        } catch (e) {
          loggerService.debug('Failed to parse as base64 JSON');
        }
      }
      return null;
    }
  }
  
  /**
   * @deprecated Use clerk-auth.service.ts instead
   */
  generateRefreshToken(user: any): string {
    // @ts-ignore - ignoring type issues since this service is deprecated
    return jwt.sign(
      {
        userId: user.id, // Use userId to match our new token structure
        email: user.email,
        isRefreshToken: true
      },
      JWT_SECRET,
      { expiresIn: JWT_REFRESH_EXPIRES_IN }
    );
  }

  /**
   * For compatibility with old code
   * @deprecated Use verifyToken instead
   */
  validateToken(token: string): any {
    return this.verifyToken(token);
  }
  
  /**
   * Generate a JWT token
   */
  generateToken(user: any): string {
    // @ts-ignore - ignoring type issues since this service is deprecated
    return jwt.sign(
      {
        userId: user.id, // Changed from id to userId
        email: user.email
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }
}

export const authService = new AuthService();
