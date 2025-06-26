import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { logger } from "../logger";

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "";

export class SupabaseStorageService {
  private supabase: SupabaseClient | null = null;
  private bucketName = "trade-charts";
  private initialized = false;
  private folderName = "evaluations";

  private async initialize() {
    if (this.initialized) return;

    try {
      if (!SUPABASE_URL || (!SUPABASE_ANON_KEY && !SUPABASE_SERVICE_KEY)) {
        logger.warn("Supabase configuration missing - using fallback mode");
        this.initialized = true;
        return;
      }

      // Use service key if available, otherwise use anon key
      const supabaseKey = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;

      logger.info(`Initializing Supabase client with URL: ${SUPABASE_URL}`);

      this.supabase = createClient(SUPABASE_URL, supabaseKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });

      // Test the connection and create bucket if needed
      await this.ensureBucketExists();

      logger.info("Supabase client initialized successfully");
      this.initialized = true;
    } catch (error) {
      logger.error("Failed to initialize Supabase client:", error);
      // Don't throw - fallback to local storage simulation
      this.initialized = true;
    }
  }

  async uploadFile(
    fileName: string,
    fileBuffer: Buffer,
    contentType: string = "image/png",
  ): Promise<{
    success: boolean;
    publicUrl?: string;
    error?: string;
  }> {
    await this.initialize();

    if (!this.supabase) {
      // Fallback mode - return local storage URL
      logger.warn("Supabase not configured, using local storage fallback");
      return {
        success: true,
        publicUrl: `/uploads/${fileName}`,
      };
    }

    try {
      const filePath = `${this.folderName}/${fileName}`;

      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .upload(filePath, fileBuffer, {
          contentType,
          upsert: true,
          cacheControl: "3600",
        });

      if (error) {
        logger.error(`Supabase upload error: ${error.message}`);
        return {
          success: false,
          error: error.message,
        };
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = this.supabase.storage.from(this.bucketName).getPublicUrl(filePath);

      logger.info(`File uploaded successfully: ${publicUrl}`);

      return {
        success: true,
        publicUrl,
      };
    } catch (error) {
      logger.error("Upload error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Upload a base64 image to Supabase storage
   */
  async uploadBase64Image(base64Image: string, fileName: string, userId: string): Promise<string> {
    await this.initialize();

    try {
      // Extract the actual base64 data (remove data URI prefix if present)
      const base64Data = base64Image.includes("base64,")
        ? base64Image.split("base64,")[1]
        : base64Image;

      // Convert base64 to buffer
      const buffer = Buffer.from(base64Data, "base64");

      const result = await this.uploadFile(`${userId}/${fileName}`, buffer, "image/png");

      if (!result.success) {
        throw new Error(result.error || "Upload failed");
      }

      return result.publicUrl!;
    } catch (error) {
      logger.error("Error in uploadBase64Image:", error);
      // Fallback to local storage URL
      return `/uploads/${userId}/${fileName}`;
    }
  }

  /**
   * Delete a file from Supabase storage
   */
  async deleteFile(fileName: string, userId: string): Promise<void> {
    await this.initialize();

    if (!this.supabase) {
      logger.info(`Local storage delete: ${fileName}`);
      return;
    }

    try {
      const filePath = `${this.folderName}/${userId}/${fileName}`;

      const { error } = await this.supabase.storage.from(this.bucketName).remove([filePath]);

      if (error) {
        logger.error(`Delete error: ${error.message}`);
        return;
      }

      logger.info(`File deleted successfully: ${filePath}`);
    } catch (error) {
      logger.error("Error in deleteFile:", error);
    }
  }

  /**
   * List files for a user
   */
  async listFiles(userId: string) {
    await this.initialize();

    if (!this.supabase) {
      return [];
    }

    try {
      const folderPath = `${this.folderName}/${userId}`;

      const { data, error } = await this.supabase.storage.from(this.bucketName).list(folderPath);

      if (error) {
        logger.error(`List files error: ${error.message}`);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error("Error in listFiles:", error);
      return [];
    }
  }

  /**
   * Ensure the storage bucket exists
   */
  private async ensureBucketExists(): Promise<void> {
    if (!this.supabase) return;

    try {
      // Check if bucket exists
      const { data: buckets } = await this.supabase.storage.listBuckets();
      const bucketExists = buckets?.some((bucket: any) => bucket.name === this.bucketName);

      if (bucketExists) {
        logger.info(`Bucket ${this.bucketName} already exists`);
        return;
      }

      // Create bucket
      const { error } = await this.supabase.storage.createBucket(this.bucketName, {
        public: true, // Make it public for chart access
        fileSizeLimit: 10485760, // 10MB limit
      });

      if (error) {
        logger.warn(`Could not create bucket: ${error.message}`);
        return;
      }

      logger.info(`Bucket ${this.bucketName} created successfully`);
    } catch (error) {
      logger.warn("Error ensuring bucket exists:", error);
      // Don't throw - this is not critical
    }
  }

  /**
   * Test the Supabase connection
   */
  async testConnection(): Promise<boolean> {
    await this.initialize();

    if (!this.supabase) {
      return false;
    }

    try {
      const { data } = await this.supabase.storage.listBuckets();
      return Array.isArray(data);
    } catch (error) {
      logger.error("Supabase connection test failed:", error);
      return false;
    }
  }

  /**
   * Get service status
   */
  getStatus(): { connected: boolean; bucketName: string; initialized: boolean } {
    return {
      connected: !!this.supabase,
      bucketName: this.bucketName,
      initialized: this.initialized,
    };
  }
}

// Export singleton instance
export const supabaseStorageService = new SupabaseStorageService();
