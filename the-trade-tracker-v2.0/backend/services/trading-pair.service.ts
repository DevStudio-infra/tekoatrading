import { Prisma } from "@prisma/client";
import { prisma } from "../utils/prisma";

export class TradingPairService {
  /**
   * Get all trading pairs
   */
  async getAllTradingPairs(limit: number = 100, offset: number = 0): Promise<any[]> {
    try {
      const result = await prisma.tradingPair.findMany({
        where: {
          isActive: true,
        },
        take: limit,
        skip: offset,
      });

      return result;
    } catch (error) {
      console.error("Error fetching trading pairs:", error);
      throw error;
    }
  }

  /**
   * Get trading pairs by broker name
   */
  async getTradingPairsByBroker(brokerName: string, limit: number = 100, offset: number = 0): Promise<any[]> {
    try {
      const result = await prisma.tradingPair.findMany({
        where: {
          brokerName: brokerName,
          isActive: true,
        },
        take: limit,
        skip: offset,
      });

      return result;
    } catch (error) {
      console.error("Error fetching trading pairs by broker:", error);
      throw error;
    }
  }

  /**
   * Search trading pairs by text
   */
  async searchTradingPairs(searchTerm: string, limit: number = 100, offset: number = 0): Promise<any[]> {
    try {
      // Prisma doesn't have a direct equivalent to "like" operator with %term%
      // We'll use the contains operator which is equivalent
      const result = await prisma.tradingPair.findMany({
        where: {
          OR: [{ symbol: { contains: searchTerm, mode: "insensitive" } }, { name: { contains: searchTerm, mode: "insensitive" } }],
          isActive: true,
        },
        take: limit,
        skip: offset,
      });

      return result;
    } catch (error) {
      console.error("Error searching trading pairs:", error);
      throw error;
    }
  }

  /**
   * Get a trading pair by ID
   */
  async getTradingPairById(id: number): Promise<any | null> {
    try {
      const result = await prisma.tradingPair.findUnique({
        where: { id },
      });

      return result;
    } catch (error) {
      console.error("Error fetching trading pair by ID:", error);
      throw error;
    }
  }

  /**
   * Get a trading pair by symbol
   */
  async getTradingPairBySymbol(symbol: string): Promise<any | null> {
    try {
      const result = await prisma.tradingPair.findFirst({
        where: { symbol },
      });

      return result;
    } catch (error) {
      console.error("Error fetching trading pair by symbol:", error);
      throw error;
    }
  }

  /**
   * Get trading pairs by category
   */
  async getTradingPairsByCategory(category: string, limit: number = 100, offset: number = 0): Promise<any[]> {
    try {
      const result = await prisma.tradingPair.findMany({
        where: {
          category: category,
          isActive: true,
        },
        take: limit,
        skip: offset,
      });

      return result;
    } catch (error) {
      console.error("Error fetching trading pairs by category:", error);
      throw error;
    }
  }

  /**
   * Get all available categories
   */
  async getAllCategories(): Promise<string[]> {
    try {
      // This is a bit different with Prisma - we need to get all distinct categories
      const result = await prisma.tradingPair.findMany({
        select: {
          category: true,
        },
        distinct: ["category"],
        where: {
          isActive: true,
        },
      });

      // Extract just the category names from the result objects
      return result.map((r) => r.category).filter((cat) => cat !== null) as string[];
    } catch (error) {
      console.error("Error fetching trading pair categories:", error);
      throw error;
    }
  }

