/**
 * Script to set up Supabase storage bucket for chart images
 * Run this once to create the necessary bucket
 */
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../.env") });

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "";
const BUCKET_NAME = "chart-images";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Missing Supabase configuration in environment variables");
  console.error("Please ensure SUPABASE_URL and SUPABASE_SERVICE_KEY are set in .env");
  process.exit(1);
}

// Initialize Supabase client with service key for admin operations
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function setupStorageBucket() {
  try {
    console.log("🚀 Setting up Supabase storage bucket...");
    console.log(`📍 Supabase URL: ${SUPABASE_URL}`);
    console.log(`📦 Bucket name: ${BUCKET_NAME}`);

    // Check if bucket already exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error("❌ Error listing buckets:", listError.message);
      return;
    }

    const bucketExists = buckets?.some((bucket) => bucket.name === BUCKET_NAME);

    if (bucketExists) {
      console.log(`✅ Bucket '${BUCKET_NAME}' already exists`);
    } else {
      // Create the bucket
      console.log(`📦 Creating bucket '${BUCKET_NAME}'...`);
      const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true, // Make it public for easy chart access
        fileSizeLimit: 10485760, // 10MB limit
      });

      if (createError) {
        console.error("❌ Error creating bucket:", createError.message);
        return;
      }

      console.log(`✅ Bucket '${BUCKET_NAME}' created successfully`);
    }

    // Test the bucket with a sample upload
    console.log("🧪 Testing bucket with a sample upload...");
    const testContent = Buffer.from("Test file created at " + new Date().toISOString());
    const fileName = `test-${Date.now()}.txt`;
    const filePath = `evaluations/test/${fileName}`;

    const { data, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, testContent, {
        contentType: "text/plain",
        upsert: true,
      });

    if (uploadError) {
      console.error("❌ Upload test failed:", uploadError.message);
      return;
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);

    console.log("✅ Upload test successful!");
    console.log(`📎 Test file URL: ${publicUrl}`);

    // Clean up test file
    const { error: deleteError } = await supabase.storage.from(BUCKET_NAME).remove([filePath]);

    if (deleteError) {
      console.warn("⚠️ Could not delete test file:", deleteError.message);
    } else {
      console.log("🧹 Test file cleaned up");
    }

    console.log("\n✅ Supabase storage setup completed successfully!");
    console.log(`📦 Bucket '${BUCKET_NAME}' is ready for use`);
    console.log("\n📝 Next steps:");
    console.log(
      "1. Ensure your application has the SUPABASE_URL and SUPABASE_ANON_KEY/SERVICE_KEY set",
    );
    console.log("2. The bucket is now ready to store chart images");
  } catch (error) {
    console.error("❌ Unexpected error:", error);
  }
}

// Run the setup
setupStorageBucket();
