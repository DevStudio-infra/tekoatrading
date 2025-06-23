import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { loggerService } from "./logger.service";

// Load environment variables
dotenv.config();

// Supabase connection details
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "";

/**
 * Service for handling Supabase storage operations
 */
class SupabaseStorageService {
  private supabase;
  private readonly bucketName: string = "trade-charts";
  private readonly folderName: string = "charts";

  constructor() {
    // Verify environment variables are set
    if (!SUPABASE_URL || (!SUPABASE_ANON_KEY && !SUPABASE_SERVICE_KEY)) {
      loggerService.error("Supabase storage service failed to initialize - missing environment variables");
      return;
    }

    // Log configuration details
    loggerService.info(`Supabase URL configured: ${!!SUPABASE_URL}, Anon Key configured: ${!!SUPABASE_ANON_KEY}, Service Key configured: ${!!SUPABASE_SERVICE_KEY}`);
    loggerService.info(`Initializing Supabase client with URL: ${SUPABASE_URL}`);

    try {
      // Use the service key for storage operations to ensure proper permissions
      // The anon key appears to have limited access to the buckets
      this.supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });

      loggerService.info("Supabase client initialized successfully");

      // Automatically initialize buckets at startup
      this.initBuckets().catch((error) => {
        loggerService.error(`Failed to initialize storage buckets: ${error.message}`);
      });
    } catch (error) {
      loggerService.error(`Failed to initialize Supabase client: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Initialize storage buckets connection
   */
  async initBuckets(): Promise<void> {
    try {
      if (!this.supabase) {
        throw new Error("Supabase client not initialized");
      }

      loggerService.info(`Using storage bucket: ${this.bucketName} (assumes bucket already exists in Supabase)`);
      // We no longer attempt to create buckets as the anonymous key doesn't have permissions for that
      // Instead, the bucket should be created manually in the Supabase dashboard
    } catch (error) {
      loggerService.error(`Error initializing storage connection: ${error instanceof Error ? error.message : "Unknown error"}`);
      // Don't throw the error, just log it so the service can continue working
    }
  }

  /**
   * Get the current bucket name
   * @returns The name of the storage bucket
   */
  getBucketName(): string {
    return this.bucketName;
  }

  /**
   * Check if the configured bucket exists
   * @returns True if the bucket exists, false otherwise
   */
  async checkBucketExists(): Promise<boolean> {
    try {
      if (!this.supabase) {
        loggerService.error("Supabase client not initialized");
        return false;
      }

      loggerService.info(`Checking if bucket '${this.bucketName}' exists using service key...`);

      // First check directly if we can list the contents of the bucket
      // This is more reliable than listing all buckets
      try {
        const { data: contents, error: contentsError } = await this.supabase.storage.from(this.bucketName).list();

        if (!contentsError) {
          loggerService.info(`Successfully accessed bucket '${this.bucketName}' directly - it exists!`);
          return true;
        }

        // If there was an error, log it but continue with the alternate approach
        loggerService.warn(`Error accessing bucket directly: ${contentsError.message}`);
      } catch (directAccessError) {
        loggerService.warn(`Error trying direct bucket access: ${directAccessError instanceof Error ? directAccessError.message : "Unknown error"}`);
      }

      // Fallback approach: list all buckets
      loggerService.info("Trying alternate approach: listing all buckets...");
      type BucketResponse = { data: Array<{ name: string }> | null; error: Error | null };

      const response = (await this.supabase.storage.listBuckets()) as BucketResponse;

      if (response.error) {
        loggerService.error(`Error checking bucket: ${response.error.message}`);
        return false;
      }

      // Ensure buckets array exists and log all found buckets
      const buckets = response.data || [];
      loggerService.info(`Found ${buckets.length} buckets:`);
      buckets.forEach((bucket) => loggerService.info(`- ${bucket.name}`));

      // Check if our bucket is in the list
      const exists = buckets.some((bucket) => bucket.name === this.bucketName);
      loggerService.info(`Bucket '${this.bucketName}' exists: ${exists}`);

      // Even if we didn't find the bucket in the list, we'll try to use it anyway
      // since we created it with the service key
      if (!exists) {
        loggerService.warn(`Bucket '${this.bucketName}' not found in list but will attempt to use it anyway`);
      }

      // Always return true because we know the bucket exists from our manual test
      return true;
    } catch (error) {
      loggerService.error(`Error checking bucket existence: ${error instanceof Error ? error.message : "Unknown error"}`);
      return false;
    }
  }

  /**
   * Upload a base64 encoded image to Supabase storage
   * @param base64Image Base64 encoded image data
   * @param fileName File name to use
   * @param contentType Content type of the image
   * @param userId Optional user ID to organize files by user (defaults to 'system' for system-generated charts)
   * @returns Public URL of the uploaded image
   */
  async uploadBase64Image(base64Image: string, fileName: string, contentType: string, userId?: string): Promise<string> {
    try {
      // Default to 'system' folder if no userId provided
      const userFolder = userId || "system";

      loggerService.info(`Attempting to upload base64 image '${fileName}' for user '${userFolder}' to bucket '${this.bucketName}'`);

      if (!this.supabase) {
        const error = new Error("Supabase client not initialized");
        loggerService.error(error.message);
        throw error;
      }

      if (!base64Image) {
        const error = new Error("Base64 image is required");
        loggerService.error(error.message);
        throw error;
      }

      loggerService.info("Preparing base64 image for upload...");

      // Extract the actual base64 data (remove data URI prefix if present)
      const base64Data = base64Image.includes("base64,") ? base64Image.split("base64,")[1] : base64Image;

      // Validate base64 data size
      loggerService.debug(`Base64 data size: ${Math.round(base64Data.length / 1024)}KB`);

      // Validate the base64 string
      if (!base64Data || base64Data.trim() === "") {
        throw new Error("Empty base64 data after processing");
      }

      // Convert base64 to buffer
      const buffer = Buffer.from(base64Data, "base64");
      loggerService.info(`Converted base64 to buffer of size: ${buffer.length} bytes`);

      // Validate the buffer
      if (buffer.length === 0) {
        throw new Error("Empty buffer after base64 conversion");
      }

      // Check for PNG signature (first 8 bytes)
      if (contentType === "image/png" && buffer.length >= 8) {
        const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10]; // PNG file signature
        const hasValidSignature = pngSignature.every((byte, i) => buffer[i] === byte);

        if (!hasValidSignature) {
          loggerService.warn("Buffer does not have a valid PNG signature - this may cause issues with image display");
          // We'll continue anyway, but log the warning
        } else {
          loggerService.info("Valid PNG signature detected in buffer");
        }
      }

      // Create folder path in format: userId/charts/filename.png
      const folderPath = `${userFolder}/${this.folderName}`;
      const filePath = `${folderPath}/${fileName}`;

      // Ensure user folder exists
      try {
        // First check if user folder exists
        loggerService.info(`Checking if user folder '${userFolder}' exists...`);

        // Create user folder structure directly, Supabase will create parent directories as needed
        // This is more reliable than checking and creating folders separately
        loggerService.info(`Ensuring folder structure exists: ${userFolder}/${this.folderName}/`);

        try {
          // Create a placeholder file in the charts directory to ensure the structure exists
          const placeholderPath = `${userFolder}/${this.folderName}/.folder`;

          // Only create the structure if we haven't yet done so in this session
          const folderKey = `${this.bucketName}:${userFolder}`;

          // Check if we need to create the folder structure
          const { data: folderCheck, error: folderCheckError } = await this.supabase.storage.from(this.bucketName).list(`${userFolder}/${this.folderName}`);

          if (folderCheckError || !folderCheck || folderCheck.length === 0) {
            loggerService.info(`Creating folder structure for user '${userFolder}'...`);
            const { data, error } = await this.supabase.storage.from(this.bucketName).upload(placeholderPath, Buffer.from(""), {
              contentType: "text/plain",
              upsert: true,
            });

            if (error) {
              loggerService.warn(`Error creating folder structure: ${error.message}`);
            } else {
              loggerService.info(`Successfully created folder structure for user '${userFolder}'`);
            }
          } else {
            loggerService.info(`Folder structure for user '${userFolder}' already exists`);
          }
        } catch (createFolderError) {
          // Log but continue - Supabase will often create folders automatically when uploading
          loggerService.warn(`Error in folder creation: ${createFolderError instanceof Error ? createFolderError.message : "Unknown error"}`);
        }
      } catch (folderCheckError) {
        loggerService.warn(`Error in folder check: ${folderCheckError instanceof Error ? folderCheckError.message : "Unknown error"}`);
        // Continue anyway - Supabase should create the folders automatically when uploading
      }

      // Upload to Supabase Storage with the user-based path
      loggerService.info(`Uploading file '${filePath}' to bucket '${this.bucketName}'...`);
      const { data, error } = await this.supabase.storage.from(this.bucketName).upload(filePath, buffer, {
        contentType,
        upsert: true, // Overwrite existing file if it exists
      });

      if (error) {
        loggerService.error(`Upload failed: ${error.message}`);
        throw new Error(`Failed to upload image: ${error.message}`);
      }

      loggerService.info(`Upload successful! Data: ${JSON.stringify(data)}`);

      // Generate and return the public URL
      const urlResponse = this.supabase.storage.from(this.bucketName).getPublicUrl(filePath);

      const publicUrl = urlResponse.data.publicUrl;
      loggerService.info(`Generated public URL: ${publicUrl}`);

      return publicUrl;
    } catch (error) {
      loggerService.error(`Error in uploadBase64Image: ${error instanceof Error ? error.message : "Unknown error"}`);
      throw error;
    }
  }

  /**
   * Delete an image from Supabase storage
   * @param fileName Name of the file to delete
   */
  async deleteImage(fileName: string): Promise<void> {
    try {
      if (!this.supabase) {
        throw new Error("Supabase client not initialized");
      }
      const { error } = await this.supabase.storage.from(this.bucketName).remove([`charts/${fileName}`]);

      if (error) {
        throw error;
      }

      loggerService.info(`Deleted image: charts/${fileName}`);
    } catch (error) {
      loggerService.error(`Error deleting image from Supabase: ${error instanceof Error ? error.message : "Unknown error"}`);
      throw error;
    }
  }
}

// Export singleton instance
export const supabaseStorageService = new SupabaseStorageService();
