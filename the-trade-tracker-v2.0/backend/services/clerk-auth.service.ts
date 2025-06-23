import { prisma } from '../utils/prisma';
import * as fs from 'fs';
import * as path from 'path';
import jwt from 'jsonwebtoken';
import { SignOptions } from 'jsonwebtoken';
import { loggerService } from './logger.service';

interface ClerkUser {
  id: string; // This is the Clerk user ID
  email: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  provider: 'google' | 'email' | 'github' | 'microsoft' | 'apple' | 'facebook';
}

interface TokenPayload {
  userId: string; // Using UUID format
  email: string;
}

export const clerkAuthService = {
  /**
   * Sync a Clerk user with our database
   * 
   * If the user already exists, we'll update their profile
   * If the user doesn't exist, we'll create a new user
   */
  async syncClerkUser(clerkUser: ClerkUser) {
    try {
      // First check if user exists by clerkId
      let existingUser = await prisma.user.findUnique({
        where: { clerkId: clerkUser.id }
      });
      
      // If not found by clerkId, try by email (for backward compatibility)
      if (!existingUser) {
        existingUser = await prisma.user.findFirst({
          where: { email: clerkUser.email }
        });
      }
      
      if (existingUser) {
        // Update existing user
        const updatedUser = await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            clerkId: clerkUser.id, // Always update clerkId to ensure it's set
            email: clerkUser.email, // Update email
            firstName: clerkUser.firstName,
            lastName: clerkUser.lastName,
            imageUrl: clerkUser.imageUrl
          }
        });
        
        return {
          user: updatedUser,
          token: this.generateToken({ userId: updatedUser.id, email: updatedUser.email }),
          refreshToken: this.generateRefreshToken({ userId: updatedUser.id, email: updatedUser.email }),
        };
      }
    
      // Create new user
      const newUser = await prisma.user.create({
        data: {
          clerkId: clerkUser.id,
          email: clerkUser.email,
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
          imageUrl: clerkUser.imageUrl
        }
      });
      
      return {
        user: newUser,
        token: this.generateToken({ userId: newUser.id, email: newUser.email }),
        refreshToken: this.generateRefreshToken({ userId: newUser.id, email: newUser.email }),
      };
    } catch (error) {
      loggerService.error('Error syncing user from Clerk:', error);
      throw error;
    }
  },
  
  /**
   * Generate a JWT token
   */
  generateToken(payload: TokenPayload) {
    const secret = process.env.JWT_SECRET as string;
    const options: SignOptions = { expiresIn: '1h' };
    
    return jwt.sign(payload, secret, options);
  },
  
  /**
   * Generate a refresh token
   */
  generateRefreshToken(payload: TokenPayload) {
    const secret = process.env.JWT_SECRET as string;
    const options: SignOptions = { expiresIn: '7d' };
    
    return jwt.sign(payload, secret, options);
  },
  
  /**
   * Verify a JWT token
   */
  verifyToken(token: string) {
    try {
      const secret = process.env.JWT_SECRET as string;
      return jwt.verify(token, secret) as TokenPayload;
    } catch (error) {
      return null;
    }
  },
  
  /**
   * Get user from token
   */
  async getUserFromToken(token: string) {
    try {
      const decoded = this.verifyToken(token) as TokenPayload;
      if (!decoded) return null;
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      });
      
      if (!user) {
        return null;
      }
      
      return {
        id: user.id,         // Changed from userId to id
        email: user.email,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
      };
    } catch (error) {
      console.error('Error getting user from token:', error);
      return null;
    }
  },

  /**
   * Process a Clerk webhook event
   */
  async processWebhookEvent(eventType: string, data: any) {
    loggerService.info(`Processing webhook event: ${eventType}`);
    
    // Write to a file for debugging
    const debugFile = path.join(__dirname, '../../webhook-processing.log');
    
    fs.appendFileSync(
      debugFile,
      `\n[${new Date().toISOString()}] Processing event: ${eventType}\nDATA: ${JSON.stringify(data, null, 2)}\n`
    );
    
    try {
      switch (eventType) {
        // User events
        case 'user.created':
          loggerService.info('Handling user.created event');
          await this.handleUserCreated(data);
          loggerService.info('User creation handler completed successfully');
          break;
        case 'user.updated':
          loggerService.info('Handling user.updated event');
          await this.handleUserUpdated(data);
          loggerService.info('User update handler completed successfully');
          break;
        case 'user.deleted':
          loggerService.info('Handling user.deleted event');
          await this.handleUserDeleted(data);
          loggerService.info('User deletion handler completed successfully');
          break;
        
        // Session events
        case 'session.created':
          loggerService.info('Handling session.created event');
          // Use our session data to sync user information
          if (data.user_id) {
            fs.appendFileSync(debugFile, `\nSession has user_id: ${data.user_id}, processing user creation\n`);
            await this.syncUserFromSession(data);
            loggerService.info('Session user sync completed');
          } else {
            fs.appendFileSync(debugFile, `\nSession has no user_id, skipping\n`);
            loggerService.warn('Session created event missing user_id');
          }
          break;
          
        case 'session.removed':
          loggerService.info('Handling session.removed event');
          // No action needed currently for session removal
          break;
          
        default:
          loggerService.info(`Unhandled webhook event: ${eventType}`);
          fs.appendFileSync(debugFile, `Unhandled event type: ${eventType}\n`);
      }
      
      fs.appendFileSync(debugFile, `Event processed successfully: ${eventType}\n==========\n`);
    } catch (error) {
      const err = error as Error;
      fs.appendFileSync(debugFile, `ERROR processing event: ${err.message}\n${err.stack || 'No stack trace'}\n`);
      loggerService.error(`Error processing webhook event ${eventType}:`, error);
      throw error; // Rethrow to be caught by the route handler
    }
  },
  
  /**
   * Handle Clerk user.created webhook event
   */
  async handleUserCreated(data: any) {
    loggerService.info('handleUserCreated - Processing data:', JSON.stringify(data, null, 2));
    loggerService.info('Extracted user data structure:', JSON.stringify(data.data, null, 2));
    
    // Extract the actual user data, which is nested inside data.data
    const userData = data.data;
    
    if (!userData) {
      loggerService.warn('Invalid user data format, missing data object');
      return;
    }
    
    // Extract email from the proper nested location
    let primaryEmail = null;
    
    // Check if there's a primary_email_address_id and find that specific email
    if (userData.primary_email_address_id && userData.email_addresses && Array.isArray(userData.email_addresses)) {
      const primaryEmailObj = userData.email_addresses.find((email: any) => email.id === userData.primary_email_address_id);
      if (primaryEmailObj && primaryEmailObj.email_address) {
        primaryEmail = primaryEmailObj.email_address;
      }
    }
    
    // If no primary email found, try the first available email
    if (!primaryEmail && userData.email_addresses && userData.email_addresses.length > 0) {
      primaryEmail = userData.email_addresses[0].email_address;
    }
    
    loggerService.info('Primary email extracted:', primaryEmail);
    
    if (!primaryEmail) {
      loggerService.warn('No primary email found in user data, skipping user creation');
      return;
    }

    try {
      // Check if user already exists
      loggerService.info(`Checking if user with email ${primaryEmail} already exists`);
      
      // Log database debug info
      try {
        loggerService.info('Database connection check');
        const tableInfo = await prisma.$queryRaw`SELECT * FROM information_schema.tables WHERE table_name = 'users'`;
        loggerService.info('users table info:', tableInfo);
        
        // Also check the column types to ensure UUID is used
        const columnInfo = await prisma.$queryRaw`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'users'
        `;
        loggerService.info('users column types:', columnInfo);
      } catch (dbError) {
        loggerService.error('Error checking database schema:', dbError);
      }
      
      const existingUser = await prisma.user.findFirst({
        where: { email: primaryEmail }
      });
      loggerService.info('Existing user query result:', existingUser);
      
      if (existingUser) {
        loggerService.info(`User with email ${primaryEmail} already exists, updating Clerk ID`);
        // Update with clerk ID if needed
        const updateResult = await prisma.user.update({
          where: { id: existingUser.id },
          data: { clerkId: data.id }
        });
        loggerService.info('User update result:', updateResult);
        return;
      }

      // Create new user directly with Prisma
      loggerService.info(`Creating new user with email ${primaryEmail}`);
      
      // Write to a file for debugging
      const debugFile = path.join(__dirname, '../../user-creation-debug.log');
      
      fs.appendFileSync(
        debugFile,
        `\n[${new Date().toISOString()}] Creating user with email: ${primaryEmail}, clerkId: ${data.id}\n`
      );
      
      // Get correct values ensuring nulls are handled
      const clerkId = userData.id || null;
      const email = primaryEmail;
      const firstName = userData.first_name || null;
      const lastName = userData.last_name || null;
      const imageUrl = userData.image_url || userData.profile_image_url || null;
      const username = userData.username || null;
      const metadata = userData.public_metadata ? JSON.stringify(userData.public_metadata) : null;
      
      fs.appendFileSync(
        debugFile,
        `User data: ${JSON.stringify({ clerkId, email, firstName, lastName, imageUrl, username, metadata })}\n`
      );
      
      try {
        // Use Prisma to create the user
        const userData = {
          clerkId,
          email,
          firstName,
          lastName,
          imageUrl,
          username,
          metadata
        };
        
        fs.appendFileSync(debugFile, `User data for Prisma: ${JSON.stringify(userData)}\n`);
        
        const newUser = await prisma.user.create({
          data: userData,
          select: { id: true }
        });
        
        fs.appendFileSync(debugFile, `Insert result: ${JSON.stringify(newUser)}\n`);
        loggerService.info('User created successfully with ID:', newUser.id);
      } catch (error) {
        const sqlError = error as Error;
        fs.appendFileSync(debugFile, `SQL ERROR: ${sqlError.message}\n${sqlError.stack || 'No stack trace'}\n`);
        loggerService.error('SQL error during user creation:', sqlError);
        throw error;
      }
    } catch (error) {
      loggerService.error('Error handling user creation:', error);
      throw error;
    }
  },
  
  /**
   * Handle Clerk user.updated webhook event
   */
  async handleUserUpdated(data: any) {
    const primaryEmail = data.email_addresses?.[0]?.email_address;
    if (!primaryEmail) return;

    // Try finding by clerk ID first, then by email
    let user = await prisma.user.findUnique({
      where: { clerkId: data.id }
    });
    
    if (!user) {
      user = await prisma.user.findFirst({
        where: { email: primaryEmail }
      });
    }

    if (!user) return; // User not found

    await prisma.user.update({
      where: { id: user.id },
      data: {
        clerkId: data.id,
        email: primaryEmail,
        firstName: data.first_name || undefined,
        lastName: data.last_name || undefined,
        imageUrl: data.image_url || undefined
      }
    });
  },
  
  /**
   * Handle Clerk user.deleted webhook event
   */
  async handleUserDeleted(data: any) {
    if (!data.id) return;
    
    // Find the user first
    const user = await prisma.user.findUnique({
      where: { clerkId: data.id }
    });
    
    if (!user) return;
    
    // Delete the user from our database
    await prisma.user.delete({
      where: { id: user.id }
    });
  },
  
  /**
   * Sync user data from a session event
   * This is used when we receive session events but no user events
   */
  async syncUserFromSession(sessionData: any) {
    // Write to a file for debugging
    const debugFile = path.join(__dirname, '../../session-sync-debug.log');
    
    fs.appendFileSync(
      debugFile,
      `\n[${new Date().toISOString()}] Syncing user from session\nSession data: ${JSON.stringify(sessionData, null, 2)}\n`
    );
    
    try {
      const userId = sessionData.user_id;
      if (!userId) {
        fs.appendFileSync(debugFile, `No user_id in session data\n`);
        return;
      }
      
      // First check if this user already exists in our database
      const existingUser = await prisma.user.findUnique({
        where: { clerkId: userId }
      });
      fs.appendFileSync(debugFile, `Existing user query result: ${JSON.stringify(existingUser)}\n`);
      
      if (existingUser) {
        fs.appendFileSync(debugFile, `User with clerk ID ${userId} already exists in database\n`);
        return;
      }
      
      // In a real implementation, you would use Clerk's API to fetch the user details
      // For now, we'll create a minimal user record with just the Clerk ID
      // Later, when we get a user.updated event, it will fill in the details
      
      fs.appendFileSync(debugFile, `Creating user with Prisma\n`);
      
      try {
        // Use Prisma to create a minimal user with just the essential fields
        await prisma.user.create({
          data: {
            clerkId: userId,
            email: userId + '@placeholder.com'
          }
        });
        
        fs.appendFileSync(debugFile, `User created successfully with Prisma\n`);
        
        // Success! User created
        fs.appendFileSync(debugFile, `Successfully created placeholder user for clerk ID: ${userId}\n`);
      } catch (error) {
        const err = error as Error;
        fs.appendFileSync(debugFile, `ERROR during Prisma insert: ${err.message}\n${err.stack || 'No stack trace'}\n`);
        throw error;
      }
    } catch (error) {
      const err = error as Error;
      fs.appendFileSync(debugFile, `ERROR syncing user from session: ${err.message}\n${err.stack || 'No stack trace'}\n`);
      throw error;
    }
  }
};