  /**
   * Get popular trading pairs
   * @param brokerName Optional broker name to filter by
   * @param limit Maximum number of pairs to return
   */
  async getPopularTradingPairs(brokerName?: string, limit: number = 20): Promise<any[]> {
    try {
      console.log(`[SERVICE] Fetching popular trading pairs with broker: ${brokerName}, limit: ${limit}`);

      // Construct the where clause based on whether brokerName is provided
      const whereClause: any = {
        isActive: true,
      };

      if (brokerName) {
        // Make broker name search case-insensitive by using contains
        // This handles different capitalizations like 'capital.com' vs 'Capital.com'
        whereClause.brokerName = {
          contains: brokerName,
          mode: "insensitive", // Case-insensitive search
        };

        console.log(`[SERVICE] Using case-insensitive search for broker: ${brokerName}`);
      }

      // Add debug logging - check if we have any pairs at all with this broker
      const totalPairsCount = await prisma.tradingPair.count({
        where: whereClause,
      });

      console.log(`[SERVICE] Total trading pairs in database matching criteria: ${totalPairsCount}`);

      // Just get pairs directly if we don't have many
      if (totalPairsCount < 500) {
        console.log(`[SERVICE] Fetching all pairs directly since total count is low`);
        const allPairs = await prisma.tradingPair.findMany({
          where: whereClause,
          take: limit,
          orderBy: { createdAt: "desc" },
        });

        console.log(`[SERVICE] Fetched ${allPairs.length} pairs directly`);
        return allPairs;
      }

      // Get pairs from all categories evenly distributed
      // First, get all distinct categories
      const categories = await this.getCategories(brokerName);
      console.log(`[SERVICE] Found ${categories.length} categories: ${categories.join(", ")}`);

      // Calculate how many items to take per category - ensure it's a large enough number
      const perCategory = Math.max(50, Math.floor(limit / Math.max(1, categories.length)));
      console.log(`[SERVICE] Will take ${perCategory} items per category`);

      // Get pairs for each category
      let allPairs: any[] = [];

      // If we have categories, get items from each category
      if (categories.length > 0) {
        for (const category of categories) {
          // Give priority to certain categories that aren't showing up properly
          let categoryLimit = perCategory;
          if (["Stocks", "Other", "Forex"].includes(category)) {
            categoryLimit = 75; // Higher limit for problematic categories
            console.log(`[SERVICE] Using higher limit (${categoryLimit}) for category: ${category}`);
          }

          const categoryClause = { ...whereClause, category };
          const pairs = await prisma.tradingPair.findMany({
            where: categoryClause,
            take: categoryLimit,
            orderBy: { createdAt: "desc" },
          });
          console.log(`[SERVICE] Found ${pairs.length} pairs for category: ${category}`);
          allPairs = [...allPairs, ...pairs];
        }
      }

      // If we got no pairs at all (either no categories or no pairs in categories)
      // Just get pairs directly without category filtering
      if (allPairs.length === 0) {
        console.log(`[SERVICE] No pairs found by category, fetching without category filtering`);
        const directPairs = await prisma.tradingPair.findMany({
          where: whereClause,
          take: limit,
          orderBy: { createdAt: "desc" },
        });
        allPairs = directPairs;
        console.log(`[SERVICE] Found ${directPairs.length} pairs without category filtering`);
      }
      // If we didn't get enough pairs, get more without category filtering
      else if (allPairs.length < limit) {
        console.log(`[SERVICE] Not enough pairs found (${allPairs.length}), getting more without category filtering`);
        const remainingPairs = await prisma.tradingPair.findMany({
          where: whereClause,
          take: limit - allPairs.length,
          orderBy: { createdAt: "desc" },
        });
        console.log(`[SERVICE] Found ${remainingPairs.length} additional pairs without category filtering`);
        allPairs = [...allPairs, ...remainingPairs];
      }

      // Shuffle the array to mix categories
      allPairs = this.shuffleArray(allPairs);

      // Limit to the requested number
      allPairs = allPairs.slice(0, limit);

      console.log(`[SERVICE] Total pairs returned: ${allPairs.length}`);
      // Log category distribution in the returned data
      const categoryMap: Record<string, number> = {};
      allPairs.forEach((pair) => {
        const cat = pair.category || "uncategorized";
        categoryMap[cat] = (categoryMap[cat] || 0) + 1;
      });
      console.log(`[SERVICE] Category distribution in returned data:`, categoryMap);

      return allPairs;
    } catch (error) {
      console.error("Error fetching popular trading pairs:", error);
      throw error;
    }
  }

  /**
   * Helper method to shuffle an array
   * @param array Array to shuffle
   * @returns Shuffled array
   */
  private shuffleArray<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }

  /**
   * Get categories (alias for getAllCategories for controller compatibility)
   * @param brokerName Optional broker name to filter by
   */
  async getCategories(brokerName?: string): Promise<string[]> {
    try {
      // If broker name is provided, filter categories by broker
      if (brokerName) {
        const result = await prisma.tradingPair.findMany({
          select: {
            category: true,
          },
          distinct: ["category"],
          where: {
            brokerName: brokerName,
            isActive: true,
          },
        });

        return result.map((r) => r.category).filter((cat) => cat !== null) as string[];
      }

      // Otherwise use the existing method to get all categories
      return this.getAllCategories();
    } catch (error) {
      console.error("Error fetching categories by broker:", error);
      throw error;
    }
  }
}

// Export an instance of the trading pair service for use in controllers
export const tradingPairService = new TradingPairService();
