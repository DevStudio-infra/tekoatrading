import { Prisma } from "@prisma/client";
import { prisma } from "../utils/prisma";
import crypto from "crypto";

export class BrokerCredentialService {
  /**
   * Create a new broker credential
   */
  /**
   * Helper method to get a real UUID for a user from the database
   * This handles numeric IDs from the API and converts them to proper UUIDs
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
      // In production, get the user by their numeric ID or convert from JWT
      // This assumes user IDs map correctly between systems
      const user = await prisma.user.findFirst({
        where: {
          // Try to find by clerkId if that's what we're using
          clerkId: String(userId),
        },
      });

      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }

      return user.id;
    }
  }

  async createBrokerCredential(userId: string, brokerName: string, credentials: Record<string, string | boolean>, isActive: boolean = true): Promise<any> {
    try {
      // Get a real UUID for the user
      const realUserId = await this.getRealUserUuid(userId);

      // Encrypt the entire credentials object
      const encryptedCredentials = this.encryptCredentials(credentials);

      // Generate a name for the credential if not provided
      // Format: broker-name-timestamp (e.g., capital.com-2025-05-15)
      const credentialName = `${brokerName}-${new Date().toISOString().split("T")[0]}`;

      console.log(`Creating broker credential for user ${realUserId} with broker ${brokerName}`);

      // Create broker credential with encrypted credentials
      // Match field names with the Prisma schema
      const insertedCredential = await prisma.brokerCredential.create({
        data: {
          userId: realUserId, // Now using a proper UUID
          name: credentialName, // Required field in schema
          broker: brokerName, // Schema uses 'broker' not 'brokerName'
          credentials: encryptedCredentials,
          isActive,
        },
      });

      console.log(`Created broker credential with ID ${insertedCredential.id}`);
      return insertedCredential;
    } catch (error) {
      console.error("Error creating broker credential:", error);
      throw error;
    }
  }

  /**
   * Get a broker credential by ID
   */
  async getBrokerCredentialById(id: string, userId: string): Promise<any | null> {
    try {
      // Get the real UUID of the user from the database
      let realUserId: string;
      try {
        realUserId = await this.getRealUserUuid(userId);
      } catch (error) {
        console.error("Error getting real user UUID:", error);
        return null; // User not found
      }

      const result = await prisma.brokerCredential.findFirst({
        where: {
          id: id, // ID is a string in Prisma schema
          userId: realUserId,
        },
      });

      if (!result) {
        return null;
      }

      // Decrypt the credentials
      const decryptedCredentials = this.decryptCredentials(result.credentials as any);

      return {
        ...result,
        brokerName: result.broker, // Map back to the API field name
        credentials: decryptedCredentials,
      };
    } catch (error) {
      console.error("Error fetching broker credential by ID:", error);
      throw error;
    }
  }

  /**
   * Get all broker credentials for a user
   */
  async getBrokerCredentialsByUser(userId: string): Promise<any[]> {
    try {
      // Get the real UUID of the user from the database
      let realUserId: string;
      try {
        realUserId = await this.getRealUserUuid(userId);
      } catch (error) {
        console.error("Error getting real user UUID:", error);
        return []; // Return empty array if user not found
      }

      const credentials = await prisma.brokerCredential.findMany({
        where: {
          userId: realUserId,
        },
      });

      // Decrypt the credentials for each item and map field names for API
      return credentials.map((cred) => ({
        ...cred,
        brokerName: cred.broker, // Map back to the API field name
        credentials: this.decryptCredentials(cred.credentials as any),
      }));
    } catch (error) {
      console.error("Error fetching broker credentials by user:", error);
      throw error;
    }
  }

  /**
   * Update a broker credential
   */
  async updateBrokerCredential(
    id: string,
    userId: string,
    updateData: {
      brokerName?: string;
      credentials?: Record<string, string | boolean>;
      isActive?: boolean;
    }
  ): Promise<any> {
    try {
      // Get real user UUID from our helper method
      const userIdString = await this.getRealUserUuid(userId);

      // Make sure the credential exists and belongs to the user
      const existingCredential = await prisma.brokerCredential.findFirst({
        where: {
          id: id,
          userId: userIdString,
        },
      });

      if (!existingCredential) {
        throw new Error("Broker credential not found or does not belong to the user");
      }

      // Prepare update data, mapping API field names to schema field names
      const data: any = {};

      // Map isActive directly
      if (updateData.isActive !== undefined) {
        data.isActive = updateData.isActive;
      }

      // Map brokerName to broker (schema field name)
      if (updateData.brokerName) {
        data.broker = updateData.brokerName;
      }

      // If credentials are being updated, encrypt them
      if (updateData.credentials) {
        data.credentials = this.encryptCredentials(updateData.credentials);
      }

      const updatedCredential = await prisma.brokerCredential.update({
        where: { id: id },
        data: data,
      });

      // Decrypt credentials for the response and map field names back to API
      return {
        ...updatedCredential,
        brokerName: updatedCredential.broker, // Map schema field back to API field
        credentials: this.decryptCredentials(updatedCredential.credentials as any),
      };
    } catch (error) {
      console.error("Error updating broker credential:", error);
      throw error;
    }
  }

