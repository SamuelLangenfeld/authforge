import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("🧪 Testing connection to Neon...");

    // Simple query to test connection
    const result = await prisma.$queryRaw`SELECT NOW()`;
    const users = await prisma.user.findMany();
    console.log(`Found ${users.length} users`);
    console.log("✅ Connected successfully!");
    console.log("Server time:", result[0].now);
  } catch (error) {
    console.error("❌ Connection test failed:");
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
