const { PrismaClient } = require("../generated/prisma");

const prisma = new PrismaClient();

async function fixBrokerCredentials() {
  try {
    console.log("🔧 Fixing broker credentials JSON parsing...\n");

    const credentials = await prisma.brokerCredential.findMany({
      where: {
        broker: {
          in: ["capital.com", "capital"],
        },
      },
    });

    if (credentials.length === 0) {
      console.log("❌ No Capital.com broker credentials found in database");
      return;
    }

    console.log(`✅ Found ${credentials.length} Capital.com credential(s) to fix:\n`);

    for (const cred of credentials) {
      console.log(`--- Processing Credential ${cred.id} ---`);
      console.log(`Current credentials type:`, typeof cred.credentials);
      console.log(`Current credentials value:`, cred.credentials);

      let fixedCredentials;

      // Check if credentials is a string that needs to be parsed
      if (typeof cred.credentials === "string") {
        try {
          // Handle double-encoded JSON
          let credString = cred.credentials;
          if (credString.startsWith('"') && credString.endsWith('"')) {
            // Remove outer quotes and unescape
            credString = credString.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
          }

          fixedCredentials = JSON.parse(credString);
          console.log("✅ Successfully parsed JSON string");
          console.log("📋 Parsed structure:", fixedCredentials);

          // Update the database with the proper JSON object
          await prisma.brokerCredential.update({
            where: { id: cred.id },
            data: {
              credentials: fixedCredentials,
            },
          });

          console.log("✅ Database updated with proper JSON object");
        } catch (error) {
          console.log("❌ Failed to parse credentials JSON:", error.message);
          console.log("Raw value:", cred.credentials);
        }
      } else if (typeof cred.credentials === "object" && cred.credentials !== null) {
        console.log("✅ Credentials are already a proper JSON object");
        fixedCredentials = cred.credentials;
      } else {
        console.log("❌ Credentials are null or unknown type");
      }

      // Validate the structure
      if (fixedCredentials) {
        console.log("\n📋 Final Credential Structure:");
        console.log(`  apiKey: ${fixedCredentials.apiKey ? "✅ Present" : "❌ Missing"}`);
        console.log(`  identifier: ${fixedCredentials.identifier ? "✅ Present" : "❌ Missing"}`);
        console.log(`  password: ${fixedCredentials.password ? "✅ Present" : "❌ Missing"}`);
        console.log(`  isDemo: ${fixedCredentials.isDemo !== undefined ? `✅ ${fixedCredentials.isDemo}` : "❌ Missing"}`);
      }

      console.log("\n" + "=".repeat(50) + "\n");
    }

    console.log("🎉 Broker credentials fix completed!");
  } catch (error) {
    console.error("❌ Error fixing broker credentials:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixBrokerCredentials();
