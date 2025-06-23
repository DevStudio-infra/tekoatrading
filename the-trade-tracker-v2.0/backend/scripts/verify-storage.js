/**
 * Simple script to verify Supabase storage functionality
 * Uploads a simple text file to the trade-charts bucket
 */
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Get Supabase credentials from environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const BUCKET_NAME = 'trade-charts';

console.log('SUPABASE STORAGE VERIFICATION');
console.log('============================');
console.log(`Using Supabase URL: ${SUPABASE_URL}`);
console.log(`Using Bucket: ${BUCKET_NAME}`);

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function testUpload() {
  try {
    // Create a simple test file content
    const testContent = Buffer.from(`Test file created at ${new Date().toISOString()}`);
    const fileName = `verify-${Date.now()}.txt`;
    const filePath = `charts/${fileName}`;
    
    console.log(`\nUploading file: ${fileName}`);
    
    // First check if the bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error(`Error listing buckets: ${listError.message}`);
      return;
    }
    
    console.log(`Found ${buckets.length} buckets:`);
    buckets.forEach(bucket => console.log(`- ${bucket.name}`));
    
    // Check if our bucket exists
    const bucketExists = buckets.some(bucket => bucket.name === BUCKET_NAME);
    
    if (!bucketExists) {
      console.error(`\n❌ Bucket '${BUCKET_NAME}' does not exist! Available buckets:`);
      buckets.forEach(bucket => console.log(`- ${bucket.name}`));
      return;
    }
    
    console.log(`\n✅ Bucket '${BUCKET_NAME}' exists, proceeding with upload...`);
    
    // Try to upload the file
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, testContent, {
        contentType: 'text/plain',
        upsert: true
      });
    
    if (error) {
      console.error(`\n❌ Upload failed: ${error.message}`);
      
      if (error.message.includes('bucket not found')) {
        console.log('\nBucket not found error. Let\'s try to create it...');
        
        try {
          const { data: createData, error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
            public: true
          });
          
          if (createError) {
            console.error(`Failed to create bucket: ${createError.message}`);
          } else {
            console.log(`✅ Bucket '${BUCKET_NAME}' created successfully. Please run this script again.`);
          }
        } catch (createErr) {
          console.error(`Error creating bucket: ${createErr.message}`);
        }
      }
      
      return;
    }
    
    console.log(`\n✅ File uploaded successfully!`);
    
    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);
    
    console.log(`File available at: ${publicUrl}`);
    
    // Try to list files in the bucket to confirm
    console.log('\nListing files in the bucket:');
    
    const { data: fileList, error: listFilesError } = await supabase.storage
      .from(BUCKET_NAME)
      .list('charts');
    
    if (listFilesError) {
      console.error(`Error listing files: ${listFilesError.message}`);
    } else if (!fileList || fileList.length === 0) {
      console.log('No files found in the charts folder.');
    } else {
      console.log(`Found ${fileList.length} files:`);
      fileList.forEach(file => console.log(`- ${file.name}`));
    }
  } catch (error) {
    console.error(`\n❌ Unexpected error: ${error.message}`);
  }
}

// Run the test
testUpload();
