const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function createDevUser() {
  const DEV_USER_UUID = "550e8400-e29b-41d4-a716-446655440000";
  const DEV_CLERK_ID = "dev_user_clerk_id";

  try {
    console.log("🔍 Checking if development user exists...");

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { id: DEV_USER_UUID },
    });

    if (existingUser) {
      console.log("✅ Development user already exists:", existingUser.email);
      return;
    }

    // Create the development user
    const user = await prisma.user.create({
      data: {
        id: DEV_USER_UUID,
        clerkId: DEV_CLERK_ID,
        email: "dev@example.com",
        firstName: "Development",
        lastName: "User",
        username: "dev-user",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    console.log("✅ Development user created successfully:", user.email);
    console.log("📋 User ID:", user.id);
    console.log("📋 Clerk ID:", user.clerkId);
  } catch (error) {
    console.error("❌ Error creating development user:", error);

    // If it's a unique constraint error, the user might already exist
    if (error.code === "P2002") {
      console.log("ℹ️  User with this email or clerkId already exists");
    }
  } finally {
    await prisma.$disconnect();
  }
}

createDevUser();