  /**
   * Delete a broker credential
   */
  async deleteBrokerCredential(id: string, userId: string): Promise<void> {
    try {
      // Get the real UUID of the user from the database
      let realUserId: string;
      try {
        realUserId = await this.getRealUserUuid(userId);
      } catch (error) {
        console.error("Error getting real user UUID:", error);
        throw new Error("User not found");
      }

      // Make sure the credential exists and belongs to the user
      const existingCredential = await prisma.brokerCredential.findFirst({
        where: {
          id: id, // ID is a string in Prisma schema
          userId: realUserId,
        },
      });

      if (!existingCredential) {
        throw new Error("Broker credential not found or does not belong to the user");
      }

      await prisma.brokerCredential.delete({
        where: { id: id },
      });
    } catch (error) {
      console.error("Error deleting broker credential:", error);
      throw error;
    }
  }

  /**
   * Encrypt credentials object for storage
   */
  private encryptCredentials(credentials: Record<string, any>): string {
    try {
      // Get the encryption key from environment
      const encryptionKey = process.env.CREDENTIALS_ENCRYPTION_KEY;

      // If no encryption key, just JSON stringify
      if (!encryptionKey) {
        console.warn("No encryption key set for broker credentials. Using plain JSON.");
        return JSON.stringify(credentials);
      }

      // Encrypt using AES-256-CBC
      const iv = crypto.randomBytes(16);
      const key = crypto.createHash("sha256").update(encryptionKey).digest("base64").substr(0, 32);
      const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);

      // Convert credentials to string and encrypt
      const stringifiedCredentials = JSON.stringify(credentials);
      let encrypted = cipher.update(stringifiedCredentials, "utf8", "hex");
      encrypted += cipher.final("hex");

      // Combine IV and encrypted data for storage
      return iv.toString("hex") + ":" + encrypted;
    } catch (error) {
      console.error("Error encrypting credentials:", error);
      // Fallback to plain JSON if encryption fails
      return JSON.stringify(credentials);
    }
  }

  /**
   * Decrypt stored credentials
   */
  private decryptCredentials(encryptedCredentials: any): Record<string, any> {
    try {
      // Handle cases where the credentials might be already an object or null/undefined
      if (!encryptedCredentials) {
        console.warn("No credentials found to decrypt");
        return {};
      }

      // If credentials are already an object, return them directly
      if (typeof encryptedCredentials === "object") {
        return encryptedCredentials;
      }

      // Get the encryption key from environment
      const encryptionKey = process.env.CREDENTIALS_ENCRYPTION_KEY;

      // Convert encryptedCredentials to string if it's not already
      const credentialsStr = String(encryptedCredentials);

      // Check if it's a double-encoded JSON string (common issue with database storage)
      if (credentialsStr.startsWith('"') && credentialsStr.endsWith('"')) {
        try {
          // Remove the outer quotes and parse the inner JSON
          const unquotedStr = credentialsStr.slice(1, -1);
          // Replace escaped quotes
          const unescapedStr = unquotedStr.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
          return JSON.parse(unescapedStr);
        } catch (parseError) {
          console.warn("Failed to parse double-encoded JSON:", parseError);
        }
      }

      // If no encryption key or not in the expected format, assume it's plain JSON
      if (!encryptionKey || !credentialsStr.includes(":")) {
        try {
          return JSON.parse(credentialsStr);
        } catch (parseError) {
          console.warn("Failed to parse non-encrypted credentials as JSON:", parseError);
          // If it's not valid JSON but a string, try to return it as-is in an object
          return { credential: credentialsStr };
        }
      }

      // Split IV and encrypted data
      const [ivHex, encrypted] = credentialsStr.split(":");
      const iv = Buffer.from(ivHex, "hex");
      const key = crypto.createHash("sha256").update(encryptionKey).digest("base64").substr(0, 32);

      // Decrypt
      const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
      let decrypted = decipher.update(encrypted, "hex", "utf8");
      decrypted += decipher.final("utf8");

      // Parse the decrypted string back to an object
      try {
        return JSON.parse(decrypted);
      } catch (parseError) {
        console.warn("Failed to parse decrypted content as JSON:", parseError);
        // If decrypted result is not valid JSON, return it as-is in an object
        return { credential: decrypted };
      }
    } catch (error) {
      console.error("Error decrypting credentials:", error);
      // In case of error, return an empty object
      return {};
    }
  }
}

export const brokerCredentialService = new BrokerCredentialService();
