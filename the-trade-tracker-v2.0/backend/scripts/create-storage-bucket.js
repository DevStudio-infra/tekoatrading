/**
 * Script to create a Supabase storage bucket for chart images
 * Uses the ANON key which we verified is working
 */
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Get environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Bucket name from the memory
const BUCKET_NAME = 'trade-charts';

// Initialize Supabase client with the service key (needed for admin operations like creating buckets)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function createBucket() {
  try {
    console.log(`Creating storage bucket: ${BUCKET_NAME}`);
    
    const { data, error } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true  // Make the bucket public so we can access the chart images
    });
    
    if (error) {
      console.error(`Error creating bucket: ${error.message}`);
      return false;
    }
    
    console.log(`✅ Bucket '${BUCKET_NAME}' created successfully!`);
    return true;
  } catch (error) {
    console.error(`Unexpected error: ${error.message}`);
    return false;
  }
}

async function testUpload() {
  try {
    console.log('\nTesting upload to the bucket...');
    
    // Create a simple test file
    const testContent = Buffer.from(`Test file created at ${new Date().toISOString()}`);
    const fileName = `test-${Date.now()}.txt`;
    const filePath = `charts/${fileName}`;
    
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, testContent, {
        contentType: 'text/plain',
        upsert: true
      });
    
    if (error) {
      console.error(`Upload failed: ${error.message}`);
      return false;
    }
    
    console.log(`✅ Test file uploaded successfully!`);
    
    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);
    
    console.log(`File available at: ${publicUrl}`);
    return true;
  } catch (error) {
    console.error(`Upload test failed: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('SUPABASE BUCKET SETUP');
  console.log('====================');
  
  // First check if the bucket already exists
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error(`Error listing buckets: ${error.message}`);
    } else {
      const existingBucket = buckets.find(b => b.name === BUCKET_NAME);
      
      if (existingBucket) {
        console.log(`Bucket '${BUCKET_NAME}' already exists.`);
        await testUpload();
        return;
      }
    }
  } catch (error) {
    console.error(`Error checking buckets: ${error.message}`);
  }
  
  // Create the bucket
  const created = await createBucket();
  
  if (created) {
    // Test uploading a file
    await testUpload();
  }
}

// Run the script
main();
