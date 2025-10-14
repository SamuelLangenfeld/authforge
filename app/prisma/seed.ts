import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();

async function main() {
  const saltRounds = 10;
  const demoPass = await bcrypt.hash("demo", saltRounds);

  const alice = await prisma.user.create({
    data: {
      email: "alice@demo.com",
      name: "Alice",
      password: demoPass,
    },
  });
  const bob = await prisma.user.create({
    data: {
      email: "bob@demo.com",
      name: "Bob",
      password: demoPass,
    },
  });
  const charlie = await prisma.user.create({
    data: {
      email: "charlie@demo.com",
      name: "Charlie",
      password: demoPass,
    },
  });
  const diana = await prisma.user.create({
    data: {
      email: "diana@demo.com",
      name: "Diana",
      password: demoPass,
    },
  });
  const eve = await prisma.user.create({
    data: {
      email: "eve@demo.com",
      name: "Eve",
      password: demoPass,
    },
  });

  const org = await prisma.organization.create({
    data: {
      name: "Demo Org",
    },
  });
  const adminRole = await prisma.role.create({
    data: {
      name: "admin",
    },
  });
  const userRole = await prisma.role.create({
    data: {
      name: "user",
    },
  });

  // Bob - Admin
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

  // Alice - Admin
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
      roleId: adminRole.id,
    },
  });

  // Charlie - User
  await prisma.membership.upsert({
    where: {
      userId_orgId: {
        userId: charlie.id,
        orgId: org.id,
      },
    },
    update: {},
    create: {
      userId: charlie.id,
      orgId: org.id,
      roleId: userRole.id,
    },
  });

  // Diana - User
  await prisma.membership.upsert({
    where: {
      userId_orgId: {
        userId: diana.id,
        orgId: org.id,
      },
    },
    update: {},
    create: {
      userId: diana.id,
      orgId: org.id,
      roleId: userRole.id,
    },
  });

  // Eve - User
  await prisma.membership.upsert({
    where: {
      userId_orgId: {
        userId: eve.id,
        orgId: org.id,
      },
    },
    update: {},
    create: {
      userId: eve.id,
      orgId: org.id,
      roleId: userRole.id,
    },
  });

  const acmeCorp = await prisma.organization.create({
    data: {
      name: "Acme Corp",
    },
  });

  const techStart = await prisma.organization.create({
    data: {
      name: "TechStart Inc",
    },
  });

  const globalSolutions = await prisma.organization.create({
    data: {
      name: "Global Solutions",
    },
  });

  const innovationLabs = await prisma.organization.create({
    data: {
      name: "Innovation Labs",
    },
  });

  // Acme Corp memberships
  await prisma.membership.create({
    data: {
      userId: alice.id,
      orgId: acmeCorp.id,
      roleId: adminRole.id,
    },
  });
  await prisma.membership.create({
    data: {
      userId: bob.id,
      orgId: acmeCorp.id,
      roleId: userRole.id,
    },
  });
  await prisma.membership.create({
    data: {
      userId: charlie.id,
      orgId: acmeCorp.id,
      roleId: userRole.id,
    },
  });

  // TechStart Inc memberships
  await prisma.membership.create({
    data: {
      userId: bob.id,
      orgId: techStart.id,
      roleId: adminRole.id,
    },
  });
  await prisma.membership.create({
    data: {
      userId: diana.id,
      orgId: techStart.id,
      roleId: adminRole.id,
    },
  });
  await prisma.membership.create({
    data: {
      userId: eve.id,
      orgId: techStart.id,
      roleId: userRole.id,
    },
  });

  // Global Solutions memberships
  await prisma.membership.create({
    data: {
      userId: charlie.id,
      orgId: globalSolutions.id,
      roleId: adminRole.id,
    },
  });
  await prisma.membership.create({
    data: {
      userId: alice.id,
      orgId: globalSolutions.id,
      roleId: userRole.id,
    },
  });

  // Innovation Labs memberships
  await prisma.membership.create({
    data: {
      userId: diana.id,
      orgId: innovationLabs.id,
      roleId: adminRole.id,
    },
  });
  await prisma.membership.create({
    data: {
      userId: eve.id,
      orgId: innovationLabs.id,
      roleId: userRole.id,
    },
  });
  await prisma.membership.create({
    data: {
      userId: bob.id,
      orgId: innovationLabs.id,
      roleId: userRole.id,
    },
  });
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
