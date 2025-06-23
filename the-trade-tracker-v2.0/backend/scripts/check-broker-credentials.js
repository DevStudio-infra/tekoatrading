const { PrismaClient } = require("@prisma/client");
const { brokerCredentialService } = require("../services/broker-credential.service");

const prisma = new PrismaClient();

async function checkBrokerCredentials() {
  try {
    console.log("🔍 Checking broker credentials...\n");

    const credentials = await prisma.brokerCredential.findMany({
      where: {
        broker: {
          in: ["capital.com", "capital"],
        },
      },
      select: {
        id: true,
        name: true,
        broker: true,
        credentials: true,
        isActive: true,
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (credentials.length === 0) {
      console.log("❌ No Capital.com broker credentials found in database");
      return;
    }

    console.log(`✅ Found ${credentials.length} Capital.com credential(s):\n`);

    for (const cred of credentials) {
      console.log(`--- Credential ${credentials.indexOf(cred) + 1} ---`);
      console.log(`ID: ${cred.id}`);
      console.log(`Name: ${cred.name}`);
      console.log(`Broker: ${cred.broker}`);
      console.log(`Active: ${cred.isActive}`);
      console.log(`User: ${cred.user.email} (${cred.user.id})`);

      // Use the broker credential service to get properly decrypted credentials
      try {
        const fullCredential = await brokerCredentialService.getBrokerCredentialById(cred.id, cred.user.id);
        const credData = fullCredential ? fullCredential.credentials : {};

        console.log("\n📋 Credential Structure:");
        console.log(`  apiKey: ${credData.apiKey ? "✅ Present" : "❌ Missing"}`);
        console.log(`  identifier: ${credData.identifier ? "✅ Present" : "❌ Missing"}`);
        console.log(`  password: ${credData.password ? "✅ Present" : "❌ Missing"}`);
        console.log(`  isDemo: ${credData.isDemo !== undefined ? `✅ ${credData.isDemo}` : "❌ Missing"}`);

        // Check for alternative field names
        if (!credData.identifier) {
          if (credData.username) {
            console.log(`  username: ✅ Present (should be renamed to 'identifier')`);
          }
          if (credData.email) {
            console.log(`  email: ✅ Present (should be renamed to 'identifier')`);
          }
        }

        console.log("\n📝 Decrypted JSON:");
        console.log(JSON.stringify(credData, null, 2));
      } catch (error) {
        console.log("\n❌ Error decrypting credentials:", error.message);
        console.log("\n📝 Raw JSON:");
        console.log(JSON.stringify(cred.credentials, null, 2));
      }

      console.log("\n" + "=".repeat(50) + "\n");
    }

    // Provide fix suggestions
    console.log("🔧 Fix Suggestions:");
    console.log("If identifier is missing but username/email exists:");
    console.log("1. Update via web interface: Go to Broker Credentials → Edit → Re-enter credentials");
    console.log("2. Or update database directly with the missing identifier field");
    console.log("\nExpected JSON structure:");
    console.log(
      JSON.stringify(
        {
          apiKey: "your-api-key",
          identifier: "your-email-or-username",
          password: "your-api-password",
          isDemo: true,
        },
        null,
        2
      )
    );
  } catch (error) {
    console.error("❌ Error checking broker credentials:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBrokerCredentials();
