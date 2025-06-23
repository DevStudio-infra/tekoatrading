import { inferAsyncReturnType } from '@trpc/server';
import { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import * as jwt from 'jsonwebtoken';
import { prisma } from '../../utils/prisma';

interface JwtPayload {
  clerkId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  iat?: number;
  exp?: number;
}

export const createContext = async ({ req, res }: CreateExpressContextOptions) => {
  let user: { id: string; email: string; firstName: string; lastName: string } | null = null;

  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      
      const decoded = jwt.verify(
        token, 
        process.env.JWT_SECRET || 'default-secret-key'
      ) as JwtPayload;
      
      if (decoded.clerkId) {
        const userData = await prisma.user.findUnique({
          where: { clerkId: decoded.clerkId }
        });
        
        if (userData) {
          user = {
            id: userData.clerkId,
            email: userData.email,
            firstName: userData.firstName || '',
            lastName: userData.lastName || ''
          };
        }
      }
    }
  } catch (error) {
    console.error('Auth error:', error);
  }

  return {
    req,
    res,
    user
  };
};

export type Context = inferAsyncReturnType<typeof createContext>;
