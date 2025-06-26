import crypto from "crypto";

export class CredentialsEncryptionService {
  private readonly encryptionKey: string;

  constructor() {
    this.encryptionKey = process.env.CREDENTIALS_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY || "";

    if (!this.encryptionKey) {
      console.warn(
        "No encryption key set for broker credentials. Please set CREDENTIALS_ENCRYPTION_KEY or ENCRYPTION_KEY environment variable.",
      );
    }
  }

  /**
   * Encrypt credentials object for storage
   */
  encryptCredentials(credentials: Record<string, any>): string {
    try {
      // If no encryption key, just JSON stringify with warning
      if (!this.encryptionKey) {
        console.warn("No encryption key set. Storing credentials as plain JSON (NOT SECURE).");
        return JSON.stringify(credentials);
      }

      // Encrypt using AES-256-CBC
      const iv = crypto.randomBytes(16);
      const key = crypto.createHash("sha256").update(this.encryptionKey).digest().slice(0, 32);
      const cipher = crypto.createCipher("aes-256-cbc", key);
      cipher.setEncoding("hex");

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
  decryptCredentials(encryptedCredentials: string): Record<string, any> {
    try {
      // Handle null/undefined
      if (!encryptedCredentials) {
        console.warn("No credentials found to decrypt");
        return {};
      }

      // If no encryption key or not in the expected format, assume it's plain JSON
      if (!this.encryptionKey || !encryptedCredentials.includes(":")) {
        try {
          return JSON.parse(encryptedCredentials);
        } catch (parseError) {
          console.warn("Failed to parse non-encrypted credentials as JSON:", parseError);
          return {};
        }
      }

      // Split IV and encrypted data
      const [ivHex, encrypted] = encryptedCredentials.split(":");
      const iv = Buffer.from(ivHex, "hex");
      const key = crypto.createHash("sha256").update(this.encryptionKey).digest().slice(0, 32);

      // Decrypt
      const decipher = crypto.createDecipher("aes-256-cbc", key);
      let decrypted = decipher.update(encrypted, "hex", "utf8");
      decrypted += decipher.final("utf8");

      // Parse the decrypted string back to an object
      try {
        return JSON.parse(decrypted);
      } catch (parseError) {
        console.warn("Failed to parse decrypted content as JSON:", parseError);
        return {};
      }
    } catch (error) {
      console.error("Error decrypting credentials:", error);
      return {};
    }
  }

  /**
   * Check if credentials are encrypted (contains IV separator)
   */
  isEncrypted(credentials: string): boolean {
    return credentials.includes(":") && this.encryptionKey !== "";
  }
}

export const credentialsEncryption = new CredentialsEncryptionService();
