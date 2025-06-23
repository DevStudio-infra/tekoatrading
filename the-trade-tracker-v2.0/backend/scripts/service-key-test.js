/**
 * Test Supabase bucket access using the SERVICE key
 * This has higher permissions than the anon key
 */
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Get Supabase credentials from environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BUCKET_NAME = 'trade-charts';

console.log('SUPABASE SERVICE KEY TEST');
console.log('========================');
console.log(`Using Supabase URL: ${SUPABASE_URL}`);
console.log(`Target Bucket: ${BUCKET_NAME}`);

// Initialize Supabase client with service key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testBucket() {
  try {
    // List all buckets
    console.log('\nListing all buckets with service key...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error(`Error listing buckets: ${bucketsError.message}`);
      return;
    }
    
    console.log(`Found ${buckets.length} buckets:`);
    buckets.forEach(bucket => console.log(`- ${bucket.name}`));
    
    // Check if our bucket exists
    const targetBucket = buckets.find(b => b.name === BUCKET_NAME);
    
    if (!targetBucket) {
      console.log(`\n❌ Bucket '${BUCKET_NAME}' not found!`);
      
      // Try to create the bucket
      console.log(`\nAttempting to create bucket '${BUCKET_NAME}'...`);
      const { data: createData, error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true
      });
      
      if (createError) {
        console.error(`Error creating bucket: ${createError.message}`);
        return;
      }
      
      console.log(`✅ Bucket '${BUCKET_NAME}' created successfully!`);
    } else {
      console.log(`\n✅ Bucket '${BUCKET_NAME}' found!`);
    }
    
    // Test upload
    console.log('\nTesting file upload...');
    const testContent = Buffer.from(`Test file created at ${new Date().toISOString()}`);
    const fileName = `service-key-test-${Date.now()}.txt`;
    const filePath = `charts/${fileName}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, testContent, {
        contentType: 'text/plain',
        upsert: true
      });
    
    if (uploadError) {
      console.error(`Error uploading file: ${uploadError.message}`);
      return;
    }
    
    console.log(`✅ File uploaded successfully!`);
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);
    
    console.log(`Public URL: ${publicUrl}`);
    
    // List files in the bucket
    console.log('\nListing files in the charts folder...');
    const { data: files, error: listError } = await supabase.storage
      .from(BUCKET_NAME)
      .list('charts');
    
    if (listError) {
      console.error(`Error listing files: ${listError.message}`);
      return;
    }
    
    if (!files || files.length === 0) {
      console.log('No files found in the charts folder.');
    } else {
      console.log(`Found ${files.length} files:`);
      files.forEach(file => console.log(`- ${file.name}`));
    }
    
    // Update the Service to use the service key
    console.log('\nSuggestion: Consider updating the SupabaseStorageService to use the service key instead of the anon key for better permissions.');
  } catch (error) {
    console.error(`Unexpected error: ${error.message}`);
  }
}

// Run test
testBucket();
