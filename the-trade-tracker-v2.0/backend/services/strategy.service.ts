import { Prisma } from "@prisma/client";
import { prisma } from "../utils/prisma";

// Strategy interface matching our Prisma model schema
interface StrategyData {
  id?: string;
  userId: string;
  name: string;
  type?: string;
  description: string | null;
  parameters: Record<string, any>;
  minRiskPerTrade?: number;
  maxRiskPerTrade?: number;
  confidenceThreshold?: number;
  isDefault?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class StrategyService {
  /**
   * Helper method to get a real UUID for a user from the database
   * This handles user IDs and ensures they are valid UUIDs
   */
  private async getRealUserUuid(userId: string): Promise<string> {
    if (process.env.NODE_ENV === "development") {
      // In development, try to find a user - any user will do for testing
      console.log("[DEV] Looking up a valid user UUID from the database");
      const anyUser = await prisma.user.findFirst();

      if (!anyUser) {
        // If no users exist, create a temporary development user
        console.log("[DEV] No users found, creating a temporary development user");
        const tempUser = await prisma.user.create({
          data: {
            clerkId: "dev-user-" + Date.now(),
            email: "dev@example.com",
          },
        });
        return tempUser.id;
      }

      console.log(`[DEV] Using user with UUID: ${anyUser.id}`);
      return anyUser.id;
    } else {
      // Try to find the user by their ID directly
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (user) {
        return user.id;
      }

      // If not found by ID, try to find by clerkId
      const userByClerkId = await prisma.user.findFirst({
        where: { clerkId: userId },
      });

      if (!userByClerkId) {
        throw new Error(`User with ID ${userId} not found`);
      }

      return userByClerkId.id;
    }
  }

  /**
   * Create a new trading strategy
   */
  async createStrategy(strategyData: {
    userId: string;
    name: string;
    description: string | null;
    timeframes: string[];
    indicators: any[];
    entryConditions: any[];
    exitConditions: any[];
    riskControls?: {
      maxDrawdown?: number;
      trailingStopLoss?: number;
      takeProfitLevel?: number;
    };
  }): Promise<any> {
    try {
      // Get real user UUID for database
      const realUserId = await this.getRealUserUuid(strategyData.userId);

      // Create strategy with proper data structure for Prisma
      const insertedStrategy = await prisma.strategy.create({
        data: {
          userId: realUserId,
          name: strategyData.name,
          type: "custom", // Default to custom type
          description: strategyData.description || "", // Ensure description is never null
          parameters: {
            timeframes: strategyData.timeframes,
            indicators: strategyData.indicators,
            entryConditions: strategyData.entryConditions,
            exitConditions: strategyData.exitConditions,
            riskControls: strategyData.riskControls || {
              maxDrawdown: 5,
              trailingStopLoss: 2,
              takeProfitLevel: 3,
            },
          },
          minRiskPerTrade: strategyData.riskControls?.maxDrawdown ? strategyData.riskControls.maxDrawdown * 100 : 50, // default 0.5%
          maxRiskPerTrade: 200, // default 2%
          confidenceThreshold: 70, // default 70%
          isDefault: false,
          updatedAt: new Date(), // Ensure updatedAt is set
        },
      });

      console.log(`Created strategy with ID ${insertedStrategy.id}`);
      return insertedStrategy;
    } catch (error) {
      console.error("Error creating strategy:", error);
      throw error;
    }
  }

  /**
   * Get a specific strategy by ID
   */
  async getStrategyById(strategyId: string, userId: string): Promise<any | null> {
    try {
      // Get real user UUID for database
      const realUserId = await this.getRealUserUuid(userId);

      const result = await prisma.strategy.findFirst({
        where: {
          id: strategyId,
          userId: realUserId,
        },
      });

      return result;
    } catch (error) {
      console.error("Error fetching strategy by ID:", error);
      throw error;
    }
  }

  /**
   * Get all strategies for a specific user
   */
  async getUserStrategies(userId: string): Promise<any[]> {
    try {
      // Get real user UUID for database
      const realUserId = await this.getRealUserUuid(userId);

      return await prisma.strategy.findMany({
        where: {
          userId: realUserId,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    } catch (error) {
      console.error("Error fetching strategies by user:", error);
      throw error;
    }
  }

  /**
   * Update an existing strategy
   */
  async updateStrategy(strategyId: string, userId: string, updates: any): Promise<any | null> {
    try {
      // Get real user UUID for database
      const realUserId = await this.getRealUserUuid(userId);

      // Make sure the strategy exists and belongs to the user
      const existingStrategy = await prisma.strategy.findFirst({
        where: {
          id: strategyId,
          userId: realUserId,
        },
      });

      if (!existingStrategy) {
        throw new Error("Strategy not found or does not belong to the user");
      }

      // If updating a strategy to be default, make sure to unset any other default strategies
      if (updates.isDefault) {
        await prisma.strategy.updateMany({
          where: {
            userId: realUserId,
            isDefault: true,
            id: { not: strategyId },
          },
          data: {
            isDefault: false,
          },
        });
      }

      // Set updatedAt field
      const dataToUpdate = {
        ...updates,
        updatedAt: new Date(),
      };

      // Update the strategy
      const updatedStrategy = await prisma.strategy.update({
        where: { id: strategyId },
        data: dataToUpdate,
      });

      return updatedStrategy;
    } catch (error) {
      console.error("Error updating strategy:", error);
      throw error;
    }
  }

  /**
   * Delete a strategy
   */
  async deleteStrategy(strategyId: string, userId: string): Promise<boolean> {
    try {
      // Get real user UUID for database
      const realUserId = await this.getRealUserUuid(userId);

      // Make sure the strategy exists and belongs to the user
      const existingStrategy = await prisma.strategy.findFirst({
        where: {
          id: strategyId,
          userId: realUserId,
        },
      });

      if (!existingStrategy) {
        throw new Error("Strategy not found or does not belong to the user");
      }

      // Check if strategy is used by any bots before deleting
      const connectedBots = await prisma.bot.findMany({
        where: {
          strategyId: strategyId,
        },
      });

      if (connectedBots.length > 0) {
        throw new Error("Cannot delete strategy that is used by bots. Please delete or reassign those bots first.");
      }

      // Delete the strategy
      await prisma.strategy.delete({
        where: { id: strategyId },
      });

      console.log(`Deleted strategy with ID ${strategyId}`);
      return true;
    } catch (error) {
      console.error("Error deleting strategy:", error);
      throw error;
    }
  }

  /**
   * Duplicate a strategy
   * @param strategyId ID of the strategy to duplicate
   * @param userId ID of the current user
   * @param newName New name for the duplicated strategy
   * @returns
   */
  async duplicateStrategy(strategyId: string, userId: string, newName?: string): Promise<any | null> {
    try {
      // Get real user UUID for database
      const realUserId = await this.getRealUserUuid(userId);

      // Make sure the strategy exists and belongs to the user
      const result = await prisma.strategy.findFirst({
        where: {
          id: strategyId,
          userId: realUserId,
        },
      });

      if (!result) {
        throw new Error("Strategy not found or does not belong to the user");
      }

      // Cast the result to our StrategyData interface
      const sourceStrategy = result as unknown as StrategyData;

      // Create a copy with a new name - use the same approach that works in createStrategy
      const duplicatedStrategy = await prisma.strategy.create({
        data: {
          userId: realUserId,
          name: `${sourceStrategy.name} (Copy)`,
          type: sourceStrategy.type || "custom",
          description: sourceStrategy.description || "",
          parameters: sourceStrategy.parameters,
          minRiskPerTrade: sourceStrategy.minRiskPerTrade || 50,
          maxRiskPerTrade: sourceStrategy.maxRiskPerTrade || 200,
          confidenceThreshold: sourceStrategy.confidenceThreshold || 70,
          isDefault: false, // Never make the duplicate the default
          updatedAt: new Date(), // Ensure updatedAt is set
        },
      });

      console.log(`Duplicated strategy with ID ${sourceStrategy.id} to new ID ${duplicatedStrategy.id}`);
      return duplicatedStrategy;
    } catch (error) {
      console.error("Error duplicating strategy:", error);
      throw error;
    }
  }
}

export const strategyService = new StrategyService();
