const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Log the environment variables (redacted for security)
console.log('Environment variables:');
console.log(`SUPABASE_URL: ${process.env.SUPABASE_URL ? '✓ Set' : '❌ Not set'}`);
console.log(`SUPABASE_ANON_KEY: ${process.env.SUPABASE_ANON_KEY ? '✓ Set' : '❌ Not set'}`);

// Use the values from .env file
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const bucketName = 'trade-chart'; // Correct bucket name

async function testUploadToExistingBucket() {
  try {
    console.log(`Initializing Supabase client with URL: ${SUPABASE_URL}`);
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });

    // Skip bucket creation, assume it exists
    console.log(`Attempting to upload test file to existing '${bucketName}' bucket...`);
    
    // Test uploading a simple text file
    const testFileName = `test-${Date.now()}.txt`;
    const testContent = Buffer.from('This is a test file for Supabase storage.');
    
    console.log(`Uploading file: ${testFileName}`);
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(`charts/${testFileName}`, testContent, {
        contentType: 'text/plain',
        upsert: true
      });
    
    if (error) {
      console.error('Error uploading test file:', error.message);
      return;
    }
    
    console.log('File uploaded successfully:', data);
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(`charts/${testFileName}`);
    
    console.log(`Public URL for test file: ${publicUrl}`);
    
    console.log('\nSupabase upload test completed successfully!');
  } catch (error) {
    console.error('Error in Supabase upload test:', error);
  }
}

testUploadToExistingBucket();
