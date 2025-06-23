/**
 * Proper test script for Supabase storage connection
 * This script ensures environment variables are properly loaded
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Get Supabase credentials from environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Try both potential bucket names from the project
const BUCKET_NAMES = ['trade-chart', 'trade-charts'];
let BUCKET_NAME = BUCKET_NAMES[0]; // Start with the first one

// Logging environment variables status (without exposing full values)
console.log('Environment variables check:');
console.log(`SUPABASE_URL: ${SUPABASE_URL ? 'Found' : 'Missing'}`);
console.log(`SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY ? 'Found' : 'Missing'}`);
console.log(`Using bucket name: ${BUCKET_NAME}`);
console.log('');

// Get service key (needed for creating buckets)
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
console.log(`SUPABASE_SERVICE_KEY: ${SUPABASE_SERVICE_KEY ? 'Found' : 'Missing'}`);
console.log('');

// Create Supabase client with anon key (for regular operations)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

// Create Supabase admin client with service role key (for admin operations)
const supabaseAdmin = SUPABASE_SERVICE_KEY ? 
  createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  }) : null;

// Function to create a test text file
function createTestFile() {
  const testContent = `This is a test file created at ${new Date().toISOString()}`;
  return Buffer.from(testContent);
}

// Function to upload test file to Supabase
async function uploadTestFile() {
  try {
    // Create test file
    const fileBuffer = createTestFile();
    const fileName = `test-${Date.now()}.txt`;
    const filePath = `charts/${fileName}`;
    
    console.log(`Uploading file to bucket '${BUCKET_NAME}', path: ${filePath}`);
    
    // Upload to Supabase
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, fileBuffer, {
        contentType: 'text/plain',
        upsert: true
      });
    
    if (error) {
      console.error('Error uploading file:', error.message);
      if (error.message.includes('insufficient permissions') || error.message.includes('row level security')) {
        console.error('\nPermission error detected: This is likely a row-level security (RLS) policy issue.');
        console.error('Make sure the "trade-chart" bucket exists and has the correct permissions set.');
      }
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
    console.error('Error:', error.message);
    return null;
  }
}

// Function to check if bucket exists
async function checkBucket() {
  try {
    console.log(`Checking if bucket '${BUCKET_NAME}' exists...`);
    
    // List all buckets
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('Error listing buckets:', error.message);
      return false;
    }
    
    // Check if our bucket exists
    const bucketExists = buckets.some(bucket => bucket.name === BUCKET_NAME);
    
    if (bucketExists) {
      console.log(`✅ Bucket '${BUCKET_NAME}' exists!`);
      return true;
    } else {
      console.error(`❌ Bucket '${BUCKET_NAME}' does not exist!`);
      console.log('Available buckets:');
      buckets.forEach(bucket => console.log(`- ${bucket.name}`));
      return false;
    }
  } catch (error) {
    console.error('Error checking bucket:', error.message);
    return false;
  }
}

// Function to create bucket
async function createBucket() {
  if (!supabaseAdmin) {
    console.error('Cannot create bucket: Service role key is required');
    return false;
  }
  
  try {
    console.log(`Creating bucket '${BUCKET_NAME}'...`);
    
    const { data, error } = await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
      public: true, // Make the bucket public so charts can be accessed without authentication
      fileSizeLimit: 10485760, // 10MB
    });
    
    if (error) {
      console.error('Error creating bucket:', error.message);
      return false;
    }
    
    console.log(`✅ Bucket '${BUCKET_NAME}' created successfully!`);
    
    // Also set up proper RLS policies for the bucket
    console.log('Setting up RLS policies for the bucket...');
    
    // Add a policy to allow anonymous uploads (needed for chart uploads)
    try {
      const { error: policyError } = await supabaseAdmin.storage.from(BUCKET_NAME).createPolicy('allow-uploads', {
        name: 'allow uploads',
        definition: {
          bucket_id: BUCKET_NAME,
          operation: 'INSERT',
          constraints: [],
          action: 'ALLOW',
          check: 'true', // Allow all uploads
        }
      });
      
      if (policyError) {
        console.error('Error creating policy:', policyError.message);
      } else {
        console.log('✅ Upload policy created successfully!');
      }
    } catch (policyError) {
      console.error('Error creating policy:', policyError.message);
    }
    
    return true;
  } catch (error) {
    console.error('Error creating bucket:', error.message);
    return false;
  }
}

// Main function
async function main() {
  try {
    console.log('SUPABASE STORAGE TEST');
    console.log('====================');
    
    let success = false;
    
    // Try each bucket name
    for (const bucketName of BUCKET_NAMES) {
      BUCKET_NAME = bucketName;
      console.log(`\nTrying bucket name: ${BUCKET_NAME}`);
      
      // First check if the bucket exists
      let bucketExists = await checkBucket();
      
      // If bucket doesn't exist, try to create it
      if (!bucketExists) {
        console.log('\nAttempting to create the bucket with service role key...');
        bucketExists = await createBucket();
        
        if (!bucketExists) {
          console.log(`\n❌ Could not use bucket '${BUCKET_NAME}'. Trying next bucket...`);
          continue; // Try the next bucket
        }
      }
      
      // Try to upload a test file
      const publicUrl = await uploadTestFile();
      
      if (publicUrl) {
        console.log('\n✅ TEST SUCCESSFUL!');
        console.log(`File uploaded and available at: ${publicUrl}`);
        console.log(`\nCORRECT BUCKET NAME CONFIRMED: '${BUCKET_NAME}'`);
        success = true;
        break; // We found a working bucket, no need to try others
      } else {
        console.log(`\n❌ Upload to '${BUCKET_NAME}' failed. Trying next bucket...`);
      }
    }
    
    if (!success) {
      console.log('\n❌ ALL BUCKET TESTS FAILED!');
      console.log('Could not upload to any of the Supabase storage buckets.');
      console.log('Please check your Supabase configuration and storage settings.');
    }
  } catch (error) {
    console.error('Test failed with unexpected error:', error);
  }
}

// Run the test
main();
