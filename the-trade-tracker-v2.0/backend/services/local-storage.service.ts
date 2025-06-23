import * as fs from 'fs';
import * as path from 'path';
import { loggerService } from './logger.service';

/**
 * Local file storage service as fallback for Supabase
 * When Supabase storage is unavailable or authentication issues occur
 */
class LocalStorageService {
  private readonly storageDir: string;
  private readonly publicPath: string = '/charts';
  
  constructor() {
    // Create storage directory in project root/public/charts
    this.storageDir = path.resolve(__dirname, '../public/charts');
    
    // Create directories if they don't exist
    this.ensureDirExists(path.resolve(__dirname, '../public'));
    this.ensureDirExists(this.storageDir);
    
    loggerService.info(`Local storage service initialized at ${this.storageDir}`);
  }
  
  /**
   * Ensure a directory exists, create it if it doesn't
   */
  private ensureDirExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      loggerService.info(`Created directory: ${dirPath}`);
    }
  }
  
  /**
   * Save a base64 image to local storage
   * @param base64Image Base64 encoded image data
   * @param fileName Name to use for the stored file
   * @param contentType MIME type of the image
   * @returns URL path to the stored image
   */
  async saveBase64Image(base64Image: string, fileName: string, contentType = 'image/png'): Promise<string> {
    try {
      // Remove data URI prefix if present
      const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
      
      // Convert base64 to binary data
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Create file path
      const filePath = path.join(this.storageDir, fileName);
      
      // Write the file
      fs.writeFileSync(filePath, buffer);
      
      loggerService.info(`Saved image locally: ${filePath}`);
      
      // Return a URL path (not a full URL) - this will be resolved by the frontend
      return `${this.publicPath}/${fileName}`;
    } catch (error) {
      loggerService.error(`Error saving image locally: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }
  
  /**
   * Delete an image from local storage
   * @param fileName Name of the file to delete
   */
  async deleteImage(fileName: string): Promise<void> {
    try {
      const filePath = path.join(this.storageDir, fileName);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        loggerService.info(`Deleted image from local storage: ${filePath}`);
      } else {
        loggerService.warn(`Attempted to delete non-existent file: ${filePath}`);
      }
    } catch (error) {
      loggerService.error(`Error deleting image from local storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }
}

// Export singleton instance
export const localStorageService = new LocalStorageService();
