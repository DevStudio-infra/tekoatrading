/**
 * Test script for Supabase storage using the service key to bypass RLS
 * While using a folder structure that's compatible with our application
 */
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Get Supabase credentials from environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BUCKET_NAME = 'trade-charts';

console.log('SUPABASE SERVICE KEY STORAGE TEST');
console.log('=================================');
console.log(`Using Supabase URL: ${SUPABASE_URL}`);
console.log(`Using bucket: ${BUCKET_NAME}`);
console.log('Note: Service key bypasses RLS policies');

// Initialize Supabase client with service key (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Test various folder structures to find one that works
 */
async function testFolderStructures() {
  console.log('\nTesting different folder structures...');
  
  const testContent = Buffer.from(`Test content created at ${new Date().toISOString()}`);
  const timestamp = Date.now();
  
  // Test cases for folder structures
  const testCases = [
    { name: 'Root level file', path: `test-file-${timestamp}.txt` },
    { name: 'Charts folder', path: `charts/test-file-${timestamp}.txt` },
    { name: 'Private folder', path: `private/test-file-${timestamp}.txt` },
    { name: 'Public folder', path: `public/test-file-${timestamp}.txt` },
  ];
  
  for (const test of testCases) {
    console.log(`\nTrying: ${test.name} (${test.path})`);
    
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(test.path, testContent, {
          contentType: 'text/plain',
          upsert: true
        });
      
      if (error) {
        console.error(`❌ Failed: ${error.message}`);
        continue;
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(test.path);
      
      console.log(`✅ Success! Public URL: ${urlData.publicUrl}`);
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
    }
  }
}

/**
 * List all files in the bucket to see what's already there
 */
async function listAllFiles() {
  console.log('\nListing all files in the bucket:');
  
  try {
    // First list root folders
    const { data: rootItems, error: rootError } = await supabase.storage
      .from(BUCKET_NAME)
      .list();
    
    if (rootError) {
      console.error(`Error listing root items: ${rootError.message}`);
      return;
    }
    
    console.log(`Found ${rootItems.length} items at root level:`);
    for (const item of rootItems) {
      console.log(`- ${item.name} ${item.id ? '[File]' : '[Folder]'}`);
      
      // If it's a folder, list its contents
      if (!item.id) {
        const { data: folderItems, error: folderError } = await supabase.storage
          .from(BUCKET_NAME)
          .list(item.name);
        
        if (folderError) {
          console.error(`  Error listing ${item.name}: ${folderError.message}`);
          continue;
        }
        
        console.log(`  Contains ${folderItems.length} items:`);
        folderItems.forEach(subItem => console.log(`  - ${subItem.name}`));
      }
    }
  } catch (error) {
    console.error(`Error listing files: ${error.message}`);
  }
}

/**
 * Run the test
 */
async function runTest() {
  try {
    // List existing files first
    await listAllFiles();
    
    // Test different folder structures
    await testFolderStructures();
    
    // List files again to see what was added
    await listAllFiles();
    
    console.log('\n✅ Test completed!');
    console.log('\nRecommendation:');
    console.log('1. Based on the successful folder structure, update the SupabaseStorageService'); 
    console.log('2. Make sure to use the service key for storage operations to bypass RLS');
    console.log('3. Store files in the folder path that worked in the test');
  } catch (error) {
    console.error(`\n❌ Test failed: ${error.message}`);
  }
}

// Run the test
runTest();
