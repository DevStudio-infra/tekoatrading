// Define Bot type locally until Prisma client is properly set up
interface Bot {
  id: string;
  name: string;
  symbol: string;
  timeframe: string;
  isActive: boolean;
  isAiTradingActive: boolean;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Fetches a bot by its ID
 * @param id The bot ID
 * @returns The bot or null if not found
 */
export async function getBotById(id: string): Promise<Bot | null> {
  try {
    // Import fetchWithAuth dynamically to avoid circular dependencies
    const { fetchWithAuth } = await import("@/lib/fetch-with-auth");

    // Use absolute URL to avoid parsing issues - handle both client and server side
    const baseUrl = typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const response = await fetchWithAuth(`${baseUrl}/api/bots/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch bot: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching bot:", error);
    return null;
  }
}

/**
 * Fetches all bots for the current user
 * @returns Array of bots
 */
export async function getAllBots(): Promise<Bot[]> {
  try {
    // Import fetchWithAuth dynamically to avoid circular dependencies
    const { fetchWithAuth } = await import("@/lib/fetch-with-auth");

    // Use absolute URL to avoid parsing issues - handle both client and server side
    const baseUrl = typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const response = await fetchWithAuth(`${baseUrl}/api/bots`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch bots: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching bots:", error);
    return [];
  }
}

/**
 * Fetches bot evaluations by bot ID
 * @param botId The bot ID
 * @returns Array of evaluations
 */
export async function getBotEvaluations(botId: string) {
  try {
    // Import fetchWithAuth dynamically to avoid circular dependencies
    const { fetchWithAuth } = await import("@/lib/fetch-with-auth");

    // Use absolute URL to avoid parsing issues - handle both client and server side
    const baseUrl = typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const response = await fetchWithAuth(`${baseUrl}/api/bots/${botId}/evaluations`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch bot evaluations: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching bot evaluations:", error);
    return { evaluations: [] };
  }
}
