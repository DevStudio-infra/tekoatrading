/* eslint-disable no-console */
import { prisma } from "../src/prisma";

async function main() {
  await prisma.user.create({
    data: {
      email: "demo@tekoa.ai",
      bots: {
        create: {
          name: "Demo Bot",
        },
      },
    },
  });
  console.log("Seed data created");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
