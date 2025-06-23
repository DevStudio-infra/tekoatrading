/**
 * This script directly tests uploading a sample text file to Supabase
 * bypassing the chart engine to verify storage functionality
 */
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables - this is critical for Supabase access
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Log environment variables (without showing full values for security)
console.log('Environment check:');
console.log(`SUPABASE_URL set: ${process.env.SUPABASE_URL ? '✓' : '✗'}`);
console.log(`SUPABASE_ANON_KEY set: ${process.env.SUPABASE_ANON_KEY ? '✓' : '✗'}`);
console.log('');

// Supabase connection details
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const BUCKET_NAME = 'trade-chart';

// Sample image path - using a placeholder image for testing
const sampleImagePath = path.join(__dirname, 'sample-chart.png');

// Create a simple test file for uploading
function createTestFile() {
  console.log('Creating a simple test file for Supabase upload');
  
  // Create a simple text file with timestamp
  const text = `Test file for Supabase upload. Created at ${new Date().toISOString()}`;
  const buffer = Buffer.from(text);
  
  // We'll create a simple test file
  fs.writeFileSync('test-upload.txt', buffer);
  console.log('Test file created: test-upload.txt');
  return buffer;
}

// Upload to Supabase storage
async function uploadToSupabase(fileBuffer) {
  try {
    console.log(`Connecting to Supabase at: ${SUPABASE_URL}`);
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });

    // Generate a unique filename
    const fileName = `test-${Date.now()}.txt`;
    const filePath = `charts/${fileName}`;
    
    console.log(`Uploading file to bucket '${BUCKET_NAME}', path: ${filePath}`);
    
    // Use the buffer provided
    const buffer = fileBuffer || fs.readFileSync('test-upload.txt');
    
    // Upload to Supabase
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: 'text/plain',
        upsert: true
      });
    
    if (error) {
      console.error('Upload error:', error.message);
      return null;
    }
    
    console.log('Upload successful:', data);
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);
    
    console.log('Public URL:', publicUrl);
    return publicUrl;
  } catch (error) {
    console.error('Error uploading to Supabase:', error);
    return null;
  }
}

// Main function
async function main() {
  try {
    console.log('DIRECT SUPABASE STORAGE TEST');
    console.log('==========================');
    console.log('This test bypasses the chart engine to verify Supabase storage functionality');
    
    // Create test file
    const fileBuffer = createTestFile();
    
    // Upload to Supabase
    const publicUrl = await uploadToSupabase(fileBuffer);
    
    if (publicUrl) {
      console.log('\n✅ TEST SUCCESSFUL!');
      console.log(`File uploaded and available at: ${publicUrl}`);
      console.log('This confirms Supabase storage is working correctly.');
    } else {
      console.log('\n❌ TEST FAILED!');
      console.log('Could not upload file to Supabase storage.');
    }
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the test
main();
