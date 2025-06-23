/**
 * Supabase Storage Setup Script
 * This script correctly sets up the Supabase storage bucket with proper RLS policies
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

// Get Supabase credentials from environment
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // Must use service key for admin operations

// We'll try both bucket names from the memories - one with 's' and one without
const BUCKET_NAMES = ['trade-chart', 'trade-charts'];

// Verify environment variables
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('ERROR: Missing required environment variables SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

// Create Supabase client with service role key (required for admin operations)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
});

// Function to set bucket policies
async function configureBucketPolicies(bucketName) {
  try {
    console.log(`Setting up RLS policies for bucket '${bucketName}'...`);
    
    // Allow anonymous uploads (for chart upload functionality)
    const uploadPolicyName = `allow_anon_uploads_${bucketName}`;
    const { error: uploadError } = await supabase.rpc('create_storage_policy', {
      name: uploadPolicyName,
      bucket: bucketName,
      operation: 'INSERT',
      definition: 'true', // Allow any authenticated or anonymous user to upload
      check: 'true'
    });
    
    if (uploadError) {
      if (uploadError.message.includes('already exists')) {
        console.log(`- Upload policy already exists`);
      } else {
        console.error(`- Error creating upload policy: ${uploadError.message}`);
      }
    } else {
      console.log(`- Created upload policy successfully`);
    }
    
    // Allow public read access (for serving chart images)
    const selectPolicyName = `allow_public_select_${bucketName}`;
    const { error: selectError } = await supabase.rpc('create_storage_policy', {
      name: selectPolicyName,
      bucket: bucketName,
      operation: 'SELECT',
      definition: 'true', // Allow anyone to read
      check: 'true'
    });
    
    if (selectError) {
      if (selectError.message.includes('already exists')) {
        console.log(`- Select policy already exists`);
      } else {
        console.error(`- Error creating select policy: ${selectError.message}`);
      }
    } else {
      console.log(`- Created select policy successfully`);
    }
    
    return true;
  } catch (error) {
    console.error(`Error configuring bucket policies: ${error.message}`);
    return false;
  }
}

// Function to create or get bucket
async function setupBucket(bucketName) {
  try {
    console.log(`\nAttempting to setup bucket: ${bucketName}`);
    
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error(`Error listing buckets: ${listError.message}`);
      return false;
    }
    
    const existingBucket = buckets.find(b => b.name === bucketName);
    
    if (existingBucket) {
      console.log(`Bucket '${bucketName}' already exists.`);
    } else {
      // Create bucket
      console.log(`Creating bucket '${bucketName}'...`);
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true, // Make it public for easy access to chart images
        fileSizeLimit: 10485760 // 10MB limit
      });
      
      if (createError) {
        console.error(`Error creating bucket: ${createError.message}`);
        return false;
      }
      
      console.log(`Bucket '${bucketName}' created successfully!`);
    }
    
    // Setup bucket policies regardless (to ensure they're correct)
    const policiesSetup = await configureBucketPolicies(bucketName);
    
    if (!policiesSetup) {
      console.error(`Failed to configure policies for bucket '${bucketName}'`);
      return false;
    }
    
    // Test bucket with a simple upload
    return await testBucketUpload(bucketName);
  } catch (error) {
    console.error(`Unexpected error: ${error.message}`);
    return false;
  }
}

// Function to test bucket with a simple upload
async function testBucketUpload(bucketName) {
  try {
    const testContent = Buffer.from(`Test file created at ${new Date().toISOString()}`);
    const fileName = `test-${Date.now()}.txt`;
    const filePath = `charts/${fileName}`;
    
    console.log(`Testing bucket with a sample upload: ${filePath}`);
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, testContent, {
        contentType: 'text/plain',
        upsert: true
      });
    
    if (error) {
      console.error(`Upload test failed: ${error.message}`);
      return false;
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);
    
    console.log(`Upload successful! File available at: ${publicUrl}`);
    
    // Save successful bucket name to a file for the application to use
    const fs = require('fs');
    const configPath = require('path').join(__dirname, '..', 'storage-config.json');
    
    fs.writeFileSync(configPath, JSON.stringify({
      bucketName,
      testedAt: new Date().toISOString()
    }, null, 2));
    
    console.log(`Saved successful bucket configuration to ${configPath}`);
    
    return true;
  } catch (error) {
    console.error(`Test upload error: ${error.message}`);
    return false;
  }
}

// Update the supabase storage service
async function updateStorageService() {
  try {
    console.log('\nUpdating supabase-storage.service.ts with correct bucket name...');
    
    const configPath = require('path').join(__dirname, '..', 'storage-config.json');
    
    if (!require('fs').existsSync(configPath)) {
      console.log('No storage config found. Cannot update service.');
      return;
    }
    
    const config = require(configPath);
    const servicePath = require('path').join(__dirname, '..', 'services', 'supabase-storage.service.ts');
    
    if (!require('fs').existsSync(servicePath)) {
      console.log(`Service file not found at ${servicePath}`);
      return;
    }
    
    let serviceContent = require('fs').readFileSync(servicePath, 'utf8');
    
    // Replace bucket name in the service
    const bucketRegex = /private\s+readonly\s+bucketName\s*=\s*['"]([^'"]+)['"]/;
    serviceContent = serviceContent.replace(
      bucketRegex, 
      `private readonly bucketName = '${config.bucketName}'`
    );
    
    require('fs').writeFileSync(servicePath, serviceContent);
    console.log(`Updated storage service with bucket name: ${config.bucketName}`);
  } catch (error) {
    console.error(`Error updating storage service: ${error.message}`);
  }
}

// Main function
async function main() {
  console.log('SUPABASE STORAGE SETUP');
  console.log('=====================');
  console.log(`Using Supabase URL: ${SUPABASE_URL}`);
  
  let success = false;
  
  // Try each bucket name
  for (const bucketName of BUCKET_NAMES) {
    const result = await setupBucket(bucketName);
    
    if (result) {
      console.log(`\n✅ Successfully set up bucket: ${bucketName}`);
      success = true;
      break;
    } else {
      console.log(`\n❌ Failed to set up bucket: ${bucketName}`);
    }
  }
  
  if (success) {
    await updateStorageService();
    console.log('\n✅ SETUP COMPLETE! Your Supabase storage is ready to use.');
  } else {
    console.error('\n❌ SETUP FAILED! Could not set up any of the bucket options.');
    console.log('Please check your Supabase credentials and permissions.');
  }
}

// Run setup
main();
