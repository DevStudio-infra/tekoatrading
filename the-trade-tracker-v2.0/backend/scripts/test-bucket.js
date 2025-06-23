/**
 * Simple script to test Supabase bucket access
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Hardcode the URL and key from .env for testing
const SUPABASE_URL = 'https://fjraryjhmsjmplbpmafw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqcmFyeWpobXNqbXBsYnBtYWZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTU2MTMwMDAsImV4cCI6MjAzMTE4OTAwMH0.qgaEpbFB0LRKVf8NKMWmmgHXHyA2L2g_PuN9IyWVg1A';
const BUCKET_NAME = 'trade-chart';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testBucketAccess() {
  try {
    console.log(`Testing access to bucket: ${BUCKET_NAME}`);
    
    // Try to list files in the bucket
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list('charts');
    
    if (error) {
      console.error('Error accessing bucket:', error.message);
      return;
    }
    
    console.log(`Successfully accessed bucket ${BUCKET_NAME}`);
    console.log(`Found ${data.length} files in 'charts' folder:`);
    
    if (data.length > 0) {
      data.forEach((file, index) => {
        console.log(`${index + 1}. ${file.name}`);
      });
    } else {
      console.log('No files found in charts folder.');
    }
    
    // Test uploading a simple text file
    const testContent = Buffer.from(`Test file uploaded at ${new Date().toISOString()}`);
    const fileName = `test-${Date.now()}.txt`;
    
    console.log(`\nUploading test file: ${fileName}`);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(`charts/${fileName}`, testContent, {
        contentType: 'text/plain',
        upsert: true
      });
    
    if (uploadError) {
      console.error('Error uploading test file:', uploadError.message);
      return;
    }
    
    console.log('Upload successful!');
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(`charts/${fileName}`);
    
    console.log(`Public URL: ${publicUrl}`);
    console.log('\n✅ Supabase storage is working correctly!');
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the test
testBucketAccess();
