require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function addClosedAtColumn() {
  try {
    console.log("Adding closed_at column to trades table...");

    // Check if column already exists first
    const { data: columns, error: checkError } = await supabase.rpc("get_table_columns", { table_name: "trades" });

    if (checkError) {
      console.log("Could not check existing columns, proceeding with ALTER TABLE...");
    } else {
      const hasClosedAt = columns.some((col) => col.column_name === "closed_at");
      if (hasClosedAt) {
        console.log("✅ closed_at column already exists");
        return;
      }
    }

    // Add the column using raw SQL
    const { data, error } = await supabase.rpc("exec_sql", {
      sql: "ALTER TABLE trades ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP;",
    });

    if (error) {
      console.error("❌ Error adding column:", error);

      // Fallback: try direct SQL execution
      console.log("Trying alternative method...");
      const { data: altData, error: altError } = await supabase.from("trades").select("closed_at").limit(1);

      if (altError && altError.message.includes("closed_at")) {
        console.log("Column definitely missing, need manual SQL execution");
        console.log("Please run this SQL manually in your Supabase SQL editor:");
        console.log("ALTER TABLE trades ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP;");
      } else {
        console.log("✅ Column may already exist or was added successfully");
      }
    } else {
      console.log("✅ Successfully added closed_at column to trades table");
    }

    // Verify the column was added
    const { data: testData, error: testError } = await supabase.from("trades").select("id, closed_at").limit(1);

    if (testError) {
      console.error("❌ Column verification failed:", testError.message);
    } else {
      console.log("✅ Column verification successful");
    }
  } catch (error) {
    console.error("❌ Script error:", error);
  }
}

addClosedAtColumn()
  .then(() => {
    console.log("Script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
