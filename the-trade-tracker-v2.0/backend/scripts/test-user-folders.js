/**
 * Test script for verifying the user-based folder structure in Supabase storage
 */
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Get Supabase credentials from environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BUCKET_NAME = 'trade-charts';

console.log('USER FOLDER STRUCTURE TEST');
console.log('==========================');
console.log(`Using Supabase URL: ${SUPABASE_URL}`);
console.log(`Using bucket: ${BUCKET_NAME}`);

// Initialize Supabase client with service key (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Get all files in a bucket, organized by folder structure
 */
async function listAllFilesWithFolderStructure() {
  console.log('\nListing all files with folder structure:');
  
  try {
    // First list root folders
    const { data: rootItems, error: rootError } = await supabase.storage
      .from(BUCKET_NAME)
      .list();
    
    if (rootError) {
      console.error(`Error listing root items: ${rootError.message}`);
      return;
    }
    
    console.log(`Found ${rootItems.length} items at root level:`);
    
    const folderStructure = {};
    
    // Process each root item
    for (const item of rootItems) {
      console.log(`- ${item.name} ${item.id ? '[File]' : '[Folder]'}`);
      
      // If it's a folder, list its contents
      if (!item.id) {
        const folderPath = item.name;
        folderStructure[folderPath] = { subfolders: {}, files: [] };
        
        try {
          // List contents of the folder
          const { data: folderItems, error: folderError } = await supabase.storage
            .from(BUCKET_NAME)
            .list(folderPath);
          
          if (folderError) {
            console.error(`  Error listing ${folderPath}: ${folderError.message}`);
            continue;
          }
          
          console.log(`  Contains ${folderItems.length} items:`);
          
          // Process each item in the folder
          for (const subItem of folderItems) {
            console.log(`  - ${subItem.name} ${subItem.id ? '[File]' : '[Folder]'}`);
            
            if (subItem.id) {
              // It's a file
              folderStructure[folderPath].files.push(subItem.name);
            } else {
              // It's a subfolder, list its contents
              const subfolderPath = `${folderPath}/${subItem.name}`;
              folderStructure[folderPath].subfolders[subItem.name] = { files: [] };
              
              try {
                const { data: subfolderItems, error: subfolderError } = await supabase.storage
                  .from(BUCKET_NAME)
                  .list(subfolderPath);
                
                if (subfolderError) {
                  console.error(`    Error listing ${subfolderPath}: ${subfolderError.message}`);
                  continue;
                }
                
                console.log(`    Contains ${subfolderItems.length} items:`);
                
                // Process each item in the subfolder
                for (const fileItem of subfolderItems) {
                  console.log(`    - ${fileItem.name}`);
                  folderStructure[folderPath].subfolders[subItem.name].files.push(fileItem.name);
                }
              } catch (subfolderError) {
                console.error(`    Error processing subfolder ${subfolderPath}: ${subfolderError.message}`);
              }
            }
          }
        } catch (folderError) {
          console.error(`  Error processing folder ${folderPath}: ${folderError.message}`);
        }
      }
    }
    
    console.log('\nFolder Structure Summary:');
    console.log(JSON.stringify(folderStructure, null, 2));
    
    return folderStructure;
  } catch (error) {
    console.error(`Error listing files: ${error.message}`);
    return null;
  }
}

/**
 * Test uploading files to user folders
 */
async function testUserFolderUploads() {
  console.log('\nTesting user folder uploads:');
  
  const testUsers = [
    { id: 'user-test-1', name: 'Test User 1' },
    { id: 'user-test-2', name: 'Test User 2' },
    { id: 'bot-123456', name: 'Bot Folder Test' }
  ];
  
  for (const user of testUsers) {
    console.log(`\nUploading test file for ${user.name} (${user.id}):`);
    
    const testContent = Buffer.from(`Test content for ${user.name} created at ${new Date().toISOString()}`);
    const fileName = `test-${Date.now()}.txt`;
    const filePath = `${user.id}/charts/${fileName}`;
    
    try {
      // First ensure the folder structure exists
      console.log(`Creating folder structure: ${user.id}/charts/`);
      
      // Create user folder if needed
      const { error: userFolderError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(`${user.id}/.keep`, Buffer.from(''), {
          contentType: 'text/plain',
          upsert: true
        });
      
      if (userFolderError) {
        console.error(`Error creating user folder: ${userFolderError.message}`);
        continue;
      }
      
      // Create charts subfolder if needed
      const { error: chartsFolderError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(`${user.id}/charts/.keep`, Buffer.from(''), {
          contentType: 'text/plain',
          upsert: true
        });
      
      if (chartsFolderError) {
        console.error(`Error creating charts subfolder: ${chartsFolderError.message}`);
        continue;
      }
      
      // Upload the test file
      console.log(`Uploading file: ${filePath}`);
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, testContent, {
          contentType: 'text/plain',
          upsert: true
        });
      
      if (error) {
        console.error(`Error uploading file: ${error.message}`);
        continue;
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);
      
      console.log(`✅ Upload successful! Public URL: ${urlData.publicUrl}`);
    } catch (error) {
      console.error(`Error in user folder test: ${error.message}`);
    }
  }
}

/**
 * Run the tests
 */
async function runTests() {
  try {
    // List existing structure to see what's there
    await listAllFilesWithFolderStructure();
    
    // Test creating user folders and uploading
    await testUserFolderUploads();
    
    // List again to see the results
    await listAllFilesWithFolderStructure();
    
    console.log('\n✅ Tests completed successfully!');
  } catch (error) {
    console.error(`\n❌ Test failed: ${error.message}`);
  }
}

// Run the tests
runTests();
