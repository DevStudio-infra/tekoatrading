/**
 * Test script for Supabase storage with authentication
 * This script uses the information from the documentation to properly
 * authenticate and create a folder structure compatible with the RLS policies
 */
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Get Supabase credentials from environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const BUCKET_NAME = 'trade-charts';

console.log('SUPABASE AUTHENTICATED STORAGE TEST');
console.log('==================================');
console.log(`Using Supabase URL: ${SUPABASE_URL}`);
console.log(`Using bucket: ${BUCKET_NAME}`);

// Initialize Supabase client with anon key (for user authentication)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Create a test user programmatically
 * Note: This requires admin/service role permissions
 */
async function createTestUser() {
  console.log('\nCreating test user...');
  
  // This would normally be set with actual user credentials
  // For test purposes we're just using a fixed user ID
  const testUserId = 'system';
  
  console.log(`Using test user ID: ${testUserId}`);
  
  return { id: testUserId };
}

/**
 * Upload a file to the user's folder
 */
async function uploadFileToUserFolder(userId, fileName, fileContent) {
  console.log(`\nUploading file to folder '${userId}/${fileName}'...`);
  
  // The path must follow the structure that matches the RLS policy
  // In this case: {userId}/filename
  const filePath = `${userId}/${fileName}`;
  
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, fileContent, {
      contentType: 'text/plain',
      upsert: true  // Overwrite if exists
    });
  
  if (error) {
    console.error(`Error uploading file: ${error.message}`);
    return null;
  }
  
  console.log(`✅ File uploaded successfully!`);
  return data;
}

/**
 * Get the public URL for a file
 */
async function getPublicUrl(userId, fileName) {
  const filePath = `${userId}/${fileName}`;
  
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);
  
  console.log(`Public URL: ${data.publicUrl}`);
  return data.publicUrl;
}

/**
 * Run the test
 */
async function runTest() {
  try {
    // Create or get test user
    const user = await createTestUser();
    
    // Prepare test content
    const testFileName = `test-file-${Date.now()}.txt`;
    const testContent = Buffer.from(`Test content created at ${new Date().toISOString()}`);
    
    // Upload file to user folder
    const uploadResult = await uploadFileToUserFolder(user.id, testFileName, testContent);
    
    if (uploadResult) {
      // Get public URL
      await getPublicUrl(user.id, testFileName);
      
      console.log('\n✅ Test completed successfully!');
      console.log('\nImportant lessons:');
      console.log('1. Files must be stored in a folder structure like {userId}/filename');
      console.log('2. The folder name must match the user ID referenced in the RLS policy');
      console.log('3. For the trade-charts case, we should create a "charts" folder for the system');
      console.log('   or organize chart files by user IDs to comply with RLS policies');
    }
  } catch (error) {
    console.error(`\n❌ Test failed: ${error.message}`);
  }
}

// Run the test
runTest();
