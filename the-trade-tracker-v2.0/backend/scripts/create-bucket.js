/**
 * Script to create the trade-charts bucket in Supabase using the service key
 */
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Get Supabase credentials from environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // Using service key for admin operations
const BUCKET_NAME = 'trade-charts';

console.log('SUPABASE BUCKET CREATION');
console.log('=======================');
console.log(`Using Supabase URL: ${SUPABASE_URL}`);
console.log(`Target Bucket Name: ${BUCKET_NAME}`);

// Initialize Supabase client with service key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createBucket() {
  try {
    // List buckets first to see what exists
    console.log("\nChecking existing buckets...");
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error(`Error listing buckets: ${listError.message}`);
      return;
    }
    
    console.log(`Found ${buckets.length} existing bucket(s):`);
    buckets.forEach(bucket => console.log(`- ${bucket.name}`));
    
    // Check if our bucket already exists
    const bucketExists = buckets.some(bucket => bucket.name === BUCKET_NAME);
    
    if (bucketExists) {
      console.log(`\n✅ Bucket '${BUCKET_NAME}' already exists. No need to create it.`);
      return;
    }
    
    // Create bucket
    console.log(`\nCreating bucket '${BUCKET_NAME}'...`);
    const { data, error } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true // Make the bucket public for easier access to charts
    });
    
    if (error) {
      console.error(`\n❌ Failed to create bucket: ${error.message}`);
      return;
    }
    
    console.log(`\n✅ Bucket '${BUCKET_NAME}' created successfully!`);
    
    // Set RLS policies to allow uploads without authentication
    console.log(`\nSetting up RLS policies for the bucket...`);
    
    // Allow read access to anyone
    const { error: readPolicyError } = await supabase.storage.from(BUCKET_NAME).createPolicy('read-policy', {
      name: 'Public Read Policy',
      definition: {
        operation: 'SELECT',
        action: 'ALLOW',
        check: 'true' // Allow any user to read
      }
    });
    
    if (readPolicyError) {
      console.error(`Error creating read policy: ${readPolicyError.message}`);
    } else {
      console.log(`- ✅ Read policy created successfully`);
    }
    
    // Allow insertions from authenticated users or anonymous users
    const { error: insertPolicyError } = await supabase.storage.from(BUCKET_NAME).createPolicy('insert-policy', {
      name: 'Public Insert Policy',
      definition: {
        operation: 'INSERT',
        action: 'ALLOW',
        check: 'true' // Allow any user to insert
      }
    });
    
    if (insertPolicyError) {
      console.error(`Error creating insert policy: ${insertPolicyError.message}`);
    } else {
      console.log(`- ✅ Insert policy created successfully`);
    }
    
    // Test by uploading a file
    console.log(`\nTesting the bucket with a sample upload...`);
    const testContent = Buffer.from(`Test file created at ${new Date().toISOString()}`);
    const fileName = `bucket-test-${Date.now()}.txt`;
    const filePath = `charts/${fileName}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, testContent, {
        contentType: 'text/plain',
        upsert: true
      });
    
    if (uploadError) {
      console.error(`\n❌ Test upload failed: ${uploadError.message}`);
      return;
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);
    
    console.log(`\n✅ Test file uploaded successfully!`);
    console.log(`Public URL: ${publicUrl}`);
    
    console.log(`\nBucket '${BUCKET_NAME}' is now ready for use with the trade tracker application!`);
  } catch (error) {
    console.error(`\n❌ Unexpected error: ${error.message}`);
  }
}

// Run the function
createBucket();
