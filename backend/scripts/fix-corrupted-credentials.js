const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function fixCorruptedCredentials() {
  try {
    console.log("🔧 Checking and fixing corrupted broker credentials...\n");

    // Get all broker credentials
    const credentials = await prisma.brokerCredential.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
        _count: {
          select: {
            bots: true,
          },
        },
      },
    });

    if (credentials.length === 0) {
      console.log("❌ No broker credentials found in database");
      return;
    }

    console.log(`✅ Found ${credentials.length} broker credential(s) to check:\n`);

    let fixedCount = 0;
    let corruptedCount = 0;

    for (const cred of credentials) {
      console.log(`--- Processing Credential ${cred.id.substring(0, 8)}... ---`);
      console.log(`Name: ${cred.name}`);
      console.log(`Broker: ${cred.broker}`);
      console.log(`User: ${cred.user?.email || "Unknown"}`);
      console.log(`Bots using this credential: ${cred._count.bots}`);
      console.log(`Raw credentials type: ${typeof cred.credentials}`);

      // Try to parse the credentials directly first
      let credentialsData = null;
      let needsUpdate = false;

      // Check if it's corrupted (starts with partial hash like "d20951e75b")
      if (typeof cred.credentials === "string") {
        const credStr = cred.credentials;

        // Check if it's a partial hash (corrupted)
        if (credStr.match(/^[a-f0-9]{10}/) && !credStr.includes(":") && credStr.length < 50) {
          console.log("❌ CORRUPTED: Credential appears to be a partial hash");
          corruptedCount++;

          // Check if we can recover or if it needs to be deleted
          console.log("🗑️  This credential is corrupted and cannot be recovered.");
          console.log("   Recommendation: Delete this credential and ask user to re-enter.");
          console.log("");
          continue;
        }

        // Try to parse as JSON directly
        try {
          credentialsData = JSON.parse(credStr);
          console.log("✅ Successfully parsed as plain JSON");
        } catch (parseError) {
          // Check if it's encrypted format (contains colon)
          if (credStr.includes(":")) {
            console.log("🔐 Appears to be encrypted format");
            console.log("   Will be handled by the encryption service automatically");
          } else {
            console.log("❌ Cannot parse as JSON or encrypted format");
            console.log(`   Raw value: ${credStr.substring(0, 50)}...`);
          }
        }
      } else if (typeof cred.credentials === "object" && cred.credentials !== null) {
        console.log("✅ Already a proper JSON object");
        credentialsData = cred.credentials;
      }

      // Validate credential structure if we have data
      if (credentialsData) {
        console.log("\n📋 Credential Structure:");
        console.log(`  apiKey: ${credentialsData.apiKey ? "✅ Present" : "❌ Missing"}`);
        console.log(`  identifier: ${credentialsData.identifier ? "✅ Present" : "❌ Missing"}`);
        console.log(`  password: ${credentialsData.password ? "✅ Present" : "❌ Missing"}`);
        console.log(
          `  isDemo: ${credentialsData.isDemo !== undefined ? `✅ ${credentialsData.isDemo}` : "❌ Missing"}`,
        );

        const isValid =
          credentialsData.apiKey && credentialsData.identifier && credentialsData.password;
        console.log(`\n🎯 Credential Status: ${isValid ? "✅ Valid" : "❌ Invalid"}`);

        if (!isValid) {
          console.log("   Missing required fields for Capital.com");
        }
      }

      console.log("\n" + "=".repeat(60) + "\n");
    }

    // Summary
    console.log("📊 SUMMARY:");
    console.log(`Total credentials: ${credentials.length}`);
    console.log(`Corrupted (unfixable): ${corruptedCount}`);
    console.log(`Fixed: ${fixedCount}`);

    if (corruptedCount > 0) {
      console.log("\n🚨 ACTION REQUIRED:");
      console.log("- Corrupted credentials need to be deleted and re-entered by users");
      console.log("- Users will need to reconfigure their broker connections");
      console.log("- Consider notifying affected users");
    }

    console.log("\n✅ Credential check completed!");
  } catch (error) {
    console.error("❌ Error checking credentials:", error);
  } finally {
    await prisma.$disconnect();
  }
}

async function deleteCorruptedCredentials() {
  try {
    console.log("🗑️  Deleting corrupted credentials...\n");

    // Find credentials that are corrupted (partial hashes)
    const credentials = await prisma.brokerCredential.findMany();
    const toDelete = [];

    for (const cred of credentials) {
      if (typeof cred.credentials === "string") {
        const credStr = cred.credentials;
        // Check if it's a partial hash (corrupted)
        if (credStr.match(/^[a-f0-9]{10}/) && !credStr.includes(":") && credStr.length < 50) {
          toDelete.push(cred);
        }
      }
    }

    if (toDelete.length === 0) {
      console.log("✅ No corrupted credentials found to delete");
      return;
    }

    console.log(`Found ${toDelete.length} corrupted credential(s) to delete:`);
    for (const cred of toDelete) {
      console.log(`- ${cred.id.substring(0, 8)}... (${cred.name})`);
    }

    // Ask for confirmation
    console.log("\nDELETING THESE CREDENTIALS. THIS CANNOT BE UNDONE.");

    // Delete the corrupted credentials
    const deleteResult = await prisma.brokerCredential.deleteMany({
      where: {
        id: {
          in: toDelete.map((c) => c.id),
        },
      },
    });

    console.log(`✅ Deleted ${deleteResult.count} corrupted credential(s)`);
  } catch (error) {
    console.error("❌ Error deleting corrupted credentials:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Main execution
const action = process.argv[2];

if (action === "delete") {
  deleteCorruptedCredentials();
} else {
  fixCorruptedCredentials();
}
