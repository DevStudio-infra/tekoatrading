/**
 * Test script for Supabase Storage Service
 * Run with: npx ts-node src/test-supabase.ts
 */

import { supabaseStorageService } from "./services/supabase-storage.service";
import { logger } from "./logger";

async function testSupabaseService() {
  logger.info("🧪 Testing Supabase Storage Service...");

  try {
    // Test 1: Check status
    const status = supabaseStorageService.getStatus();
    logger.info("📊 Service Status:", status);

    // Test 2: Test connection
    const connected = await supabaseStorageService.testConnection();
    logger.info(`🔗 Connection Test: ${connected ? "✅ Connected" : "❌ Failed"}`);

    // Test 3: Upload a test file
    const testData = Buffer.from("This is a test file for chart storage", "utf-8");
    const uploadResult = await supabaseStorageService.uploadFile(
      "test-file.txt",
      testData,
      "text/plain"
    );

    logger.info("📤 Upload Test:", uploadResult);

    // Test 4: Upload base64 image (mock)
    const base64Data = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
    const imageUrl = await supabaseStorageService.uploadBase64Image(
      base64Data,
      "test-chart.png",
      "test-user-123"
    );

    logger.info(`🖼️ Base64 Upload Test: ${imageUrl}`);

    // Test 5: List files
    const files = await supabaseStorageService.listFiles("test-user-123");
    logger.info("📋 List Files Test:", files);

    logger.info("✅ All Supabase tests completed!");

  } catch (error) {
    logger.error("❌ Supabase test failed:", error);
  }
}

// Run the test
testSupabaseService().catch(console.error);
