import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();

async function main() {
  const saltRounds = 10;
  const demoPass = await bcrypt.hash("demo", saltRounds);
  const alice = await prisma.user.upsert({
    where: { email: "alice@prisma.io" },
    update: {},
    create: {
      email: "alice@demo.com",
      name: "Alice",
      password: demoPass,
    },
  });
  const bob = await prisma.user.upsert({
    where: { email: "bob@prisma.io" },
    update: {},
    create: {
      email: "bob@demo.com",
      name: "Bob",
      password: demoPass,
    },
  });
  const org = await prisma.organization.create({
    data: {
      name: "Demo Org",
    },
  });
  const adminRole = await prisma.role.upsert({
    where: { name: "admin" },
    update: {},
    create: {
      name: "admin",
    },
  });
  const userRole = await prisma.role.upsert({
    where: { name: "user" },
    update: {},
    create: {
      name: "user",
    },
  });
  await prisma.membership.upsert({
    where: {
      userId_orgId: {
        userId: bob.id,
        orgId: org.id,
      },
    },
    update: {},
    create: {
      userId: bob.id,
      orgId: org.id,
      roleId: adminRole.id,
    },
  });
  await prisma.membership.upsert({
    where: {
      userId_orgId: {
        userId: alice.id,
        orgId: org.id,
      },
    },
    update: {},
    create: {
      userId: alice.id,
      orgId: org.id,
      roleId: userRole.id,
    },
  });
  console.log({ alice, bob });
}
main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
