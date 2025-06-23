import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { DEV_AUTH_TOKEN } from './api-auth';

/**
 * Get the server session for server components
 * Works in both development and production environments
 * 
 * @returns The session object with userId
 */
export async function getServerSession() {
  // In development, return a mock session
  if (process.env.NODE_ENV === 'development') {
    return {
      userId: 'user_development',
      user: {
        id: 'user_development',
        email: 'dev@example.com',
        firstName: 'Development',
        lastName: 'User'
      }
    };
  }

  // In production, use Clerk's auth
  const session = auth();
  
  if (!session || !session.userId) {
    return null;
  }

  return {
    userId: session.userId,
    user: {
      id: session.userId,
      // Other user properties would be fetched from Clerk in a real implementation
    }
  };
}

/**
 * Get the auth header for API requests
 * 
 * @param req The Next.js request object
 * @returns The authorization header
 */
export function getAuthHeader(req?: NextRequest) {
  if (process.env.NODE_ENV === 'development') {
    return DEV_AUTH_TOKEN;
  }

  // In production, extract from request
  if (req) {
    return req.headers.get('authorization');
  }

  return null;
}
