/**
 * Split the large SQL file into smaller chunks for Supabase SQL Editor
 * Each chunk will be small enough to run directly in the SQL Editor
 */

const fs = require('fs');
const path = require('path');

// Configuration
const SQL_FILE_PATH = path.resolve(__dirname, './import_all_trading_pairs.sql');
const OUTPUT_DIR = path.resolve(__dirname, './sql_chunks');
const MAX_PAIRS_PER_FILE = 50; // Small number for SQL Editor

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Read the full SQL file
console.log('Reading SQL file...');
const sqlContent = fs.readFileSync(SQL_FILE_PATH, 'utf8');

// Split into chunks - look for INSERT statements
console.log('Splitting into chunks...');
const insertRegex = /-- Batch \d+\/\d+\nINSERT INTO public\.trading_pairs[\s\S]*?;\n\n/g;
const matches = sqlContent.match(insertRegex) || [];

console.log(`Found ${matches.length} INSERT batches`);

// Get the setup part (before first INSERT)
const setupEndIndex = sqlContent.indexOf('-- Batch 1/');
const setupSQL = sqlContent.substring(0, setupEndIndex);

// Get the finalization part (after last INSERT)
const finalizationStartIndex = sqlContent.lastIndexOf(';') + 1;
const finalizationSQL = sqlContent.substring(finalizationStartIndex);

// Group inserts into chunks for separate files
const chunks = [];
let currentChunk = [];
let currentSize = 0;

for (const insert of matches) {
  // Count number of VALUES in this insert (approx number of pairs)
  const valueCount = (insert.match(/\),\n/g) || []).length + 1;
  
  if (currentSize + valueCount > MAX_PAIRS_PER_FILE && currentChunk.length > 0) {
    // Current chunk is full, start a new one
    chunks.push(currentChunk);
    currentChunk = [insert];
    currentSize = valueCount;
  } else {
    // Add to current chunk
    currentChunk.push(insert);
    currentSize += valueCount;
  }
}

// Add the last chunk if not empty
if (currentChunk.length > 0) {
  chunks.push(currentChunk);
}

console.log(`Split into ${chunks.length} files with ~${MAX_PAIRS_PER_FILE} pairs each`);

// Write setup file
fs.writeFileSync(
  path.join(OUTPUT_DIR, '00_setup.sql'), 
  setupSQL
);
console.log('Created setup file: 00_setup.sql');

// Write each chunk to a separate file
chunks.forEach((chunk, index) => {
  const paddedIndex = String(index + 1).padStart(2, '0');
  const fileName = `${paddedIndex}_import_chunk.sql`;
  
  fs.writeFileSync(
    path.join(OUTPUT_DIR, fileName),
    chunk.join('')
  );
  
  console.log(`Created chunk file: ${fileName}`);
});

// Write finalization file
fs.writeFileSync(
  path.join(OUTPUT_DIR, '99_finalize.sql'),
  finalizationSQL
);
console.log('Created finalization file: 99_finalize.sql');

console.log('\nInstructions:');
console.log('1. First run 00_setup.sql in the Supabase SQL Editor');
console.log('2. Then run each chunk file (01_import_chunk.sql, 02_import_chunk.sql, etc.)');
console.log('3. Finally run 99_finalize.sql to verify the import and create indices');
console.log(`\nAll files are in: ${OUTPUT_DIR}`);
