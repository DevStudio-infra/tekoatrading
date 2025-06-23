/**
 * Setup script for Trade Tracker Chart Storage
 * 
 * This script:
 * 1. Applies the SQL migration for chart image support
 * 2. Creates the Supabase storage bucket for chart images
 * 3. Sets up appropriate permissions
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Get Supabase credentials from environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

// Check for required environment variables
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing required environment variables: SUPABASE_URL, SUPABASE_ANON_KEY');
  console.error('Please add these to your .env file and try again');
  process.exit(1);
}

// Initialize Supabase client
console.log('Initializing Supabase client...');
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Function to create storage bucket
async function setupStorageBucket() {
  try {
    console.log('Checking for existing trade-charts bucket...');
    const { data: buckets } = await supabase.storage.listBuckets();
    
    // Check if bucket already exists
    const bucketExists = buckets?.some(bucket => bucket.name === 'trade-charts');
    
    if (bucketExists) {
      console.log('✅ trade-charts bucket already exists');
    } else {
      // Create the bucket
      console.log('Creating trade-charts bucket...');
      const { data, error } = await supabase.storage.createBucket('trade-charts', {
        public: true, // Make it publicly accessible
        fileSizeLimit: 5242880, // 5MB limit
      });
      
      if (error) {
        throw error;
      }
      
      console.log('✅ Successfully created trade-charts bucket');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error setting up storage bucket:', error.message);
    return false;
  }
}

// Function to apply SQL migration
async function applyMigration() {
  if (!DATABASE_URL) {
    console.error('❌ Missing DATABASE_URL environment variable');
    console.error('Unable to apply SQL migration');
    return false;
  }
  
  try {
    // Create a database connection
    const pool = new Pool({
      connectionString: DATABASE_URL,
    });
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '..', 'prisma', 'chart_image_migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Applying SQL migration...');
    await pool.query(migrationSQL);
    console.log('✅ Successfully applied SQL migration');
    
    // Close the connection
    await pool.end();
    return true;
  } catch (error) {
    console.error('❌ Error applying SQL migration:', error.message);
    return false;
  }
}

// Test uploading a sample image
async function testImageUpload() {
  try {
    // Create a simple test image (1x1 transparent pixel as base64)
    const testImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFeAJ5iYKO/AAAAABJRU5ErkJggg==';
    const buffer = Buffer.from(testImage, 'base64');
    
    console.log('Testing image upload to Supabase storage...');
    
    // Upload the test image
    const { data, error } = await supabase.storage
      .from('trade-charts')
      .upload('test/test-image.png', buffer, {
        contentType: 'image/png',
        upsert: true
      });
      
    if (error) {
      throw error;
    }
    
    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('trade-charts')
      .getPublicUrl('test/test-image.png');
    
    console.log('✅ Test image uploaded successfully');
    console.log('📊 Test image URL:', publicUrl);
    
    return true;
  } catch (error) {
    console.error('❌ Error testing image upload:', error.message);
    return false;
  }
}

// Main function to run all setup steps
async function setup() {
  console.log('==================================================');
  console.log('🚀 Setting up Trade Tracker Chart Storage');
  console.log('==================================================');
  
  // Setup storage bucket
  const bucketSetup = await setupStorageBucket();
  
  // Apply SQL migration
  const migrationApplied = await applyMigration();
  
  // Test image upload
  const testUpload = await testImageUpload();
  
  // Print summary
  console.log('\n==================================================');
  console.log('📋 Setup Summary:');
  console.log('==================================================');
  console.log(`📁 Storage Bucket: ${bucketSetup ? '✅ Success' : '❌ Failed'}`);
  console.log(`📄 SQL Migration: ${migrationApplied ? '✅ Success' : '❌ Failed'}`);
  console.log(`🖼️ Test Upload: ${testUpload ? '✅ Success' : '❌ Failed'}`);
  console.log('==================================================');
  
  // Add environment variable reminder
  console.log('\n📢 IMPORTANT: Ensure you have these environment variables set:');
  console.log('- SUPABASE_URL: Your Supabase project URL');
  console.log('- SUPABASE_ANON_KEY: Your Supabase anonymous key');
  console.log('- CHART_ENGINE_URL: URL to your Python chart engine (default: http://localhost:5001)');
  
  if (bucketSetup && migrationApplied && testUpload) {
    console.log('\n✅ All setup steps completed successfully!');
  } else {
    console.log('\n⚠️ Some setup steps failed. Review the logs above for details.');
  }
}

// Run the setup
setup().catch(error => {
  console.error('Unhandled error during setup:', error);
  process.exit(1);
});
