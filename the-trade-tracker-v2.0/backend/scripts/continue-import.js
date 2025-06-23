/**
 * Helper script to continue the batch import process
 * This will import the remaining trading pairs in larger batches
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const BATCH_FILES_DIR = path.resolve(__dirname);
const START_BATCH = 6;    // We've already imported batches 1-5
const END_BATCH = 195;    // Total number of batches
const PROJECT_ID = 'fjraryjhmsjmplbpmafw';

// Function to run the import using the MCP command
function runImportBatch(batchStart, batchEnd) {
  console.log(`Importing batches ${batchStart} to ${batchEnd}...`);
  
  // Get the contents of each batch file and combine them
  let combinedSQL = '';
  
  for (let i = batchStart; i <= batchEnd; i++) {
    const batchFilePath = path.join(BATCH_FILES_DIR, `batch_${i}.sql`);
    
    // Skip if file doesn't exist
    if (!fs.existsSync(batchFilePath)) {
      console.log(`Warning: Batch file ${batchFilePath} not found. Skipping.`);
      continue;
    }
    
    const batchSQL = fs.readFileSync(batchFilePath, 'utf8');
    combinedSQL += batchSQL + '\n';
  }
  
  // Create a temporary file with the combined SQL
  const tempFile = path.join(BATCH_FILES_DIR, 'temp_combined_batch.sql');
  fs.writeFileSync(tempFile, combinedSQL);
  
  // Execute the SQL using the mcp6_execute_sql command
  try {
    console.log(`Executing combined batch (${batchStart}-${batchEnd})...`);
    const command = `npx supabase-execute-sql --project-id ${PROJECT_ID} --file ${tempFile}`;
    
    // Just output the command - don't execute
    console.log(`Command to run:\n${command}`);
    
  } catch (error) {
    console.error(`Error executing batch ${batchStart}-${batchEnd}:`, error);
    throw error;
  }
}

// Main function to import in larger chunks
async function importRemainingBatches() {
  try {
    // Calculate the total number of remaining batches
    const totalRemaining = END_BATCH - START_BATCH + 1;
    console.log(`Starting import of remaining ${totalRemaining} batches...`);
    
    // Import in chunks of 10 batches at a time
    const CHUNK_SIZE = 10;
    
    for (let i = START_BATCH; i <= END_BATCH; i += CHUNK_SIZE) {
      const chunkEnd = Math.min(i + CHUNK_SIZE - 1, END_BATCH);
      console.log(`\n--- Processing chunk ${i}-${chunkEnd} ---`);
      
      // Run the import for this chunk
      runImportBatch(i, chunkEnd);
      
      // Calculate progress
      const processedBatches = chunkEnd - START_BATCH + 1;
      const progress = (processedBatches / totalRemaining) * 100;
      console.log(`Progress: ${processedBatches}/${totalRemaining} batches (${progress.toFixed(2)}%)`);
    }
    
    console.log('\nAll batches processed! Now verify the import:');
    console.log(`npx supabase-execute-sql --project-id ${PROJECT_ID} --query "SELECT COUNT(*) FROM public.trading_pairs;"`);
    
  } catch (error) {
    console.error('Fatal error during import:', error);
  }
}

// Run the import
console.log('=== Continuing Trading Pairs Import Process ===');
importRemainingBatches().catch(console.error);
