import { z } from 'zod';
import { protectedProcedure, router } from '../index';
import { brokerCredentialService } from '../../../services/broker-credential.service';

export const brokerCredentialRouter = router({
  // Create a new broker credential
  createBrokerCredential: protectedProcedure
    .input(z.object({
      capitalApiKey: z.string(),
      capitalIdentifier: z.string(),
      capitalPassword: z.string(),
      isDemo: z.boolean().optional().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      // Create a credentials object with the broker info
      const credentialsObj = {
        apiKey: input.capitalApiKey,
        identifier: input.capitalIdentifier,
        password: input.capitalPassword,
        isDemo: input.isDemo,
      };
      
      // Pass broker name, credentials object and isActive flag
      const credential = await brokerCredentialService.createBrokerCredential(
        ctx.user.id,
        'capital.com',
        credentialsObj,
        true // isActive
      );
      
      // Mask sensitive data in response
      return {
        id: credential.id,
        name: credential.name,
        broker: credential.broker,
        isActive: credential.isActive,
        createdAt: credential.createdAt,
        // Don't return raw credentials
      };
    }),
  
  // Get all broker credentials for the current user
  getUserBrokerCredentials: protectedProcedure
    .query(async ({ ctx }) => {
      const credentials = await brokerCredentialService.getBrokerCredentialsByUser(ctx.user.id);
      
      // Mask sensitive data
      return credentials.map(cred => ({
        id: cred.id,
        name: cred.name,
        broker: cred.broker,
        isActive: cred.isActive,
        createdAt: cred.createdAt,
        // Don't return raw credentials
      }));
    }),
  
  // Get a broker credential by ID
  getBrokerCredentialById: protectedProcedure
    .input(z.object({
      id: z.string()
    }))
    .query(async ({ input, ctx }) => {
      const credential = await brokerCredentialService.getBrokerCredentialById(input.id, ctx.user.id);
      
      if (!credential) {
        throw new Error('Broker credential not found');
      }
      
      // Mask sensitive data
      return {
        id: credential.id,
        name: credential.name,
        broker: credential.broker,
        isActive: credential.isActive,
        createdAt: credential.createdAt,
        // Don't return raw credentials
      };
    }),
  
  // Update a broker credential
  updateBrokerCredential: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      isActive: z.boolean().optional(),
      credentials: z.object({
        apiKey: z.string().optional(),
        identifier: z.string().optional(),
        password: z.string().optional(),
        isDemo: z.boolean().optional()
      }).optional()
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...updates } = input;
      
      // IDs are strings in our updated services
      const updatedCredential = await brokerCredentialService.updateBrokerCredential(id, ctx.user.id, updates);
      
      if (!updatedCredential) {
        throw new Error('Broker credential not found');
      }
      
      // Mask sensitive data
      return {
        id: updatedCredential.id,
        name: updatedCredential.name,
        broker: updatedCredential.broker,
        isActive: updatedCredential.isActive,
        createdAt: updatedCredential.createdAt,
        // Don't return raw credentials
      };
    }),
  
  // Delete a broker credential
  deleteBrokerCredential: protectedProcedure
    .input(z.object({
      id: z.string()
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        await brokerCredentialService.deleteBrokerCredential(input.id, ctx.user.id);
        return { success: true };
      } catch (error) {
        // Type assertion for error
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to delete broker credential: ${errorMessage}`);
      }
    }),
  
  // Toggle broker credential active status
  toggleCredentialActive: protectedProcedure
    .input(z.object({
      id: z.string()
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Get the credential first - IDs are strings in our updated services
        const credential = await brokerCredentialService.getBrokerCredentialById(input.id, ctx.user.id);
        if (!credential) {
          throw new Error('Broker credential not found');
        }
        
        // Toggle the isActive flag - IDs are strings in our updated services
        const updatedCredential = await brokerCredentialService.updateBrokerCredential(
          input.id, 
          ctx.user.id, 
          { isActive: !credential.isActive }
        );
        
        return {
          id: updatedCredential.id,
          name: updatedCredential.name,
          broker: updatedCredential.broker,
          isActive: updatedCredential.isActive,
          createdAt: updatedCredential.createdAt,
        };
      } catch (error) {
        // Type assertion for error
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to toggle credential status: ${errorMessage}`);
      }
    }),
});

