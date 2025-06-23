import { z } from 'zod';
import { publicProcedure, router } from '../index';
import { clerkAuthService } from '../../../services/clerk-auth.service';

// Clerk authentication router
export const clerkAuthRouter = router({
  // Sync a Clerk user with our database
  syncUser: publicProcedure
    .input(z.object({
      id: z.string(),
      email: z.string().email(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      imageUrl: z.string().optional(),
      provider: z.enum(['google', 'email']).default('email'),
    }))
    .mutation(async ({ input }) => {
      const result = await clerkAuthService.syncClerkUser({
        id: input.id,
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        imageUrl: input.imageUrl,
        provider: input.provider,
      });
      
      return {
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
        },
        token: result.token,
        refreshToken: result.refreshToken,
      };
    }),
  
  // Verify a JWT token
  verifyToken: publicProcedure
    .input(z.object({
      token: z.string(),
    }))
    .query(async ({ input }) => {
      const payload = clerkAuthService.verifyToken(input.token);
      
      if (!payload) {
        throw new Error('Invalid token');
      }
      
      const user = await clerkAuthService.getUserFromToken(input.token);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      return {
        valid: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      };
    }),
});
