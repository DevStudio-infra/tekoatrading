const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Log the environment variables
console.log('Environment variables:');
console.log(`SUPABASE_URL: ${process.env.SUPABASE_URL ? '✓ Set' : '❌ Not set'}`);
console.log(`SUPABASE_ANON_KEY: ${process.env.SUPABASE_ANON_KEY ? '✓ Set' : '❌ Not set'}`);
console.log(`SUPABASE_SERVICE_KEY: ${process.env.SUPABASE_SERVICE_KEY ? '✓ Set' : '❌ Not set'}`);

// Use the values directly from .env file if environment variables aren't loaded
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://fjraryjhmsjmplbpmafw.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqcmFyeWpobXNqbXBsYnBtYWZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTU2MTMwMDAsImV4cCI6MjAzMTE4OTAwMH0.qgaEpbFB0LRKVf8NKMWmmgHXHyA2L2g_PuN9IyWVg1A';
const bucketName = 'trade-chart';

async function testSupabaseStorage() {
  try {
    console.log(`Initializing Supabase client with URL: ${SUPABASE_URL}`);
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });

    console.log('Checking if bucket exists...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError.message);
      return;
    }
    
    console.log(`Found ${buckets.length} buckets:`, buckets.map(b => b.name));
    
    const bucketExists = buckets.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      console.log(`Bucket '${bucketName}' does not exist. Creating it now...`);
      const { data: newBucket, error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true
      });
      
      if (createError) {
        console.error('Error creating bucket:', createError.message);
        return;
      }
      
      console.log(`Bucket '${bucketName}' created successfully:`, newBucket);
    } else {
      console.log(`Bucket '${bucketName}' already exists.`);
    }
    
    // Test uploading a simple text file
    const testFileName = `test-${Date.now()}.txt`;
    const testContent = Buffer.from('This is a test file for Supabase storage.');
    
    console.log(`Uploading test file: ${testFileName}`);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(`charts/${testFileName}`, testContent, {
        contentType: 'text/plain',
        upsert: true
      });
    
    if (uploadError) {
      console.error('Error uploading test file:', uploadError.message);
      return;
    }
    
    console.log('File uploaded successfully:', uploadData);
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(`charts/${testFileName}`);
    
    console.log(`Public URL for test file: ${publicUrl}`);
    
    console.log('\nSupabase storage test completed successfully!');
  } catch (error) {
    console.error('Error in Supabase storage test:', error);
  }
}

testSupabaseStorage();
