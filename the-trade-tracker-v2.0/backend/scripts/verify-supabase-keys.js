/**
 * Simple script to verify Supabase credentials are valid
 * This script tests both the anon key and service key
 */
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

// Ensure we load environment variables from the correct path
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Log the paths for debugging
console.log(`Current directory: ${__dirname}`);
console.log(`Looking for .env at: ${path.join(__dirname, '..', '.env')}`);
console.log('');

// Get environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

console.log('SUPABASE CREDENTIALS VERIFICATION');
console.log('================================');

// Log truncated versions of credentials for security
console.log(`URL: ${SUPABASE_URL}`);
console.log(`ANON KEY: ${SUPABASE_ANON_KEY ? SUPABASE_ANON_KEY.substring(0, 10) + '...' : 'Not set'}`);
console.log(`SERVICE KEY: ${SUPABASE_SERVICE_KEY ? SUPABASE_SERVICE_KEY.substring(0, 10) + '...' : 'Not set'}`);

// Function to verify key by listing buckets
async function verifyKey(key, keyType) {
  console.log(`\nTesting ${keyType}...`);
  
  const client = createClient(SUPABASE_URL, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
  
  try {
    // First try a simple auth check
    console.log('- Testing auth connection...');
    const { data: authData, error: authError } = await client.auth.getSession();
    
    if (authError) {
      console.log(`❌ Auth check failed: ${authError.message}`);
    } else {
      console.log('✅ Auth connection successful');
    }
    
    // Try to list buckets
    console.log('- Testing storage connection...');
    const { data: storageData, error: storageError } = await client.storage.listBuckets();
    
    if (storageError) {
      console.log(`❌ Storage check failed: ${storageError.message}`);
      return false;
    }
    
    console.log('✅ Storage connection successful');
    console.log(`Found ${storageData.length} buckets:`);
    storageData.forEach(bucket => console.log(`  - ${bucket.name}`));
    return true;
  } catch (error) {
    console.log(`❌ Unexpected error: ${error.message}`);
    return false;
  }
}

// Function to check if bucket exists
async function checkBucket(key, bucketName) {
  console.log(`\nChecking for bucket '${bucketName}'...`);
  
  const client = createClient(SUPABASE_URL, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
  
  try {
    const { data, error } = await client.storage.listBuckets();
    
    if (error) {
      console.log(`❌ Error listing buckets: ${error.message}`);
      return false;
    }
    
    const bucket = data.find(b => b.name === bucketName);
    
    if (bucket) {
      console.log(`✅ Bucket '${bucketName}' exists`);
      
      // Try to list contents
      try {
        console.log(`Listing contents of '${bucketName}'...`);
        const { data: files, error: listError } = await client.storage.from(bucketName).list();
        
        if (listError) {
          console.log(`❌ Error listing contents: ${listError.message}`);
        } else {
          console.log(`Found ${files.length} files/folders`);
        }
      } catch (listError) {
        console.log(`❌ Error listing contents: ${listError.message}`);
      }
      
      return true;
    } else {
      console.log(`❌ Bucket '${bucketName}' not found`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Error checking bucket: ${error.message}`);
    return false;
  }
}

async function main() {
  // Verify both keys
  const anonSuccess = await verifyKey(SUPABASE_ANON_KEY, 'ANON KEY');
  const serviceSuccess = await verifyKey(SUPABASE_SERVICE_KEY, 'SERVICE KEY');
  
  // Check for both potential bucket names
  if (anonSuccess || serviceSuccess) {
    const key = anonSuccess ? SUPABASE_ANON_KEY : SUPABASE_SERVICE_KEY;
    
    await checkBucket(key, 'trade-chart');
    await checkBucket(key, 'trade-charts');
  }
  
  if (!anonSuccess && !serviceSuccess) {
    console.log('\n❌ VERIFICATION FAILED');
    console.log('Both keys failed verification. Please check your Supabase credentials.');
    console.log('\nPossible solutions:');
    console.log('1. Verify the values in your .env file match your Supabase project');
    console.log('2. Check if your Supabase keys have expired and need renewal');
    console.log('3. Confirm your Supabase project is active and not in maintenance mode');
  }
}

main();
